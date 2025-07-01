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

    // ==================== USUÁRIOS HOTSPOwT ====================
    
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
                    throw new Error(`Erro ao verificar servidores hotspot: ${serverError.message}`);
                }
            }
            
            const params = [
                `=name=${userData.name}`,
                `=password=${userData.password || ''}`,
                `=profile=${userData.profile || 'default'}`,
                `=server=${serverName}`
            ];

            // Campos básicos
            if (userData.comment) params.push(`=comment=${userData.comment}`);
            if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled}`);
            if (userData.email) params.push(`=email=${userData.email}`);
            
            // Limites de tempo
            if (userData.limit_uptime) params.push(`=limit-uptime=${userData.limit_uptime}`);
            if (userData.limit_bytes_in) params.push(`=limit-bytes-in=${userData.limit_bytes_in}`);
            if (userData.limit_bytes_out) params.push(`=limit-bytes-out=${userData.limit_bytes_out}`);
            if (userData.limit_bytes_total) params.push(`=limit-bytes-total=${userData.limit_bytes_total}`);
            
            // Endereço específico
            if (userData.address) params.push(`=address=${userData.address}`);
            if (userData.mac_address) params.push(`=mac-address=${userData.mac_address}`);
            if (userData['mac-address']) params.push(`=mac-address=${userData['mac-address']}`);
            
            // Limites de conexão
            if (userData.routes) params.push(`=routes=${userData.routes}`);
            if (userData.rate_limit) params.push(`=rate-limit=${userData.rate_limit}`);
            
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
            
            // Campos básicos
            if (userData.name) params.push(`=name=${userData.name}`);
            if (userData.password !== undefined) params.push(`=password=${userData.password}`);
            if (userData.profile) params.push(`=profile=${userData.profile}`);
            if (userData.server) params.push(`=server=${userData.server}`);
            if (userData.comment !== undefined) params.push(`=comment=${userData.comment}`);
            if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled}`);
            if (userData.email !== undefined) params.push(`=email=${userData.email}`);
            
            // Limites de tempo e dados
            if (userData.limit_uptime !== undefined) params.push(`=limit-uptime=${userData.limit_uptime}`);
            if (userData.limit_bytes_in !== undefined) params.push(`=limit-bytes-in=${userData.limit_bytes_in}`);
            if (userData.limit_bytes_out !== undefined) params.push(`=limit-bytes-out=${userData.limit_bytes_out}`);
            if (userData.limit_bytes_total !== undefined) params.push(`=limit-bytes-total=${userData.limit_bytes_total}`);
            
            // Endereçamento
            if (userData.address !== undefined) params.push(`=address=${userData.address}`);
            if (userData.mac_address !== undefined) params.push(`=mac-address=${userData.mac_address}`);
            
            // Limites de velocidade e rotas
            if (userData.routes !== undefined) params.push(`=routes=${userData.routes}`);
            if (userData.rate_limit !== undefined) params.push(`=rate-limit=${userData.rate_limit}`);
            
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

    async findUserByUsername(host, username, password, searchUsername, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Buscando usuário por username: ${searchUsername}`);
            
            // Use RouterOS query to find user by name (exact match)
            // Escape special characters in username for RouterOS query
            const escapedUsername = searchUsername.replace(/[\\]/g, '\\\\');
            const users = await conn.write('/ip/hotspot/user/print', [`?name=${escapedUsername}`]);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${users.length} usuários com username: ${searchUsername}`);
            
            if (users.length > 0) {
                const user = users[0];
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário encontrado:`, {
                    id: user['.id'],
                    name: user.name,
                    profile: user.profile,
                    comment: user.comment ? user.comment.substring(0, 50) + '...' : 'N/A',
                    hasComment: !!user.comment,
                    disabled: user.disabled || 'false',
                    hasPassword: !!user.password
                });
                
                // Retornar dados completos para verificação
                return users.map(u => ({
                    ...u,
                    // Garantir que campos essenciais existam
                    name: u.name || '',
                    password: u.password || '',
                    profile: u.profile || 'default',
                    comment: u.comment || '',
                    disabled: u.disabled || 'false'
                }));
            } else {
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Nenhum usuário encontrado com username: ${searchUsername}`);
            }
            
            return users;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao buscar usuário por username:`, error.message);
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
            
            // Timeouts e limites de tempo
            if (profileData.idle_timeout) params.push(`=idle-timeout=${profileData.idle_timeout}`);
            if (profileData.keepalive_timeout) params.push(`=keepalive-timeout=${profileData.keepalive_timeout}`);
            if (profileData.status_autorefresh) params.push(`=status-autorefresh=${profileData.status_autorefresh}`);
            if (profileData.session_timeout) params.push(`=session-timeout=${profileData.session_timeout}`);
            
            // Controle de usuários e cookies
            if (profileData.shared_users) params.push(`=shared-users=${profileData.shared_users}`);
            if (profileData.add_mac_cookie !== undefined) params.push(`=add-mac-cookie=${profileData.add_mac_cookie}`);
            if (profileData.mac_cookie_timeout) params.push(`=mac-cookie-timeout=${profileData.mac_cookie_timeout}`);
            
            // Velocidade e rate limiting
            if (profileData.rate_limit) params.push(`=rate-limit=${profileData.rate_limit}`);
            if (profileData.rate_limit_min_throughput) params.push(`=rate-limit-min-throughput=${profileData.rate_limit_min_throughput}`);
            if (profileData.rate_limit_burst_limit) params.push(`=rate-limit-burst-limit=${profileData.rate_limit_burst_limit}`);
            if (profileData.rate_limit_burst_threshold) params.push(`=rate-limit-burst-threshold=${profileData.rate_limit_burst_threshold}`);
            if (profileData.rate_limit_burst_time) params.push(`=rate-limit-burst-time=${profileData.rate_limit_burst_time}`);
            
            // Endereçamento e pools
            if (profileData.address_pool) params.push(`=address-pool=${profileData.address_pool}`);
            if (profileData.address_list) params.push(`=address-list=${profileData.address_list}`);
            if (profileData.bind_to_address) params.push(`=bind-to-address=${profileData.bind_to_address}`);
            
            // Proxy e redirecionamento
            if (profileData.transparent_proxy !== undefined) params.push(`=transparent-proxy=${profileData.transparent_proxy}`);
            if (profileData.advertise !== undefined) params.push(`=advertise=${profileData.advertise}`);
            if (profileData.advertise_url) params.push(`=advertise-url=${profileData.advertise_url}`);
            if (profileData.advertise_interval) params.push(`=advertise-interval=${profileData.advertise_interval}`);
            if (profileData.advertise_timeout) params.push(`=advertise-timeout=${profileData.advertise_timeout}`);
            
            // Scripts
            if (profileData.on_login) params.push(`=on-login=${profileData.on_login}`);
            if (profileData.on_logout) params.push(`=on-logout=${profileData.on_logout}`);
            
            // Outros parâmetros
            if (profileData.parent_queue) params.push(`=parent-queue=${profileData.parent_queue}`);
            if (profileData.queue_type) params.push(`=queue-type=${profileData.queue_type}`);
            if (profileData.incoming_filter) params.push(`=incoming-filter=${profileData.incoming_filter}`);
            if (profileData.outgoing_filter) params.push(`=outgoing-filter=${profileData.outgoing_filter}`);
            if (profileData.incoming_packet_mark) params.push(`=incoming-packet-mark=${profileData.incoming_packet_mark}`);
            if (profileData.outgoing_packet_mark) params.push(`=outgoing-packet-mark=${profileData.outgoing_packet_mark}`);
            
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
            
            // Campos básicos
            if (profileData.name) params.push(`=name=${profileData.name}`);
            
            // Timeouts e limites de tempo
            if (profileData.idle_timeout !== undefined) params.push(`=idle-timeout=${profileData.idle_timeout}`);
            if (profileData.keepalive_timeout !== undefined) params.push(`=keepalive-timeout=${profileData.keepalive_timeout}`);
            if (profileData.status_autorefresh !== undefined) params.push(`=status-autorefresh=${profileData.status_autorefresh}`);
            if (profileData.session_timeout !== undefined) params.push(`=session-timeout=${profileData.session_timeout}`);
            
            // Controle de usuários e cookies
            if (profileData.shared_users !== undefined) params.push(`=shared-users=${profileData.shared_users}`);
            if (profileData.add_mac_cookie !== undefined) params.push(`=add-mac-cookie=${profileData.add_mac_cookie}`);
            if (profileData.mac_cookie_timeout !== undefined) params.push(`=mac-cookie-timeout=${profileData.mac_cookie_timeout}`);
            
            // Velocidade e rate limiting
            if (profileData.rate_limit !== undefined) params.push(`=rate-limit=${profileData.rate_limit}`);
            if (profileData.rate_limit_min_throughput !== undefined) params.push(`=rate-limit-min-throughput=${profileData.rate_limit_min_throughput}`);
            if (profileData.rate_limit_burst_limit !== undefined) params.push(`=rate-limit-burst-limit=${profileData.rate_limit_burst_limit}`);
            if (profileData.rate_limit_burst_threshold !== undefined) params.push(`=rate-limit-burst-threshold=${profileData.rate_limit_burst_threshold}`);
            if (profileData.rate_limit_burst_time !== undefined) params.push(`=rate-limit-burst-time=${profileData.rate_limit_burst_time}`);
            
            // Endereçamento e pools
            if (profileData.address_pool !== undefined) params.push(`=address-pool=${profileData.address_pool}`);
            if (profileData.address_list !== undefined) params.push(`=address-list=${profileData.address_list}`);
            if (profileData.bind_to_address !== undefined) params.push(`=bind-to-address=${profileData.bind_to_address}`);
            
            // Proxy e redirecionamento
            if (profileData.transparent_proxy !== undefined) params.push(`=transparent-proxy=${profileData.transparent_proxy}`);
            if (profileData.advertise !== undefined) params.push(`=advertise=${profileData.advertise}`);
            if (profileData.advertise_url !== undefined) params.push(`=advertise-url=${profileData.advertise_url}`);
            if (profileData.advertise_interval !== undefined) params.push(`=advertise-interval=${profileData.advertise_interval}`);
            if (profileData.advertise_timeout !== undefined) params.push(`=advertise-timeout=${profileData.advertise_timeout}`);
            
            // Scripts
            if (profileData.on_login !== undefined) params.push(`=on-login=${profileData.on_login}`);
            if (profileData.on_logout !== undefined) params.push(`=on-logout=${profileData.on_logout}`);
            
            // Outros parâmetros
            if (profileData.parent_queue !== undefined) params.push(`=parent-queue=${profileData.parent_queue}`);
            if (profileData.queue_type !== undefined) params.push(`=queue-type=${profileData.queue_type}`);
            if (profileData.incoming_filter !== undefined) params.push(`=incoming-filter=${profileData.incoming_filter}`);
            if (profileData.outgoing_filter !== undefined) params.push(`=outgoing-filter=${profileData.outgoing_filter}`);
            if (profileData.incoming_packet_mark !== undefined) params.push(`=incoming-packet-mark=${profileData.incoming_packet_mark}`);
            if (profileData.outgoing_packet_mark !== undefined) params.push(`=outgoing-packet-mark=${profileData.outgoing_packet_mark}`);
            
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

    async createServer(host, username, password, serverData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando servidor do hotspot: ${serverData.name}`);
            
            const params = [
                `=name=${serverData.name}`,
                `=interface=${serverData.interface}`
            ];

            if (serverData.address_pool) params.push(`=address-pool=${serverData.address_pool}`);
            if (serverData.profile) params.push(`=profile=${serverData.profile}`);
            if (serverData.disabled !== undefined) params.push(`=disabled=${serverData.disabled}`);
            if (serverData.addresses_per_mac) params.push(`=addresses-per-mac=${serverData.addresses_per_mac}`);
            if (serverData.idle_timeout) params.push(`=idle-timeout=${serverData.idle_timeout}`);
            if (serverData.keepalive_timeout) params.push(`=keepalive-timeout=${serverData.keepalive_timeout}`);
            if (serverData.login_timeout) params.push(`=login-timeout=${serverData.login_timeout}`);
            if (serverData.proxy_status) params.push(`=proxy-status=${serverData.proxy_status}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros do servidor:`, params);
            
            const result = await conn.write('/ip/hotspot/add', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Servidor criado com sucesso: ${serverData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao criar servidor:`, error.message);
            throw error;
        }
    }

    async updateServer(host, username, password, serverId, serverData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Atualizando servidor do hotspot ID: ${serverId}`);
            
            const params = [`=.id=${serverId}`];
            
            if (serverData.name) params.push(`=name=${serverData.name}`);
            if (serverData.interface) params.push(`=interface=${serverData.interface}`);
            if (serverData.address_pool !== undefined) params.push(`=address-pool=${serverData.address_pool}`);
            if (serverData.profile !== undefined) params.push(`=profile=${serverData.profile}`);
            if (serverData.disabled !== undefined) params.push(`=disabled=${serverData.disabled}`);
            if (serverData.addresses_per_mac !== undefined) params.push(`=addresses-per-mac=${serverData.addresses_per_mac}`);
            if (serverData.idle_timeout !== undefined) params.push(`=idle-timeout=${serverData.idle_timeout}`);
            if (serverData.keepalive_timeout !== undefined) params.push(`=keepalive-timeout=${serverData.keepalive_timeout}`);
            if (serverData.login_timeout !== undefined) params.push(`=login-timeout=${serverData.login_timeout}`);
            if (serverData.proxy_status !== undefined) params.push(`=proxy-status=${serverData.proxy_status}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params);
            
            const result = await conn.write('/ip/hotspot/set', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Servidor atualizado com sucesso ID: ${serverId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao atualizar servidor:`, error.message);
            throw error;
        }
    }

    async deleteServer(host, username, password, serverId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo servidor do hotspot ID: ${serverId}`);
            
            const result = await conn.write('/ip/hotspot/remove', [`=.id=${serverId}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Servidor removido com sucesso ID: ${serverId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover servidor:`, error.message);
            throw error;
        }
    }

    // ==================== SERVER PROFILES ====================
    
    async listServerProfiles(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando hotspot profiles para ${host}`);
            
            // Use /ip/hotspot/profile/print (comando que funciona)
            const profiles = await conn.write('/ip/hotspot/profile/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${profiles.length} hotspot profiles`);
            
            return profiles;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar hotspot profiles:`, error.message);
            throw error;
        }
    }

    async createServerProfile(host, username, password, profileData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando hotspot profile: ${profileData.name}`);
            
            const params = [`=name=${profileData.name}`];
            
            // Parâmetros baseados no comando que funciona:
            // /ip hotspot profile add name=hsprof12 html-directory=hotspot/custom login-by=http-chap,http-pap
            if (profileData.html_directory) params.push(`=html-directory=${profileData.html_directory}`);
            if (profileData.login_by) params.push(`=login-by=${profileData.login_by}`);
            
            // Parâmetros opcionais do hotspot profile
            if (profileData.idle_timeout) params.push(`=idle-timeout=${profileData.idle_timeout}`);
            if (profileData.keepalive_timeout) params.push(`=keepalive-timeout=${profileData.keepalive_timeout}`);
            if (profileData.status_autorefresh) params.push(`=status-autorefresh=${profileData.status_autorefresh}`);
            if (profileData.session_timeout) params.push(`=session-timeout=${profileData.session_timeout}`);
            if (profileData.shared_users) params.push(`=shared-users=${profileData.shared_users}`);
            if (profileData.rate_limit) params.push(`=rate-limit=${profileData.rate_limit}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros do hotspot profile:`, params);
            
            // Usar comando /ip/hotspot/profile/add
            const result = await conn.write('/ip/hotspot/profile/add', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Hotspot profile criado com sucesso: ${profileData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao criar hotspot profile:`, error.message);
            throw error;
        }
    }

    async updateServerProfile(host, username, password, profileId, profileData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Atualizando hotspot profile ID: ${profileId}`);
            
            const params = [`=.id=${profileId}`];
            
            // Parâmetros baseados no comando que funciona
            if (profileData.name) params.push(`=name=${profileData.name}`);
            if (profileData.html_directory !== undefined) params.push(`=html-directory=${profileData.html_directory}`);
            if (profileData.login_by !== undefined) params.push(`=login-by=${profileData.login_by}`);
            
            // Parâmetros opcionais do hotspot profile
            if (profileData.idle_timeout !== undefined) params.push(`=idle-timeout=${profileData.idle_timeout}`);
            if (profileData.keepalive_timeout !== undefined) params.push(`=keepalive-timeout=${profileData.keepalive_timeout}`);
            if (profileData.status_autorefresh !== undefined) params.push(`=status-autorefresh=${profileData.status_autorefresh}`);
            if (profileData.session_timeout !== undefined) params.push(`=session-timeout=${profileData.session_timeout}`);
            if (profileData.shared_users !== undefined) params.push(`=shared-users=${profileData.shared_users}`);
            if (profileData.rate_limit !== undefined) params.push(`=rate-limit=${profileData.rate_limit}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params);
            
            // Usar comando /ip/hotspot/profile/set
            const result = await conn.write('/ip/hotspot/profile/set', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Hotspot profile atualizado com sucesso ID: ${profileId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao atualizar hotspot profile:`, error.message);
            throw error;
        }
    }

    async deleteServerProfile(host, username, password, profileId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo hotspot profile ID: ${profileId}`);
            
            // Usar comando /ip/hotspot/profile/remove
            const result = await conn.write('/ip/hotspot/profile/remove', [`=.id=${profileId}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Hotspot profile removido com sucesso ID: ${profileId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover hotspot profile:`, error.message);
            throw error;
        }
    }

    // ==================== HOTSPOT SETUP ====================
    
    async hotspotSetup(host, username, password, setupData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Executando hotspot setup para ${host}`);
            
            const params = [];
            
            if (setupData.hotspot_interface) params.push(`=hotspot-interface=${setupData.hotspot_interface}`);
            if (setupData.local_address) params.push(`=local-address=${setupData.local_address}`);
            if (setupData.masquerade_network !== undefined) params.push(`=masquerade-network=${setupData.masquerade_network}`);
            if (setupData.address_pool) params.push(`=address-pool=${setupData.address_pool}`);
            if (setupData.select_certificate) params.push(`=select-certificate=${setupData.select_certificate}`);
            if (setupData.ssl_certificate) params.push(`=ssl-certificate=${setupData.ssl_certificate}`);
            if (setupData.dns_servers) params.push(`=dns-servers=${setupData.dns_servers}`);
            if (setupData.dns_name) params.push(`=dns-name=${setupData.dns_name}`);
            if (setupData.smtp_server) params.push(`=smtp-server=${setupData.smtp_server}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros do setup:`, params);
            
            const result = await conn.write('/ip/hotspot/setup', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Hotspot setup executado com sucesso`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro no hotspot setup:`, error.message);
            throw error;
        }
    }

    // ==================== GERENCIAMENTO DE ARQUIVOS ====================
    
    async listFiles(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando arquivos para ${host}`);
            
            const files = await conn.write('/file/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${files.length} arquivos`);
            
            return files;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar arquivos:`, error.message);
            throw error;
        }
    }

    async deleteFile(host, username, password, fileName, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo arquivo: ${fileName}`);
            
            const result = await conn.write('/file/remove', [`=numbers=${fileName}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Arquivo removido com sucesso: ${fileName}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover arquivo:`, error.message);
            throw error;
        }
    }

    // ==================== REINICIALIZAÇÃO ====================
    
    async rebootSystem(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Reiniciando sistema: ${host}`);
            
            const result = await conn.write('/system/reboot');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Comando de reinicialização enviado com sucesso`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao reiniciar sistema:`, error.message);
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

    // ==================== GERENCIAMENTO POR MAC ADDRESS ====================
    
    async deleteUserByMac(host, username, password, macAddress, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Procurando usuário com MAC: ${macAddress}`);
            
            // Listar todos os usuários para encontrar pelo MAC
            const users = await conn.write('/ip/hotspot/user/print');
            
            // Normalizar MAC address para comparação
            const cleanMac = macAddress.replace(/[:-]/g, '').toLowerCase();
            
            let deletedUser = null;
            let deleted = false;
            
            for (const user of users) {
                // Verificar MAC address e username
                const userMac = user['mac-address'] ? user['mac-address'].replace(/[:-]/g, '').toLowerCase() : '';
                const userName = user.name ? user.name.toLowerCase() : '';
                
                if (userMac === cleanMac || userName === cleanMac) {
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrado usuário para deletar: ${user.name} (MAC: ${user['mac-address']})`);
                    
                    // Deletar o usuário
                    await conn.write('/ip/hotspot/user/remove', [`=.id=${user['.id']}`]);
                    deletedUser = user;
                    deleted = true;
                    
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário deletado com sucesso: ${user.name}`);
                    break;
                }
            }
            
            if (!deleted) {
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Nenhum usuário encontrado com MAC: ${macAddress}`);
            }
            
            return {
                deleted: deleted,
                deletedUser: deletedUser,
                searchedMac: macAddress,
                totalUsers: users.length
            };
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao deletar usuário por MAC:`, error.message);
            throw error;
        }
    }

    async createUserDirectly(host, username, password, userData, port = 8728) {
        try {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando usuário diretamente: ${userData.name} (MAC: ${userData['mac-address'] || userData.mac_address})`);
            
            const startTime = Date.now();
            
            // Criar usuário diretamente sem buscar existentes
            const createResult = await this.createUser(host, username, password, userData, port);
            
            const duration = Date.now() - startTime;
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário criado em ${duration}ms: ${userData.name}`);
            
            return {
                success: true,
                createResult: createResult,
                duration: duration,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao criar usuário:`, error.message);
            throw error;
        }
    }

    async manageUserWithMac(host, username, password, userData, port = 8728) {
        try {
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Gerenciando usuário: ${userData.name} (MAC: ${userData['mac-address'] || userData.mac_address})`);
            
            const results = {
                deleteResult: null,
                removeHostResult: null,
                createResult: null,
                success: false
            };
            
            // 1. Primeiro tentar deletar usuário existente pelo MAC
            const macAddress = userData['mac-address'] || userData.mac_address;
            if (macAddress) {
                try {
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Tentando deletar usuário existente com MAC: ${macAddress}`);
                    results.deleteResult = await this.deleteUserByMac(host, username, password, macAddress, port);
                } catch (deleteError) {
                    console.warn(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Aviso: Não foi possível deletar usuário existente:`, deleteError.message);
                    results.deleteResult = { deleted: false, error: deleteError.message };
                }
            }
            
            // 2. Criar novo usuário
            try {
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando novo usuário: ${userData.name}`);
                results.createResult = await this.createUser(host, username, password, userData, port);
                results.success = true;
                
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário criado com sucesso: ${userData.name}`);
            } catch (createError) {
                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao criar novo usuário:`, createError.message);
                results.createResult = { success: false, error: createError.message };
                throw createError;
            }

            // 3. APÓS criação do usuário, remover host pelo MAC (conforme solicitado)
            if (macAddress && results.success) {
                try {
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo host com MAC: ${macAddress} (após criação do usuário)`);
                    results.removeHostResult = await this.removeHostByMac(host, username, password, macAddress, port);
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Host removido com sucesso: ${macAddress}`);
                } catch (hostError) {
                    console.warn(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Aviso: Não foi possível remover host:`, hostError.message);
                    results.removeHostResult = { removed: false, error: hostError.message };
                }
            }
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Usuário gerenciado com sucesso: ${userData.name}`);
            return results;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro no gerenciamento do usuário:`, error.message);
            throw error;
        }
    }

    // Remover host pelo MAC address
    async removeHostByMac(host, username, password, macAddress, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Executando comando: /ip hotspot host remove [find mac-address=${macAddress}]`);
            
            // Primeiro listar todos os hosts para encontrar os que correspondem ao MAC
            const hosts = await conn.write('/ip/hotspot/host/print');
            
            // Normalizar MAC address para comparação (remover separadores e converter para maiúsculo)
            const normalizedMac = macAddress.replace(/[:-]/g, '').toUpperCase();
            
            let removedCount = 0;
            const removedHosts = [];
            
            for (const hostItem of hosts) {
                const hostMac = hostItem['mac-address'] ? hostItem['mac-address'].replace(/[:-]/g, '').toUpperCase() : '';
                
                if (hostMac === normalizedMac) {
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrado host para remover: ${hostItem['.id']} (MAC: ${hostItem['mac-address']})`);
                    
                    // Remover o host
                    await conn.write('/ip/hotspot/host/remove', [`=.id=${hostItem['.id']}`]);
                    removedHosts.push(hostItem);
                    removedCount++;
                    
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Host removido com sucesso: ${hostItem['.id']} (MAC: ${macAddress})`);
                }
            }
            
            if (removedCount > 0) {
                return {
                    removed: true,
                    count: removedCount,
                    removedHosts: removedHosts,
                    message: `${removedCount} host(s) removido(s) com MAC ${macAddress}`
                };
            } else {
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Nenhum host encontrado com MAC: ${macAddress}`);
                return {
                    removed: false,
                    count: 0,
                    removedHosts: [],
                    message: `Nenhum host encontrado com MAC ${macAddress}`
                };
            }
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover host:`, error.message);
            throw new Error(`Erro ao remover host: ${error.message}`);
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões MikroTik (${this.connections.size} conexões)`);
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

    // ==================== CRIAÇÃO EM MASSA ====================
    
    async createBulkUsers(host, username, password, users, options = {}, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Iniciando criação em massa de ${users.length} usuários`);

            // Configurações do lote
            const batchSize = options.batchSize || 10;
            const delayBetweenBatches = options.delayBetweenBatches || 300;
            const maxRetries = options.maxRetries || 2;

            // Verificar servidores disponíveis uma vez
            let defaultServer = null;
            try {
                const servers = await conn.write('/ip/hotspot/print');
                if (servers.length > 0) {
                    defaultServer = servers[0].name;
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Servidor padrão selecionado: ${defaultServer}`);
                } else {
                    throw new Error('Nenhum servidor hotspot configurado');
                }
            } catch (serverError) {
                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao verificar servidores:`, serverError.message);
                throw new Error(`Erro ao verificar servidores hotspot: ${serverError.message}`);
            }

            const results = {
                total: users.length,
                created: 0,
                failed: 0,
                errors: [],
                successful: []
            };

            // Processar usuários em lotes
            for (let i = 0; i < users.length; i += batchSize) {
                const batch = users.slice(i, i + batchSize);
                const batchNumber = Math.floor(i / batchSize) + 1;
                const totalBatches = Math.ceil(users.length / batchSize);
                
                console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Processando lote ${batchNumber}/${totalBatches} (${batch.length} usuários)`);

                // Processar lote em paralelo com retry
                const batchPromises = batch.map(async (user, batchIndex) => {
                    const globalIndex = i + batchIndex;
                    let lastError = null;

                    // Retry logic
                    for (let retry = 0; retry <= maxRetries; retry++) {
                        try {
                            const serverName = user.server || defaultServer;
                            
                            const params = [
                                `=name=${user.name}`,
                                `=password=${user.password || ''}`,
                                `=profile=${user.profile || 'default'}`,
                                `=server=${serverName}`
                            ];

                            // Adicionar campos opcionais
                            if (user.comment) params.push(`=comment=${user.comment}`);
                            if (user.disabled !== undefined) params.push(`=disabled=${user.disabled}`);
                            if (user.email) params.push(`=email=${user.email}`);
                            if (user.address) params.push(`=address=${user.address}`);
                            if (user['mac-address']) params.push(`=mac-address=${user['mac-address']}`);
                            if (user.mac_address) params.push(`=mac-address=${user.mac_address}`);
                            if (user['rate-limit']) params.push(`=rate-limit=${user['rate-limit']}`);
                            
                            // Limites de tempo e dados
                            if (user['limit-uptime']) params.push(`=limit-uptime=${user['limit-uptime']}`);
                            if (user['limit-bytes-in']) params.push(`=limit-bytes-in=${user['limit-bytes-in']}`);
                            if (user['limit-bytes-out']) params.push(`=limit-bytes-out=${user['limit-bytes-out']}`);
                            if (user['limit-bytes-total']) params.push(`=limit-bytes-total=${user['limit-bytes-total']}`);

                            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Tentativa ${retry + 1} - Criando usuário ${globalIndex + 1}/${users.length}: ${user.name}`);

                            const result = await conn.write('/ip/hotspot/user/add', params);
                            
                            results.created++;
                            results.successful.push({
                                index: globalIndex + 1,
                                username: user.name,
                                profile: user.profile,
                                id: result && result.length > 0 ? result[0] : 'unknown'
                            });

                            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] ✅ Usuário ${globalIndex + 1}/${users.length} criado com sucesso: ${user.name}`);
                            return { success: true, user: user.name, index: globalIndex + 1 };

                        } catch (error) {
                            lastError = error;
                            
                            if (retry < maxRetries) {
                                console.warn(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] ⚠️ Tentativa ${retry + 1} falhou para usuário ${user.name}: ${error.message}. Tentando novamente...`);
                                await new Promise(resolve => setTimeout(resolve, 200 * (retry + 1))); // Delay progressivo
                            } else {
                                console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] ❌ Falha definitiva para usuário ${user.name} após ${maxRetries + 1} tentativas: ${error.message}`);
                            }
                        }
                    }

                    // Se chegou aqui, todas as tentativas falharam
                    results.failed++;
                    const errorMessage = lastError?.message || 'Erro desconhecido';
                    results.errors.push({
                        index: globalIndex + 1,
                        username: user.name,
                        error: errorMessage,
                        retries: maxRetries + 1
                    });

                    return { success: false, user: user.name, index: globalIndex + 1, error: errorMessage };
                });

                // Aguardar conclusão do lote
                await Promise.all(batchPromises);

                // Delay entre lotes (exceto no último lote)
                if (i + batchSize < users.length && delayBetweenBatches > 0) {
                    console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Aguardando ${delayBetweenBatches}ms antes do próximo lote...`);
                    await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
                }
            }

            const successRate = ((results.created / results.total) * 100).toFixed(1);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criação em massa concluída! Total: ${results.total}, Criados: ${results.created}, Falharam: ${results.failed} (${successRate}% sucesso)`);

            return {
                ...results,
                summary: {
                    total: results.total,
                    created: results.created,
                    failed: results.failed,
                    successRate: successRate + '%'
                }
            };

        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro crítico na criação em massa:`, error.message);
            throw error;
        }
    }
}

module.exports = HotspotService;