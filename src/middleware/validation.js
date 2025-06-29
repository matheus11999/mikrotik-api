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

// Middleware para validação de dados de servidor hotspot
const validateHotspotServerData = (req, res, next) => {
    const serverData = req.body;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando dados do servidor hotspot`);
    
    if (!serverData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do servidor não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do servidor é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    if (!serverData.interface) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Interface do servidor não fornecida`);
        return res.status(400).json({
            success: false,
            error: 'Interface do servidor é obrigatória',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar nome do servidor
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(serverData.name)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do servidor inválido: ${serverData.name}`);
        return res.status(400).json({
            success: false,
            error: 'Nome do servidor deve conter apenas letras, números, hífens e underscores',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados do servidor validados com sucesso: ${serverData.name}`);
    next();
};

// Middleware para validação de dados de server profile
const validateHotspotServerProfileData = (req, res, next) => {
    const profileData = req.body;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando dados do server profile`);
    
    if (!profileData.name) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do server profile não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do server profile é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    // Validar nome do server profile
    const nameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!nameRegex.test(profileData.name)) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do server profile inválido: ${profileData.name}`);
        return res.status(400).json({
            success: false,
            error: 'Nome do server profile deve conter apenas letras, números, hífens e underscores',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Dados do server profile validados com sucesso: ${profileData.name}`);
    next();
};

// Middleware para validação de nome de arquivo
const validateFileName = (req, res, next) => {
    const { filename } = req.query;
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Validando nome do arquivo: ${filename}`);
    
    if (!filename) {
        console.error(`[VALIDATION] [${new Date().toISOString()}] Nome do arquivo não fornecido`);
        return res.status(400).json({
            success: false,
            error: 'Nome do arquivo é obrigatório',
            timestamp: new Date().toISOString()
        });
    }
    
    console.log(`[VALIDATION] [${new Date().toISOString()}] Nome do arquivo validado com sucesso: ${filename}`);
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

// Middleware para rate limiting baseado no IP do MikroTik com sliding window
class RateLimiter {
    constructor() {
        this.requests = new Map();
        this.WINDOW_SIZE = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000; // 1 minuto
        this.MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200; // máximo por minuto
        this.BURST_LIMIT = parseInt(process.env.RATE_LIMIT_BURST) || 50; // limite de burst
        this.BURST_WINDOW = parseInt(process.env.RATE_LIMIT_BURST_WINDOW_MS) || 10 * 1000; // 10 segundos
        this.CLEANUP_INTERVAL = parseInt(process.env.RATE_LIMIT_CLEANUP_INTERVAL_MS) || 300 * 1000; // 5 minutos
        
        // Limpeza periódica
        this.cleanupTimer = setInterval(() => this.cleanup(), this.CLEANUP_INTERVAL);
    }
    
    cleanup() {
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [key, data] of this.requests.entries()) {
            // Remover entradas antigas
            data.requests = data.requests.filter(timestamp => now - timestamp < this.WINDOW_SIZE);
            
            if (data.requests.length === 0) {
                this.requests.delete(key);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`[RATE-LIMITER] [${new Date().toISOString()}] Limpeza: removidas ${cleanedCount} entradas antigas`);
        }
    }
    
    getRateLimitKey(req) {
        // Priorizar IP do MikroTik sobre IP do cliente
        const mikrotikIP = req.query.ip || req.body?.ip;
        const clientIP = req.ip || req.connection.remoteAddress || req.socket.remoteAddress;
        
        // Se tiver IP do MikroTik, usar ele
        if (mikrotikIP && /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(mikrotikIP)) {
            return { key: `mikrotik:${mikrotikIP}`, type: 'MikroTik', ip: mikrotikIP };
        }
        
        // Senão usar IP do cliente
        return { key: `client:${clientIP}`, type: 'Client', ip: clientIP };
    }
    
    checkRateLimit(req, res, next) {
        const { key, type, ip } = this.getRateLimitKey(req);
        const now = Date.now();
        
        console.log(`[RATE-LIMITER] [${new Date().toISOString()}] Verificando rate limit para ${type} IP: ${ip}`);
        
        if (!this.requests.has(key)) {
            this.requests.set(key, {
                requests: [],
                firstRequest: now,
                blocked: false,
                blockUntil: 0
            });
        }
        
        const data = this.requests.get(key);
        
        // Verificar se ainda está bloqueado
        if (data.blocked && now < data.blockUntil) {
            const remainingTime = Math.ceil((data.blockUntil - now) / 1000);
            console.warn(`[RATE-LIMITER] [${new Date().toISOString()}] ${type} IP ${ip} ainda bloqueado por ${remainingTime}s`);
            
            return res.status(429).json({
                success: false,
                error: `Rate limit exceeded for ${type.toLowerCase()} ${ip}`,
                message: `Too many requests. Try again in ${remainingTime} seconds.`,
                rateLimitKey: key,
                type: type.toLowerCase(),
                ip: ip,
                retryAfter: remainingTime,
                timestamp: new Date().toISOString()
            });
        }
        
        // Remover requests antigas
        data.requests = data.requests.filter(timestamp => now - timestamp < this.WINDOW_SIZE);
        
        // Verificar burst limit (últimos 10 segundos)
        const recentRequests = data.requests.filter(timestamp => now - timestamp < this.BURST_WINDOW);
        
        if (recentRequests.length >= this.BURST_LIMIT) {
            console.warn(`[RATE-LIMITER] [${new Date().toISOString()}] Burst limit excedido para ${type} IP: ${ip} (${recentRequests.length}/${this.BURST_LIMIT} em ${this.BURST_WINDOW/1000}s)`);
            
            // Bloquear por 1 minuto
            data.blocked = true;
            data.blockUntil = now + 60000;
            
            return res.status(429).json({
                success: false,
                error: `Burst limit exceeded for ${type.toLowerCase()} ${ip}`,
                message: `Too many requests in short time. Blocked for 1 minute.`,
                rateLimitKey: key,
                type: type.toLowerCase(),
                ip: ip,
                burstRequests: recentRequests.length,
                burstLimit: this.BURST_LIMIT,
                retryAfter: 60,
                timestamp: new Date().toISOString()
            });
        }
        
        // Verificar limit geral
        if (data.requests.length >= this.MAX_REQUESTS) {
            console.warn(`[RATE-LIMITER] [${new Date().toISOString()}] Rate limit geral excedido para ${type} IP: ${ip} (${data.requests.length}/${this.MAX_REQUESTS})`);
            
            const retryAfter = Math.ceil(this.WINDOW_SIZE / 1000);
            
            return res.status(429).json({
                success: false,
                error: `Rate limit exceeded for ${type.toLowerCase()} ${ip}`,
                message: `Too many requests. Try again in ${retryAfter} seconds.`,
                rateLimitKey: key,
                type: type.toLowerCase(),
                ip: ip,
                requests: data.requests.length,
                maxRequests: this.MAX_REQUESTS,
                windowSizeSeconds: this.WINDOW_SIZE / 1000,
                retryAfter: retryAfter,
                timestamp: new Date().toISOString()
            });
        }
        
        // Adicionar request atual
        data.requests.push(now);
        data.blocked = false;
        
        // Adicionar headers de rate limit
        res.set({
            'X-RateLimit-Limit': this.MAX_REQUESTS,
            'X-RateLimit-Remaining': Math.max(0, this.MAX_REQUESTS - data.requests.length),
            'X-RateLimit-Reset': new Date(now + this.WINDOW_SIZE).toISOString(),
            'X-RateLimit-Type': type
        });
        
        console.log(`[RATE-LIMITER] [${new Date().toISOString()}] Rate limit OK para ${type} IP: ${ip} (${data.requests.length}/${this.MAX_REQUESTS})`);
        next();
    }
    
    shutdown() {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
        }
    }
}

const rateLimiterInstance = new RateLimiter();
const rateLimiter = (req, res, next) => rateLimiterInstance.checkRateLimit(req, res, next);

// Graceful shutdown
process.on('SIGTERM', () => rateLimiterInstance.shutdown());
process.on('SIGINT', () => rateLimiterInstance.shutdown());

module.exports = {
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
    rateLimiter,
    rateLimiterInstance
};