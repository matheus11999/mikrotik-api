const WireGuardService = require('../services/wireguard');

class WireGuardController {
    constructor() {
        this.wireguardService = new WireGuardService();
    }

    async createClient(req, res) {
        try {
            const { clientName, mikrotikId } = req.body;
            
            if (!clientName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do cliente é obrigatório',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Criando cliente WireGuard: ${clientName} para MikroTik: ${mikrotikId}`);
            
            const wgConfig = await this.wireguardService.createWireGuardUser(clientName);
            const mikrotikConfig = this.wireguardService.generateMikroTikConfig(wgConfig, mikrotikId || clientName);
            
            console.log(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Cliente criado com sucesso: ${clientName}, IP: ${wgConfig.clientAddress}`);
            
            res.json({
                success: true,
                data: {
                    client: wgConfig,
                    mikrotikConfig: mikrotikConfig
                },
                message: 'Cliente WireGuard criado com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Erro ao criar cliente:`, error.message);
            console.error(`[WIREGUARD-CONTROLLER] Stack trace:`, error.stack);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteClient(req, res) {
        try {
            const { clientName } = req.params;
            
            if (!clientName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do cliente é obrigatório',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Removendo cliente WireGuard: ${clientName}`);
            
            const result = await this.wireguardService.deleteWireGuardUser(clientName);
            
            res.json({
                success: true,
                data: result,
                message: `Cliente ${clientName} removido com sucesso`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Erro ao remover cliente:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async listClients(req, res) {
        try {
            console.log(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Listando clientes WireGuard`);
            
            const clients = await this.wireguardService.listWireGuardClients();
            
            res.json({
                success: true,
                data: clients,
                count: clients.length,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Erro ao listar clientes:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async generateMikroTikConfig(req, res) {
        try {
            const { clientName, mikrotikId } = req.params;
            
            if (!clientName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do cliente é obrigatório',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Gerando configuração MikroTik para: ${clientName}`);
            
            // Buscar cliente existente
            const clients = await this.wireguardService.listWireGuardClients();
            const client = clients.find(c => c.name === clientName);
            
            if (!client) {
                return res.status(404).json({
                    success: false,
                    error: `Cliente WireGuard '${clientName}' não encontrado`,
                    timestamp: new Date().toISOString()
                });
            }

            // Montar configuração WireGuard
            const wgConfig = {
                clientName: client.name,
                clientPrivateKey: client.privateKey,
                clientPublicKey: client.publicKey,
                clientAddress: client.address,
                serverPublicKey: this.wireguardService.serverPublicKey,
                serverEndpoint: this.wireguardService.serverEndpoint,
                serverPort: this.wireguardService.serverPort,
                preSharedKey: this.wireguardService.preSharedKey,
                allowedIPs: '0.0.0.0/0,::/0',
                persistentKeepalive: '25s'
            };

            const mikrotikConfig = this.wireguardService.generateMikroTikConfig(wgConfig, mikrotikId || clientName);
            
            res.json({
                success: true,
                data: {
                    client: wgConfig,
                    mikrotikConfig: mikrotikConfig
                },
                message: 'Configuração MikroTik gerada com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Erro ao gerar configuração:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async testConnection(req, res) {
        try {
            console.log(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Testando conexão WG Easy`);
            
            const result = await this.wireguardService.testConnection();
            
            res.json({
                success: true,
                data: result,
                message: 'Conexão testada com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async recreateClientConfig(req, res) {
        try {
            const { mikrotikId } = req.body;
            
            if (!mikrotikId) {
                return res.status(400).json({
                    success: false,
                    error: 'ID do MikroTik é obrigatório',
                    timestamp: new Date().toISOString()
                });
            }

            const clientName = `mikrotik-${mikrotikId}`;
            
            console.log(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Recriando configuração para MikroTik existente: ${mikrotikId}`);
            
            // Verificar se cliente já existe
            const clients = await this.wireguardService.listWireGuardClients();
            let client = clients.find(c => c.name === clientName);
            
            let isNewClient = false;
            let wgConfig;

            if (!client) {
                console.log(`[WIREGUARD-CONTROLLER] Cliente ${clientName} não existe, criando novo...`);
                wgConfig = await this.wireguardService.createWireGuardUser(clientName);
                isNewClient = true;
            } else {
                console.log(`[WIREGUARD-CONTROLLER] Cliente ${clientName} já existe, usando configuração existente...`);
                wgConfig = {
                    clientName: client.name,
                    clientPrivateKey: client.privateKey,
                    clientPublicKey: client.publicKey,
                    clientAddress: client.address,
                    serverPublicKey: this.wireguardService.serverPublicKey,
                    serverEndpoint: this.wireguardService.serverEndpoint,
                    serverPort: this.wireguardService.serverPort,
                    preSharedKey: this.wireguardService.preSharedKey,
                    allowedIPs: '0.0.0.0/0,::/0',
                    persistentKeepalive: '25s'
                };
            }

            const mikrotikConfig = this.wireguardService.generateMikroTikConfig(wgConfig, mikrotikId);
            
            res.json({
                success: true,
                data: {
                    client: wgConfig,
                    mikrotikConfig: mikrotikConfig,
                    isNewClient: isNewClient
                },
                message: isNewClient ? 'Configuração WireGuard criada com sucesso' : 'Configuração WireGuard obtida com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[WIREGUARD-CONTROLLER] [${new Date().toISOString()}] Erro ao recriar configuração:`, error.message);
            console.error(`[WIREGUARD-CONTROLLER] Stack trace:`, error.stack);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }
}

module.exports = WireGuardController;