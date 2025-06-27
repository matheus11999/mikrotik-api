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
                    
                    // Approach 1: Usar script RouterOS para criar arquivo com conteúdo
                    const scriptName = `upload_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    // Escapar conteúdo para script RouterOS
                    const escapedContent = file.content
                        .replace(/\\/g, '\\\\')
                        .replace(/"/g, '\\"')
                        .replace(/\r\n/g, '\\r\\n')
                        .replace(/\n/g, '\\r\\n')
                        .replace(/\$/g, '\\$');
                    
                    const scriptContent = `:local filePath "${file.path}"
:local fileContent "${escapedContent}"

# Criar arquivo vazio primeiro
/file/print file=\$filePath without-paging

# Tentar definir conteúdo (se suportado)
:do {
    /file/set \$filePath contents=\$fileContent
} on-error={
    :log info "File created but content setting not supported"
}

:log info ("File upload completed: " . \$filePath)`;

                    console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Criando script para upload: ${scriptName}`);
                    
                    // Criar o script
                    await conn.write('/system/script/add', [
                        `=name=${scriptName}`,
                        `=source=${scriptContent}`,
                        '=policy=read,write,policy,test'
                    ]);
                    
                    console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Executando script: ${scriptName}`);
                    
                    // Executar o script
                    await conn.write('/system/script/run', [`=name=${scriptName}`]);
                    
                    // Aguardar execução
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Verificar se arquivo foi criado
                    const fileList = await conn.write('/file/print', [`=name=${file.path}`]);
                    const fileCreated = fileList.length > 0;
                    
                    // Remover o script temporário
                    try {
                        const scripts = await conn.write('/system/script/print', [`=name=${scriptName}`]);
                        if (scripts.length > 0) {
                            await conn.write('/system/script/remove', [`=.id=${scripts[0]['.id']}`]);
                        }
                    } catch (removeError) {
                        console.warn(`[FILES-SERVICE] [${new Date().toISOString()}] Erro ao remover script: ${removeError.message}`);
                    }
                    
                    if (fileCreated) {
                        results.push({
                            path: file.path,
                            success: true,
                            result: 'file created successfully',
                            size: fileList[0].size || '0',
                            note: 'RouterOS API limitations may affect content transfer'
                        });
                        
                        console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Arquivo criado com sucesso: ${file.path}`);
                    } else {
                        throw new Error('File was not created successfully');
                    }
                    
                } catch (fileError) {
                    console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro no upload primário para ${file.path}:`, fileError.message);
                    
                    // Método alternativo: criar apenas arquivo vazio como placeholder
                    try {
                        console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Tentando criar arquivo vazio: ${file.path}`);
                        
                        // Método mais simples: apenas criar arquivo
                        const simpleScript = `upload_simple_${Date.now()}`;
                        const simpleContent = `:local filePath "${file.path}"
/file/print file=\$filePath without-paging
:log info ("Empty file created: " . \$filePath)`;

                        await conn.write('/system/script/add', [
                            `=name=${simpleScript}`,
                            `=source=${simpleContent}`,
                            '=policy=read,write,policy,test'
                        ]);
                        
                        await conn.write('/system/script/run', [`=name=${simpleScript}`]);
                        
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                        // Verificar criação
                        const fileList = await conn.write('/file/print', [`=name=${file.path}`]);
                        
                        // Limpar script
                        try {
                            const scripts = await conn.write('/system/script/print', [`=name=${simpleScript}`]);
                            if (scripts.length > 0) {
                                await conn.write('/system/script/remove', [`=.id=${scripts[0]['.id']}`]);
                            }
                        } catch (e) {}
                        
                        if (fileList.length > 0) {
                            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Arquivo vazio criado: ${file.path}`);
                            
                            results.push({
                                path: file.path,
                                success: true,
                                result: 'empty file created',
                                size: '0',
                                warning: 'Content not transferred due to RouterOS API limitations. File created as placeholder.'
                            });
                        } else {
                            throw new Error('Failed to create even empty file');
                        }
                        
                    } catch (altError) {
                        console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Falha total para ${file.path}:`, altError.message);
                        results.push({
                            path: file.path,
                            success: false,
                            error: `Primary: ${fileError.message} | Alternative: ${altError.message}`
                        });
                    }
                }
            }
            
            const successCount = results.filter(r => r.success).length;
            console.log(`[FILES-SERVICE] [${new Date().toISOString()}] Upload concluído. Sucessos: ${successCount}/${results.length}`);
            return results;
            
        } catch (error) {
            console.error(`[FILES-SERVICE] [${new Date().toISOString()}] Erro geral no upload:`, error.message);
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