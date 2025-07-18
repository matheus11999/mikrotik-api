const { RouterOSAPI } = require('node-routeros');

/**
 * Converte session_timeout para minutos (para comentários)
 * @param sessionTimeout Session timeout em formato MikroTik (ex: "1h", "30m", "3600")
 * @returns Duração em minutos (ex: "60 minutos", "30 minutos")
 */
function formatSessionTimeoutInMinutes(sessionTimeout) {
    if (!sessionTimeout) return 'Sem limite';
    
    const timeout = sessionTimeout.toString().toLowerCase().trim();
    
    if (timeout.endsWith('h')) {
        const hours = parseInt(timeout.replace('h', ''));
        const minutes = hours * 60;
        return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
    } else if (timeout.endsWith('m')) {
        const minutes = parseInt(timeout.replace('m', ''));
        return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
    } else if (timeout.includes(':')) {
        // Formato HH:MM:SS
        const parts = timeout.split(':');
        const hours = parseInt(parts[0]) || 0;
        const mins = parseInt(parts[1]) || 0;
        const totalMinutes = (hours * 60) + mins;
        
        return totalMinutes === 1 ? '1 minuto' : `${totalMinutes} minutos`;
    } else {
        // Formato em segundos
        const seconds = parseInt(timeout);
        if (!isNaN(seconds)) {
            const minutes = Math.floor(seconds / 60);
            
            if (minutes >= 1) {
                return minutes === 1 ? '1 minuto' : `${minutes} minutos`;
            } else {
                return `${seconds} segundos`;
            }
        }
    }
    
    return 'Sem limite';
}

class IpBindingService {
    constructor() {
        this.connections = new Map();
    }

    async createConnection(host, username, password, port = 8728) {
        const connectionKey = `${host}:${port}`;
        
        try {
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Tentando conectar ao MikroTik: ${host}:${port} com usuário: ${username}`);
            
            if (this.connections.has(connectionKey)) {
                const existingConn = this.connections.get(connectionKey);
                try {
                    await existingConn.write('/system/identity/print');
                    console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Reutilizando conexão existente para ${host}:${port}`);
                    return existingConn;
                } catch (error) {
                    console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Conexão existente inválida, removendo da cache: ${host}:${port}`);
                    this.connections.delete(connectionKey);
                }
            }

            const conn = new RouterOSAPI({
                host: host,
                user: username,
                password: password,
                port: port,
                timeout: 5000 // 5s timeout
            });

            await conn.connect();
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Conectado com sucesso ao MikroTik: ${host}:${port}`);
            
