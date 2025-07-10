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
const IpBindingController = require('./src/controllers/ipBinding');
const UserAuthController = require('./src/controllers/userAuth');

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
const { 
    securityLogger, 
    bruteForceProtection, 
    securityHeaders, 
    advancedSanitization,
    clearIPBlocks,
    getSecurityStatus
} = require('./src/middleware/security');

// Logging middleware
const {
    requestLogger,
    errorLogger,
    performanceMonitor,
    mikrotikLogger,
    rateLimitLogger,
    healthLogger,
    validationErrorLogger,
    logStartup,
    logShutdown
} = require('./src/middleware/logging');

const app = express();
const PORT = process.env.PORT || 3000;

// Import heap expansion utility
const { forceHeapExpansion } = require('./force-heap-expansion');

// Import memory keeper for fixed RAM allocation
const { MemoryKeeper } = require('./memory-keeper');

// Initialize memory keeper with 256MB fixed allocation (more conservative)
const memoryKeeper = new MemoryKeeper(256);

// Middleware básico
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Configurar CORS de forma mais segura
const corsOptions = {
    origin: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Logging middleware (should be early in the chain)
app.use(requestLogger);
app.use(healthLogger);
app.use(rateLimitLogger);
app.use(validationErrorLogger);

// Middleware de segurança (ordem importante)
app.use(securityHeaders);
app.use(securityLogger);
app.use(bruteForceProtection);
app.use(advancedSanitization);
app.use(sanitizeInput);
app.use(rateLimiter);

// MikroTik specific logging
app.use(mikrotikLogger);

// Middleware de autenticação (aplicado a todas as rotas exceto health check)
app.use((req, res, next) => {
    // Pular autenticação para health check, monitoring, arquivos estáticos e dashboard
    if (req.path === '/health' || 
        req.path.startsWith('/css') || 
        req.path.startsWith('/js') || 
        req.path === '/' || 
        req.path === '/errors.html' ||
        req.path.startsWith('/api/logs') ||
        req.path.startsWith('/api/system/health') ||
        req.path.startsWith('/api/security') ||
        req.path.startsWith('/favicon') ||
        req.path === '/errors' ||
        req.path.includes('monitoring') ||
        req.path.includes('dashboard')) {
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
const ipBindingController = IpBindingController;
const userAuthController = new UserAuthController();

// ==================== ROTAS PRINCIPAIS ====================

// Health check
app.get('/health', (req, res) => {
    const logger = require('./src/utils/logger');
    const health = logger.getHealthStatus();
    
    res.status(health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 500).json({ 
        status: health.status, 
        service: 'MikroTik API',
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        ...health
    });
});

// ==================== MONITORING ENDPOINTS ====================

// API metrics endpoint
app.get('/api/logs/metrics', (req, res) => {
    try {
        const logger = require('./src/utils/logger');
        const metrics = logger.getMetrics();
        res.json({
            success: true,
            data: metrics,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get metrics',
            timestamp: new Date().toISOString()
        });
    }
});

// Error logs endpoint
app.get('/api/logs/errors', (req, res) => {
    try {
        const logger = require('./src/utils/logger');
        const limit = parseInt(req.query.limit) || 100;
        const logs = logger.getRecentLogs('errors', limit);
        
        res.json({
            success: true,
            data: logs,
            count: logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get error logs',
            timestamp: new Date().toISOString()
        });
    }
});

// Access logs endpoint
app.get('/api/logs/access', (req, res) => {
    try {
        const logger = require('./src/utils/logger');
        const limit = parseInt(req.query.limit) || 100;
        const logs = logger.getRecentLogs('access', limit);
        
        res.json({
            success: true,
            data: logs,
            count: logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get access logs',
            timestamp: new Date().toISOString()
        });
    }
});

// Performance logs endpoint
app.get('/api/logs/performance', (req, res) => {
    try {
        const logger = require('./src/utils/logger');
        const limit = parseInt(req.query.limit) || 100;
        const logs = logger.getRecentLogs('performance', limit);
        
        res.json({
            success: true,
            data: logs,
            count: logs.length,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get performance logs',
            timestamp: new Date().toISOString()
        });
    }
});

// System health endpoint
app.get('/api/system/health', (req, res) => {
    try {
        const logger = require('./src/utils/logger');
        const health = logger.getHealthStatus();
        const systemInfo = logger.getSystemInfo();
        
        res.json({
            success: true,
            data: {
                health,
                system: systemInfo
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get system health',
            timestamp: new Date().toISOString()
        });
    }
});

// Security management endpoints
app.get('/api/security/status', (req, res) => {
    try {
        const status = getSecurityStatus();
        res.json({
            success: true,
            data: status,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get security status',
            timestamp: new Date().toISOString()
        });
    }
});

app.post('/api/security/clear-blocks', (req, res) => {
    try {
        const { ip } = req.body;
        const result = clearIPBlocks(ip);
        
        res.json({
            success: true,
            message: ip ? `Cleared blocks for IP: ${ip}` : 'Cleared all IP blocks',
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to clear IP blocks',
            timestamp: new Date().toISOString()
        });
    }
});

// Clear logs endpoint
app.post('/api/logs/clear', (req, res) => {
    try {
        const { logType } = req.body;
        const logger = require('./src/utils/logger');
        const result = logger.clearLogs(logType);
        
        res.json({
            success: true,
            message: `Logs cleared successfully`,
            data: result,
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to clear logs',
            timestamp: new Date().toISOString()
        });
    }
});

// Force garbage collection endpoint
app.post('/api/system/gc', (req, res) => {
    try {
        const beforeMem = process.memoryUsage();
        const beforePercent = (beforeMem.heapUsed / beforeMem.heapTotal) * 100;
        
        // Force memory keeper expansion first
        memoryKeeper.forceExpansion();
        
        // Then do GC if available
        if (global.gc) {
            global.gc();
        }
        
        // Wait for operations to complete
        setTimeout(() => {
            const afterMem = process.memoryUsage();
            const afterPercent = (afterMem.heapUsed / afterMem.heapTotal) * 100;
            const memoryStatus = memoryKeeper.getStatus();
            
            res.json({
                success: true,
                message: 'Memory management and garbage collection executed',
                data: {
                    before: {
                        heapUsed: Math.round(beforeMem.heapUsed / 1024 / 1024 * 100) / 100,
                        heapTotal: Math.round(beforeMem.heapTotal / 1024 / 1024 * 100) / 100,
                        percentage: Math.round(beforePercent * 100) / 100
                    },
                    after: {
                        heapUsed: Math.round(afterMem.heapUsed / 1024 / 1024 * 100) / 100,
                        heapTotal: Math.round(afterMem.heapTotal / 1024 / 1024 * 100) / 100,
                        percentage: Math.round(afterPercent * 100) / 100
                    },
                    memoryKeeper: memoryStatus,
                    saved: Math.round((beforeMem.heapUsed - afterMem.heapUsed) / 1024 / 1024 * 100) / 100,
                    heapExpansion: Math.round((afterMem.heapTotal - beforeMem.heapTotal) / 1024 / 1024 * 100) / 100
                },
                timestamp: new Date().toISOString()
            });
        }, 1500);
        
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to execute memory management',
            timestamp: new Date().toISOString()
        });
    }
});

// Memory keeper status endpoint
app.get('/api/system/memory-status', (req, res) => {
    try {
        const memoryStatus = memoryKeeper.getStatus();
        const systemMem = process.memoryUsage();
        
        res.json({
            success: true,
            data: {
                memoryKeeper: memoryStatus,
                systemMemory: {
                    heapUsed: Math.round(systemMem.heapUsed / 1024 / 1024 * 100) / 100,
                    heapTotal: Math.round(systemMem.heapTotal / 1024 / 1024 * 100) / 100,
                    rss: Math.round(systemMem.rss / 1024 / 1024 * 100) / 100,
                    external: Math.round(systemMem.external / 1024 / 1024 * 100) / 100
                }
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: 'Failed to get memory status',
            timestamp: new Date().toISOString()
        });
    }
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

// Buscar usuário por username
app.get('/hotspot/users/find', validateConnectionParams, (req, res) => hotspotController.findUserByUsername(req, res));

// Criação em massa de usuários
app.post('/hotspot/users/bulk', validateConnectionParams, (req, res) => hotspotController.createBulkUsers(req, res));

// Usuários ativos
app.get('/hotspot/active-users', validateConnectionParams, (req, res) => hotspotController.listActiveUsers(req, res));
app.post('/hotspot/disconnect', validateConnectionParams, validateId, (req, res) => hotspotController.disconnectUser(req, res));

// Gerenciamento de usuários por MAC address
app.post('/hotspot/users/delete-by-mac', validateConnectionParams, (req, res) => hotspotController.deleteUserByMac(req, res));
app.post('/hotspot/users/create-directly', validateConnectionParams, validateHotspotUserData, (req, res) => hotspotController.createUserDirectly(req, res));
app.post('/hotspot/users/manage-with-mac', validateConnectionParams, validateHotspotUserData, (req, res) => hotspotController.manageUserWithMac(req, res));

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

// Sistema
app.get('/system/essential-info', validateConnectionParams, (req, res) => systemController.getEssentialSystemInfo(req, res));

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




// ==================== ROTAS DE TEMPLATES ====================

// Aplicar template
app.post('/templates/apply', validateConnectionParams, (req, res) => templateController.applyTemplate(req, res));

// Verificar status do template
app.get('/templates/status', validateConnectionParams, (req, res) => templateController.checkStatus(req, res));

// Teste de conexão para templates
app.post('/templates/test-connection', validateConnectionParams, (req, res) => templateController.testConnection(req, res));

// ==================== ROTAS DE IP BINDING ====================

// Criar IP binding para pagamento aprovado
app.post('/ip-binding/create-from-payment', validateConnectionParams, (req, res) => ipBindingController.createIpBindingFromPayment(req, res));

// Teste de conexão para IP binding
app.post('/ip-binding/test-connection', validateConnectionParams, (req, res) => ipBindingController.testConnection(req, res));

// ==================== ROTAS DE TOOLS ====================

// Tool fetch direto
app.post('/tools/fetch', validateConnectionParams, (req, res) => systemController.executeToolFetch(req, res));

// ==================== ROTAS DE AUTENTICAÇÃO DE USUÁRIO ====================

// Verificar autenticação de usuário e atualizar comentário
app.post('/user-auth/check', validateConnectionParams, (req, res) => userAuthController.checkUserAuth(req, res));

// Webhook para autenticação de usuário (pode ser chamado pelo MikroTik)
app.post('/user-auth/webhook', (req, res) => userAuthController.handleAuthWebhook(req, res));

// ==================== MIDDLEWARE DE ERRO GLOBAL ====================

// Use the new error logging middleware
app.use(errorLogger);

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
            ],
            ipbinding: [
                'POST /ip-binding/create-from-payment',
                'POST /ip-binding/test-connection'
            ],
            userauth: [
                'POST /user-auth/check',
                'POST /user-auth/webhook'
            ]
        },
        timestamp: new Date().toISOString()
    });
});

