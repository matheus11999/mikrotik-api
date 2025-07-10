const { RouterOSAPI } = require('node-routeros');

class ConnectionManager {
    constructor() {
        this.connections = new Map();
        this.connectionStats = new Map();
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000, // 1 segundo
            maxDelay: 10000, // 10 segundos
            backoffMultiplier: 2
        };
        
        // Limpar conexões inválidas a cada 5 minutos
        setInterval(() => this.cleanupInvalidConnections(), 5 * 60 * 1000);
    }

    /**
     * Cria ou reutiliza uma conexão com o MikroTik
     * @param {string} host - IP do MikroTik
     * @param {string} username - Usuário
     * @param {string} password - Senha
     * @param {number} port - Porta (padrão 8728)
     * @returns {Promise<Object>} Conexão RouterOS
     */
    async getConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}:${username}`;
        const timestamp = Date.now();

        try {
            console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] Solicitando conexão para ${host}:${port} (usuário: ${username})`);

            // Verificar se existe conexão válida em cache
            const existingConnection = await this.checkExistingConnection(connectionKey);
            if (existingConnection) {
                console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] Reutilizando conexão válida para ${host}:${port}`);
                this.updateConnectionStats(connectionKey, 'reused', timestamp);
                return existingConnection;
            }

            // Criar nova conexão com retry
            const connection = await this.createConnectionWithRetry(host, username, password, port, connectionKey);
            
            this.updateConnectionStats(connectionKey, 'created', timestamp);
            return connection;

        } catch (error) {
            this.updateConnectionStats(connectionKey, 'failed', timestamp, error);
            throw error;
        }
    }

    /**
     * Verifica se existe uma conexão válida em cache
     */
    async checkExistingConnection(connectionKey) {
        if (!this.connections.has(connectionKey)) {
            return null;
        }

        const connection = this.connections.get(connectionKey);
        
        try {
            // Teste rápido para verificar se a conexão ainda é válida
            await connection.write('/system/identity/print', [], { timeout: 3000 });
            return connection;
        } catch (error) {
            console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] Conexão em cache inválida (${connectionKey}): ${error.message}`);
            this.connections.delete(connectionKey);
            
            // Tentar fechar a conexão inválida
            try {
                await connection.close();
            } catch (closeError) {
                // Ignorar erros ao fechar conexão já inválida
            }
            
            return null;
        }
    }

    /**
     * Cria nova conexão com sistema de retry avançado
     */
    async createConnectionWithRetry(host, username, password, port, connectionKey) {
        let lastError = null;
        let delay = this.retryConfig.baseDelay;

        for (let attempt = 1; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] Tentativa ${attempt}/${this.retryConfig.maxRetries} - Conectando a ${host}:${port}`);
                
                const connection = await this.createSingleConnection(host, username, password, port);
                
                // Armazenar conexão no cache
                this.connections.set(connectionKey, connection);
                
                console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] ✅ Conectado com sucesso a ${host}:${port} (tentativa ${attempt})`);
                return connection;

            } catch (error) {
                lastError = error;
                const errorType = this.classifyError(error);
                
                console.warn(`[CONNECTION-MANAGER] [${new Date().toISOString()}] ❌ Tentativa ${attempt} falhou para ${host}:${port}: ${error.message} (Tipo: ${errorType})`);

                // Parar imediatamente para alguns erros definitivos
                if (errorType === 'authentication') {
                    console.error(`[CONNECTION-MANAGER] [${new Date().toISOString()}] 🔐 Erro de autenticação detectado - interrompendo tentativas`);
                    throw this.createAuthenticationError(error);
                }

                // Se o host está offline ou houve timeout, não faz sentido continuar
                if (errorType === 'host_unreachable' || errorType === 'timeout') {
                    console.error(`[CONNECTION-MANAGER] [${new Date().toISOString()}] 🌐 Host inacessível - interrompendo tentativas`);
                    throw this.createNetworkError(error);
                }

                // Se não é a última tentativa, aguardar antes de tentar novamente
                if (attempt < this.retryConfig.maxRetries) {
                    console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] ⏳ Aguardando ${delay}ms antes da próxima tentativa...`);
                    await this.sleep(delay);
                    
                    // Aumentar delay para próxima tentativa (backoff exponencial)
                    delay = Math.min(delay * this.retryConfig.backoffMultiplier, this.retryConfig.maxDelay);
                }
            }
        }

        // Se chegou aqui, todas as tentativas falharam
        console.error(`[CONNECTION-MANAGER] [${new Date().toISOString()}] 💥 Todas as ${this.retryConfig.maxRetries} tentativas falharam para ${host}:${port}`);
        throw this.createRetryExhaustedError(lastError, this.retryConfig.maxRetries);
    }

    /**
     * Cria uma única conexão (sem retry)
     */
    async createSingleConnection(host, username, password, port) {
        const startTime = Date.now();
        
        const connection = new RouterOSAPI({
            host: host,
            user: username,
            password: password,
            port: port,
            timeout: 5000, // 5 segundos de timeout (falha rápida se dispositivo estiver offline)
            keepalive: true
        });

        await connection.connect();
        
        // Teste adicional para verificar se a conexão está funcionando
        await connection.write('/system/identity/print');
        
        const connectionTime = Date.now() - startTime;
        console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] Conexão estabelecida em ${connectionTime}ms`);
        
        return connection;
    }

    /**
     * Classifica o tipo de erro para determinar se deve tentar novamente
     */
    classifyError(error) {
        const message = error.message.toLowerCase();
        
        // Erros de autenticação
        if (message.includes('authentication') || 
            message.includes('login failed') || 
            message.includes('invalid user') ||
            message.includes('bad user name or password') ||
            message.includes('login incorrect') ||
            message.includes('access denied')) {
            return 'authentication';
        }
        
        // Erros de rede/host
        if (message.includes('econnrefused') || 
            message.includes('connection refused') ||
            message.includes('host unreachable') ||
            message.includes('network unreachable') ||
            message.includes('no route to host')) {
            return 'host_unreachable';
        }
        
        // Erros de timeout (podem ser temporários)
        if (message.includes('timeout') || 
            message.includes('timed out') ||
            message.includes('etimedout')) {
            return 'timeout';
        }
        
        // Erros de protocolo
        if (message.includes('protocol') || 
            message.includes('handshake')) {
            return 'protocol';
        }
        
        // Outros erros (podem ser temporários)
        return 'unknown';
    }

    /**
     * Cria erro específico de autenticação
     */
    createAuthenticationError(originalError) {
        const error = new Error('Falha na autenticação: usuário ou senha incorretos');
        error.type = 'AUTHENTICATION_ERROR';
        error.code = 'AUTH_FAILED';
        error.statusCode = 401;
        error.originalError = originalError;
        error.retryable = false;
        return error;
    }

    /**
     * Cria erro específico de rede
     */
    createNetworkError(originalError) {
        const error = new Error('Host inacessível: verifique IP, porta e conectividade de rede');
        error.type = 'NETWORK_ERROR';
        error.code = 'HOST_UNREACHABLE';
        error.statusCode = 503;
        error.originalError = originalError;
        error.retryable = false;
        return error;
    }

    /**
     * Cria erro quando todas as tentativas se esgotaram
     */
    createRetryExhaustedError(lastError, maxRetries) {
        const error = new Error(`Falha após ${maxRetries} tentativas: ${lastError.message}`);
        error.type = 'RETRY_EXHAUSTED';
        error.code = 'MAX_RETRIES_EXCEEDED';
        error.statusCode = 500;
        error.originalError = lastError;
        error.retryable = false;
        error.attempts = maxRetries;
        return error;
    }

    /**
     * Atualiza estatísticas de conexão
     */
    updateConnectionStats(connectionKey, action, timestamp, error = null) {
        if (!this.connectionStats.has(connectionKey)) {
            this.connectionStats.set(connectionKey, {
                created: 0,
                reused: 0,
                failed: 0,
                lastUsed: null,
                lastError: null,
                totalAttempts: 0
            });
        }

        const stats = this.connectionStats.get(connectionKey);
        stats[action]++;
        stats.totalAttempts++;
        stats.lastUsed = timestamp;
        
        if (error) {
            stats.lastError = {
                message: error.message,
                type: this.classifyError(error),
                timestamp: timestamp
            };
        }
    }

    /**
     * Testa conexão e retorna informações detalhadas
     */
    async testConnection(host, username, password, port = 8728) {
        const startTime = Date.now();
        const connectionKey = `${host}:${port}:${username}`;
        
        try {
            console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] 🧪 Iniciando teste de conexão para ${host}:${port}`);
            
            const connection = await this.getConnection(host, username, password, port);
            
            // Obter informações do sistema
            const identity = await connection.write('/system/identity/print');
            const resource = await connection.write('/system/resource/print');
            
            const connectionTime = Date.now() - startTime;
            const stats = this.connectionStats.get(connectionKey);
            
            console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] ✅ Teste de conexão bem-sucedido em ${connectionTime}ms`);
            
            return {
                success: true,
                connectionTime: connectionTime,
                mikrotikInfo: {
                    identity: identity[0]?.name || 'Unknown',
                    version: resource[0]?.version || 'Unknown',
                    board: resource[0]?.['board-name'] || 'Unknown',
                    uptime: resource[0]?.uptime || 'Unknown'
                },
                connectionStats: stats,
                cacheStatus: this.connections.has(connectionKey) ? 'cached' : 'new',
                timestamp: new Date().toISOString()
            };
            
        } catch (error) {
            const connectionTime = Date.now() - startTime;
            const errorType = this.classifyError(error);
            
            console.error(`[CONNECTION-MANAGER] [${new Date().toISOString()}] ❌ Teste de conexão falhou em ${connectionTime}ms: ${error.message}`);
            
            return {
                success: false,
                connectionTime: connectionTime,
                error: {
                    message: error.message,
                    type: errorType,
                    code: error.code || 'UNKNOWN',
                    retryable: error.retryable !== false
                },
                timestamp: new Date().toISOString()
            };
        }
    }

    /**
     * Remove conexões inválidas do cache
     */
    async cleanupInvalidConnections() {
        console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] 🧹 Iniciando limpeza de conexões inválidas...`);
        
        let removed = 0;
        const keysToRemove = [];
        
        for (const [key, connection] of this.connections.entries()) {
            try {
                await connection.write('/system/identity/print', [], { timeout: 2000 });
            } catch (error) {
                keysToRemove.push(key);
                try {
                    await connection.close();
                } catch (closeError) {
                    // Ignorar erros ao fechar
                }
            }
        }
        
        keysToRemove.forEach(key => {
            this.connections.delete(key);
            removed++;
        });
        
        if (removed > 0) {
            console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] 🗑️ Removidas ${removed} conexões inválidas`);
        }
    }

    /**
     * Fecha todas as conexões
     */
    async closeAllConnections() {
        console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        const promises = Array.from(this.connections.values()).map(async (connection) => {
            try {
                await connection.close();
            } catch (error) {
                // Ignorar erros ao fechar
            }
        });
        
        await Promise.allSettled(promises);
        
        this.connections.clear();
        console.log(`[CONNECTION-MANAGER] [${new Date().toISOString()}] Todas as conexões foram fechadas`);
    }

    /**
     * Obtém estatísticas do gerenciador
     */
    getStats() {
        const activeConnections = this.connections.size;
        const totalStats = Array.from(this.connectionStats.values()).reduce((acc, stats) => {
            acc.created += stats.created;
            acc.reused += stats.reused;
            acc.failed += stats.failed;
            acc.totalAttempts += stats.totalAttempts;
            return acc;
        }, { created: 0, reused: 0, failed: 0, totalAttempts: 0 });
        
        return {
            activeConnections,
            totalStats,
            cacheHitRate: totalStats.totalAttempts > 0 
                ? (totalStats.reused / totalStats.totalAttempts * 100).toFixed(2) + '%'
                : '0%',
            uptime: process.uptime()
        };
    }

    /**
     * Utilitário para aguardar
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

module.exports = ConnectionManager; 