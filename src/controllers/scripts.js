const ScriptsService = require('../services/scripts');

class ScriptsController {
    constructor() {
        this.scriptsService = new ScriptsService();
    }

    // ==================== SCRIPTS ====================
    
    async listScripts(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Listando scripts para ${ip}`);
            
            const scripts = await this.scriptsService.listScripts(ip, username, password, port);
            
            res.json({
                success: true,
                data: scripts,
                count: scripts.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao listar scripts:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createScript(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const scriptData = req.body;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Criando script: ${scriptData.name}`);
            
            const result = await this.scriptsService.createScript(ip, username, password, scriptData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Script criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao criar script:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async updateScript(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            const scriptData = req.body;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Atualizando script ID: ${id}`);
            
            const result = await this.scriptsService.updateScript(ip, username, password, id, scriptData, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Script atualizado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao atualizar script:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteScript(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Removendo script ID: ${id}`);
            
            const result = await this.scriptsService.deleteScript(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Script removido com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao remover script:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getScriptById(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Buscando script ID: ${id}`);
            
            const script = await this.scriptsService.getScriptById(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: script,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao buscar script:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async runScript(req, res) {
        try {
            const { ip, username, password, port, id, name } = req.query;
            const { script } = req.body;
            
            let result;
            
            // Se há um script no body, execute diretamente (ad-hoc)
            if (script) {
                console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Executando script ad-hoc`);
                result = await this.scriptsService.runAdHocScript(ip, username, password, script, port);
            } else if (id) {
                console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Executando script ID: ${id}`);
                result = await this.scriptsService.runScript(ip, username, password, id, port);
            } else if (name) {
                console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Executando script por nome: ${name}`);
                result = await this.scriptsService.runScriptByName(ip, username, password, name, port);
            } else {
                throw new Error('ID, nome do script ou conteúdo do script é obrigatório');
            }
            
            res.json({
                success: true,
                data: result,
                message: 'Script executado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao executar script:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ENVIRONMENT ====================
    
    async getEnvironment(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Obtendo environment para ${ip}`);
            
            const environment = await this.scriptsService.getEnvironment(ip, username, password, port);
            
            res.json({
                success: true,
                data: environment,
                count: environment.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao obter environment:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async setEnvironmentVariable(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const { name, value } = req.body;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Definindo variável de ambiente: ${name}`);
            
            const result = await this.scriptsService.setEnvironmentVariable(ip, username, password, name, value, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Variável de ambiente definida com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao definir variável de ambiente:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async removeEnvironmentVariable(req, res) {
        try {
            const { ip, username, password, port, name } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Removendo variável de ambiente: ${name}`);
            
            const result = await this.scriptsService.removeEnvironmentVariable(ip, username, password, name, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Variável de ambiente removida com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao remover variável de ambiente:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== JOBS ====================
    
    async getJobs(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Obtendo jobs para ${ip}`);
            
            const jobs = await this.scriptsService.getJobs(ip, username, password, port);
            
            res.json({
                success: true,
                data: jobs,
                count: jobs.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao obter jobs:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async stopJob(req, res) {
        try {
            const { ip, username, password, port, id } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Parando job ID: ${id}`);
            
            const result = await this.scriptsService.stopJob(ip, username, password, id, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Job parado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao parar job:`, error.message);
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
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Obtendo templates de scripts`);
            
            const templates = this.scriptsService.getScriptTemplates();
            
            res.json({
                success: true,
                data: templates,
                count: Object.keys(templates).length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao obter templates:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createScriptFromTemplate(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            const { templateName, scriptName } = req.body;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Criando script do template: ${templateName}`);
            
            const result = await this.scriptsService.createScriptFromTemplate(ip, username, password, templateName, scriptName, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Script criado do template com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao criar script do template:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== ESTATÍSTICAS ====================
    
    async getScriptStats(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Coletando estatísticas de scripts para ${ip}`);
            
            const stats = await this.scriptsService.getScriptStats(ip, username, password, port);
            
            res.json({
                success: true,
                data: stats,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro ao coletar estatísticas:`, error.message);
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
            
            console.log(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Testando conexão para ${ip}:${port}`);
            
            const result = await this.scriptsService.testConnection(ip, username, password, port);
            
            res.json({
                success: true,
                data: result,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[SCRIPTS-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = ScriptsController;