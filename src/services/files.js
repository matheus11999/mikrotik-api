const { RouterOSAPI } = require('node-routeros');

class FilesService {
    constructor() {
        this.connections = new Map();
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Tentando conectar ao MikroTik: ${host}:${port} com usuário: ${username}`);
            
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    await existingConn.write('/system/identity/print');
                    console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
                    this.connections.delete(connectionKey);
                }
            }

            const conn = new RouterOSAPI({
                host: host,
                user: username,
                password: password,
                port: port,
                timeout: 15000
            });

            await conn.connect();
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

    // ==================== GERENCIAMENTO DE ARQUIVOS ====================
    
    async listFiles(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Listando arquivos para ${host}`);
            
            const files = await conn.write('/file/print');
            
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Encontrados ${files.length} arquivos`);
            return files;
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao listar arquivos:`, error.message);
            throw error;
        }
    }

    async createDirectory(host, username, password, path, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Criando diretório: ${path}`);
            
            // O MikroTik não tem comando direto para criar diretório
            // Vamos criar um arquivo temporário no diretório para criar a estrutura
            const tempFileName = `${path}/.temp`;
            const result = await conn.write('/file/add', [
                `=name=${tempFileName}`,
                '=contents='
            ]);
            
            // Remover o arquivo temporário
            try {
                await conn.write('/file/remove', [`=numbers=${tempFileName}`]);
            } catch (removeError) {
                console.warn(`[FILES-SERVICE] [${new Date().toISOString()}] Aviso: Não foi possível remover arquivo temporário: ${removeError.message}`);
            }
            
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Diretório criado: ${path}`);
            return result;
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao criar diretório:`, error.message);
            throw error;
        }
    }

    async uploadFile(host, username, password, files, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Fazendo upload de ${files.length} arquivo(s)`);
            
            const results = [];
            
            for (const file of files) {
                try {
                    console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Fazendo upload do arquivo: ${file.path}`);
                    
                    // Criar o arquivo com conteúdo
                    const result = await conn.write('/file/add', [
                        `=name=${file.path}`,
                        `=contents=${file.content}`
                    ]);
                    
                    results.push({
                        path: file.path,
                        success: true,
                        result: result
                    });
                    
                    console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Arquivo enviado com sucesso: ${file.path}`);
                    
                } catch (fileError) {
                    console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao enviar arquivo ${file.path}:`, fileError.message);
                    results.push({
                        path: file.path,
                        success: false,
                        error: fileError.message
                    });
                }
            }
            
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Upload concluído. Sucessos: ${results.filter(r => r.success).length}/${results.length}`);
            return results;
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao fazer upload de arquivos:`, error.message);
            throw error;
        }
    }

    async deleteFile(host, username, password, fileName, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Removendo arquivo: ${fileName}`);
            
            const result = await conn.write('/file/remove', [`=numbers=${fileName}`]);
            
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Arquivo removido com sucesso: ${fileName}`);
            return result;
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao remover arquivo:`, error.message);
            throw error;
        }
    }

    async getFileContent(host, username, password, fileName, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Obtendo conteúdo do arquivo: ${fileName}`);
            
            const files = await conn.write('/file/print', [`=name=${fileName}`]);
            
            if (files.length === 0) {
                throw new Error(`Arquivo não encontrado: ${fileName}`);
            }
            
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Conteúdo do arquivo obtido: ${fileName}`);
            return files[0];
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao obter conteúdo do arquivo:`, error.message);
            throw error;
        }
    }

    // ==================== OPERAÇÕES DE TEMPLATE ====================
    
    async uploadTemplate(host, username, password, templateContent, targetPath = '/flash/mikropix/login.html', port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Fazendo upload de template para: ${targetPath}`);
            
            // Primeiro, garantir que o diretório existe
            const dirPath = targetPath.substring(0, targetPath.lastIndexOf('/'));
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Garantindo que o diretório existe: ${dirPath}`);
            
            try {
                await this.createDirectory(host, username, password, dirPath, port);
            } catch (dirError) {
                console.warn(`[FILES-SERVICE] [${new Date().toISOString()}] Aviso: Erro ao criar diretório (pode já existir): ${dirError.message}`);
            }
            
            // Fazer upload do template
            const result = await this.uploadFile(host, username, password, [
                {
                    path: targetPath,
                    content: templateContent
                }
            ], port);
            
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Template enviado com sucesso para: ${targetPath}`);
            return result[0];
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao fazer upload do template:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            const identity = await conn.write('/system/identity/print');
            
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Teste de conexão bem-sucedido para ${host}:${port}`);
            
            return {
                success: true,
                message: 'Conexão testada com sucesso',
                identity: identity[0] && identity[0].name ? identity[0].name : 'Sem nome',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Teste de conexão falhou:`, error.message);
            throw error;
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        for (const [key, conn] of this.connections) {
            try {
                await conn.close();
                console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        
        this.connections.clear();
    }
}

module.exports = FilesService;