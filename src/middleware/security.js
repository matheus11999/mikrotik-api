const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

// Cache para monitoramento de ataques
const securityCache = new Map();
const SECURITY_WINDOW = 300000; // 5 minutos
const MAX_FAILED_ATTEMPTS = 10;
const SUSPICIOUS_PATTERNS = [
    /\.\.\//, // Path traversal
    /<script/i, // XSS
    /union.*select/i, // SQL injection
    /javascript:/i, // JavaScript injection
    /%2e%2e%2f/i, // Encoded path traversal
    /%3cscript/i, // Encoded XSS
];

// Middleware de logging de segurança
const securityLogger = (req, res, next) => {
    const timestamp = new Date().toISOString();
    const ip = req.ip || req.connection.remoteAddress;
    const mikrotikIP = req.query.ip || req.body?.ip;
    const userAgent = req.headers['user-agent'] || 'Unknown';
    const method = req.method;
    const url = req.url;
    const authHeader = req.headers['authorization'];
    
    // Check if this is a whitelisted endpoint (same logic as app.js)
    const isWhitelisted = (
        req.path === '/health' || 
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
        req.path.includes('dashboard')
    );
    
    // Log básico da requisição
    console.log(`[SECURITY] [${timestamp}] ${method} ${url} - Client: ${ip} - MikroTik: ${mikrotikIP || 'N/A'} - UA: ${userAgent.substring(0, 100)}`);
    
    // Verificar padrões suspeitos
    const fullUrl = `${method} ${url} ${JSON.stringify(req.query)} ${JSON.stringify(req.body)}`;
    const suspiciousPattern = SUSPICIOUS_PATTERNS.find(pattern => pattern.test(fullUrl));
    
    if (suspiciousPattern) {
        console.warn(`[SECURITY] [${timestamp}] ⚠️  SUSPICIOUS PATTERN DETECTED: ${suspiciousPattern} - IP: ${ip} - URL: ${url}`);
        
        // Log para arquivo se necessário
        logSecurityEvent('SUSPICIOUS_PATTERN', {
            ip,
            mikrotikIP,
            url,
            pattern: suspiciousPattern.toString(),
            userAgent,
            timestamp
        });
    }
    
    // Only track failed auth for non-whitelisted endpoints
    if (!authHeader && process.env.API_TOKEN && !isWhitelisted) {
        trackFailedAuth(ip, 'NO_TOKEN');
    }
    
    next();
};

// Middleware para detectar tentativas de força bruta
const bruteForceProtection = (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    if (!securityCache.has(ip)) {
        securityCache.set(ip, {
            attempts: 0,
            firstAttempt: now,
            blocked: false,
            blockUntil: 0
        });
    }
    
    const ipData = securityCache.get(ip);
    
    // Verificar se ainda está bloqueado
    if (ipData.blocked && now < ipData.blockUntil) {
        const remainingTime = Math.ceil((ipData.blockUntil - now) / 1000);
        console.warn(`[SECURITY] [${new Date().toISOString()}] 🚫 BLOCKED IP: ${ip} - Remaining: ${remainingTime}s`);
        
        return res.status(429).json({
            success: false,
            error: 'IP temporarily blocked due to suspicious activity',
            message: `Access blocked. Try again in ${remainingTime} seconds.`,
            retryAfter: remainingTime,
            timestamp: new Date().toISOString()
        });
    }
    
    // Reset se passou da janela de tempo
    if (now - ipData.firstAttempt > SECURITY_WINDOW) {
        ipData.attempts = 0;
        ipData.firstAttempt = now;
        ipData.blocked = false;
    }
    
    next();
};

// Função para rastrear falhas de autenticação
const trackFailedAuth = (ip, reason) => {
    const now = Date.now();
    
    if (!securityCache.has(ip)) {
        securityCache.set(ip, {
            attempts: 0,
            firstAttempt: now,
            blocked: false,
            blockUntil: 0
        });
    }
    
    const ipData = securityCache.get(ip);
    ipData.attempts++;
    
    console.warn(`[SECURITY] [${new Date().toISOString()}] ⚠️  FAILED AUTH: ${ip} - Reason: ${reason} - Attempts: ${ipData.attempts}/${MAX_FAILED_ATTEMPTS}`);
    
    // Bloquear se exceder tentativas
    if (ipData.attempts >= MAX_FAILED_ATTEMPTS) {
        ipData.blocked = true;
        ipData.blockUntil = now + (30 * 60 * 1000); // 30 minutos
        
        console.error(`[SECURITY] [${new Date().toISOString()}] 🚫 BLOCKING IP: ${ip} - Reason: Too many failed attempts (${ipData.attempts})`);
        
        logSecurityEvent('IP_BLOCKED', {
            ip,
            reason,
            attempts: ipData.attempts,
            blockDuration: 30,
            timestamp: new Date().toISOString()
        });
    }
};

