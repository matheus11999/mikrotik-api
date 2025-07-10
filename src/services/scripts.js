const { RouterOSAPI } = require('node-routeros');

class ScriptsService {
    constructor() {
        this.connections = new Map();
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Tentando conectar ao MikroTik: ${host}:${port} com usuário: ${username}`);
            
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    await existingConn.write('/system/identity/print');
                    console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
                    this.connections.delete(connectionKey);
                }
            }

            const conn = new RouterOSAPI({
                host: host,
                user: username,
                password: password,
                port: port,
                timeout: 5000 // 5 segundos de timeout para autenticação rápida
            });

            await conn.connect();
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

    // ==================== SCRIPTS ====================
    
    async listScripts(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Listando scripts para ${host}`);
            
            const scripts = await conn.write('/system/script/print');
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Encontrados ${scripts.length} scripts`);
            
            return scripts;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao listar scripts:`, error.message);
            throw error;
        }
    }

    async createScript(host, username, password, scriptData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Criando script: ${scriptData.name}`);
            
            const params = [
                `=name=${scriptData.name}`,
                `=source=${scriptData.source || ''}`
            ];
            
            if (scriptData.policy) params.push(`=policy=${scriptData.policy}`);
            if (scriptData.comment) params.push(`=comment=${scriptData.comment}`);
            if (scriptData.owner) params.push(`=owner=${scriptData.owner}`);
            if (scriptData.dont_require_permissions !== undefined) params.push(`=dont-require-permissions=${scriptData.dont_require_permissions}`);
            
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Parâmetros do script:`, params.map(p => p.includes('source=') ? p.substring(0, 50) + '...' : p));
            
            const result = await conn.write('/system/script/add', params);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script criado com sucesso: ${scriptData.name}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao criar script:`, error.message);
            throw error;
        }
    }

    async updateScript(host, username, password, scriptId, scriptData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Atualizando script ID: ${scriptId}`);
            
            const params = [`=.id=${scriptId}`];
            
            if (scriptData.name) params.push(`=name=${scriptData.name}`);
            if (scriptData.source !== undefined) params.push(`=source=${scriptData.source}`);
            if (scriptData.policy !== undefined) params.push(`=policy=${scriptData.policy}`);
            if (scriptData.comment !== undefined) params.push(`=comment=${scriptData.comment}`);
            if (scriptData.owner !== undefined) params.push(`=owner=${scriptData.owner}`);
            if (scriptData.dont_require_permissions !== undefined) params.push(`=dont-require-permissions=${scriptData.dont_require_permissions}`);
            
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params.map(p => p.includes('source=') ? p.substring(0, 50) + '...' : p));
            
            const result = await conn.write('/system/script/set', params);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script atualizado com sucesso ID: ${scriptId}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao atualizar script:`, error.message);
            throw error;
        }
    }

    async deleteScript(host, username, password, scriptId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Removendo script ID: ${scriptId}`);
            
            const result = await conn.write('/system/script/remove', [`=.id=${scriptId}`]);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script removido com sucesso ID: ${scriptId}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao remover script:`, error.message);
            throw error;
        }
    }

    async getScriptById(host, username, password, scriptId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Buscando script ID: ${scriptId}`);
            
            const scripts = await conn.write('/system/script/print', [`=.id=${scriptId}`]);
            
            if (scripts.length === 0) {
                throw new Error(`Script com ID ${scriptId} não encontrado`);
            }
            
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script encontrado: ${scripts[0].name}`);
            return scripts[0];
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao buscar script:`, error.message);
            throw error;
        }
    }

    async runScript(host, username, password, scriptId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Executando script ID: ${scriptId}`);
            
            const result = await conn.write('/system/script/run', [`=.id=${scriptId}`]);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script executado com sucesso ID: ${scriptId}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao executar script:`, error.message);
            throw error;
        }
    }

    async runScriptByName(host, username, password, scriptName, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Executando script por nome: ${scriptName}`);
            
            const result = await conn.write('/system/script/run', [`=.id=${scriptName}`]);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script executado com sucesso: ${scriptName}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao executar script por nome:`, error.message);
            throw error;
        }
    }

    // ==================== ENVIRONMENT ====================
    
    async getEnvironment(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Obtendo environment para ${host}`);
            
            const environment = await conn.write('/system/script/environment/print');
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Encontradas ${environment.length} variáveis de ambiente`);
            
            return environment;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao obter environment:`, error.message);
            throw error;
        }
    }

    async setEnvironmentVariable(host, username, password, name, value, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Definindo variável de ambiente: ${name}`);
            
            const params = [
                `=name=${name}`,
                `=value=${value}`
            ];
            
            const result = await conn.write('/system/script/environment/set', params);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Variável de ambiente definida: ${name}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao definir variável de ambiente:`, error.message);
            throw error;
        }
    }

    async removeEnvironmentVariable(host, username, password, name, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Removendo variável de ambiente: ${name}`);
            
            const result = await conn.write('/system/script/environment/remove', [`=name=${name}`]);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Variável de ambiente removida: ${name}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao remover variável de ambiente:`, error.message);
            throw error;
        }
    }

    // ==================== JOB ====================
    
    async getJobs(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Obtendo jobs para ${host}`);
            
            const jobs = await conn.write('/system/script/job/print');
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Encontrados ${jobs.length} jobs`);
            
            return jobs;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao obter jobs:`, error.message);
            throw error;
        }
    }

    async stopJob(host, username, password, jobId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Parando job ID: ${jobId}`);
            
            const result = await conn.write('/system/script/job/stop', [`=.id=${jobId}`]);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Job parado com sucesso ID: ${jobId}`);
            
            return result;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao parar job:`, error.message);
            throw error;
        }
    }

    // ==================== TEMPLATES DE SCRIPTS ====================
    
    getScriptTemplates() {
        console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Obtendo templates de scripts`);
        
        return {
            basic_log: {
                name: "Basic Log Script",
                description: "Script básico para logging",
                source: `:log info "Script executado em $(date)"`
            },
            backup_script: {
                name: "Backup Script",
                description: "Script para criar backup automático",
                source: `:log info "Iniciando backup automático"
/system backup save name=("backup-" . [/system clock get date] . "-" . [/system clock get time])
:log info "Backup concluído"`
            },
            interface_monitor: {
                name: "Interface Monitor",
                description: "Script para monitorar interfaces",
                source: `:foreach interface in=[/interface find] do={
    :local interfaceName [/interface get $interface name]
    :local interfaceStatus [/interface get $interface running]
    :log info ("Interface " . $interfaceName . " está " . $interfaceStatus)
}`
            },
            user_cleanup: {
                name: "Hotspot User Cleanup",
                description: "Script para limpar usuários inativos do hotspot",
                source: `:log info "Iniciando limpeza de usuários inativos"
:foreach user in=[/ip hotspot user find] do={
    :local userName [/ip hotspot user get $user name]
    :local lastSeen [/ip hotspot user get $user bytes-in]
    :if ($lastSeen = 0) do={
        :log warning ("Usuário inativo encontrado: " . $userName)
    }
}`
            },
            system_health: {
                name: "System Health Check",
                description: "Script para verificar saúde do sistema",
                source: `:local cpuLoad [/system resource get cpu-load]
:local freeMemory [/system resource get free-memory]
:local totalMemory [/system resource get total-memory]
:local uptime [/system resource get uptime]

:log info ("CPU Load: " . $cpuLoad . "%")
:log info ("Free Memory: " . $freeMemory . " bytes")
:log info ("Total Memory: " . $totalMemory . " bytes")
:log info ("Uptime: " . $uptime)

:if ($cpuLoad > 80) do={
    :log warning "CPU Load muito alto!"
}

:if ($freeMemory < 10000000) do={
    :log warning "Memória baixa!"
}`
            },
            firewall_stats: {
                name: "Firewall Statistics",
                description: "Script para coletar estatísticas do firewall",
                source: `:log info "Coletando estatísticas do firewall"
:foreach rule in=[/ip firewall filter find] do={
    :local ruleComment [/ip firewall filter get $rule comment]
    :local ruleBytes [/ip firewall filter get $rule bytes]
    :local rulePackets [/ip firewall filter get $rule packets]
    :if ($ruleComment != "") do={
        :log info ("Regra: " . $ruleComment . " - Bytes: " . $ruleBytes . " - Packets: " . $rulePackets)
    }
}`
            }
        };
    }

    async createScriptFromTemplate(host, username, password, templateName, scriptName, port = 8728) {
        try {
            const templates = this.getScriptTemplates();
            
            if (!templates[templateName]) {
                throw new Error(`Template ${templateName} não encontrado`);
            }
            
            const template = templates[templateName];
            const scriptData = {
                name: scriptName,
                source: template.source,
                comment: template.description,
                policy: "read,write,policy,test,password,sniff,sensitive,romon"
            };
            
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Criando script do template: ${templateName}`);
            
            return await this.createScript(host, username, password, scriptData, port);
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao criar script do template:`, error.message);
            throw error;
        }
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getScriptStats(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Coletando estatísticas de scripts para ${host}`);
            
            const scripts = await this.listScripts(host, username, password, port);
            const jobs = await this.getJobs(host, username, password, port);
            const environment = await this.getEnvironment(host, username, password, port);
            
            const stats = {
                total_scripts: scripts.length,
                active_jobs: jobs.length,
                environment_variables: environment.length,
                scripts_by_owner: {},
                scripts_by_policy: {},
                jobs_by_type: {},
                timestamp: new Date().toISOString()
            };

            // Agrupar scripts por owner
            scripts.forEach(script => {
                const owner = script.owner || 'unknown';
                stats.scripts_by_owner[owner] = (stats.scripts_by_owner[owner] || 0) + 1;
            });

            // Agrupar scripts por policy
            scripts.forEach(script => {
                const policy = script.policy || 'none';
                stats.scripts_by_policy[policy] = (stats.scripts_by_policy[policy] || 0) + 1;
            });

            // Agrupar jobs por tipo
            jobs.forEach(job => {
                const type = job.type || 'unknown';
                stats.jobs_by_type[type] = (stats.jobs_by_type[type] || 0) + 1;
            });
            
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Estatísticas de scripts coletadas com sucesso`);
            
            return stats;
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            await conn.write('/system/identity/print');
            
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Teste de conexão bem-sucedido para ${host}:${port}`);
            
            return {
                success: true,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Teste de conexão falhou:`, error.message);
            throw error;
        }
    }

    // Executar script ad-hoc (temporário)
    async runAdHocScript(host, username, password, scriptContent, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Executando script ad-hoc`);
            
            // Criar script temporário
            const tempScriptName = `temp_script_${Date.now()}`;
            
            await conn.write('/system/script/add', [
                `=name=${tempScriptName}`,
                `=source=${scriptContent}`,
                '=policy=read,write,policy,test'
            ]);
            
            console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script temporário criado: ${tempScriptName}`);
            
            // Executar script usando o número ID em vez do nome
            try {
                // Buscar o script recém-criado
                const scripts = await conn.write('/system/script/print', [`=name=${tempScriptName}`]);
                if (scripts.length > 0) {
                    const scriptId = scripts[0]['.id'];
                    console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Executando script por ID: ${scriptId}`);
                    
                    // Executar script por ID
                    const result = await conn.write('/system/script/run', [`=.id=${scriptId}`]);
                    
                    // Aguardar execução
                    await new Promise(resolve => setTimeout(resolve, 3000));
                    
                    console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script executado com sucesso`);
                    
                    // Remover script temporário
                    try {
                        await conn.write('/system/script/remove', [`=.id=${scriptId}`]);
                        console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Script temporário removido: ${tempScriptName}`);
                    } catch (removeError) {
                        console.warn(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao remover script temporário:`, removeError.message);
                    }
                    
                    return result;
                } else {
                    throw new Error('Script criado mas não encontrado para execução');
                }
            } catch (runError) {
                console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao executar script:`, runError.message);
                
                // Tentar remover script mesmo se a execução falhou
                try {
                    const scripts = await conn.write('/system/script/print', [`=name=${tempScriptName}`]);
                    if (scripts.length > 0) {
                        await conn.write('/system/script/remove', [`=.id=${scripts[0]['.id']}`]);
                    }
                } catch (removeError) {
                    console.warn(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao remover script após falha:`, removeError.message);
                }
                
                throw runError;
            }
            
        } catch (error) {
            console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao executar script ad-hoc:`, error.message);
            throw error;
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        for (const [key, conn] of this.connections) {
            try {
                await conn.close();
                console.log(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[SCRIPTS-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        
        this.connections.clear();
    }
}

module.exports = ScriptsService;