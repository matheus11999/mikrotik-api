const TemplateService = require('../services/template');

const templateService = new TemplateService();

// Helper function to validate connection parameters
const validateConnectionParams = (ip, username, password) => {
    if (!ip || !username || !password) {
        return false;
    }
    
    // Validar formato do IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
};

class TemplateController {
    
    // ==================== APLICAR TEMPLATE ====================
    
    async applyTemplate(req, res) {
        try {
            console.log(`[TEMPLATE-CONTROLLER] [${new Date().toISOString()}] Aplicando template - IP: ${req.query.ip}`);
            
            const { ip, username, password, port } = req.query;
            const { templateContent, serverProfileId } = req.body;
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            if (!templateContent) {
                return res.status(400).json({
                    success: false,
                    error: 'Conteúdo do template é obrigatório.'
                });
            }

            console.log(`[TEMPLATE-CONTROLLER] [${new Date().toISOString()}] Iniciando aplicação de template...`);
            
            const result = await templateService.applyTemplate(
                ip, 
                username, 
                password, 
                templateContent,
                serverProfileId,
                parseInt(port) || 8728
            );
            
            res.json({
                success: true,
                data: result,
                message: result.message,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[TEMPLATE-CONTROLLER] [${new Date().toISOString()}] Erro ao aplicar template:`, error.message);
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
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            const result = await templateService.testConnection(ip, username, password, parseInt(port) || 8728);
            
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[TEMPLATE-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== VERIFICAR STATUS ====================
    
    async checkStatus(req, res) {
        try {
            const { ip, username, password, port } = req.query;
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            // Verificar se o arquivo template existe
            const conn = await templateService.createConnection(ip, username, password, parseInt(port) || 8728);
            const files = await conn.write('/file/print', ['=name=/flash/mikropix/login.html']);
            
            const templateExists = files.length > 0;
            const templateSize = templateExists ? (files[0].size || '0') : '0';
            
            // Verificar server profiles que usam o template
            const serverProfiles = await conn.write('/ip/hotspot/server-profile/print');
            const templatedProfiles = serverProfiles.filter(profile => 
                profile['html-directory'] === '/flash/mikropix' && 
                profile['login-page'] === 'login.html'
            );
            
            res.json({
                success: true,
                data: {
                    templateExists,
                    templateSize,
                    templatePath: '/flash/mikropix/login.html',
                    serverProfilesUsingTemplate: templatedProfiles.length,
                    profiles: templatedProfiles.map(p => ({
                        id: p['.id'],
                        name: p.name
                    }))
                },
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[TEMPLATE-CONTROLLER] [${new Date().toISOString()}] Erro ao verificar status:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new TemplateController();