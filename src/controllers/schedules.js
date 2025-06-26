const SchedulesService = require('../services/schedules');

class SchedulesController {
    constructor() {
        this.schedulesService = new SchedulesService();
    }

    // ==================== SCHEDULES ====================
    
    async listSchedules(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Listando schedules para ${ip}`);
            
            const schedules = await this.schedulesService.listSchedules(ip, username, password, port);
            
            res.json({
                success: true,
                data: schedules,
                count: schedules.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao listar schedules:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createSchedule(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const scheduleData = req.body;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Criando schedule: ${scheduleData.name}`);
            
            const result = await this.schedulesService.createSchedule(ip, username, password, scheduleData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Schedule criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao criar schedule:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateSchedule(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            const scheduleData = req.body;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Atualizando schedule ID: ${id}`);
            
            const result = await this.schedulesService.updateSchedule(ip, username, password, id, scheduleData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Schedule atualizado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao atualizar schedule:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteSchedule(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Removendo schedule ID: ${id}`);
            
            const result = await this.schedulesService.deleteSchedule(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Schedule removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao remover schedule:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getScheduleById(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Buscando schedule ID: ${id}`);
            
            const schedule = await this.schedulesService.getScheduleById(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: schedule,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao buscar schedule:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async enableSchedule(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Habilitando schedule ID: ${id}`);
            
            const result = await this.schedulesService.enableSchedule(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Schedule habilitado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao habilitar schedule:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async disableSchedule(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Desabilitando schedule ID: ${id}`);
            
            const result = await this.schedulesService.disableSchedule(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Schedule desabilitado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao desabilitar schedule:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== TEMPLATES ====================
    
    async getTemplates(req, res) {
        try {
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Obtendo templates de schedules`);
            
            const templates = this.schedulesService.getScheduleTemplates();
            
            res.json({
                success: true,
                data: templates,
                count: Object.keys(templates).length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao obter templates:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createScheduleFromTemplate(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const { templateName, scheduleName, customOptions } = req.body;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Criando schedule do template: ${templateName}`);
            
            const result = await this.schedulesService.createScheduleFromTemplate(
                ip, username, password, templateName, scheduleName, customOptions || {}, port
            );
            
            res.json({
                success: true,
                data: result,
                message: 'Schedule criado do template com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao criar schedule do template:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== UTILITÁRIOS DE TEMPO ====================
    
    async getTimeOptions(req, res) {
        try {
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Obtendo opções de tempo`);
            
            const timeOptions = this.schedulesService.generateTimeOptions();
            
            res.json({
                success: true,
                data: timeOptions,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao obter opções de tempo:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async validateTime(req, res) {
        try {
            const { time, interval } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Validando tempo/intervalo`);
            
            const result = {
                time_valid: time ? this.schedulesService.validateScheduleTime(time) : null,
                interval_valid: interval ? this.schedulesService.validateScheduleInterval(interval) : null
            };
            
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao validar tempo:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getScheduleStats(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Coletando estatísticas de schedules para ${ip}`);
            
            const stats = await this.schedulesService.getScheduleStats(ip, username, password, port);
            
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== OPERAÇÕES EM LOTE ====================
    
    async enableAllSchedules(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Habilitando todos os schedules para ${ip}`);
            
            const results = await this.schedulesService.enableAllSchedules(ip, username, password, port);
            
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            
            res.json({
                success: true,
                data: results,
                message: `${successCount} schedules habilitados, ${errorCount} erros`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro na operação em lote:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async disableAllSchedules(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Desabilitando todos os schedules para ${ip}`);
            
            const results = await this.schedulesService.disableAllSchedules(ip, username, password, port);
            
            const successCount = results.filter(r => r.success).length;
            const errorCount = results.filter(r => !r.success).length;
            
            res.json({
                success: true,
                data: results,
                message: `${successCount} schedules desabilitados, ${errorCount} erros`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro na operação em lote:`, error.message);
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
            
            console.log(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Testando conexão para ${ip}:${port}`);
            
            const result = await this.schedulesService.testConnection(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCHEDULES-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = SchedulesController;