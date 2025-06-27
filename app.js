require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// Controllers
const HotspotController = require('./src/controllers/hotspot');
const SystemController = require('./src/controllers/system');
const ScriptsController = require('./src/controllers/scripts');
const SchedulesController = require('./src/controllers/schedules');
const FilesController = require('./src/controllers/files');
const TemplateController = require('./src/controllers/template');
const WireGuardController = require('./src/controllers/wireguard');

// Middleware
const {
    validateConnectionParams,
    validateId,
    validateHotspotUserData,
    validateHotspotProfileData,
    validateHotspotServerData,
    validateHotspotServerProfileData,
    validateFileName,
    validateScriptData,
    validateScheduleData,
    validateSystemData,
    sanitizeInput,
    rateLimiter
} = require('./src/middleware/validation');

const { authenticateApiToken } = require('./src/middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Middleware global
app.use(sanitizeInput);
app.use(rateLimiter);

// Middleware para logging
app.use((req, res, next) => {
    console.log(`[APP] [${new Date().toISOString()}] ${req.method} ${req.url} - IP: ${req.ip || req.connection.remoteAddress}`);
    next();
});

// Middleware de autenticação (aplicado a todas as rotas exceto health check)
app.use((req, res, next) => {
    // Pular autenticação para health check e arquivos estáticos
    if (req.path === '/health' || req.path.startsWith('/css') || req.path.startsWith('/js') || req.path === '/') {
        return next();
    }
    authenticateApiToken(req, res, next);
});

// Instanciar controllers
const hotspotController = new HotspotController();
const systemController = new SystemController();
const scriptsController = new ScriptsController();
const schedulesController = new SchedulesController();
const filesController = FilesController;
const templateController = TemplateController;
const wireguardController = new WireGuardController();

// ==================== ROTAS PRINCIPAIS ====================

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        service: 'MikroTik API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Teste de conexão geral
app.post('/test-connection', validateConnectionParams, async (req, res) => {
    try {
        await hotspotController.testConnection(req, res);
    } catch (error) {
        console.error(`[APP] [${new Date().toISOString()}] Erro no teste de conexão:`, error.message);
        res.status(500).json({
            success: false,
            error: 'Erro interno do servidor',
            timestamp: new Date().toISOString()
        });
    }
});

// ==================== ROTAS DO HOTSPOT ====================

// Usuários
app.get('/hotspot/users', validateConnectionParams, (req, res) => hotspotController.listUsers(req, res));
app.post('/hotspot/users', validateConnectionParams, validateHotspotUserData, (req, res) => hotspotController.createUser(req, res));
app.put('/hotspot/users', validateConnectionParams, validateId, (req, res) => hotspotController.updateUser(req, res));
app.delete('/hotspot/users', validateConnectionParams, validateId, (req, res) => hotspotController.deleteUser(req, res));
app.get('/hotspot/users/details', validateConnectionParams, validateId, (req, res) => hotspotController.getUserById(req, res));

// Usuários ativos
app.get('/hotspot/active-users', validateConnectionParams, (req, res) => hotspotController.listActiveUsers(req, res));
app.post('/hotspot/disconnect', validateConnectionParams, validateId, (req, res) => hotspotController.disconnectUser(req, res));

// Profiles
app.get('/hotspot/profiles', validateConnectionParams, (req, res) => hotspotController.listProfiles(req, res));
app.post('/hotspot/profiles', validateConnectionParams, validateHotspotProfileData, (req, res) => hotspotController.createProfile(req, res));
app.put('/hotspot/profiles', validateConnectionParams, validateId, (req, res) => hotspotController.updateProfile(req, res));
app.delete('/hotspot/profiles', validateConnectionParams, validateId, (req, res) => hotspotController.deleteProfile(req, res));

// Servidores
app.get('/hotspot/servers', validateConnectionParams, (req, res) => hotspotController.listServers(req, res));
app.post('/hotspot/servers', validateConnectionParams, validateHotspotServerData, (req, res) => hotspotController.createServer(req, res));
app.put('/hotspot/servers', validateConnectionParams, validateId, (req, res) => hotspotController.updateServer(req, res));
app.delete('/hotspot/servers', validateConnectionParams, validateId, (req, res) => hotspotController.deleteServer(req, res));

// Server Profiles
app.get('/hotspot/server-profiles', validateConnectionParams, (req, res) => hotspotController.listServerProfiles(req, res));
app.post('/hotspot/server-profiles', validateConnectionParams, validateHotspotServerProfileData, (req, res) => hotspotController.createServerProfile(req, res));
app.put('/hotspot/server-profiles', validateConnectionParams, validateId, (req, res) => hotspotController.updateServerProfile(req, res));
app.delete('/hotspot/server-profiles', validateConnectionParams, validateId, (req, res) => hotspotController.deleteServerProfile(req, res));

// Hotspot Setup
app.post('/hotspot/setup', validateConnectionParams, (req, res) => hotspotController.hotspotSetup(req, res));

// Gerenciamento de Arquivos
app.get('/files', validateConnectionParams, (req, res) => hotspotController.listFiles(req, res));
app.delete('/files', validateConnectionParams, validateFileName, (req, res) => hotspotController.deleteFile(req, res));

// Reinicialização
app.post('/system/reboot-mikrotik', validateConnectionParams, (req, res) => hotspotController.rebootSystem(req, res));

// Cookies
app.get('/hotspot/cookies', validateConnectionParams, (req, res) => hotspotController.listCookies(req, res));
app.delete('/hotspot/cookies', validateConnectionParams, validateId, (req, res) => hotspotController.deleteCookie(req, res));

// Estatísticas
app.get('/hotspot/stats', validateConnectionParams, (req, res) => hotspotController.getStats(req, res));

// ==================== ROTAS DO SISTEMA ====================

// Informações gerais
app.get('/system/info', validateConnectionParams, (req, res) => systemController.getSystemInfo(req, res));
app.get('/system/identity', validateConnectionParams, (req, res) => systemController.getSystemIdentity(req, res));
app.post('/system/identity', validateConnectionParams, validateSystemData, (req, res) => systemController.setSystemIdentity(req, res));
app.get('/system/resource', validateConnectionParams, (req, res) => systemController.getSystemResource(req, res));
app.get('/system/clock', validateConnectionParams, (req, res) => systemController.getSystemClock(req, res));
app.post('/system/clock', validateConnectionParams, (req, res) => systemController.setSystemClock(req, res));

// Logs
app.get('/system/logs', validateConnectionParams, (req, res) => systemController.getSystemLogs(req, res));
app.delete('/system/logs', validateConnectionParams, (req, res) => systemController.clearSystemLogs(req, res));

// Usuários do sistema
app.get('/system/users', validateConnectionParams, (req, res) => systemController.getSystemUsers(req, res));
app.post('/system/users', validateConnectionParams, (req, res) => systemController.createSystemUser(req, res));

// Interfaces
app.get('/system/interfaces', validateConnectionParams, (req, res) => systemController.getInterfaces(req, res));
app.get('/system/interfaces/stats', validateConnectionParams, (req, res) => systemController.getInterfaceStats(req, res));

// Endereços IP
app.get('/system/ip-addresses', validateConnectionParams, (req, res) => systemController.getIpAddresses(req, res));

// Rotas
app.get('/system/routes', validateConnectionParams, (req, res) => systemController.getRoutes(req, res));

// Backup
app.post('/system/backup', validateConnectionParams, validateSystemData, (req, res) => systemController.createBackup(req, res));
app.get('/system/backups', validateConnectionParams, (req, res) => systemController.listBackups(req, res));

// Controle do sistema
app.post('/system/reboot', validateConnectionParams, (req, res) => systemController.rebootSystem(req, res));
app.post('/system/shutdown', validateConnectionParams, (req, res) => systemController.shutdownSystem(req, res));

// Estatísticas completas
app.get('/system/complete-stats', validateConnectionParams, (req, res) => systemController.getCompleteStats(req, res));

// ==================== ROTAS DOS SCRIPTS ====================

// Scripts básicos
app.get('/scripts', validateConnectionParams, (req, res) => scriptsController.listScripts(req, res));
app.post('/scripts', validateConnectionParams, validateScriptData, (req, res) => scriptsController.createScript(req, res));
app.put('/scripts', validateConnectionParams, validateId, (req, res) => scriptsController.updateScript(req, res));
app.delete('/scripts', validateConnectionParams, validateId, (req, res) => scriptsController.deleteScript(req, res));
app.get('/scripts/details', validateConnectionParams, validateId, (req, res) => scriptsController.getScriptById(req, res));
app.post('/scripts/run', validateConnectionParams, (req, res) => scriptsController.runScript(req, res));

// Environment
app.get('/scripts/environment', validateConnectionParams, (req, res) => scriptsController.getEnvironment(req, res));
app.post('/scripts/environment', validateConnectionParams, (req, res) => scriptsController.setEnvironmentVariable(req, res));
app.delete('/scripts/environment', validateConnectionParams, (req, res) => scriptsController.removeEnvironmentVariable(req, res));

// Jobs
app.get('/scripts/jobs', validateConnectionParams, (req, res) => scriptsController.getJobs(req, res));
app.post('/scripts/jobs/stop', validateConnectionParams, validateId, (req, res) => scriptsController.stopJob(req, res));

// Templates
app.get('/scripts/templates', (req, res) => scriptsController.getTemplates(req, res));
app.post('/scripts/from-template', validateConnectionParams, (req, res) => scriptsController.createScriptFromTemplate(req, res));

// Estatísticas
app.get('/scripts/stats', validateConnectionParams, (req, res) => scriptsController.getScriptStats(req, res));

// ==================== ROTAS DOS SCHEDULES ====================

// Schedules básicos
app.get('/schedules', validateConnectionParams, (req, res) => schedulesController.listSchedules(req, res));
app.post('/schedules', validateConnectionParams, validateScheduleData, (req, res) => schedulesController.createSchedule(req, res));
app.put('/schedules', validateConnectionParams, validateId, (req, res) => schedulesController.updateSchedule(req, res));
app.delete('/schedules', validateConnectionParams, validateId, (req, res) => schedulesController.deleteSchedule(req, res));
app.get('/schedules/details', validateConnectionParams, validateId, (req, res) => schedulesController.getScheduleById(req, res));

// Controle de schedules
app.post('/schedules/enable', validateConnectionParams, validateId, (req, res) => schedulesController.enableSchedule(req, res));
app.post('/schedules/disable', validateConnectionParams, validateId, (req, res) => schedulesController.disableSchedule(req, res));
app.post('/schedules/enable-all', validateConnectionParams, (req, res) => schedulesController.enableAllSchedules(req, res));
app.post('/schedules/disable-all', validateConnectionParams, (req, res) => schedulesController.disableAllSchedules(req, res));

// Templates
app.get('/schedules/templates', (req, res) => schedulesController.getTemplates(req, res));
app.post('/schedules/from-template', validateConnectionParams, (req, res) => schedulesController.createScheduleFromTemplate(req, res));

// Utilitários
app.get('/schedules/time-options', (req, res) => schedulesController.getTimeOptions(req, res));
app.get('/schedules/validate-time', (req, res) => schedulesController.validateTime(req, res));

// Estatísticas
app.get('/schedules/stats', validateConnectionParams, (req, res) => schedulesController.getScheduleStats(req, res));

// ==================== ROTAS DE ARQUIVOS ====================

// Listar arquivos
app.get('/files', validateConnectionParams, (req, res) => filesController.listFiles(req, res));

// Criar diretório
app.post('/files/create-directory', validateConnectionParams, (req, res) => filesController.createDirectory(req, res));

// Upload de arquivos
app.post('/files/upload', validateConnectionParams, (req, res) => filesController.uploadFiles(req, res));

// Deletar arquivo
app.delete('/files', validateConnectionParams, (req, res) => filesController.deleteFile(req, res));

// Obter conteúdo do arquivo
app.get('/files/content', validateConnectionParams, (req, res) => filesController.getFileContent(req, res));

// Upload de template
app.post('/files/upload-template', validateConnectionParams, (req, res) => filesController.uploadTemplate(req, res));

// Teste de conexão para arquivos
app.post('/files/test-connection', validateConnectionParams, (req, res) => filesController.testConnection(req, res));

// ==================== ROTAS WIREGUARD ====================

// Listar clientes WireGuard
app.get('/wireguard/clients', sanitizeInput, rateLimiter, (req, res) => wireguardController.listClients(req, res));

// Criar cliente WireGuard
app.post('/wireguard/clients', sanitizeInput, rateLimiter, (req, res) => wireguardController.createClient(req, res));

// Deletar cliente WireGuard
app.delete('/wireguard/clients/:clientName', sanitizeInput, rateLimiter, (req, res) => wireguardController.deleteClient(req, res));

// Gerar configuração MikroTik para cliente existente
app.get('/wireguard/clients/:clientName/mikrotik-config/:mikrotikId', sanitizeInput, rateLimiter, (req, res) => wireguardController.generateMikroTikConfig(req, res));

// Recriar/obter configuração para MikroTik existente
app.post('/wireguard/recreate-config', sanitizeInput, rateLimiter, (req, res) => wireguardController.recreateClientConfig(req, res));

// Teste de conexão WG Easy
app.post('/wireguard/test-connection', sanitizeInput, rateLimiter, (req, res) => wireguardController.testConnection(req, res));

// ==================== ROTAS DE TEMPLATES ====================

// Aplicar template
app.post('/templates/apply', validateConnectionParams, (req, res) => templateController.applyTemplate(req, res));

// Verificar status do template
app.get('/templates/status', validateConnectionParams, (req, res) => templateController.checkStatus(req, res));

// Teste de conexão para templates
app.post('/templates/test-connection', validateConnectionParams, (req, res) => templateController.testConnection(req, res));

// ==================== ROTAS DE TOOLS ====================

// Tool fetch direto
app.post('/tools/fetch', validateConnectionParams, (req, res) => systemController.executeToolFetch(req, res));

// ==================== MIDDLEWARE DE ERRO GLOBAL ====================

app.use((error, req, res, next) => {
    console.error(`[APP] [${new Date().toISOString()}] Erro não tratado:`, error);
    res.status(500).json({
        success: false,
        error: 'Erro interno do servidor',
        timestamp: new Date().toISOString()
    });
});

// Middleware para rotas não encontradas (deve ser o último)
app.use((req, res) => {
    console.warn(`[APP] [${new Date().toISOString()}] Rota não encontrada: ${req.method} ${req.url}`);
    res.status(404).json({
        success: false,
        error: 'Rota não encontrada',
        available_endpoints: {
            hotspot: [
                'GET /hotspot/users',
                'POST /hotspot/users',
                'PUT /hotspot/users',
                'DELETE /hotspot/users',
                'GET /hotspot/active-users',
                'GET /hotspot/profiles',
                'POST /hotspot/profiles',
                'PUT /hotspot/profiles',
                'DELETE /hotspot/profiles',
                'GET /hotspot/servers',
                'POST /hotspot/servers',
                'PUT /hotspot/servers',
                'DELETE /hotspot/servers',
                'GET /hotspot/server-profiles',
                'POST /hotspot/server-profiles',
                'PUT /hotspot/server-profiles',
                'DELETE /hotspot/server-profiles',
                'POST /hotspot/setup',
                'GET /hotspot/stats'
            ],
            files: [
                'GET /files',
                'DELETE /files'
            ],
            wireguard: [
                'GET /wireguard/clients',
                'POST /wireguard/clients',
                'DELETE /wireguard/clients/:clientName',
                'GET /wireguard/clients/:clientName/mikrotik-config/:mikrotikId',
                'POST /wireguard/recreate-config',
                'POST /wireguard/test-connection'
            ],
            system: [
                'GET /system/info',
                'GET /system/logs',
                'GET /system/interfaces',
                'POST /system/backup'
            ],
            scripts: [
                'GET /scripts',
                'POST /scripts',
                'POST /scripts/run',
                'GET /scripts/templates'
            ],
            schedules: [
                'GET /schedules',
                'POST /schedules',
                'GET /schedules/templates'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', async () => {
    console.log(`[APP] [${new Date().toISOString()}] Recebido SIGTERM, encerrando aplicação...`);
    
    // Fechar todas as conexões dos serviços
    try {
        await hotspotController.hotspotService.closeAllConnections();
        await systemController.systemService.closeAllConnections();
        await scriptsController.scriptsService.closeAllConnections();
        await schedulesController.schedulesService.closeAllConnections();
    } catch (error) {
        console.error(`[APP] [${new Date().toISOString()}] Erro ao fechar conexões:`, error.message);
    }
    
    process.exit(0);
});

process.on('SIGINT', async () => {
    console.log(`[APP] [${new Date().toISOString()}] Recebido SIGINT, encerrando aplicação...`);
    
    // Fechar todas as conexões dos serviços
    try {
        await hotspotController.hotspotService.closeAllConnections();
        await systemController.systemService.closeAllConnections();
        await scriptsController.scriptsService.closeAllConnections();
        await schedulesController.schedulesService.closeAllConnections();
    } catch (error) {
        console.error(`[APP] [${new Date().toISOString()}] Erro ao fechar conexões:`, error.message);
    }
    
    process.exit(0);
});

// ==================== INICIAR SERVIDOR ====================

app.listen(PORT, () => {
    console.log(`[APP] [${new Date().toISOString()}] 🚀 MikroTik API iniciada na porta ${PORT}`);
    console.log(`[APP] [${new Date().toISOString()}] 📊 Interface web disponível em http://localhost:${PORT}`);
    console.log(`[APP] [${new Date().toISOString()}] 🏥 Health check disponível em http://localhost:${PORT}/health`);
    console.log(`[APP] [${new Date().toISOString()}] 🔗 Teste de conexão disponível em POST http://localhost:${PORT}/test-connection`);
    console.log(`[APP] [${new Date().toISOString()}] 📡 Endpoints principais:`);
    console.log(`[APP] [${new Date().toISOString()}]    - Hotspot: /hotspot/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - Sistema: /system/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - Scripts: /scripts/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - Schedules: /schedules/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - WireGuard: /wireguard/*`);
});

module.exports = app;