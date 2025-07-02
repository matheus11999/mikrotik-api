const { RouterOSAPI } = require('node-routeros');
const ConnectionManager = require('./connection-manager');

class HotspotImprovedService {
    constructor() {
        this.connectionManager = new ConnectionManager();
        this.connections = new Map();
        this.connectionAttempts = new Map();
        this.blacklistedConnections = new Map();
        
        // Configurações de retry
        this.MAX_RETRY_ATTEMPTS = parseInt(process.env.MIKROTIK_MAX_RETRY_ATTEMPTS) || 3;
        this.RETRY_DELAY_MS = parseInt(process.env.MIKROTIK_RETRY_DELAY_MS) || 2000;
        this.CONNECTION_TIMEOUT = parseInt(process.env.MIKROTIK_CONNECTION_TIMEOUT_MS) || 10000;
        this.BLACKLIST_DURATION = parseInt(process.env.MIKROTIK_BLACKLIST_DURATION_MS) || 300000; // 5 minutos
        
        // Limpeza periódica de blacklist
        this.cleanupTimer = setInterval(() => this.cleanupBlacklist(), 60000); // 1 minuto
    }
    
    cleanupBlacklist() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, data] of this.blacklistedConnections.entries()) {
            if (now - data.timestamp > this.BLACKLIST_DURATION) {
                this.blacklistedConnections.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Limpeza de blacklist: removidas ${cleanedCount} entradas`);
        }
    }
    
    isBlacklisted(connectionKey) {
        const blacklistData = this.blacklistedConnections.get(connectionKey);
        if (!blacklistData) return false;
        
        const isStillBlacklisted = Date.now() - blacklistData.timestamp < this.BLACKLIST_DURATION;
        if (!isStillBlacklisted) {
            this.blacklistedConnections.delete(connectionKey);
        }
        return isStillBlacklisted;
    }
    
    addToBlacklist(connectionKey, reason) {
        this.blacklistedConnections.set(connectionKey, {
            timestamp: Date.now(),
            reason: reason
        });
        console.warn(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Adicionado à blacklist: ${connectionKey} - Razão: ${reason}`);
    }
    
    isAuthenticationError(error) {
        const authErrorMessages = [
            'invalid user name or password',
            'login failure',
            'cannot log in',
            'authentication failed',
            'bad credentials',
            'access denied',
            'unauthorized',
            'authentication error',
            'login failed',
            'wrong password',
            'user does not exist'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        return authErrorMessages.some(msg => errorMessage.includes(msg));
    }
    
    isConnectionError(error) {
        const connectionErrorMessages = [
            'timeout',
            'connect',
            'connection',
            'network',
            'unreachable',
            'refused',
            'reset',
            'enotfound',
            'econnrefused',
            'econnreset',
            'ehostunreach',
            'enetunreach'
        ];
        
        const errorMessage = error.message?.toLowerCase() || '';
        return connectionErrorMessages.some(msg => errorMessage.includes(msg));
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async createConnectionWithRetry(host, username, password, port = 8728, attempt = 1) {
        const connectionKey = `${host}:${port}:${username}`;
        
        // Verificar se está na blacklist
        if (this.isBlacklisted(connectionKey)) {
            const blacklistData = this.blacklistedConnections.get(connectionKey);
            const remainingTime = Math.ceil((this.BLACKLIST_DURATION - (Date.now() - blacklistData.timestamp)) / 1000);
            throw new Error(`Connection blacklisted: ${blacklistData.reason}. Try again in ${remainingTime} seconds.`);
        }
        
        try {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Tentativa ${attempt}/${this.MAX_RETRY_ATTEMPTS} - Conectando ao MikroTik: ${host}:${port} com usuário: ${username}`);
            
            const conn = new RouterOSAPI({
                host: host,
                user: username,
                password: password,
                port: port,
                timeout: this.CONNECTION_TIMEOUT
            });

            await conn.connect();
            
            // Testar conexão com comando simples
            await conn.write('/system/identity/print');
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port} (tentativa ${attempt})`);
            
            // Limpar contador de tentativas em caso de sucesso
            this.connectionAttempts.delete(connectionKey);
            
            return conn;
            
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Falha na tentativa ${attempt}/${this.MAX_RETRY_ATTEMPTS} para ${host}:${port}:`, error.message);
            
            // Se for erro de autenticação, não tentar novamente
            if (this.isAuthenticationError(error)) {
                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro de autenticação detectado para ${host}:${port} - Não tentando novamente`);
                this.addToBlacklist(connectionKey, 'Authentication failed');
                throw new Error(`Authentication failed: Invalid username or password for ${host}:${port}`);
            }
            
            // Se chegou ao limite de tentativas
            if (attempt >= this.MAX_RETRY_ATTEMPTS) {
                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Limite de tentativas excedido para ${host}:${port}`);
                
                // Adicionar à blacklist se foram muitas falhas de conexão
                if (this.isConnectionError(error)) {
                    this.addToBlacklist(connectionKey, 'Max connection attempts exceeded');
                }
                
                throw new Error(`Connection failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${error.message}`);
            }
            
            // Aguardar antes de tentar novamente (backoff exponencial)
            const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Aguardando ${delayMs}ms antes da próxima tentativa...`);
            await this.delay(delayMs);
            
            // Tentar novamente
            return this.createConnectionWithRetry(host, username, password, port, attempt + 1);
        }
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            // Verificar se já existe uma conexão válida
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    // Testar se a conexão ainda está ativa
                    await existingConn.write('/system/identity/print');
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
                    this.connections.delete(connectionKey);
                    
                    // Tentar fechar a conexão antiga
                    try {
                        existingConn.close();
                    } catch (closeError) {
                        console.debug(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão antiga: ${closeError.message}`);
                    }
                }
            }

            // Criar nova conexão com retry
            const conn = await this.createConnectionWithRetry(host, username, password, port);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Falha final na conexão com ${host}:${port}:`, error.message);
            
            // Limpar conexão do cache se houver erro
            if (this.connections.has(connectionKey)) {
                this.connections.delete(connectionKey);
            }
            
            throw error;
        }
    }
    
    async closeAllConnections() {
        console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        for (const [key, conn] of this.connections.entries()) {
            try {
                await conn.close();
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        
        this.connections.clear();
        
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }

    // ==================== WRAPPER PARA OPERAÇÕES COM RETRY ====================
    
    async executeWithRetry(operation, host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        let lastError;
        
        for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                const conn = await this.createConnection(host, username, password, port);
                return await operation(conn);
            } catch (error) {
                lastError = error;
                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro na tentativa ${attempt}/${this.MAX_RETRY_ATTEMPTS}:`, error.message);
                
                // Se for erro de autenticação, não tentar novamente
                if (this.isAuthenticationError(error)) {
                    throw error;
                }
                
                // Limpar conexão do cache
                if (this.connections.has(connectionKey)) {
                    const conn = this.connections.get(connectionKey);
                    try {
                        conn.close();
                    } catch (closeError) {
                        console.debug(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão: ${closeError.message}`);
                    }
                    this.connections.delete(connectionKey);
                }
                
                // Se não é a última tentativa, aguardar antes de tentar novamente
                if (attempt < this.MAX_RETRY_ATTEMPTS) {
                    const delayMs = this.RETRY_DELAY_MS * Math.pow(2, attempt - 1);
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Aguardando ${delayMs}ms antes da próxima tentativa...`);
                    await this.delay(delayMs);
                }
            }
        }
        
        throw lastError;
    }

    // ==================== USUÁRIOS HOTSPOT ====================
    
    async listUsers(host, username, password, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Listando usuários do hotspot para ${host}`);
            
            const users = await conn.write('/ip/hotspot/user/print');
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Encontrados ${users.length} usuários no hotspot`);
            
            return users;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao listar usuários:`, error.message);
            throw this.enhanceError(error, 'listUsers', { host, port });
        }
    }

    async createUser(host, username, password, userData, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Criando usuário do hotspot: ${userData.name}`);
            
            // Verificar servidores disponíveis se não foi especificado um servidor
            let serverName = userData.server;
            if (!serverName) {
                console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Servidor não especificado, verificando servidores disponíveis...`);
                try {
                    const servers = await conn.write('/ip/hotspot/print');
                    console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Servidores encontrados:`, servers.map(s => s.name));
                    
                    if (servers.length > 0) {
                        serverName = servers[0].name;
                        console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Usando primeiro servidor disponível: ${serverName}`);
                    } else {
                        const error = new Error('Nenhum servidor hotspot configurado. Configure um servidor hotspot primeiro.');
                        error.type = 'CONFIGURATION_ERROR';
                        error.code = 'NO_HOTSPOT_SERVER';
                        error.statusCode = 400;
                        error.userMessage = 'Nenhum servidor hotspot está configurado no MikroTik.';
                        throw error;
                    }
                } catch (serverError) {
                    if (serverError.type) throw serverError; // Re-lançar erros nossos
                    throw this.enhanceError(serverError, 'checkServers', { host, port });
                }
            }
            
            const params = [
                `=name=${userData.name}`,
                `=password=${userData.password || ''}`,
                `=profile=${userData.profile || 'default'}`,
                `=server=${serverName}`
            ];

            // Campos opcionais
            if (userData.comment) params.push(`=comment=${userData.comment}`);
            if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled}`);
            if (userData.email) params.push(`=email=${userData.email}`);
            if (userData.limit_uptime) params.push(`=limit-uptime=${userData.limit_uptime}`);
            if (userData.limit_bytes_in) params.push(`=limit-bytes-in=${userData.limit_bytes_in}`);
            if (userData.limit_bytes_out) params.push(`=limit-bytes-out=${userData.limit_bytes_out}`);
            if (userData.limit_bytes_total) params.push(`=limit-bytes-total=${userData.limit_bytes_total}`);
            if (userData.address) params.push(`=address=${userData.address}`);
            if (userData.mac_address) params.push(`=mac-address=${userData.mac_address}`);
            if (userData['mac-address']) params.push(`=mac-address=${userData['mac-address']}`);
            if (userData.routes) params.push(`=routes=${userData.routes}`);
            if (userData.rate_limit) params.push(`=rate-limit=${userData.rate_limit}`);
            
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Parâmetros do usuário:`, params);
            
            const result = await conn.write('/ip/hotspot/user/add', params);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Usuário criado com sucesso: ${userData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao criar usuário:`, error.message);
            if (error.type) throw error; // Re-lançar erros nossos
            throw this.enhanceError(error, 'createUser', { host, port, userName: userData.name });
        }
    }

    async updateUser(host, username, password, userId, userData, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Atualizando usuário do hotspot ID: ${userId}`);
            
            const params = [`=.id=${userId}`];
            
            // Campos atualizáveis
            if (userData.name) params.push(`=name=${userData.name}`);
            if (userData.password !== undefined) params.push(`=password=${userData.password}`);
            if (userData.profile) params.push(`=profile=${userData.profile}`);
            if (userData.server) params.push(`=server=${userData.server}`);
            if (userData.comment !== undefined) params.push(`=comment=${userData.comment}`);
            if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled}`);
            if (userData.email !== undefined) params.push(`=email=${userData.email}`);
            if (userData.limit_uptime !== undefined) params.push(`=limit-uptime=${userData.limit_uptime}`);
            if (userData.limit_bytes_in !== undefined) params.push(`=limit-bytes-in=${userData.limit_bytes_in}`);
            if (userData.limit_bytes_out !== undefined) params.push(`=limit-bytes-out=${userData.limit_bytes_out}`);
            if (userData.limit_bytes_total !== undefined) params.push(`=limit-bytes-total=${userData.limit_bytes_total}`);
            if (userData.address !== undefined) params.push(`=address=${userData.address}`);
            if (userData.mac_address !== undefined) params.push(`=mac-address=${userData.mac_address}`);
            if (userData.routes !== undefined) params.push(`=routes=${userData.routes}`);
            if (userData.rate_limit !== undefined) params.push(`=rate-limit=${userData.rate_limit}`);
            
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Parâmetros de atualização:`, params);
            
            const result = await conn.write('/ip/hotspot/user/set', params);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Usuário atualizado com sucesso ID: ${userId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao atualizar usuário:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'updateUser', { host, port, userId });
        }
    }

    async deleteUser(host, username, password, userId, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Removendo usuário do hotspot ID: ${userId}`);
            
            const result = await conn.write('/ip/hotspot/user/remove', [`=.id=${userId}`]);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Usuário removido com sucesso ID: ${userId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao remover usuário:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'deleteUser', { host, port, userId });
        }
    }

    async getUserById(host, username, password, userId, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Buscando usuário do hotspot ID: ${userId}`);
            
            const users = await conn.write('/ip/hotspot/user/print', [`=.id=${userId}`]);
            
            if (users.length === 0) {
                const error = new Error(`Usuário com ID ${userId} não encontrado`);
                error.type = 'NOT_FOUND_ERROR';
                error.code = 'USER_NOT_FOUND';
                error.statusCode = 404;
                error.userMessage = `Usuário com ID ${userId} não foi encontrado.`;
                throw error;
            }
            
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Usuário encontrado: ${users[0].name}`);
            return users[0];
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao buscar usuário:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'getUserById', { host, port, userId });
        }
    }

    async findUserByUsername(host, username, password, searchUsername, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Buscando usuário por username: ${searchUsername}`);
            
            const users = await conn.write('/ip/hotspot/user/print');
            const matchingUsers = users.filter(user => 
                user.name && user.name.toLowerCase().includes(searchUsername.toLowerCase())
            );
            
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Encontrados ${matchingUsers.length} usuários com username similar a: ${searchUsername}`);
            return matchingUsers;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao buscar usuário por username:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'findUserByUsername', { host, port, searchUsername });
        }
    }

    // ==================== USUÁRIOS ATIVOS ====================
    
    async listActiveUsers(host, username, password, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Listando usuários ativos para ${host}`);
            
            const activeUsers = await conn.write('/ip/hotspot/active/print');
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Encontrados ${activeUsers.length} usuários ativos`);
            
            return activeUsers;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao listar usuários ativos:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'listActiveUsers', { host, port });
        }
    }

    async disconnectActiveUser(host, username, password, activeId, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Desconectando usuário ativo ID: ${activeId}`);
            
            const result = await conn.write('/ip/hotspot/active/remove', [`=.id=${activeId}`]);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Usuário desconectado com sucesso ID: ${activeId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao desconectar usuário ativo:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'disconnectActiveUser', { host, port, activeId });
        }
    }

    // ==================== TESTE DE CONEXÃO AVANÇADO ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] 🧪 Iniciando teste de conexão avançado para ${host}:${port}`);
            
            const result = await this.connectionManager.testConnection(host, username, password, port);
            
            if (result.success) {
                console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] ✅ Teste de conexão bem-sucedido`);
            } else {
                console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] ❌ Teste de conexão falhou: ${result.error.message}`);
            }
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro crítico no teste de conexão:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'testConnection', { host, port });
        }
    }

    // ==================== PROFILES ====================
    
    async listProfiles(host, username, password, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Listando perfis do hotspot para ${host}`);
            
            const profiles = await conn.write('/ip/hotspot/user-profile/print');
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Encontrados ${profiles.length} perfis`);
            
            return profiles;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao listar perfis:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'listProfiles', { host, port });
        }
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getStats(host, username, password, port = 8728) {
        try {
            const conn = await this.getConnection(host, username, password, port);
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Coletando estatísticas para ${host}`);
            
            const [users, activeUsers, profiles, servers] = await Promise.all([
                conn.write('/ip/hotspot/user/print'),
                conn.write('/ip/hotspot/active/print'),
                conn.write('/ip/hotspot/user-profile/print'),
                conn.write('/ip/hotspot/print')
            ]);
            
            const stats = {
                totalUsers: users.length,
                activeUsers: activeUsers.length,
                profiles: profiles.length,
                servers: servers.length,
                connectionManager: this.connectionManager.getStats(),
                timestamp: new Date().toISOString()
            };
            
            console.log(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Estatísticas coletadas:`, stats);
            return stats;
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
            if (error.type) throw error;
            throw this.enhanceError(error, 'getStats', { host, port });
        }
    }

    // ==================== GESTÃO DE CONEXÕES ====================
    
    async closeAllConnections() {
        return await this.connectionManager.closeAllConnections();
    }
    
    getConnectionStats() {
        return this.connectionManager.getStats();
    }

    /**
     * Wrapper para obter conexão com tratamento de erro melhorado
     */
    async getConnection(host, username, password, port = 8728) {
        try {
            return await this.connectionManager.getConnection(host, username, password, port);
        } catch (error) {
            // Converter erro para formato consistente
            throw this.enhanceError(error, 'connection', { host, username, port });
        }
    }

    /**
     * Aprimora erros com informações adicionais e códigos específicos
     */
    enhanceError(error, operation, context = {}) {
        // Se já é um erro nosso, apenas repassar
        if (error.type && error.code) {
            return error;
        }

        const enhanced = new Error(error.message);
        enhanced.operation = operation;
        enhanced.context = context;
        enhanced.timestamp = new Date().toISOString();
        enhanced.originalError = error;

        // Classificar erro baseado na mensagem
        const message = error.message.toLowerCase();
        
        if (message.includes('authentication') || message.includes('login') || message.includes('password')) {
            enhanced.type = 'AUTHENTICATION_ERROR';
            enhanced.code = 'AUTH_FAILED';
            enhanced.statusCode = 401;
            enhanced.userMessage = 'Credenciais inválidas. Verifique usuário e senha.';
        } else if (message.includes('timeout') || message.includes('timed out')) {
            enhanced.type = 'TIMEOUT_ERROR';
            enhanced.code = 'CONNECTION_TIMEOUT';
            enhanced.statusCode = 408;
            enhanced.userMessage = 'Timeout na conexão. Verifique a conectividade de rede.';
        } else if (message.includes('refused') || message.includes('unreachable')) {
            enhanced.type = 'NETWORK_ERROR';
            enhanced.code = 'CONNECTION_REFUSED';
            enhanced.statusCode = 503;
            enhanced.userMessage = 'Não foi possível conectar ao MikroTik. Verifique IP e porta.';
        } else {
            enhanced.type = 'UNKNOWN_ERROR';
            enhanced.code = 'OPERATION_FAILED';
            enhanced.statusCode = 500;
            enhanced.userMessage = 'Erro interno na operação.';
        }

        return enhanced;
    }
}

module.exports = HotspotImprovedService;