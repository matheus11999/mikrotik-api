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
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Listando server profiles do hotspot para ${host}`);
            
            const profiles = await conn.write('/ip/hotspot/profile/print');
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Encontrados ${profiles.length} server profiles`);
            
            return profiles;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao listar server profiles:`, error.message);
            throw error;
        }
    }

    async createServerProfile(host, username, password, profileData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Criando server profile do hotspot: ${profileData.name}`);
            
            const params = [`=name=${profileData.name}`];
            
            if (profileData.hotspot_address) params.push(`=hotspot-address=${profileData.hotspot_address}`);
            if (profileData.dns_name) params.push(`=dns-name=${profileData.dns_name}`);
            if (profileData.html_directory) params.push(`=html-directory=${profileData.html_directory}`);
            if (profileData.html_directory_override) params.push(`=html-directory-override=${profileData.html_directory_override}`);
            if (profileData.http_proxy) params.push(`=http-proxy=${profileData.http_proxy}`);
            if (profileData.http_cookie_lifetime) params.push(`=http-cookie-lifetime=${profileData.http_cookie_lifetime}`);
            if (profileData.login_by) params.push(`=login-by=${profileData.login_by}`);
            if (profileData.split_user_domain !== undefined) params.push(`=split-user-domain=${profileData.split_user_domain}`);
            if (profileData.use_radius !== undefined) params.push(`=use-radius=${profileData.use_radius}`);
            if (profileData.nas_port_type) params.push(`=nas-port-type=${profileData.nas_port_type}`);
            if (profileData.radius_accounting !== undefined) params.push(`=radius-accounting=${profileData.radius_accounting}`);
            if (profileData.radius_interim_update) params.push(`=radius-interim-update=${profileData.radius_interim_update}`);
            if (profileData.radius_default_domain) params.push(`=radius-default-domain=${profileData.radius_default_domain}`);
            if (profileData.radius_location_id) params.push(`=radius-location-id=${profileData.radius_location_id}`);
            if (profileData.radius_location_name) params.push(`=radius-location-name=${profileData.radius_location_name}`);
            if (profileData.radius_mac_format) params.push(`=radius-mac-format=${profileData.radius_mac_format}`);
            if (profileData.smtp_server) params.push(`=smtp-server=${profileData.smtp_server}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros do server profile:`, params);
            
            const result = await conn.write('/ip/hotspot/profile/add', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Server profile criado com sucesso: ${profileData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao criar server profile:`, error.message);
            throw error;
        }
    }

    async updateServerProfile(host, username, password, profileId, profileData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Atualizando server profile do hotspot ID: ${profileId}`);
            
            const params = [`=.id=${profileId}`];
            
            if (profileData.name) params.push(`=name=${profileData.name}`);
            if (profileData.hotspot_address !== undefined) params.push(`=hotspot-address=${profileData.hotspot_address}`);
            if (profileData.dns_name !== undefined) params.push(`=dns-name=${profileData.dns_name}`);
            if (profileData.html_directory !== undefined) params.push(`=html-directory=${profileData.html_directory}`);
            if (profileData.html_directory_override !== undefined) params.push(`=html-directory-override=${profileData.html_directory_override}`);
            if (profileData.http_proxy !== undefined) params.push(`=http-proxy=${profileData.http_proxy}`);
            if (profileData.http_cookie_lifetime !== undefined) params.push(`=http-cookie-lifetime=${profileData.http_cookie_lifetime}`);
            if (profileData.login_by !== undefined) params.push(`=login-by=${profileData.login_by}`);
            if (profileData.split_user_domain !== undefined) params.push(`=split-user-domain=${profileData.split_user_domain}`);
            if (profileData.use_radius !== undefined) params.push(`=use-radius=${profileData.use_radius}`);
            if (profileData.nas_port_type !== undefined) params.push(`=nas-port-type=${profileData.nas_port_type}`);
            if (profileData.radius_accounting !== undefined) params.push(`=radius-accounting=${profileData.radius_accounting}`);
            if (profileData.radius_interim_update !== undefined) params.push(`=radius-interim-update=${profileData.radius_interim_update}`);
            if (profileData.radius_default_domain !== undefined) params.push(`=radius-default-domain=${profileData.radius_default_domain}`);
            if (profileData.radius_location_id !== undefined) params.push(`=radius-location-id=${profileData.radius_location_id}`);
            if (profileData.radius_location_name !== undefined) params.push(`=radius-location-name=${profileData.radius_location_name}`);
            if (profileData.radius_mac_format !== undefined) params.push(`=radius-mac-format=${profileData.radius_mac_format}`);
            if (profileData.smtp_server !== undefined) params.push(`=smtp-server=${profileData.smtp_server}`);
            
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params);
            
            const result = await conn.write('/ip/hotspot/profile/set', params);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Server profile atualizado com sucesso ID: ${profileId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao atualizar server profile:`, error.message);
            throw error;
        }
    }

    async deleteServerProfile(host, username, password, profileId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Removendo server profile do hotspot ID: ${profileId}`);
            
            const result = await conn.write('/ip/hotspot/profile/remove', [`=.id=${profileId}`]);
            console.log(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Server profile removido com sucesso ID: ${profileId}`);
            
            return result;
        } catch (error) {
            console.error(`[HOTSPOT-SERVICE] [${new Date().toISOString()}] Erro ao remover server profile:`, error.message);
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