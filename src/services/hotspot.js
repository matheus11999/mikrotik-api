const { RouterOSAPI } = require('node-routeros');

class HotspotService {
    constructor() {
        this.connections = new Map();
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Tentando conectar ao MikroTik: ${host}:${port} com usuário: ${username}`);
            
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    await existingConn.write('/system/identity/print');
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
                    this.connections.delete(connectionKey);
                }
            }

            const conn = new RouterOSAPI({
                host: host,
                user: username,
                password: password,
                port: port,
                timeout: 10000
            });

            await conn.connect();
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

    // ==================== USUÁRIOS HOTSPOT ====================
    
    async listUsers(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando usuários do hotspot para ${host}`);
            
            const users = await conn.write('/ip/hotspot/user/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${users.length} usuários no hotspot`);
            
            return users;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar usuários:`, error.message);
            throw error;
        }
    }

    async createUser(host, username, password, userData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando usuário do hotspot: ${userData.name}`);
            
            const params = [
                `=name=${userData.name}`,
                `=password=${userData.password || ''}`,
                `=profile=${userData.profile || 'default'}`,
                `=server=${userData.server || 'hotspot1'}`
            ];

            if (userData.comment) params.push(`=comment=${userData.comment}`);
            if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled}`);
            if (userData.limit_uptime) params.push(`=limit-uptime=${userData.limit_uptime}`);
            if (userData.limit_bytes_in) params.push(`=limit-bytes-in=${userData.limit_bytes_in}`);
            if (userData.limit_bytes_out) params.push(`=limit-bytes-out=${userData.limit_bytes_out}`);
            if (userData.limit_bytes_total) params.push(`=limit-bytes-total=${userData.limit_bytes_total}`);
            if (userData.email) params.push(`=email=${userData.email}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros do usuário:`, params);
            
            const result = await conn.write('/ip/hotspot/user/add', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário criado com sucesso: ${userData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao criar usuário:`, error.message);
            throw error;
        }
    }

    async updateUser(host, username, password, userId, userData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Atualizando usuário do hotspot ID: ${userId}`);
            
            const params = [`=.id=${userId}`];
            
            if (userData.name) params.push(`=name=${userData.name}`);
            if (userData.password !== undefined) params.push(`=password=${userData.password}`);
            if (userData.profile) params.push(`=profile=${userData.profile}`);
            if (userData.server) params.push(`=server=${userData.server}`);
            if (userData.comment !== undefined) params.push(`=comment=${userData.comment}`);
            if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled}`);
            if (userData.limit_uptime !== undefined) params.push(`=limit-uptime=${userData.limit_uptime}`);
            if (userData.limit_bytes_in !== undefined) params.push(`=limit-bytes-in=${userData.limit_bytes_in}`);
            if (userData.limit_bytes_out !== undefined) params.push(`=limit-bytes-out=${userData.limit_bytes_out}`);
            if (userData.limit_bytes_total !== undefined) params.push(`=limit-bytes-total=${userData.limit_bytes_total}`);
            if (userData.email !== undefined) params.push(`=email=${userData.email}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params);
            
            const result = await conn.write('/ip/hotspot/user/set', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário atualizado com sucesso ID: ${userId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao atualizar usuário:`, error.message);
            throw error;
        }
    }

    async deleteUser(host, username, password, userId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo usuário do hotspot ID: ${userId}`);
            
            const result = await conn.write('/ip/hotspot/user/remove', [`=.id=${userId}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário removido com sucesso ID: ${userId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover usuário:`, error.message);
            throw error;
        }
    }

    async getUserById(host, username, password, userId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Buscando usuário do hotspot ID: ${userId}`);
            
            const users = await conn.write('/ip/hotspot/user/print', [`=.id=${userId}`]);
            
            if (users.length === 0) {
                throw new Error(`Usuário com ID ${userId} não encontrado`);
            }
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário encontrado: ${users[0].name}`);
            return users[0];
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao buscar usuário:`, error.message);
            throw error;
        }
    }

    // ==================== USUÁRIOS ATIVOS ====================
    
    async listActiveUsers(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando usuários ativos do hotspot para ${host}`);
            
            const activeUsers = await conn.write('/ip/hotspot/active/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${activeUsers.length} usuários ativos`);
            
            return activeUsers;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar usuários ativos:`, error.message);
            throw error;
        }
    }

    async disconnectActiveUser(host, username, password, activeId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Desconectando usuário ativo ID: ${activeId}`);
            
            const result = await conn.write('/ip/hotspot/active/remove', [`=.id=${activeId}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário desconectado com sucesso ID: ${activeId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao desconectar usuário:`, error.message);
            throw error;
        }
    }

    // ==================== PROFILES ====================
    
    async listProfiles(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando profiles do hotspot para ${host}`);
            
            const profiles = await conn.write('/ip/hotspot/user/profile/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${profiles.length} profiles`);
            
            return profiles;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar profiles:`, error.message);
            throw error;
        }
    }

    async createProfile(host, username, password, profileData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando profile do hotspot: ${profileData.name}`);
            
            const params = [`=name=${profileData.name}`];
            
            if (profileData.rate_limit) params.push(`=rate-limit=${profileData.rate_limit}`);
            if (profileData.session_timeout) params.push(`=session-timeout=${profileData.session_timeout}`);
            if (profileData.idle_timeout) params.push(`=idle-timeout=${profileData.idle_timeout}`);
            if (profileData.keepalive_timeout) params.push(`=keepalive-timeout=${profileData.keepalive_timeout}`);
            if (profileData.status_autorefresh) params.push(`=status-autorefresh=${profileData.status_autorefresh}`);
            if (profileData.shared_users) params.push(`=shared-users=${profileData.shared_users}`);
            if (profileData.mac_cookie_timeout) params.push(`=mac-cookie-timeout=${profileData.mac_cookie_timeout}`);
            if (profileData.address_pool) params.push(`=address-pool=${profileData.address_pool}`);
            if (profileData.transparent_proxy) params.push(`=transparent-proxy=${profileData.transparent_proxy}`);
            if (profileData.bind_to_address) params.push(`=bind-to-address=${profileData.bind_to_address}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros do profile:`, params);
            
            const result = await conn.write('/ip/hotspot/user/profile/add', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Profile criado com sucesso: ${profileData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao criar profile:`, error.message);
            throw error;
        }
    }

    async updateProfile(host, username, password, profileId, profileData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Atualizando profile do hotspot ID: ${profileId}`);
            
            const params = [`=.id=${profileId}`];
            
            if (profileData.name) params.push(`=name=${profileData.name}`);
            if (profileData.rate_limit !== undefined) params.push(`=rate-limit=${profileData.rate_limit}`);
            if (profileData.session_timeout !== undefined) params.push(`=session-timeout=${profileData.session_timeout}`);
            if (profileData.idle_timeout !== undefined) params.push(`=idle-timeout=${profileData.idle_timeout}`);
            if (profileData.keepalive_timeout !== undefined) params.push(`=keepalive-timeout=${profileData.keepalive_timeout}`);
            if (profileData.status_autorefresh !== undefined) params.push(`=status-autorefresh=${profileData.status_autorefresh}`);
            if (profileData.shared_users !== undefined) params.push(`=shared-users=${profileData.shared_users}`);
            if (profileData.mac_cookie_timeout !== undefined) params.push(`=mac-cookie-timeout=${profileData.mac_cookie_timeout}`);
            if (profileData.address_pool !== undefined) params.push(`=address-pool=${profileData.address_pool}`);
            if (profileData.transparent_proxy !== undefined) params.push(`=transparent-proxy=${profileData.transparent_proxy}`);
            if (profileData.bind_to_address !== undefined) params.push(`=bind-to-address=${profileData.bind_to_address}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params);
            
            const result = await conn.write('/ip/hotspot/user/profile/set', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Profile atualizado com sucesso ID: ${profileId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao atualizar profile:`, error.message);
            throw error;
        }
    }

    async deleteProfile(host, username, password, profileId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo profile do hotspot ID: ${profileId}`);
            
            const result = await conn.write('/ip/hotspot/user/profile/remove', [`=.id=${profileId}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Profile removido com sucesso ID: ${profileId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover profile:`, error.message);
            throw error;
        }
    }

    // ==================== SERVIDORES HOTSPOT ====================
    
    async listServers(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando servidores do hotspot para ${host}`);
            
            const servers = await conn.write('/ip/hotspot/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${servers.length} servidores`);
            
            return servers;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar servidores:`, error.message);
            throw error;
        }
    }

    // ==================== COOKIES ====================
    
    async listCookies(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando cookies do hotspot para ${host}`);
            
            const cookies = await conn.write('/ip/hotspot/cookie/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${cookies.length} cookies`);
            
            return cookies;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar cookies:`, error.message);
            throw error;
        }
    }

    async deleteCookie(host, username, password, cookieId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo cookie do hotspot ID: ${cookieId}`);
            
            const result = await conn.write('/ip/hotspot/cookie/remove', [`=.id=${cookieId}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Cookie removido com sucesso ID: ${cookieId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover cookie:`, error.message);
            throw error;
        }
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getHotspotStats(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Coletando estatísticas do hotspot para ${host}`);
            
            const users = await this.listUsers(host, username, password, port);
            const activeUsers = await this.listActiveUsers(host, username, password, port);
            const profiles = await this.listProfiles(host, username, password, port);
            const servers = await this.listServers(host, username, password, port);
            
            const stats = {
                total_users: users.length,
                active_users: activeUsers.length,
                total_profiles: profiles.length,
                total_servers: servers.length,
                users_by_profile: {},
                active_users_by_server: {}
            };

            // Agrupar usuários por profile
            users.forEach(user => {
                const profile = user.profile || 'default';
                stats.users_by_profile[profile] = (stats.users_by_profile[profile] || 0) + 1;
            });

            // Agrupar usuários ativos por servidor
            activeUsers.forEach(user => {
                const server = user.server || 'unknown';
                stats.active_users_by_server[server] = (stats.active_users_by_server[server] || 0) + 1;
            });
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Estatísticas coletadas com sucesso`);
            
            return stats;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            await conn.write('/system/identity/print');
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Teste de conexão bem-sucedido para ${host}:${port}`);
            
            return {
                success: true,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Teste de conexão falhou:`, error.message);
            throw error;
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        for (const [key, conn] of this.connections) {
            try {
                await conn.close();
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        
        this.connections.clear();
    }
}

module.exports = HotspotService;