const HotspotService = require('../services/hotspot');

class HotspotController {
    constructor() {
        this.hotspotService = new HotspotService();
    }

    // ==================== USUÁRIOS ====================
    
    async listUsers(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Listando usuários para ${ip}`);
            
            const users = await this.hotspotService.listUsers(ip, username, password, port);
            
            res.json({
                success: true,
                data: users,
                count: users.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao listar usuários:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createUser(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const userData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Criando usuário: ${userData.name}`);
            
            const result = await this.hotspotService.createUser(ip, username, password, userData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao criar usuário:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateUser(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            const userData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Atualizando usuário ID: ${id}`);
            
            const result = await this.hotspotService.updateUser(ip, username, password, id, userData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário atualizado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao atualizar usuário:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteUser(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Removendo usuário ID: ${id}`);
            
            const result = await this.hotspotService.deleteUser(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao remover usuário:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getUserById(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Buscando usuário ID: ${id}`);
            
            const user = await this.hotspotService.getUserById(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: user,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao buscar usuário:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== USUÁRIOS ATIVOS ====================
    
    async listActiveUsers(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Listando usuários ativos para ${ip}`);
            
            const activeUsers = await this.hotspotService.listActiveUsers(ip, username, password, port);
            
            res.json({
                success: true,
                data: activeUsers,
                count: activeUsers.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao listar usuários ativos:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async disconnectUser(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Desconectando usuário ativo ID: ${id}`);
            
            const result = await this.hotspotService.disconnectActiveUser(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário desconectado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao desconectar usuário:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== PROFILES ====================
    
    async listProfiles(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Listando profiles para ${ip}`);
            
            const profiles = await this.hotspotService.listProfiles(ip, username, password, port);
            
            res.json({
                success: true,
                data: profiles,
                count: profiles.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao listar profiles:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createProfile(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const profileData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Criando profile: ${profileData.name}`);
            
            const result = await this.hotspotService.createProfile(ip, username, password, profileData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Profile criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao criar profile:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateProfile(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            const profileData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Atualizando profile ID: ${id}`);
            
            const result = await this.hotspotService.updateProfile(ip, username, password, id, profileData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Profile atualizado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao atualizar profile:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteProfile(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Removendo profile ID: ${id}`);
            
            const result = await this.hotspotService.deleteProfile(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Profile removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao remover profile:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== SERVIDORES ====================
    
    async listServers(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Listando servidores para ${ip}`);
            
            const servers = await this.hotspotService.listServers(ip, username, password, port);
            
            res.json({
                success: true,
                data: servers,
                count: servers.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao listar servidores:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createServer(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const serverData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Criando servidor: ${serverData.name}`);
            
            const result = await this.hotspotService.createServer(ip, username, password, serverData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Servidor criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao criar servidor:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateServer(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            const serverData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Atualizando servidor ID: ${id}`);
            
            const result = await this.hotspotService.updateServer(ip, username, password, id, serverData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Servidor atualizado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao atualizar servidor:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteServer(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Removendo servidor ID: ${id}`);
            
            const result = await this.hotspotService.deleteServer(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Servidor removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao remover servidor:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== SERVER PROFILES ====================
    
    async listServerProfiles(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Listando server profiles para ${ip}`);
            
            const profiles = await this.hotspotService.listServerProfiles(ip, username, password, port);
            
            res.json({
                success: true,
                data: profiles,
                count: profiles.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao listar server profiles:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createServerProfile(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const profileData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Criando server profile: ${profileData.name}`);
            
            const result = await this.hotspotService.createServerProfile(ip, username, password, profileData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Server profile criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao criar server profile:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateServerProfile(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            const profileData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Atualizando server profile ID: ${id}`);
            
            const result = await this.hotspotService.updateServerProfile(ip, username, password, id, profileData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Server profile atualizado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao atualizar server profile:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteServerProfile(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Removendo server profile ID: ${id}`);
            
            const result = await this.hotspotService.deleteServerProfile(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Server profile removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao remover server profile:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== HOTSPOT SETUP ====================
    
    async hotspotSetup(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const setupData = req.body;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Executando hotspot setup para ${ip}`);
            
            const result = await this.hotspotService.hotspotSetup(ip, username, password, setupData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Hotspot setup executado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro no hotspot setup:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== GERENCIAMENTO DE ARQUIVOS ====================
    
    async listFiles(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Listando arquivos para ${ip}`);
            
            const files = await this.hotspotService.listFiles(ip, username, password, port);
            
            res.json({
                success: true,
                data: files,
                count: files.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao listar arquivos:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteFile(req, res) {
        try {
            const { ip, username, password, port, filename } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Removendo arquivo: ${filename}`);
            
            const result = await this.hotspotService.deleteFile(ip, username, password, filename, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Arquivo removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao remover arquivo:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== REINICIALIZAÇÃO ====================
    
    async rebootSystem(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Reiniciando sistema: ${ip}`);
            
            const result = await this.hotspotService.rebootSystem(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Sistema reiniciado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao reiniciar sistema:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== COOKIES ====================
    
    async listCookies(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Listando cookies para ${ip}`);
            
            const cookies = await this.hotspotService.listCookies(ip, username, password, port);
            
            res.json({
                success: true,
                data: cookies,
                count: cookies.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao listar cookies:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteCookie(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Removendo cookie ID: ${id}`);
            
            const result = await this.hotspotService.deleteCookie(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Cookie removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao remover cookie:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getStats(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Coletando estatísticas para ${ip}`);
            
            const stats = await this.hotspotService.getHotspotStats(ip, username, password, port);
            
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
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
            
            console.log(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Testando conexão para ${ip}:${port}`);
            
            const result = await this.hotspotService.testConnection(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = HotspotController;