// Função para log de eventos de segurança
const logSecurityEvent = (eventType, data) => {
    const logEntry = {
        timestamp: new Date().toISOString(),
        eventType,
        ...data
    };
    
    // Console log sempre
    console.error(`[SECURITY-EVENT] ${JSON.stringify(logEntry)}`);
    
    // Log em arquivo se configurado
    if (process.env.SECURITY_LOG_FILE) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(process.env.SECURITY_LOG_FILE, logLine);
        } catch (error) {
            console.error(`[SECURITY] Failed to write to log file:`, error.message);
        }
    }
};

// Middleware para headers de segurança
const securityHeaders = (req, res, next) => {
    // Headers de segurança básicos
    res.set({
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Content-Security-Policy': "default-src 'self'",
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-API-Version': '1.0.0',
        'X-Rate-Limit-Policy': 'per-mikrotik-ip'
    });
    
    // Remover headers que revelam informações
    res.removeHeader('X-Powered-By');
    res.removeHeader('Server');
    
    next();
};

// Função para validar integridade de dados críticos
const validateDataIntegrity = (data, expectedHash) => {
    if (!expectedHash) return true;
    
    const dataString = typeof data === 'object' ? JSON.stringify(data) : String(data);
    const actualHash = crypto.createHash('sha256').update(dataString).digest('hex');
    
    return actualHash === expectedHash;
};

// Middleware para sanitização avançada
const advancedSanitization = (req, res, next) => {
    // Sanitizar parâmetros críticos
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        // Remover caracteres perigosos
        return str
            .replace(/[<>\"']/g, '') // XSS básico
            .replace(/\.\./g, '.') // Path traversal
            .replace(/[;\|\&\$]/g, '') // Command injection
            .trim();
    };
    
    // Sanitizar query parameters
    for (const key in req.query) {
        if (typeof req.query[key] === 'string') {
            req.query[key] = sanitizeString(req.query[key]);
        }
    }
    
    // Sanitizar body (apenas strings)
    if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
            if (typeof req.body[key] === 'string') {
                req.body[key] = sanitizeString(req.body[key]);
            }
        }
    }
    
    next();
};

// Função para limpar bloqueios de IP
const clearIPBlocks = (ip = null) => {
    if (ip) {
        // Limpar IP específico
        if (securityCache.has(ip)) {
            securityCache.delete(ip);
            console.log(`[SECURITY] [${new Date().toISOString()}] Cleared blocks for IP: ${ip}`);
            return { cleared: [ip] };
        }
        return { cleared: [] };
    } else {
        // Limpar todos os bloqueios
        const clearedIPs = [];
        for (const [ipAddress, data] of securityCache.entries()) {
            if (data.blocked) {
                clearedIPs.push(ipAddress);
            }
        }
        securityCache.clear();
        console.log(`[SECURITY] [${new Date().toISOString()}] Cleared all IP blocks. Total: ${clearedIPs.length}`);
        return { cleared: clearedIPs };
    }
};

// Função para obter status dos bloqueios
const getSecurityStatus = () => {
    const now = Date.now();
    const blockedIPs = [];
    const monitoredIPs = [];
    
    for (const [ip, data] of securityCache.entries()) {
        if (data.blocked && now < data.blockUntil) {
            blockedIPs.push({
                ip,
                attempts: data.attempts,
                blockedSince: new Date(data.blockUntil - (30 * 60 * 1000)).toISOString(),
                remainingTime: Math.ceil((data.blockUntil - now) / 1000)
            });
        } else if (data.attempts > 0) {
            monitoredIPs.push({
                ip,
                attempts: data.attempts,
                firstAttempt: new Date(data.firstAttempt).toISOString()
            });
        }
    }
    
    return {
        blockedIPs,
        monitoredIPs,
        totalBlocked: blockedIPs.length,
        totalMonitored: monitoredIPs.length
    };
};

// Limpeza periódica do cache de segurança
setInterval(() => {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [ip, data] of securityCache.entries()) {
        // Remover entradas antigas ou desbloqueadas
        if (now - data.firstAttempt > SECURITY_WINDOW && !data.blocked) {
            securityCache.delete(ip);
            cleanedCount++;
        } else if (data.blocked && now > data.blockUntil) {
            data.blocked = false;
            data.attempts = 0;
        }
    }
    
    if (cleanedCount > 0) {
        console.log(`[SECURITY] [${new Date().toISOString()}] Cache cleanup: removed ${cleanedCount} entries`);
    }
}, 60000); // 1 minuto

module.exports = {
    securityLogger,
    bruteForceProtection,
    trackFailedAuth,
    logSecurityEvent,
    securityHeaders,
    validateDataIntegrity,
    advancedSanitization,
    clearIPBlocks,
    getSecurityStatus
};