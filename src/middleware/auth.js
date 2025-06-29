const crypto = require('crypto');
const { trackFailedAuth, logSecurityEvent } = require('./security');

// Função para comparação timing-safe
const timingSafeCompare = (a, b) => {
    if (a.length !== b.length) {
        return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
        result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return result === 0;
};

// Cache para tokens válidos hasheados
const tokenCache = new Map();
const CACHE_TTL = 300000; // 5 minutos

// Contador de tentativas de autenticação por IP
const authAttempts = new Map();

const authenticateApiToken = (req, res, next) => {
    // Se não há token configurado, pula a autenticação
    if (!process.env.API_TOKEN) {
        console.warn(`[AUTH] [${new Date().toISOString()}] API_TOKEN não configurado - MODO INSEGURO`);
        return next();
    }

    // Suportar tanto Authorization Bearer quanto X-API-Token para compatibilidade
    const authHeader = req.headers['authorization'];
    const apiTokenHeader = req.headers['x-api-token'];
    
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    } else if (apiTokenHeader) {
        token = apiTokenHeader;
    }

    console.log(`[AUTH] [${new Date().toISOString()}] Verificando autenticação para ${req.method} ${req.url}`);

    if (!token) {
        const ip = req.ip || req.connection.remoteAddress;
        console.error(`[AUTH] [${new Date().toISOString()}] Token não fornecido - IP: ${ip}`);
        
        trackFailedAuth(ip, 'NO_TOKEN');
        
        return res.status(401).json({
            success: false,
            error: "Authentication required",
            message: "Please provide a valid Bearer token in Authorization header",
            timestamp: new Date().toISOString()
        });
    }

    // Validar formato do token (deve ter pelo menos 32 caracteres)
    if (token.length < 32) {
        const ip = req.ip || req.connection.remoteAddress;
        console.error(`[AUTH] [${new Date().toISOString()}] Token muito curto - IP: ${ip}`);
        
        trackFailedAuth(ip, 'INVALID_TOKEN_FORMAT');
        
        return res.status(401).json({
            success: false,
            error: "Invalid token format",
            message: "Token must have at least 32 characters",
            timestamp: new Date().toISOString()
        });
    }

    // Verificar cache primeiro
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const cachedToken = tokenCache.get(tokenHash);
    
    if (cachedToken && Date.now() - cachedToken.timestamp < CACHE_TTL) {
        console.log(`[AUTH] [${new Date().toISOString()}] Token válido encontrado no cache`);
        return next();
    }

    // Comparação timing-safe
    const expectedToken = process.env.API_TOKEN;
    const ip = req.ip || req.connection.remoteAddress;
    
    if (!timingSafeCompare(token, expectedToken)) {
        console.error(`[AUTH] [${new Date().toISOString()}] Token inválido fornecido - IP: ${ip}`);
        
        trackFailedAuth(ip, 'INVALID_TOKEN');
        
        // Log evento de segurança
        logSecurityEvent('INVALID_TOKEN_ATTEMPT', {
            ip,
            mikrotikIP: req.query.ip || req.body?.ip,
            userAgent: req.headers['user-agent'],
            url: req.url,
            method: req.method
        });
        
        // Delay para prevenir ataques de timing
        setTimeout(() => {
            return res.status(401).json({
                success: false,
                error: "Invalid token",
                message: "The provided token is invalid",
                timestamp: new Date().toISOString()
            });
        }, Math.random() * 100 + 50); // 50-150ms delay
        return;
    }

    // Armazenar no cache
    tokenCache.set(tokenHash, {
        timestamp: Date.now(),
        valid: true
    });

    // Limpar cache antigo periodicamente
    if (tokenCache.size > 1000) {
        const now = Date.now();
        for (const [hash, data] of tokenCache.entries()) {
            if (now - data.timestamp > CACHE_TTL) {
                tokenCache.delete(hash);
            }
        }
    }

    // Log autenticação bem-sucedida
    console.log(`[AUTH] [${new Date().toISOString()}] Autenticação bem-sucedida - IP: ${ip}`);
    
    // Adicionar informações do usuário autenticado ao request
    req.auth = {
        authenticated: true,
        ip: ip,
        mikrotikIP: req.query.ip || req.body?.ip,
        timestamp: new Date().toISOString()
    };
    
    next();
};

module.exports = {
    authenticateApiToken,
    timingSafeCompare
}; 