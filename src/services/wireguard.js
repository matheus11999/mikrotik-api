const axios = require('axios');

class WireGuardService {
    constructor() {
        // Configurações do WG Easy
        this.wgEasyUrl = process.env.WG_EASY_URL || 'http://localhost:51821';
        this.wgEasyPassword = process.env.WG_EASY_PASSWORD || 'your-password';
        this.serverPublicKey = process.env.WG_SERVER_PUBLIC_KEY || 'ciFLsDGcfJLg4pxT/+lMIqUlcbeaVbqn/bxz9E+Qjy8=';
        this.serverEndpoint = process.env.WG_SERVER_ENDPOINT || '193.181.208.141';
        this.serverPort = process.env.WG_SERVER_PORT || '51820';
        this.preSharedKey = process.env.WG_PRESHARED_KEY || 'CQ/WhGbQMQjbiTT70hxZnk5eEk8N2hETxkghtv3lK8M=';
    }

    async authenticateWgEasy() {
        try {
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Autenticando no WG Easy...`);
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] URL: ${this.wgEasyUrl}`);
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Senha configurada: ${this.wgEasyPassword ? 'Sim' : 'Não'}`);
            
            const response = await axios.post(`${this.wgEasyUrl}/api/session`, {
                password: this.wgEasyPassword
            }, {
                timeout: 10000,
                validateStatus: (status) => {
                    // Aceita status 200-299 e 400 para debug
                    return (status >= 200 && status < 300) || status === 400;
                }
            });

            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Response status:`, response.status);
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Response headers:`, response.headers);

            if (response.status === 400) {
                console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Senha incorreta ou dados inválidos`);
                throw new Error(`Senha do WG Easy incorreta. Verifique a variável WG_EASY_PASSWORD (atual: ${this.wgEasyPassword})`);
            }

            if (response.headers['set-cookie']) {
                const cookies = response.headers['set-cookie'];
                const sessionCookie = cookies.find(cookie => cookie.startsWith('connect.sid='));
                if (sessionCookie) {
                    console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Autenticado no WG Easy com sucesso`);
                    return sessionCookie;
                }
            }

            throw new Error('Falha na autenticação: cookie de sessão não encontrado na resposta');
        } catch (error) {
            console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro na autenticação WG Easy:`, error.message);
            
            if (error.code === 'ECONNREFUSED') {
                throw new Error(`WG Easy não está acessível em ${this.wgEasyUrl}. Verifique se o serviço está rodando.`);
            }
            
            if (error.response?.status === 400) {
                throw new Error(`Senha incorreta para WG Easy. Senha atual: "${this.wgEasyPassword}". Verifique se está correta.`);
            }
            
            throw new Error(`Falha na autenticação WG Easy: ${error.message}`);
        }
    }

    async createWireGuardUser(clientName) {
        try {
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Criando usuário WireGuard: ${clientName}`);
            
            // Autenticar no WG Easy
            const sessionCookie = await this.authenticateWgEasy();

            // Criar cliente WireGuard
            const createResponse = await axios.post(`${this.wgEasyUrl}/api/wireguard/client`, {
                name: clientName
            }, {
                headers: {
                    'Cookie': sessionCookie,
                    'Content-Type': 'application/json'
                },
                timeout: 15000
            });

            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Cliente criado com sucesso: ${clientName}`);

            // Buscar configuração do cliente criado
            const clientsResponse = await axios.get(`${this.wgEasyUrl}/api/wireguard/client`, {
                headers: {
                    'Cookie': sessionCookie
                },
                timeout: 10000
            });

            const client = clientsResponse.data.find(c => c.name === clientName);
            if (!client) {
                throw new Error(`Cliente ${clientName} não encontrado após criação`);
            }

            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Configuração obtida para: ${clientName}, IP: ${client.address}`);

            return {
                clientName: client.name,
                clientPrivateKey: client.privateKey,
                clientPublicKey: client.publicKey,
                clientAddress: client.address,
                serverPublicKey: this.serverPublicKey,
                serverEndpoint: this.serverEndpoint,
                serverPort: this.serverPort,
                preSharedKey: this.preSharedKey,
                allowedIPs: '0.0.0.0/0,::/0',
                persistentKeepalive: '25s'
            };
        } catch (error) {
            console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro ao criar usuário WireGuard:`, error.message);
            if (error.response?.status === 409) {
                throw new Error(`Cliente ${clientName} já existe no WireGuard`);
            }
            throw new Error(`Falha na criação do usuário WireGuard: ${error.message}`);
        }
    }

    async deleteWireGuardUser(clientName) {
        try {
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Removendo usuário WireGuard: ${clientName}`);
            
            // Autenticar no WG Easy
            const sessionCookie = await this.authenticateWgEasy();

            // Buscar cliente para obter ID
            const clientsResponse = await axios.get(`${this.wgEasyUrl}/api/wireguard/client`, {
                headers: {
                    'Cookie': sessionCookie
                },
                timeout: 10000
            });

            const client = clientsResponse.data.find(c => c.name === clientName);
            if (!client) {
                console.warn(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Cliente ${clientName} não encontrado para remoção`);
                return { success: true, message: 'Cliente não encontrado (já removido)' };
            }

            // Remover cliente
            await axios.delete(`${this.wgEasyUrl}/api/wireguard/client/${client.id}`, {
                headers: {
                    'Cookie': sessionCookie
                },
                timeout: 10000
            });

            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Cliente removido com sucesso: ${clientName}`);
            return { success: true, message: 'Cliente removido com sucesso' };
        } catch (error) {
            console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro ao remover usuário WireGuard:`, error.message);
            throw new Error(`Falha na remoção do usuário WireGuard: ${error.message}`);
        }
    }

    generateMikroTikConfig(wgConfig, mikrotikId) {
        const interfaceName = `wg-${mikrotikId.substring(0, 8)}`; // Usar apenas parte do ID
        const clientIP = wgConfig.clientAddress.split('/')[0]; // Remove /32 para usar apenas o IP
        const serverIP = '10.8.0.1'; // IP do servidor no túnel WireGuard
        
        return `# Configuração WireGuard para MikroTik - ${mikrotikId}
# Gerado automaticamente em ${new Date().toLocaleString()}
# IP do túnel: ${clientIP}

# 1. Criar interface WireGuard
/interface/wireguard
add name="${interfaceName}" private-key="${wgConfig.clientPrivateKey}" listen-port=51820 comment="Interface WireGuard cliente - ${mikrotikId}"

# 2. Adicionar peer do servidor
/interface/wireguard/peers
add interface="${interfaceName}" public-key="${wgConfig.serverPublicKey}" preshared-key="${wgConfig.preSharedKey}" allowed-address="0.0.0.0/0" endpoint-address="${wgConfig.serverEndpoint}" endpoint-port="${wgConfig.serverPort}" persistent-keepalive=25 comment="Peer servidor WireGuard"

# 3. Configurar IP do túnel
/ip/address
add address="${clientIP}/24" interface="${interfaceName}" comment="IP WireGuard tunnel"

# 4. Configurar DNS
/ip/dns
set servers="1.1.1.1,8.8.8.8" allow-remote-requests=yes

# 5. Adicionar rota padrão via WireGuard (opcional - descomente se necessário)
# /ip/route
# add dst-address="0.0.0.0/0" gateway="${serverIP}" routing-table=main comment="Rota padrão via WireGuard"

# 6. Configurar firewall - INPUT
/ip/firewall/filter
add chain="input" protocol="udp" port="51820" action="accept" comment="Permitir WireGuard UDP"

# 7. Configurar firewall - FORWARD
add chain="forward" out-interface="${interfaceName}" action="accept" comment="Permitir forward para WireGuard"
add chain="forward" in-interface="${interfaceName}" action="accept" comment="Permitir forward do WireGuard"

# 8. Configurar NAT (se necessário para acesso à internet via VPN)
# /ip/firewall/nat
# add chain="srcnat" out-interface="${interfaceName}" action="masquerade" comment="NAT para WireGuard"

# 9. Configurar Mangle (para monitoramento)
/ip/firewall/mangle
add chain="prerouting" in-interface="${interfaceName}" action="mark-connection" new-connection-mark="wireguard-conn" comment="Marcar conexões WireGuard"
add chain="prerouting" connection-mark="wireguard-conn" action="mark-packet" new-packet-mark="wireguard-packet" comment="Marcar pacotes WireGuard"

# 10. Habilitar interface
/interface/wireguard
set [find name="${interfaceName}"] disabled=no

# CONFIGURAÇÃO CONCLUÍDA!
# Interface WireGuard: ${interfaceName}
# IP do cliente: ${clientIP}/24
# Status: Ativado automaticamente
# 
# Para verificar se está funcionando:
# /interface/wireguard/peers print
# /ip/address print where interface="${interfaceName}"
# /ping ${serverIP}`;
    }

    async listWireGuardClients() {
        try {
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Listando clientes WireGuard...`);
            
            const sessionCookie = await this.authenticateWgEasy();
            
            const response = await axios.get(`${this.wgEasyUrl}/api/wireguard/client`, {
                headers: {
                    'Cookie': sessionCookie
                },
                timeout: 10000
            });

            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Encontrados ${response.data.length} clientes WireGuard`);
            return response.data;
        } catch (error) {
            console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro ao listar clientes WireGuard:`, error.message);
            throw new Error(`Falha ao listar clientes WireGuard: ${error.message}`);
        }
    }

    async testConnection() {
        try {
            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Testando conexão com WG Easy...`);
            
            // Primeiro tenta uma requisição simples para verificar se o WG Easy está rodando
            try {
                const healthResponse = await axios.get(this.wgEasyUrl, {
                    timeout: 5000
                });
                console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] WG Easy está acessível na URL: ${this.wgEasyUrl}`);
            } catch (healthError) {
                console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] WG Easy não está acessível:`, healthError.message);
                throw new Error(`WG Easy não está disponível em ${this.wgEasyUrl}. Verifique se o Docker está rodando.`);
            }

            // Agora testa a autenticação
            try {
                const sessionCookie = await this.authenticateWgEasy();
                console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Autenticação com WG Easy bem-sucedida`);
                
                // Tenta listar clientes para confirmar funcionamento
                const response = await axios.get(`${this.wgEasyUrl}/api/wireguard/client`, {
                    headers: {
                        'Cookie': sessionCookie
                    },
                    timeout: 10000
                });

                console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Conexão OK, ${response.data.length} clientes encontrados`);
                return {
                    status: 'OK',
                    url: this.wgEasyUrl,
                    clientsCount: response.data.length,
                    authenticated: true
                };
            } catch (authError) {
                console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro na autenticação:`, authError.message);
                return {
                    status: 'ERROR',
                    url: this.wgEasyUrl,
                    error: authError.message,
                    authenticated: false,
                    suggestion: 'Verifique a senha do WG Easy na variável WG_EASY_PASSWORD'
                };
            }
        } catch (error) {
            console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            return {
                status: 'ERROR',
                url: this.wgEasyUrl,
                error: error.message,
                authenticated: false
            };
        }
    }
}

module.exports = WireGuardService;