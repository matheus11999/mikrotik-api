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
            
            const response = await axios.post(`${this.wgEasyUrl}/api/session`, {
                password: this.wgEasyPassword
            }, {
                timeout: 10000
            });

            if (response.headers['set-cookie']) {
                const cookies = response.headers['set-cookie'];
                const sessionCookie = cookies.find(cookie => cookie.startsWith('connect.sid='));
                console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Autenticado no WG Easy com sucesso`);
                return sessionCookie;
            }

            throw new Error('Falha na autenticação: cookie de sessão não encontrado');
        } catch (error) {
            console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro na autenticação WG Easy:`, error.message);
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

            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Configuração obtida para: ${clientName}`);

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
            
            const sessionCookie = await this.authenticateWgEasy();
            
            const response = await axios.get(`${this.wgEasyUrl}/api/wireguard/client`, {
                headers: {
                    'Cookie': sessionCookie
                },
                timeout: 5000
            });

            console.log(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Conexão com WG Easy OK`);
            return {
                success: true,
                message: 'Conexão com WG Easy estabelecida com sucesso',
                clientsCount: response.data.length,
                timestamp: new Date().toISOString()
            };
        } catch (error) {
            console.error(`[WIREGUARD-SERVICE] [${new Date().toISOString()}] Erro na conexão com WG Easy:`, error.message);
            throw new Error(`Falha na conexão com WG Easy: ${error.message}`);
        }
    }
}

module.exports = WireGuardService;