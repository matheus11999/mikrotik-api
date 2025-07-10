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
                timeout: 5000 // timeout reduzido para 5 s
            });

            await conn.connect();
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            const msg = error.message.toLowerCase();
            let friendly = 'Falha na conexão';
            if (msg.includes('authentication') || msg.includes('login failed') || msg.includes('invalid user') || msg.includes('bad user') || msg.includes('access denied')) {
                friendly = 'Usuário ou senha incorretos';
            } else if (msg.includes('timeout') || msg.includes('econnrefused') || msg.includes('connection refused') || msg.includes('host unreachable')) {
                friendly = 'Dispositivo offline ou IP/porta inacessível';
            }

            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            const enhancedError = new Error(friendly);
            enhancedError.original = error;
            throw enhancedError;
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
            
            // Verificar se o destino está em uma subpasta e criar estrutura de diretórios
            if (dstPath.includes('/')) {
                const pathParts = dstPath.split('/');
                const directories = pathParts.slice(0, -1); // Remove o nome do arquivo
                
                console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Criando estrutura de diretórios: ${directories.join('/')}`);
                
                // Criar cada nível de diretório
                let currentPath = '';
                for (const dir of directories) {
                    currentPath = currentPath ? `${currentPath}/${dir}` : dir;
                    
                    try {
                        // Tentar criar o diretório
                        await conn.write('/file/print', [`=file=${currentPath}`, '=.proplist=name']);
                        console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Verificando diretório: ${currentPath}`);
                    } catch (error) {
                        console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Diretório ${currentPath} pode não existir, mas será criado automaticamente pelo fetch`);
                    }
                }
            }
            
            const params = [
                `=url=${url}`,
                `=dst-path=${dstPath}`
            ];
            
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Parâmetros do fetch:`, params);
            
            const result = await conn.write('/tool/fetch', params);
            console.log(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Tool fetch executado com sucesso para ${dstPath}`);
            
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
            
            // Fetch resource, identity and routerboard information
            const [resource, identity, routerboard] = await Promise.all([
                conn.write('/system/resource/print'),
                conn.write('/system/identity/print'),
                conn.write('/system/routerboard/print')
            ]);

            // Log raw data from RouterOS
            console.log('\n=== DADOS BRUTOS DO ROUTEROS ===');
            console.log('\n[SYSTEM RESOURCE]:', JSON.stringify(resource[0], null, 2));
            console.log('\n[SYSTEM IDENTITY]:', JSON.stringify(identity[0], null, 2));
            console.log('\n[SYSTEM ROUTERBOARD]:', JSON.stringify(routerboard[0], null, 2));
            
            // Get the raw values for logging
            const boardName = resource[0]?.['board-name'] || 'N/A';
            const deviceName = identity[0]?.name || 'N/A';
            const cpuModel = resource[0]?.cpu || 'N/A';
            const cpuFreq = resource[0]?.['cpu-frequency'] || '0';
            const cpuLoad = resource[0]?.['cpu-load'] || '0';
            const freeMemory = resource[0]?.['free-memory'] || '0';
            const totalMemory = resource[0]?.['total-memory'] || '0';
            const uptime = resource[0]?.uptime || 'N/A';
            const version = resource[0]?.version || 'N/A';
            const buildTime = resource[0]?.['build-time'] || 'N/A';
            const architecture = resource[0]?.['architecture-name'] || 'N/A';
            const platform = resource[0]?.platform || 'N/A';
            const cpuCount = resource[0]?.['cpu-count'] || '1';
            const freeHddSpace = resource[0]?.['free-hdd-space'] || '0';
            const totalHddSpace = resource[0]?.['total-hdd-space'] || '0';
            const badBlocks = resource[0]?.['bad-blocks'] || '0';

            // Get routerboard specific information
            const isRouterboard = routerboard[0]?.routerboard || 'no';
            const rbModel = routerboard[0]?.model || 'N/A';
            const serialNumber = routerboard[0]?.['serial-number'] || 'N/A';
            const firmwareType = routerboard[0]?.['firmware-type'] || 'N/A';
            const factoryFirmware = routerboard[0]?.['factory-firmware'] || 'N/A';
            const currentFirmware = routerboard[0]?.['current-firmware'] || 'N/A';
            const upgradeFirmware = routerboard[0]?.['upgrade-firmware'] || 'N/A';

            // Log processed data
            console.log('\n=== DADOS PROCESSADOS ===');
            console.log({
                dispositivo: {
                    modelo: boardName,
                    nome: deviceName,
                    plataforma: platform,
                    arquitetura: architecture,
                    versaoRouterOS: version,
                    buildTime: buildTime
                },
                routerboard: {
                    ativo: isRouterboard === 'yes' ? 'Sim' : 'Não',
                    modelo: rbModel,
                    numeroSerie: serialNumber,
                    tipoFirmware: firmwareType,
                    firmwareOriginal: factoryFirmware,
                    firmwareAtual: currentFirmware,
                    firmwareDisponivel: upgradeFirmware
                },
                processador: {
                    modelo: cpuModel,
                    frequencia: `${cpuFreq}`,
                    nucleos: cpuCount,
                    uso: `${cpuLoad}%`
                },
                memoria: {
                    livre: `${(parseInt(freeMemory) / (1024*1024)).toFixed(1)}MB`,
                    total: `${(parseInt(totalMemory) / (1024*1024)).toFixed(1)}MB`,
                    porcentagemUso: `${((1 - (parseInt(freeMemory) / parseInt(totalMemory))) * 100).toFixed(1)}%`
                },
                armazenamento: {
                    livre: `${(parseInt(freeHddSpace) / (1024*1024)).toFixed(1)}MB`,
                    total: `${(parseInt(totalHddSpace) / (1024*1024)).toFixed(1)}MB`,
                    badBlocks: `${badBlocks}%`
                },
                uptime: uptime
            });
            
            // Return the essential data
            const essentialData = {
                resource: {
                    'board-name': boardName,
                    'cpu-load': cpuLoad,
                    'free-memory': freeMemory,
                    'total-memory': totalMemory,
                    cpu: cpuModel,
                    'cpu-frequency': `${cpuFreq}`,
                    uptime,
                    version,
                    'build-time': buildTime,
                    'architecture-name': architecture,
                    platform,
                    'cpu-count': cpuCount,
                    'free-hdd-space': freeHddSpace,
                    'total-hdd-space': totalHddSpace,
                    'bad-blocks': badBlocks
                },
                identity: {
                    name: deviceName
                },
                routerboard: {
                    routerboard: isRouterboard,
                    model: rbModel,
                    'serial-number': serialNumber,
                    'firmware-type': firmwareType,
                    'factory-firmware': factoryFirmware,
                    'current-firmware': currentFirmware,
                    'upgrade-firmware': upgradeFirmware
                }
            };
            
            return essentialData;
            
        } catch (error) {
            console.error(`[SYSTEM-SERVICE] [${new Date().toISOString()}] Erro ao coletar informações essenciais:`, error.message);
            throw error;
        }
    }
}

module.exports = SystemService;