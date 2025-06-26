// Middleware para validação de parâmetros de conexão
const validateConnectionParams = (req, res, next) => {
    const { ip, username, password } = req.query;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando parâmetros de conexão para IP: ${ip}`);
    
    if (!ip || !username || !password) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Parâmetros obrigatórios ausentes - IP: ${!!ip}, Username: ${!!username}, Password: ${!!password}`);
        return res.status(400).json({
            success: false,
            error: 'Parâmetros obrigatórios: ip, username, password',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar formato do IP
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Formato de IP inválido: ${ip}`);
        return res.status(400).json({
            success: false,
            error: 'Formato de IP inválido',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar porta se fornecida
    const port = req.query.port;
    if (port && (isNaN(port) || port < 1 || port > 65535)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Porta inválida: ${port}`);
        return res.status(400).json({
            success: false,
            error: 'Porta deve ser um número entre 1 e 65535',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Parâmetros de conexão validados com sucesso para ${ip}`);
    next();
};

// Middleware para validação de ID
const validateId = (req, res, next) => {
    const { id } = req.query;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando ID: ${id}`);
    
    if (!id) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] ID não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'ID é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] ID validado com sucesso: ${id}`);
    next();
};

// Middleware para validação de dados de usuário do hotspot
const validateHotspotUserData = (req, res, next) => {
    const userData = req.body;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando dados do usuário do hotspot`);
    
    if (!userData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do usuário não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do usuário é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar nome do usuário (alfanumérico, hífens e underscores)
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(userData.name)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do usuário inválido: ${userData.name}`);
        return res.status(400).json({
            success: false,
            error: 'Nome do usuário deve conter apenas letras, números, hífens e underscores',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados do usuário validados com sucesso: ${userData.name}`);
    next();
};

// Middleware para validação de dados de profile do hotspot
const validateHotspotProfileData = (req, res, next) => {
    const profileData = req.body;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando dados do profile do hotspot`);
    
    if (!profileData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do profile não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do profile é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar nome do profile
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(profileData.name)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do profile inválido: ${profileData.name}`);
        return res.status(400).json({
            success: false,
            error: 'Nome do profile deve conter apenas letras, números, hífens e underscores',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados do profile validados com sucesso: ${profileData.name}`);
    next();
};

// Middleware para validação de dados de script
const validateScriptData = (req, res, next) => {
    const scriptData = req.body;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando dados do script`);
    
    if (!scriptData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do script não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do script é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    if (!scriptData.source) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Código do script não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Código do script é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar nome do script
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(scriptData.name)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do script inválido: ${scriptData.name}`);
        return res.status(400).json({
            success: false,
            error: 'Nome do script deve conter apenas letras, números, hífens e underscores',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados do script validados com sucesso: ${scriptData.name}`);
    next();
};

// Middleware para validação de dados de schedule
const validateScheduleData = (req, res, next) => {
    const scheduleData = req.body;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando dados do schedule`);
    
    if (!scheduleData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do schedule não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do schedule é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    if (!scheduleData.on_event) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Código do schedule não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Código a ser executado é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar nome do schedule
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(scheduleData.name)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do schedule inválido: ${scheduleData.name}`);
        return res.status(400).json({
            success: false,
            error: 'Nome do schedule deve conter apenas letras, números, hífens e underscores',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar formato do horário se fornecido
    if (scheduleData.start_time) {
        const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/;
        if (!timeRegex.test(scheduleData.start_time)) {
            console.error(`[VALIDATION] [${new Date().toISOString()}] Horário inválido: ${scheduleData.start_time}`);
            return res.status(400).json({
                success: false,
                error: 'Formato de horário inválido (use HH:MM:SS)',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    // Validar formato do intervalo se fornecido
    if (scheduleData.interval) {
        const intervalRegex = /^(\d+d|\d{2}:\d{2}:\d{2})$/;
        if (!intervalRegex.test(scheduleData.interval)) {
            console.error(`[VALIDATION] [${new Date().toISOString()}] Intervalo inválido: ${scheduleData.interval}`);
            return res.status(400).json({
                success: false,
                error: 'Formato de intervalo inválido (use HH:MM:SS ou Xd)',
                timestamp: new Date().toISOString()
            });
        }
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados do schedule validados com sucesso: ${scheduleData.name}`);
    next();
};

// Middleware para validação de dados do sistema
const validateSystemData = (req, res, next) => {
    const systemData = req.body;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando dados do sistema`);
    
    // Validação específica baseada no endpoint
    const endpoint = req.route.path;
    
    if (endpoint.includes('/identity') && !systemData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome da identidade não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome da identidade é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    if (endpoint.includes('/backup') && !systemData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do backup não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do backup é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados do sistema validados com sucesso`);
    next();
};

// Middleware para sanitização de dados de entrada
const sanitizeInput = (req, res, next) => {
    console.log(`[VALIDATION] [${new Date().toISOString()}] Sanitizando dados de entrada`);
    
    // Sanitizar query parameters
    for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = req.query[key].trim();
        }
    }
    
    // Sanitizar body data
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = req.body[key].trim();
            }
        }
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados sanitizados com sucesso`);
    next();
};

// Middleware para rate limiting básico
const rateLimiter = (() => {
    const requests = new Map();
    const WINDOW_SIZE = 60 * 1000; // 1 minuto
    const MAX_REQUESTS = 100; // máximo de 100 requests por minuto por IP
    
    return (req, res, next) => {
        const clientIP = req.ip || req.connection.remoteAddress;
        const now = Date.now();
        
        console.log(`[RATE-LIMITER] [${new Date().toISOString()}] Verificando rate limit para IP: ${clientIP}`);
        
        if (!requests.has(clientIP)) {
            requests.set(clientIP, []);
        }
        
        const clientRequests = requests.get(clientIP);
        
        // Remover requests antigas
        const validRequests = clientRequests.filter(timestamp => now - timestamp < WINDOW_SIZE);
        requests.set(clientIP, validRequests);
        
        if (validRequests.length >= MAX_REQUESTS) {
            console.warn(`[RATE-LIMITER] [${new Date().toISOString()}] Rate limit excedido para IP: ${clientIP}`);
            return res.status(429).json({
                success: false,
                error: 'Muitas requisições. Tente novamente em 1 minuto.',
                timestamp: new Date().toISOString()
            });
        }
        
        // Adicionar request atual
        validRequests.push(now);
        requests.set(clientIP, validRequests);
        
        console.log(`[RATE-LIMITER] [${new Date().toISOString()}] Rate limit OK para IP: ${clientIP} (${validRequests.length}/${MAX_REQUESTS})`);
        next();
    };
})();

module.exports = {
    validateConnectionParams,
    validateId,
    validateHotspotUserData,
    validateHotspotProfileData,
    validateScriptData,
    validateScheduleData,
    validateSystemData,
    sanitizeInput,
    rateLimiter
};