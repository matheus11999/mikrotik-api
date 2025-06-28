const { RouterOSAPI } = require('node-routeros');

class SystemService {
    constructor() {
        this.connections = new Map();
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Tentando conectar ao MikroTik: ${host}:${port} com usuário: ${username}`);
            
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    await existingConn.write('/system/identity/print');
                    console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
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
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

    // ==================== INFORMAÇÕES DO SISTEMA ====================
    
    async getSystemInfo(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Coletando informações do sistema para ${host}`);
            
            // Fetch all system information
            const identity = await conn.write('/system/identity/print');
            const resource = await conn.write('/system/resource/print');
            const clock = await conn.write('/system/clock/print');
            
            // Fetch routerboard information with proper command
            let routerboard = [];
            try {
                routerboard = await conn.write('/system/routerboard/print');
                console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Raw Routerboard data:`, JSON.stringify(routerboard, null, 2));
            } catch (rbError) {
                console.warn(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Error fetching routerboard info:`, rbError.message);
                // Try alternative command
                try {
                    routerboard = await conn.write('/system/routerboard/getall');
                    console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Raw Routerboard data (alternative):`, JSON.stringify(routerboard, null, 2));
                } catch (rbError2) {
                    console.warn(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Error fetching routerboard info (alternative):`, rbError2.message);
                }
            }

            // Process routerboard data
            let routerboardInfo = {};
            if (routerboard && routerboard.length > 0) {
                routerboardInfo = routerboard[0];
            } else {
                // Fallback to resource data
                routerboardInfo = {
                    model: resource[0]?.['board-name'],
                    'board-name': resource[0]?.['board-name'],
                    'serial-number': resource[0]?.['serial-number'],
                    'firmware-type': resource[0]?.['firmware-type']
                };
            }
            
            const systemInfo = {
                identity: identity[0] || {},
                resource: resource[0] || {},
                clock: clock[0] || {},
                routerboard: routerboardInfo,
                timestamp: new Date().toISOString()
            };
            
            // Log the final system info for debugging
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Final system info:`, JSON.stringify(systemInfo, null, 2));
            
            return systemInfo;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao coletar informações do sistema:`, error.message);
            throw error;
        }
    }

    async getSystemIdentity(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo identidade do sistema para ${host}`);
            
            const identity = await conn.write('/system/identity/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Identidade obtida: ${identity[0] && identity[0].name ? identity[0].name : 'Sem nome'}`);
            return identity[0] || {};
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter identidade:`, error.message);
            throw error;
        }
    }

    async setSystemIdentity(host, username, password, name, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Definindo identidade do sistema para: ${name}`);
            
            const result = await conn.write('/system/identity/set', [`=name=${name}`]);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Identidade definida com sucesso: ${name}`);
            return result;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao definir identidade:`, error.message);
            throw error;
        }
    }

    async getSystemResource(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo recursos do sistema para ${host}`);
            
            const resource = await conn.write('/system/resource/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Recursos obtidos com sucesso`);
            return resource[0] || {};
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter recursos:`, error.message);
            throw error;
        }
    }

    async getSystemClock(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo relógio do sistema para ${host}`);
            
            const clock = await conn.write('/system/clock/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Relógio obtido com sucesso`);
            return clock[0] || {};
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter relógio:`, error.message);
            throw error;
        }
    }

    async setSystemClock(host, username, password, clockData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Configurando relógio do sistema`);
            
            const params = [];
            if (clockData.time_zone_name) params.push(`=time-zone-name=${clockData.time_zone_name}`);
            if (clockData.time_zone_autodetect !== undefined) params.push(`=time-zone-autodetect=${clockData.time_zone_autodetect}`);
            if (clockData.gmt_offset) params.push(`=gmt-offset=${clockData.gmt_offset}`);
            if (clockData.dst_active !== undefined) params.push(`=dst-active=${clockData.dst_active}`);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Parâmetros do relógio:`, params);
            
            const result = await conn.write('/system/clock/set', params);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Relógio configurado com sucesso`);
            return result;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao configurar relógio:`, error.message);
            throw error;
        }
    }

    // ==================== LOGS DO SISTEMA ====================
    
    async getSystemLogs(host, username, password, options = {}, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo logs do sistema para ${host}`);
            
            const params = [];
            if (options.count) params.push(`=count=${options.count}`);
            if (options.topics) params.push(`=topics=${options.topics}`);
            if (options.message) params.push(`=message=${options.message}`);
            
            const logs = await conn.write('/log/print', params);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtidos ${logs.length} logs do sistema`);
            return logs;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter logs:`, error.message);
            throw error;
        }
    }

    async clearSystemLogs(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Limpando logs do sistema para ${host}`);
            
            // Primeiro, obter todos os logs
            const logs = await conn.write('/log/print');
            
            // Remover cada log individualmente
            for (const log of logs) {
                try {
                    await conn.write('/log/remove', [`=.id=${log['.id']}`]);
                } catch (error) {
                    console.warn(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao remover log ${log['.id']}:`, error.message);
                }
            }
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Logs limpos com sucesso`);
            return { cleared: logs.length };
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao limpar logs:`, error.message);
            throw error;
        }
    }

    // ==================== USUÁRIOS DO SISTEMA ====================
    
    async getSystemUsers(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo usuários do sistema para ${host}`);
            
            const users = await conn.write('/user/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtidos ${users.length} usuários do sistema`);
            return users;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter usuários:`, error.message);
            throw error;
        }
    }

    async createSystemUser(host, username, password, userData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Criando usuário do sistema: ${userData.name}`);
            
            const params = [
                `=name=${userData.name}`,
                `=group=${userData.group || 'read'}`,
                `=password=${userData.password || ''}`
            ];
            
            if (userData.address) params.push(`=address=${userData.address}`);
            if (userData.comment) params.push(`=comment=${userData.comment}`);
            if (userData.disabled !== undefined) params.push(`=disabled=${userData.disabled}`);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Parâmetros do usuário:`, params);
            
            const result = await conn.write('/user/add', params);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Usuário criado com sucesso: ${userData.name}`);
            return result;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao criar usuário:`, error.message);
            throw error;
        }
    }

    // ==================== INTERFACES ====================
    
    async getInterfaces(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo interfaces para ${host}`);
            
            const interfaces = await conn.write('/interface/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtidas ${interfaces.length} interfaces`);
            return interfaces;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter interfaces:`, error.message);
            throw error;
        }
    }

    async getInterfaceStats(host, username, password, interfaceName, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo estatísticas da interface: ${interfaceName}`);
            
            const stats = await conn.write('/interface/monitor-traffic', [
                `=interface=${interfaceName}`,
                '=once=',
                '=duration=1'
            ]);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Estatísticas obtidas para interface: ${interfaceName}`);
            return stats[0] || {};
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter estatísticas da interface:`, error.message);
            throw error;
        }
    }

    // ==================== ENDEREÇOS IP ====================
    
    async getIpAddresses(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo endereços IP para ${host}`);
            
            const addresses = await conn.write('/ip/address/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtidos ${addresses.length} endereços IP`);
            return addresses;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter endereços IP:`, error.message);
            throw error;
        }
    }

    // ==================== ROTAS ====================
    
    async getRoutes(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtendo rotas para ${host}`);
            
            const routes = await conn.write('/ip/route/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Obtidas ${routes.length} rotas`);
            return routes;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao obter rotas:`, error.message);
            throw error;
        }
    }

    // ==================== BACKUP E RESTORE ====================
    
    async createBackup(host, username, password, backupName, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Criando backup: ${backupName}`);
            
            const params = [];
            if (backupName) params.push(`=name=${backupName}`);
            
            const result = await conn.write('/system/backup/save', params);
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Backup criado com sucesso: ${backupName}`);
            return result;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao criar backup:`, error.message);
            throw error;
        }
    }

    async listBackups(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Listando backups para ${host}`);
            
            const files = await conn.write('/file/print');
            const backups = files.filter(file => file.name && file.name.endsWith('.backup'));
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Encontrados ${backups.length} backups`);
            return backups;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao listar backups:`, error.message);
            throw error;
        }
    }

    // ==================== REBOOT E SHUTDOWN ====================
    
    async rebootSystem(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Reiniciando sistema: ${host}`);
            
            const result = await conn.write('/system/reboot');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Comando de reinicialização enviado`);
            return result;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao reiniciar sistema:`, error.message);
            throw error;
        }
    }

    async shutdownSystem(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Desligando sistema: ${host}`);
            
            const result = await conn.write('/system/shutdown');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Comando de desligamento enviado`);
            return result;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao desligar sistema:`, error.message);
            throw error;
        }
    }

    // ==================== ESTATÍSTICAS COMPLETAS ====================
    
    async getCompleteStats(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Coletando estatísticas completas para ${host}`);
            
            const systemInfo = await this.getSystemInfo(host, username, password, port);
            const interfaces = await this.getInterfaces(host, username, password, port);
            const ipAddresses = await this.getIpAddresses(host, username, password, port);
            const routes = await this.getRoutes(host, username, password, port);
            const users = await this.getSystemUsers(host, username, password, port);
            
            const completeStats = {
                system: systemInfo,
                interfaces: interfaces,
                ip_addresses: ipAddresses,
                routes: routes,
                users: users,
                summary: {
                    total_interfaces: interfaces.length,
                    total_ip_addresses: ipAddresses.length,
                    total_routes: routes.length,
                    total_users: users.length
                },
                timestamp: new Date().toISOString()
            };
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Estatísticas completas coletadas com sucesso`);
            return completeStats;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao coletar estatísticas completas:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            const identity = await conn.write('/system/identity/print');
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Teste de conexão bem-sucedido para ${host}:${port}`);
            
            return {
                success: true,
                message: 'Conexão testada com sucesso',
                identity: identity[0] && identity[0].name ? identity[0].name : 'Sem nome',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Teste de conexão falhou:`, error.message);
            throw error;
        }
    }

    // ==================== TOOL FETCH ====================
    
    async executeToolFetch(host, username, password, url, dstPath, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Executando tool fetch: ${url} -> ${dstPath}`);
            
            const params = [
                `=url=${url}`,
                `=dst-path=${dstPath}`
            ];
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Parâmetros do fetch:`, params);
            
            const result = await conn.write('/tool/fetch', params);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Tool fetch executado com sucesso`);
            
            return result;
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao executar tool fetch:`, error.message);
            throw error;
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        for (const [key, conn] of this.connections) {
            try {
                await conn.close();
                console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        
        this.connections.clear();
    }

    async getEssentialSystemInfo(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Coletando informações essenciais do sistema para ${host}`);
            
            // Fetch only essential information
            const resource = await conn.write('/system/resource/print');
            console.log('[SYSTEM-SERVICE] Raw resource data:', JSON.stringify(resource, null, 2));
            
            // Process and return only needed data
            const essentialData = {
                resource: {
                    'board-name': resource[0]?.['board-name'] || 'N/A',
                    'cpu-load': resource[0]?.['cpu-load'] || '0',
                    'free-memory': resource[0]?.['free-memory'] || '0',
                    'total-memory': resource[0]?.['total-memory'] || '0',
                    cpu: resource[0]?.cpu || 'N/A',
                    'cpu-frequency': resource[0]?.['cpu-frequency'] || 'N/A',
                    uptime: resource[0]?.uptime || 'N/A'
                }
            };
            
            console.log('[SYSTEM-SERVICE] Processed essential data:', JSON.stringify(essentialData, null, 2));
            return essentialData;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao coletar informações essenciais:`, error.message);
            throw error;
        }
    }
}

module.exports = SystemService;