            this.connections.set(connectionKey, conn);
            return conn;
            
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Falha na conexão com ${host}:${port}:`, error.message);
            throw new Error(`Falha na conexão: ${error.message}`);
        }
    }

    // ==================== IP BINDING ====================

    async listIpBindings(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Listando IP bindings para ${host}`);
            
            const bindings = await conn.write('/ip/hotspot/ip-binding/print');
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Encontrados ${bindings.length} IP bindings`);
            
            return bindings;
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao listar IP bindings:`, error.message);
            throw error;
        }
    }

    async createIpBinding(host, username, password, bindingData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Criando IP binding para MAC: ${bindingData.macAddress}`);
            
            // Usar 'all' como servidor padrão para IP binding
            let serverName = bindingData.server || 'all';
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Usando servidor: ${serverName}`);

            const params = [
                `=mac-address=${bindingData.macAddress}`,
                `=type=${bindingData.type || 'bypassed'}`,
                `=server=${serverName}`
            ];

            // Campos opcionais
            if (bindingData.address) params.push(`=address=${bindingData.address}`);
            if (bindingData.comment) params.push(`=comment=${bindingData.comment}`);
            if (bindingData.disabled !== undefined) params.push(`=disabled=${bindingData.disabled}`);
            if (bindingData.to_address) params.push(`=to-address=${bindingData.to_address}`);
            if (bindingData.to_port) params.push(`=to-port=${bindingData.to_port}`);
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Parâmetros do IP binding:`, params);
            
            const result = await conn.write('/ip/hotspot/ip-binding/add', params);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] IP binding criado com sucesso para MAC: ${bindingData.macAddress}`);
            
            return result;
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao criar IP binding:`, error.message);
            throw error;
        }
    }

    async updateIpBinding(host, username, password, bindingId, bindingData, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Atualizando IP binding ID: ${bindingId}`);
            
            const params = [`=.id=${bindingId}`];
            
            // Campos básicos
            if (bindingData.macAddress) params.push(`=mac-address=${bindingData.macAddress}`);
            if (bindingData.type) params.push(`=type=${bindingData.type}`);
            if (bindingData.server) params.push(`=server=${bindingData.server}`);
            
            // Campos opcionais
            if (bindingData.address !== undefined) params.push(`=address=${bindingData.address}`);
            if (bindingData.comment !== undefined) params.push(`=comment=${bindingData.comment}`);
            if (bindingData.disabled !== undefined) params.push(`=disabled=${bindingData.disabled}`);
            if (bindingData.to_address !== undefined) params.push(`=to-address=${bindingData.to_address}`);
            if (bindingData.to_port !== undefined) params.push(`=to-port=${bindingData.to_port}`);
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Parâmetros de atualização:`, params);
            
            const result = await conn.write('/ip/hotspot/ip-binding/set', params);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] IP binding atualizado com sucesso ID: ${bindingId}`);
            
            return result;
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao atualizar IP binding:`, error.message);
            throw error;
        }
    }

    async deleteIpBinding(host, username, password, bindingId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Removendo IP binding ID: ${bindingId}`);
            
            const result = await conn.write('/ip/hotspot/ip-binding/remove', [`=.id=${bindingId}`]);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] IP binding removido com sucesso ID: ${bindingId}`);
            
            return result;
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao remover IP binding:`, error.message);
            throw error;
        }
    }

    async getIpBindingById(host, username, password, bindingId, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Buscando IP binding ID: ${bindingId}`);
            
            const bindings = await conn.write('/ip/hotspot/ip-binding/print', [`=.id=${bindingId}`]);
            
            if (bindings.length === 0) {
                throw new Error(`IP binding com ID ${bindingId} não encontrado`);
            }
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] IP binding encontrado: ${bindings[0]['mac-address']}`);
            return bindings[0];
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao buscar IP binding:`, error.message);
            throw error;
        }
    }

    async findIpBindingByMac(host, username, password, macAddress, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Buscando IP binding por MAC: ${macAddress}`);
            
            // Normalizar MAC para comparação
            const normalizedMac = macAddress.replace(/[:-]/g, '').toLowerCase();
            
            const bindings = await conn.write('/ip/hotspot/ip-binding/print');
            
            const matchingBindings = bindings.filter(binding => {
                const bindingMac = binding['mac-address'] ? binding['mac-address'].replace(/[:-]/g, '').toLowerCase() : '';
                return bindingMac === normalizedMac;
            });
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Encontrados ${matchingBindings.length} IP bindings com MAC: ${macAddress}`);
            
            return matchingBindings;
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao buscar IP binding por MAC:`, error.message);
            throw error;
        }
    }

    async deleteIpBindingByMac(host, username, password, macAddress, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Procurando IP binding para deletar com MAC: ${macAddress}`);
            
            const matchingBindings = await this.findIpBindingByMac(host, username, password, macAddress, port);
            
            let deletedCount = 0;
            const deletedBindings = [];
            
            for (const binding of matchingBindings) {
                try {
                    await conn.write('/ip/hotspot/ip-binding/remove', [`=.id=${binding['.id']}`]);
                    deletedBindings.push(binding);
                    deletedCount++;
                    console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] IP binding deletado: ${binding['.id']} (MAC: ${binding['mac-address']})`);
                } catch (deleteError) {
                    console.warn(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao deletar IP binding ${binding['.id']}:`, deleteError.message);
                }
            }
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Deletados ${deletedCount} IP bindings para MAC: ${macAddress}`);
            
            return {
                deleted: deletedCount > 0,
                deletedCount: deletedCount,
                deletedBindings: deletedBindings,
                searchedMac: macAddress
            };
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao deletar IP binding por MAC:`, error.message);
            throw error;
        }
    }

    // ==================== PAGAMENTO APROVADO - CRIAR IP BINDING ====================

    async createIpBindingFromPayment(host, username, password, paymentData, port = 8728) {
        try {
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Criando IP binding para pagamento: ${paymentData.payment_id}`);
            
            const macAddress = paymentData.mac_address;
            const normalizedMac = macAddress.replace(/[:-]/g, '').toUpperCase();
            const formattedMac = normalizedMac.match(/.{1,2}/g).join(':');
            
            // Calcular data de expiração baseada no plano (timezone Manaus)
            const createdAt = new Date();
            createdAt.setHours(createdAt.getHours() - 4); // UTC-4 (Manaus)
            const expiresAt = new Date(createdAt);
            
            // Extrair tempo do session_timeout (formato: HH:MM:SS, duração em segundos, ou formato como "1h")
            let sessionTimeoutSeconds = 0;
            if (paymentData.plano_session_timeout) {
                const timeout = paymentData.plano_session_timeout.toString().toLowerCase();
                if (timeout.includes(':')) {
                    // Formato HH:MM:SS
                    const parts = timeout.split(':');
                    sessionTimeoutSeconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
                } else if (timeout.endsWith('h')) {
                    // Formato "1h", "2h", etc.
                    const hours = parseInt(timeout.replace('h', ''));
                    sessionTimeoutSeconds = hours * 3600;
                } else if (timeout.endsWith('m')) {
                    // Formato "30m", "45m", etc.
                    const minutes = parseInt(timeout.replace('m', ''));
                    sessionTimeoutSeconds = minutes * 60;
                } else {
                    // Formato em segundos
                    sessionTimeoutSeconds = parseInt(timeout);
                }
            }
            
            // Se não tem session timeout, assumir 1 hora como padrão
            if (sessionTimeoutSeconds === 0) {
                sessionTimeoutSeconds = 3600; // 1 hora
            }
            
            expiresAt.setSeconds(expiresAt.getSeconds() + sessionTimeoutSeconds);
            
            // Formatação do comentário com informações do pagamento
            const createdAtStr = createdAt.toISOString().replace('T', ' ').split('.')[0];
            const expiresAtStr = expiresAt.toISOString().replace('T', ' ').split('.')[0];
            const durationText = formatSessionTimeoutInMinutes(paymentData.plano_session_timeout);
            
            const comment = `PIX-${paymentData.payment_id} | Plano: ${paymentData.plano_nome} | Valor: R$ ${parseFloat(paymentData.plano_valor).toFixed(2)} | Duração: ${durationText} | Criado: ${createdAtStr} | Expira: ${expiresAtStr}`;
            
            // Verificar se já existe IP binding para este MAC
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Verificando IP bindings existentes para MAC: ${formattedMac}...`);
            const existingBindings = await this.findIpBindingByMac(host, username, password, formattedMac, port);
            
            if (existingBindings.length > 0) {
                console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Encontrados ${existingBindings.length} IP binding(s) existente(s) para MAC: ${formattedMac}`);
                existingBindings.forEach((binding, index) => {
                    console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}]   ${index + 1}. ID: ${binding['.id']} | Tipo: ${binding.type} | Comentário: ${binding.comment?.substring(0, 50) || 'N/A'}...`);
                });
                
                console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Deletando IP binding(s) existente(s)...`);
                const deleteResult = await this.deleteIpBindingByMac(host, username, password, formattedMac, port);
                
                if (deleteResult.deleted) {
                    console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] ✅ ${deleteResult.deletedCount} IP binding(s) deletado(s) com sucesso`);
                    // Aguardar um pouco para garantir que a operação foi concluída
                    await new Promise(resolve => setTimeout(resolve, 1000));
                } else {
                    console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] ⚠️ Nenhum IP binding foi deletado`);
                }
            } else {
                console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] ✅ Nenhum IP binding existente encontrado para MAC: ${formattedMac}`);
            }
            
            // Dados do IP binding
            const bindingData = {
                macAddress: formattedMac,
                type: 'bypassed', // Permitir acesso sem autenticação
                comment: comment,
                disabled: false
            };
            
            // Nota: Rate limit será aplicado via user profile no hotspot, não no IP binding
            // O IP binding apenas libera o acesso baseado no MAC address
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Criando IP binding:`, {
                mac: formattedMac,
                type: bindingData.type,
                comment: comment.substring(0, 100) + '...',
                session_timeout: sessionTimeoutSeconds + 's',
                created_at: createdAtStr,
                expires_at: expiresAtStr
            });
            
            const result = await this.createIpBinding(host, username, password, bindingData, port);
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] IP binding criado com sucesso para pagamento: ${paymentData.payment_id}`);
            
            return {
                success: true,
                mac_address: formattedMac,
                type: bindingData.type,
                comment: comment,
                created_at: createdAtStr,
                expires_at: expiresAtStr,
                session_timeout_seconds: sessionTimeoutSeconds,
                result: result
            };
            
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao criar IP binding para pagamento:`, error.message);
            throw error;
        }
    }

    // ==================== UTILITÁRIOS ====================
    
    async testConnection(host, username, password, port = 8728) {
        try {
            const conn = await this.createConnection(host, username, password, port);
            await conn.write('/system/identity/print');
            
            console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Teste de conexão bem-sucedido para ${host}:${port}`);
            
            return {
                success: true,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Teste de conexão falhou:`, error.message);
            throw error;
        }
    }

    // Fechar todas as conexões
    async closeAllConnections() {
        console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Fechando todas as conexões MikroTik (${this.connections.size} conexões)`);
        for (const [key, conn] of this.connections) {
            try {
                await conn.close();
                console.log(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Conexão fechada: ${key}`);
            } catch (error) {
                console.error(`[IP-BINDING-SERVICE] [${new Date().toISOString()}] Erro ao fechar conexão ${key}:`, error.message);
            }
        }
        this.connections.clear();
    }
}

module.exports = IpBindingService;