const WireGuardService = require('../services/wireguard');

class TestController {
    constructor() {
        this.wireguardService = new WireGuardService();
    }

    async testWgEasyConnection(req, res) {
        try {
            console.log(`[TEST-CONTROLLER] [${new Date().toISOString()}] Testando conexão WG Easy`);
            
            const result = await this.wireguardService.testConnection();
            
            res.json({
                success: true,
                data: result,
                message: 'Conexão com WG Easy testada com sucesso',
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[TEST-CONTROLLER] [${new Date().toISOString()}] Erro no teste WG Easy:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async listAllClients(req, res) {
        try {
            console.log(`[TEST-CONTROLLER] [${new Date().toISOString()}] Listando todos os clientes WG Easy`);
            
            const clients = await this.wireguardService.listWireGuardClients();
            
            res.json({
                success: true,
                data: clients,
                count: clients.length,
                message: `${clients.length} clientes encontrados`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[TEST-CONTROLLER] [${new Date().toISOString()}] Erro ao listar clientes:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async createTestClient(req, res) {
        try {
            const { clientName } = req.body;
            
            if (!clientName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do cliente é obrigatório',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`[TEST-CONTROLLER] [${new Date().toISOString()}] Criando cliente teste: ${clientName}`);
            
            const wgConfig = await this.wireguardService.createWireGuardUser(clientName);
            const mikrotikConfig = this.wireguardService.generateMikroTikConfig(wgConfig, clientName);
            
            res.json({
                success: true,
                data: {
                    client: wgConfig,
                    mikrotikConfig: mikrotikConfig
                },
                message: `Cliente teste ${clientName} criado com sucesso`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[TEST-CONTROLLER] [${new Date().toISOString()}] Erro ao criar cliente teste:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async deleteTestClient(req, res) {
        try {
            const { clientName } = req.params;
            
            if (!clientName) {
                return res.status(400).json({
                    success: false,
                    error: 'Nome do cliente é obrigatório',
                    timestamp: new Date().toISOString()
                });
            }

            console.log(`[TEST-CONTROLLER] [${new Date().toISOString()}] Deletando cliente teste: ${clientName}`);
            
            const result = await this.wireguardService.deleteWireGuardUser(clientName);
            
            res.json({
                success: true,
                data: result,
                message: `Cliente teste ${clientName} deletado com sucesso`,
                timestamp: new Date().toISOString()
            });
        } catch (error) {
            console.error(`[TEST-CONTROLLER] [${new Date().toISOString()}] Erro ao deletar cliente teste:`, error.message);
            res.status(500).json({
                success: false,
                error: error.message,
                timestamp: new Date().toISOString()
            });
        }
    }

    async getTestPage(req, res) {
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>WG Easy API Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #1a1a1a; color: white; }
        .container { max-width: 800px; margin: 0 auto; }
        .endpoint { background: #2a2a2a; padding: 15px; margin: 10px 0; border-radius: 5px; }
        .method { display: inline-block; padding: 5px 10px; border-radius: 3px; color: white; font-weight: bold; }
        .get { background: #28a745; }
        .post { background: #007bff; }
        .delete { background: #dc3545; }
        button { background: #007bff; color: white; padding: 10px 15px; border: none; border-radius: 5px; cursor: pointer; margin: 5px; }
        button:hover { background: #0056b3; }
        .result { background: #000; padding: 10px; border-radius: 5px; margin-top: 10px; max-height: 400px; overflow: auto; }
        pre { margin: 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔧 WG Easy API Test</h1>
        
        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/test/wg-easy/connection</strong>
            <p>Testa a conexão com WG Easy</p>
            <button onclick="testConnection()">Testar Conexão</button>
            <div id="connection-result" class="result" style="display:none;"></div>
        </div>

        <div class="endpoint">
            <span class="method get">GET</span>
            <strong>/test/wg-easy/clients</strong>
            <p>Lista todos os clientes WireGuard</p>
            <button onclick="listClients()">Listar Clientes</button>
            <div id="clients-result" class="result" style="display:none;"></div>
        </div>

        <div class="endpoint">
            <span class="method post">POST</span>
            <strong>/test/wg-easy/clients</strong>
            <p>Cria um cliente de teste</p>
            <input type="text" id="client-name" placeholder="Nome do cliente (ex: teste-123)" style="background: #333; color: white; border: 1px solid #555; padding: 8px; border-radius: 3px;">
            <button onclick="createClient()">Criar Cliente</button>
            <div id="create-result" class="result" style="display:none;"></div>
        </div>

        <div class="endpoint">
            <span class="method delete">DELETE</span>
            <strong>/test/wg-easy/clients/:name</strong>
            <p>Deleta um cliente de teste</p>
            <input type="text" id="delete-name" placeholder="Nome do cliente para deletar" style="background: #333; color: white; border: 1px solid #555; padding: 8px; border-radius: 3px;">
            <button onclick="deleteClient()">Deletar Cliente</button>
            <div id="delete-result" class="result" style="display:none;"></div>
        </div>

        <div style="margin-top: 30px; padding: 15px; background: #2a2a2a; border-radius: 5px;">
            <h3>📋 Instruções:</h3>
            <ol>
                <li>Primeiro, teste a conexão com WG Easy</li>
                <li>Liste os clientes existentes</li>
                <li>Crie um cliente de teste</li>
                <li>Verifique se aparece na lista</li>
                <li>Delete o cliente de teste</li>
            </ol>
        </div>
    </div>

    <script>
        async function testConnection() {
            const result = document.getElementById('connection-result');
            result.style.display = 'block';
            result.innerHTML = '<pre>Testando conexão...</pre>';
            
            try {
                const response = await fetch('/test/wg-easy/connection');
                const data = await response.json();
                result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                result.innerHTML = '<pre style="color: red;">Erro: ' + error.message + '</pre>';
            }
        }

        async function listClients() {
            const result = document.getElementById('clients-result');
            result.style.display = 'block';
            result.innerHTML = '<pre>Listando clientes...</pre>';
            
            try {
                const response = await fetch('/test/wg-easy/clients');
                const data = await response.json();
                result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                result.innerHTML = '<pre style="color: red;">Erro: ' + error.message + '</pre>';
            }
        }

        async function createClient() {
            const clientName = document.getElementById('client-name').value;
            if (!clientName) {
                alert('Digite um nome para o cliente');
                return;
            }

            const result = document.getElementById('create-result');
            result.style.display = 'block';
            result.innerHTML = '<pre>Criando cliente...</pre>';
            
            try {
                const response = await fetch('/test/wg-easy/clients', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ clientName })
                });
                const data = await response.json();
                result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                result.innerHTML = '<pre style="color: red;">Erro: ' + error.message + '</pre>';
            }
        }

        async function deleteClient() {
            const clientName = document.getElementById('delete-name').value;
            if (!clientName) {
                alert('Digite o nome do cliente para deletar');
                return;
            }

            const result = document.getElementById('delete-result');
            result.style.display = 'block';
            result.innerHTML = '<pre>Deletando cliente...</pre>';
            
            try {
                const response = await fetch('/test/wg-easy/clients/' + clientName, {
                    method: 'DELETE'
                });
                const data = await response.json();
                result.innerHTML = '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
            } catch (error) {
                result.innerHTML = '<pre style="color: red;">Erro: ' + error.message + '</pre>';
            }
        }
    </script>
</body>
</html>
        `;
        res.send(html);
    }
}

module.exports = TestController;