const FilesService = require('../services/files');

const filesService = new FilesService();

// Helper function to validate connection parameters
const validateConnectionParams = (ip, username, password) => {
    if (!ip || !username || !password) {
        return false;
    }
    
    // Validar formato do IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipRegex.test(ip);
};

class FilesController {
    
    // ==================== LISTAR ARQUIVOS ====================
    
    async listFiles(req, res) {
        try {
            console.log(`[FILES-CONTROLLER] [${new Date().toISOString()}] Listando arquivos - IP: ${req.query.ip}`);
            
            const { ip, username, password, port } = req.query;
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            const files = await filesService.listFiles(ip, username, password, parseInt(port) || 8728);
            
            res.json({
                success: true,
                data: files,
                count: files.length,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[FILES-CONTROLLER] [${new Date().toISOString()}] Erro ao listar arquivos:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== CRIAR DIRETÓRIO ====================
    
    async createDirectory(req, res) {
        try {
            console.log(`[FILES-CONTROLLER] [${new Date().toISOString()}] Criando diretório - IP: ${req.query.ip}`);
            
            const { ip, username, password, port } = req.query;
            const { path } = req.body;
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            if (!path) {
                return res.status(400).json({
                    success: false,
                    error: 'Caminho do diretório é obrigatório.'
                });
            }

            const result = await filesService.createDirectory(ip, username, password, path, parseInt(port) || 8728);
            
            res.json({
                success: true,
                data: result,
                message: `Diretório criado: ${path}`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[FILES-CONTROLLER] [${new Date().toISOString()}] Erro ao criar diretório:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== UPLOAD DE ARQUIVOS ====================
    
    async uploadFiles(req, res) {
        try {
            console.log(`[FILES-CONTROLLER] [${new Date().toISOString()}] Upload de arquivos - IP: ${req.query.ip}`);
            
            const { ip, username, password, port } = req.query;
            const { files } = req.body;
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            if (!files || !Array.isArray(files) || files.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Lista de arquivos é obrigatória e deve conter pelo menos um arquivo.'
                });
            }

            // Validar estrutura dos arquivos
            for (const file of files) {
                if (!file.path || !file.content) {
                    return res.status(400).json({
                        success: false,
                        error: 'Cada arquivo deve ter os campos "path" e "content".'
                    });
                }
            }

            const results = await filesService.uploadFile(ip, username, password, files, parseInt(port) || 8728);
            
            const successCount = results.filter(r => r.success).length;
            const failCount = results.filter(r => !r.success).length;
            
            res.json({
                success: true,
                data: results,
                summary: {
                    total: results.length,
                    success: successCount,
                    failed: failCount
                },
                message: `Upload concluído: ${successCount} sucessos, ${failCount} falhas`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[FILES-CONTROLLER] [${new Date().toISOString()}] Erro no upload de arquivos:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== DELETAR ARQUIVO ====================
    
    async deleteFile(req, res) {
        try {
            console.log(`[FILES-CONTROLLER] [${new Date().toISOString()}] Deletando arquivo - IP: ${req.query.ip}`);
            
            const { ip, username, password, port, fileName } = req.query;
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do arquivo é obrigatório.'
                });
            }

            const result = await filesService.deleteFile(ip, username, password, fileName, parseInt(port) || 8728);
            
            res.json({
                success: true,
                data: result,
                message: `Arquivo removido: ${fileName}`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[FILES-CONTROLLER] [${new Date().toISOString()}] Erro ao deletar arquivo:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== OBTER CONTEÚDO DO ARQUIVO ====================
    
    async getFileContent(req, res) {
        try {
            console.log(`[FILES-CONTROLLER] [${new Date().toISOString()}] Obtendo conteúdo do arquivo - IP: ${req.query.ip}`);
            
            const { ip, username, password, port, fileName } = req.query;
            
            if (!validateConnectionParams(ip, username, password)) {
                return res.status(400).json({
                    success: false,
                    error: 'Parâmetros de conexão inválidos. IP, username e password são obrigatórios.'
                });
            }

            if (!fileName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do arquivo é obrigatório.'
                });
            }

            const fileContent = await filesService.getFileContent(ip, username, password, fileName, parseInt(port) || 8728);
            
            res.json({
                success: true,
                data: fileContent,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[FILES-CONTROLLER] [${new Date().toISOString()}] Erro ao obter conteúdo do arquivo:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    // ==================== UPLOAD DE TEMPLATE ====================
    
    async uploadTemplate(req, res) {
        try {
            console.log(`[FILES-CONTROLLER] [${new Date().toISOString()}] Upload de template - IP: ${req.query.ip}`);
            
            const { ip, username, password, port } = req.query;
            const { templateContent, targetPath } = req.body;
            
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

            const result = await filesService.uploadTemplate(
                ip, 
                username, 
                password, 
                templateContent, 
                targetPath || '/flash/mikropix/login.html', 
                parseInt(port) || 8728
            );
            
            res.json({
                success: true,
                data: result,
                message: `Template enviado para: ${targetPath || '/flash/mikropix/login.html'}`,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[FILES-CONTROLLER] [${new Date().toISOString()}] Erro no upload do template:`, error.message);
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

            const result = await filesService.testConnection(ip, username, password, parseInt(port) || 8728);
            
            res.json({
                success: true,
                data: result,
                timestamp: new Date().toISOString()
            });
            
        } catch (error) {
            console.error(`[FILES-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = new FilesController();