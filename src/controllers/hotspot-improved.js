const HotspotImprovedService = require('../services/hotspot-improved');

class HotspotImprovedController {
    constructor() {
        this.hotspotService = new HotspotImprovedService();
    }

    /**
     * Formatar resposta de erro de forma consistente
     */
    formatErrorResponse(error, req) {
        const response = {
            success: false,
            timestamp: new Date().toISOString(),
            requestId: req.headers['x-request-id'] || `req-${Date.now()}`,
            error: {
                message: error.userMessage || error.message || 'Erro interno do servidor',
                type: error.type || 'UNKNOWN_ERROR',
                code: error.code || 'UNKNOWN'
            }
        };

        // Incluir contexto adicional se disponível
        if (error.context) {
            response.error.context = error.context;
        }

        // Incluir detalhes de operação se disponível
        if (error.operation) {
            response.error.operation = error.operation;
        }

        return response;
    }

    /**
     * Determinar código de status HTTP baseado no tipo de erro
     */
    getStatusCode(error) {
        if (error.statusCode) {
            return error.statusCode;
        }

        switch (error.type) {
            case 'AUTHENTICATION_ERROR':
                return 401;
            case 'NOT_FOUND_ERROR':
                return 404;
            case 'TIMEOUT_ERROR':
                return 408;
            case 'NETWORK_ERROR':
                return 503;
            case 'CONFIGURATION_ERROR':
                return 400;
            default:
                return 500;
        }
    }

    // ==================== USUÁRIOS ====================
    
    async listUsers(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Listando usuários para ${ip}`);
            
            const users = await this.hotspotService.listUsers(ip, username, password, port);
            
            res.json({
                success: true,
                data: users,
                count: users.length,
                timestamp: new Date().toISOString(),
                connectionStats: this.hotspotService.getConnectionStats()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao listar usuários:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    async createUser(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const userData = req.body;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Criando usuário: ${userData.name}`);
            
            const result = await this.hotspotService.createUser(ip, username, password, userData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário criado com sucesso',
                timestamp: new Date().toISOString(),
                connectionStats: this.hotspotService.getConnectionStats()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao criar usuário:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    async testConnection(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Testando conexão com ${ip}:${port}`);
            
            const result = await this.hotspotService.testConnection(ip, username, password, port);
            
            // Se o teste falhou, retornar erro específico
            if (!result.success) {
                const statusCode = result.error.code === 'AUTH_FAILED' ? 401 : 503;
                return res.status(statusCode).json({
                    success: false,
                    message: 'Teste de conexão falhou',
                    error: result.error,
                    timestamp: new Date().toISOString()
                });
            }
            
            res.json({
                success: true,
                message: 'Conexão testada com sucesso',
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    async updateUser(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            const userData = req.body;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Atualizando usuário ID: ${id}`);
            
            const result = await this.hotspotService.updateUser(ip, username, password, id, userData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário atualizado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao atualizar usuário:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    async deleteUser(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Removendo usuário ID: ${id}`);
            
            const result = await this.hotspotService.deleteUser(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao remover usuário:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    async getUserById(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Buscando usuário ID: ${id}`);
            
            const user = await this.hotspotService.getUserById(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: user,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao buscar usuário:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    // ==================== USUÁRIOS ATIVOS ====================
    
    async listActiveUsers(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Listando usuários ativos para ${ip}`);
            
            const activeUsers = await this.hotspotService.listActiveUsers(ip, username, password, port);
            
            res.json({
                success: true,
                data: activeUsers,
                count: activeUsers.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao listar usuários ativos:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    async disconnectUser(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Desconectando usuário ativo ID: ${id}`);
            
            const result = await this.hotspotService.disconnectActiveUser(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Usuário desconectado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao desconectar usuário:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    // ==================== PROFILES ====================
    
    async listProfiles(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Listando perfis para ${ip}`);
            
            const profiles = await this.hotspotService.listProfiles(ip, username, password, port);
            
            res.json({
                success: true,
                data: profiles,
                count: profiles.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao listar perfis:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getStats(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Coletando estatísticas para ${ip}`);
            
            const stats = await this.hotspotService.getStats(ip, username, password, port);
            
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    // ==================== GESTÃO DE CONEXÕES ====================
    
    async getConnectionStats(req, res) {
        try {
            const stats = this.hotspotService.getConnectionStats();
            
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao obter estatísticas de conexão:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }

    async closeAllConnections(req, res) {
        try {
            await this.hotspotService.closeAllConnections();
            
            res.json({
                success: true,
                message: 'Todas as conexões foram fechadas',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[HOTSPOT-IMPROVED-CONTROLLER] [${new Date().toISOString()}] Erro ao fechar conexões:`, error.message);
            
            const statusCode = this.getStatusCode(error);
            const errorResponse = this.formatErrorResponse(error, req);
            
            res.status(statusCode).json(errorResponse);
        }
    }
}

module.exports = HotspotImprovedController; 