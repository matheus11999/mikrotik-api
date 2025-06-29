const { RouterOSAPI } = require('node-routeros');

class HotspotService {
    constructor() {
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
        return this.executeWithRetry(async (conn) => {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando usuários do hotspot para ${host}`);
            
            const users = await conn.write('/ip/hotspot/user/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${users.length} usuários no hotspot`);
            
            return users;
        }, host, username, password, port);
    }

    async createUser(host, username, password, userData, port = 8728) {
        return this.executeWithRetry(async (conn) => {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando usuário do hotspot: ${userData.name}`);
            
            // Verificar servidores disponíveis se não foi especificado um servidor
            let serverName = userData.server;
            if (!serverName) {
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Servidor não especificado, verificando servidores disponíveis...`);
                try {
                    const servers = await conn.write('/ip/hotspot/print');
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Servidores encontrados:`, servers.map(s => s.name));
                    
                    if (servers.length > 0) {
                        serverName = servers[0].name;
                        console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usando primeiro servidor disponível: ${serverName}`);
                    } else {
                        throw new Error('Nenhum servidor hotspot configurado. Configure um servidor hotspot primeiro.');
                    }
                } catch (serverError) {
                    console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao verificar servidores:`, serverError.message);
                    throw serverError;
                }
            }

            // Preparar dados do usuário
            const userParams = {
                name: userData.name,
                password: userData.password || '',
                profile: userData.profile || 'default',
                server: serverName
            };

            // Adicionar campos opcionais se fornecidos
            if (userData.comment) userParams.comment = userData.comment;
            if (userData.disabled !== undefined) userParams.disabled = userData.disabled;
            if (userData['limit-uptime']) userParams['limit-uptime'] = userData['limit-uptime'];
            if (userData['limit-bytes-in']) userParams['limit-bytes-in'] = userData['limit-bytes-in'];
            if (userData['limit-bytes-out']) userParams['limit-bytes-out'] = userData['limit-bytes-out'];
            if (userData['limit-bytes-total']) userParams['limit-bytes-total'] = userData['limit-bytes-total'];

            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros do usuário:`, userParams);

            const result = await conn.write('/ip/hotspot/user/add', userParams);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário criado com sucesso: ${userData.name}`);
            
            return result;
        }, host, username, password, port);
    }

    // Adicionar métodos similares para outras operações...
    async testConnection(host, username, password, port = 8728) {
        return this.executeWithRetry(async (conn) => {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Testando conexão com ${host}:${port}`);
            
            const identity = await conn.write('/system/identity/print');
            const resource = await conn.write('/system/resource/print');
            
            return {
                success: true,
                identity: identity[0],
                resource: resource[0],
                timestamp: new Date().toISOString()
            };
        }, host, username, password, port);
    }
}

module.exports = HotspotService;