// ==================== GRACEFUL SHUTDOWN ====================

process.on('SIGTERM', async () => {
    logShutdown('SIGTERM');
    
    // Shutdown memory keeper
    memoryKeeper.shutdown();
    
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
    logShutdown('SIGINT');
    
    // Shutdown memory keeper
    memoryKeeper.shutdown();
    
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
    logStartup(PORT);
    console.log(`[APP] [${new Date().toISOString()}] 🚀 MikroTik API iniciada na porta ${PORT}`);
    console.log(`[APP] [${new Date().toISOString()}] 📊 Interface web disponível em http://localhost:${PORT}`);
    console.log(`[APP] [${new Date().toISOString()}] 🏥 Health check disponível em http://localhost:${PORT}/health`);
    console.log(`[APP] [${new Date().toISOString()}] 📊 Error monitoring disponível em http://localhost:${PORT}/errors.html`);
    console.log(`[APP] [${new Date().toISOString()}] 🔗 Teste de conexão disponível em POST http://localhost:${PORT}/test-connection`);
    console.log(`[APP] [${new Date().toISOString()}] 📡 Endpoints principais:`);
    console.log(`[APP] [${new Date().toISOString()}]    - Hotspot: /hotspot/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - Sistema: /system/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - Scripts: /scripts/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - Schedules: /schedules/*`);
    console.log(`[APP] [${new Date().toISOString()}]    - Files: /files/*`);
    
    // Memory keeper handles memory allocation - no additional expansion needed
    setTimeout(() => {
        const memStatus = memoryKeeper.getStatus();
        console.log(`[APP] [${new Date().toISOString()}] 💾 MemoryKeeper Status:`);
        console.log(`[APP] [${new Date().toISOString()}] 📊 Target: ${memStatus.targetSizeMB}MB, Current Heap: ${memStatus.currentHeapMB.toFixed(2)}MB, Used: ${memStatus.usagePercent.toFixed(1)}%`);
        console.log(`[APP] [${new Date().toISOString()}] 🔧 Blocks: ${memStatus.blocksAllocated} x ${memStatus.blockSizeMB}MB each`);
    }, 3000); // Wait 3 seconds after startup
});

module.exports = app;