const SystemService = require('../services/system');

class SystemController {
    constructor() {
        this.systemService = new SystemService();
    }

    // ==================== INFORMAÇÕES DO SISTEMA ====================
    
    async getSystemInfo(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Coletando informações do sistema para ${ip}`);
            
            const systemInfo = await this.systemService.getSystemInfo(ip, username, password, port);
            
            res.json({
                success: true,
                data: systemInfo,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao coletar informações do sistema:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getSystemIdentity(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo identidade do sistema para ${ip}`);
            
            const identity = await this.systemService.getSystemIdentity(ip, username, password, port);
            
            res.json({
                success: true,
                data: identity,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter identidade:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async setSystemIdentity(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const { name } = req.body;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Definindo identidade do sistema: ${name}`);
            
            const result = await this.systemService.setSystemIdentity(ip, username, password, name, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Identidade definida com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao definir identidade:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getSystemResource(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo recursos do sistema para ${ip}`);
            
            const resource = await this.systemService.getSystemResource(ip, username, password, port);
            
            res.json({
                success: true,
                data: resource,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter recursos:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getSystemClock(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo relógio do sistema para ${ip}`);
            
            const clock = await this.systemService.getSystemClock(ip, username, password, port);
            
            res.json({
                success: true,
                data: clock,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter relógio:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async setSystemClock(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const clockData = req.body;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Configurando relógio do sistema`);
            
            const result = await this.systemService.setSystemClock(ip, username, password, clockData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Relógio configurado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao configurar relógio:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== LOGS DO SISTEMA ====================
    
    async getSystemLogs(req, res) {
        try {
            const { ip, username, password, port, count, topics, message } = req.query;
            
            const options = {};
            if (count) options.count = count;
            if (topics) options.topics = topics;
            if (message) options.message = message;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo logs do sistema para ${ip}`);
            
            const logs = await this.systemService.getSystemLogs(ip, username, password, options, port);
            
            res.json({
                success: true,
                data: logs,
                count: logs.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter logs:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async clearSystemLogs(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Limpando logs do sistema para ${ip}`);
            
            const result = await this.systemService.clearSystemLogs(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: `${result.cleared} logs removidos com sucesso`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao limpar logs:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== USUÁRIOS DO SISTEMA ====================
    
    async getSystemUsers(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo usuários do sistema para ${ip}`);
            
            const users = await this.systemService.getSystemUsers(ip, username, password, port);
            
            res.json({
                success: true,
                data: users,
                count: users.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter usuários:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createSystemUser(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const userData = req.body;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Criando usuário do sistema: ${userData.name}`);
            
            const result = await this.systemService.createSystemUser(ip, username, password, userData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao criar usuário:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== INTERFACES ====================
    
    async getInterfaces(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo interfaces para ${ip}`);
            
            const interfaces = await this.systemService.getInterfaces(ip, username, password, port);
            
            res.json({
                success: true,
                data: interfaces,
                count: interfaces.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter interfaces:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getInterfaceStats(req, res) {
        try {
            const { ip, username, password, port, interface: interfaceName } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo estatísticas da interface: ${interfaceName}`);
            
            const stats = await this.systemService.getInterfaceStats(ip, username, password, interfaceName, port);
            
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter estatísticas da interface:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ENDEREÇOS IP ====================
    
    async getIpAddresses(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo endereços IP para ${ip}`);
            
            const addresses = await this.systemService.getIpAddresses(ip, username, password, port);
            
            res.json({
                success: true,
                data: addresses,
                count: addresses.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter endereços IP:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ROTAS ====================
    
    async getRoutes(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo rotas para ${ip}`);
            
            const routes = await this.systemService.getRoutes(ip, username, password, port);
            
            res.json({
                success: true,
                data: routes,
                count: routes.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter rotas:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== BACKUP E RESTORE ====================
    
    async createBackup(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const { name } = req.body;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Criando backup: ${name}`);
            
            const result = await this.systemService.createBackup(ip, username, password, name, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Backup criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao criar backup:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async listBackups(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Listando backups para ${ip}`);
            
            const backups = await this.systemService.listBackups(ip, username, password, port);
            
            res.json({
                success: true,
                data: backups,
                count: backups.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao listar backups:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== REBOOT E SHUTDOWN ====================
    
    async rebootSystem(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Reiniciando sistema: ${ip}`);
            
            const result = await this.systemService.rebootSystem(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Comando de reinicialização enviado',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao reiniciar sistema:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async shutdownSystem(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Desligando sistema: ${ip}`);
            
            const result = await this.systemService.shutdownSystem(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Comando de desligamento enviado',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao desligar sistema:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ESTATÍSTICAS COMPLETAS ====================
    
    async getCompleteStats(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Coletando estatísticas completas para ${ip}`);
            
            const stats = await this.systemService.getCompleteStats(ip, username, password, port);
            
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao coletar estatísticas completas:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== TESTE DE CONEXÃO ====================
    
    async testConnection(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Testando conexão para ${ip}:${port}`);
            
            const result = await this.systemService.testConnection(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== TOOL FETCH ====================
    
    async executeToolFetch(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const { url, 'dst-path': dstPath } = req.body;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Executando tool fetch: ${url} -> ${dstPath}`);
            
            const result = await this.systemService.executeToolFetch(ip, username, password, url, dstPath, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Tool fetch executado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao executar tool fetch:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getEssentialSystemInfo(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Obtendo informações essenciais do sistema para ${ip}`);
            
            const essentialInfo = await this.systemService.getEssentialSystemInfo(ip, username, password, port);
            
            res.json({
                success: true,
                data: essentialInfo,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SYSTEM-CONTROLLER] [${new Date().toISOString()}] Erro ao obter informações essenciais:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = SystemController;