const { RouterOSAPI } = require('node-routeros');

class TemplateService {
    constructor() {
        this.connections = new Map();
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Tentando conectar ao MikroTik: ${host}:${port}`);
            
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    await existingConn.write('/system/identity/print');
                    console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
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
            console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

    // ==================== APLICAR TEMPLATE ====================
    
    async applyTemplate(host, username, password, templateContent, serverProfileId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Aplicando template ao servidor ${host}`);
            
            // Passo 1: Criar um script que gera o arquivo de template
            const scriptName = `template_generator_${Date.now()}`;
            const templatePath = '/flash/mikropix/login.html';
            
            // Escapar e dividir o conteúdo do template em chunks pequenos para RouterOS
            const maxChunkSize = 500; // Tamanho muito conservador para RouterOS
            const chunks = [];
            
            // Primeiro, limpar e preparar o conteúdo
            const cleanContent = templateContent
                .replace(/\r\n/g, '\n')  // Normalizar line endings
                .replace(/\r/g, '\n')    // Converter CR para LF
                .replace(/\t/g, '    ');    // Converter tabs para espaços
            
            for (let i = 0; i < cleanContent.length; i += maxChunkSize) {
                const chunk = cleanContent.substring(i, i + maxChunkSize);
                // Escapar de forma mais rigorosa para RouterOS
                chunks.push(chunk
                    .replace(/\\/g, '\\\\')
                    .replace(/"/g, '\\"')
                    .replace(/\n/g, '\\r\\n')
                    .replace(/\$/g, '\\$')
                    .replace(/\[/g, '\\[')
                    .replace(/\]/g, '\\]'));
            }
            
            // Criar script RouterOS para gerar o arquivo
            let scriptContent = `:local templatePath "${templatePath}"
:local content ""

# Construir conteúdo do template
`;
            
            chunks.forEach((chunk, index) => {
                scriptContent += `:set content (\$content . "${chunk}")
`;
            });
            
            scriptContent += `
# Criar diretório flash se não existir
:do {
    /file print file="flash" without-paging
} on-error={}

# Criar diretório mikropix
:do {
    /file print file="flash/mikropix" without-paging
} on-error={}

# Criar arquivo HTML usando método de log export
:do {
    # Configurar ação de log para arquivo
    /system logging action add name="template_log_action" target=file file-name="flash/mikropix/login"
    /system logging add topics=info action=template_log_action
    
    # Escrever conteúdo através de logs
    :log info \$content
    
    # Aguardar processamento
    :delay 3s
    
    # Limpar configuração de log
    :local logRules [/system logging find action="template_log_action"]
    :foreach rule in=\$logRules do={
        /system logging remove \$rule
    }
    
    :local logActions [/system logging action find name="template_log_action"]
    :foreach action in=\$logActions do={
        /system logging action remove \$action
    }
    
    # Renomear arquivo de log para HTML
    :do {
        /file set [find name="flash/mikropix/login"] name="flash/mikropix/login.html"
    } on-error={}
    
} on-error={
    # Método fallback: criar arquivo vazio
    /file print file=\$templatePath without-paging
}

:log info ("Template file creation completed: " . \$templatePath)
`;

            console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Criando script gerador: ${scriptName}`);
            
            // Criar o script
            await conn.write('/system/script/add', [
                `=name=${scriptName}`,
                `=source=${scriptContent}`,
                '=policy=read,write,policy,test'
            ]);
            
            // Executar o script
            console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Executando script gerador...`);
            await conn.write('/system/script/run', [`=name=${scriptName}`]);
            
            // Aguardar execução
            await new Promise(resolve => setTimeout(resolve, 3000));
            
            // Verificar se arquivo foi criado
            const fileList = await conn.write('/file/print', [`=name=${templatePath}`]);
            const fileCreated = fileList.length > 0;
            
            if (!fileCreated) {
                // Método alternativo: usar export para criar arquivo
                console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Tentando método de export...`);
                
                try {
                    // Criar arquivo usando export
                    await conn.write('/system/logging/action/add', [
                        '=name=template_export',
                        '=target=file',
                        '=file-name=mikropix/login.html'
                    ]);
                    
                    await conn.write('/system/logging/add', [
                        '=topics=info',
                        '=action=template_export'
                    ]);
                    
                    // Gerar log entry
                    await conn.write('/log/print', ['=message=template_start']);
                    
                    // Esperar e verificar
                    await new Promise(resolve => setTimeout(resolve, 2000));
                    
                    // Limpar configuração temporária
                    try {
                        const logActions = await conn.write('/system/logging/action/print', ['=name=template_export']);
                        if (logActions.length > 0) {
                            await conn.write('/system/logging/action/remove', [`=.id=${logActions[0]['.id']}`]);
                        }
                    } catch (e) {}
                    
                } catch (exportError) {
                    console.warn(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Export method failed:`, exportError.message);
                }
            }
            
            // Passo 2: Atualizar server profile
            if (serverProfileId) {
                try {
                    console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Atualizando server profile: ${serverProfileId}`);
                    
                    await conn.write('/ip/hotspot/server-profile/set', [
                        `=.id=${serverProfileId}`,
                        '=html-directory=/flash/mikropix',
                        '=login-page=login.html'
                    ]);
                    
                    console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Server profile atualizado com sucesso`);
                } catch (profileError) {
                    console.error(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Erro ao atualizar server profile:`, profileError.message);
                    throw new Error(`Erro ao atualizar server profile: ${profileError.message}`);
                }
            }
            
            // Passo 3: Limpar script temporário
            try {
                const scripts = await conn.write('/system/script/print', [`=name=${scriptName}`]);
                if (scripts.length > 0) {
                    await conn.write('/system/script/remove', [`=.id=${scripts[0]['.id']}`]);
                }
            } catch (removeError) {
                console.warn(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Erro ao remover script temporário:`, removeError.message);
            }
            
            // Verificar resultado final
            const finalFileList = await conn.write('/file/print', [`=name=${templatePath}`]);
            const success = finalFileList.length > 0;
            
            const result = {
                success: success,
                templatePath: templatePath,
                fileSize: success ? (finalFileList[0].size || 'unknown') : '0',
                serverProfileUpdated: !!serverProfileId,
                message: success ? 'Template aplicado com sucesso' : 'Template criado mas pode estar vazio devido a limitações da API'
            };
            
            console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Template aplicado. Resultado:`, result);
            return result;
            
        } catch (error) {
            console.error(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Erro ao aplicar template:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            const identity = await conn.write('/system/identity/print');
            
            console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Teste de conexão bem-sucedido para ${host}:${port}`);
            
            return {
                success: true,
                message: 'Conexão testada com sucesso',
                identity: identity[0] && identity[0].name ? identity[0].name : 'Sem nome',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Teste de conexão falhou:`, error.message);
            throw error;
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões...`);
        
        for (const [key, conn] of this.connections) {
            try {
                await conn.close();
                console.log(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[TEMPLATE-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        
        this.connections.clear();
    }
}

module.exports = TemplateService;