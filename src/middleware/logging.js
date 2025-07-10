const logger = require('../utils/logger');

// Request logging middleware
const requestLogger = (req, res, next) => {
    const startTime = Date.now();
    
    // Store original end function
    const originalEnd = res.end;
    
    // Override res.end to capture response time
    res.end = function(...args) {
        const responseTime = Date.now() - startTime;
        
        // Only log if we have valid request data
        if (req && req.method && req.url && res && res.statusCode) {
            logger.logAccess(req, res, responseTime);
        }
        
        // Memory management strategy (more aggressive)
        if (logger.apiMetrics.totalRequests % 10 === 0) {
            const memUsage = process.memoryUsage();
            const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;
            
            // More aggressive memory management
            if (heapUsedPercent > 80) {
                try {
                    // Clear some metrics to free memory
                    if (logger.apiMetrics.endpoints.size > 100) {
                        const recentEndpoints = Array.from(logger.apiMetrics.endpoints.entries())
                            .sort((a, b) => b[1].lastAccessed - a[1].lastAccessed)
                            .slice(0, 50);
                        logger.apiMetrics.endpoints = new Map(recentEndpoints);
                    }
                    
                    // Force GC
                    if (global.gc) {
                        global.gc();
                        console.log(`[GC] [${new Date().toISOString()}] Aggressive GC triggered - Memory was ${heapUsedPercent.toFixed(1)}%`);
                    }
                } catch (error) {
                    console.warn(`[MEMORY] Could not perform aggressive cleanup:`, error.message);
                }
            }
        }
        
        // Call original end function
        originalEnd.apply(res, args);
    };
    
    // Add request ID for tracking
    req.requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    res.setHeader('X-Request-ID', req.requestId);
    
    next();
};

// Error logging middleware (should be used after all other middleware)
const errorLogger = (error, req, res, next) => {
    // Log the error with request context
    const loggedError = logger.logError(error, req, 'Express Error Handler');
    
    // Add request ID to error response
    const errorResponse = {
        success: false,
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message,
        requestId: req.requestId,
        timestamp: new Date().toISOString()
    };
    
    // Include stack trace in development
    if (process.env.NODE_ENV !== 'production') {
        errorResponse.stack = error.stack;
        errorResponse.details = loggedError;
    }
    
    // Set appropriate status code
    const statusCode = error.statusCode || error.status || 500;
    res.status(statusCode).json(errorResponse);
};

// Async error wrapper for controllers
const asyncErrorHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch((error) => {
            // Log async errors
            logger.logError(error, req, 'Async Controller Error');
            next(error);
        });
    };
};

// Performance monitoring middleware
const performanceMonitor = (operationName) => {
    return (req, res, next) => {
        const startTime = Date.now();
        
        // Override res.end to capture operation time
        const originalEnd = res.end;
        res.end = function(...args) {
            const duration = Date.now() - startTime;
            
            // Log performance if operation takes too long
            if (duration > 1000) { // 1 second threshold
                logger.logPerformance(operationName, duration, {
                    method: req.method,
                    url: req.url,
                    statusCode: res.statusCode,
                    mikrotikIP: req.query?.ip || req.body?.ip
                });
            }
            
            originalEnd.apply(res, args);
        };
        
        next();
    };
};

// MikroTik specific logging
const mikrotikLogger = (req, res, next) => {
    const mikrotikIP = req.query?.ip || req.body?.ip;
    const operation = req.url.split('/').filter(Boolean).join('.');
    
    if (mikrotikIP) {
        logger.logInfo(`MikroTik Operation: ${operation}`, 'MikroTik API', {
            mikrotikIP,
            method: req.method,
            url: req.url,
            userAgent: req.headers['user-agent'],
            clientIP: req.ip || req.connection?.remoteAddress
        });
    }
    
    next();
};

// Security event logger (to be used with security middleware)
const securityLogger = (eventType) => {
    return (req, res, next) => {
        logger.logWarning(`Security Event: ${eventType}`, 'Security', {
            ip: req.ip || req.connection?.remoteAddress,
            url: req.url,
            method: req.method,
            userAgent: req.headers['user-agent'],
            headers: req.headers
        });
        next();
    };
};

// Rate limit logging
const rateLimitLogger = (req, res, next) => {
    const originalJson = res.json;
    
    res.json = function(data) {
        // Check if this is a rate limit response
        if (res.statusCode === 429) {
            logger.logWarning('Rate limit exceeded', 'Rate Limiter', {
                ip: req.ip || req.connection?.remoteAddress,
                url: req.url,
                method: req.method,
                userAgent: req.headers['user-agent']
            });
        }
        
        originalJson.call(this, data);
    };
    
    next();
};

// Health check logging
const healthLogger = (req, res, next) => {
    if (req.url === '/health') {
        const health = logger.getHealthStatus();
        logger.logInfo('Health check performed', 'Health Monitor', {
            status: health.status,
            clientIP: req.ip || req.connection?.remoteAddress
        });
    }
    next();
};

// Request validation error logger
const validationErrorLogger = (req, res, next) => {
    const originalStatus = res.status;
    
    res.status = function(statusCode) {
        if (statusCode === 400) {
            logger.logWarning('Validation error', 'Request Validation', {
                method: req.method,
                url: req.url,
                body: req.body,
                query: req.query,
                ip: req.ip || req.connection?.remoteAddress
            });
        }
        
        return originalStatus.call(this, statusCode);
    };
    
    next();
};

// Startup logger
const logStartup = (port) => {
    logger.logInfo(`MikroTik API Server started on port ${port}`, 'Server Startup', {
        nodeVersion: process.version,
        platform: process.platform,
        env: process.env.NODE_ENV || 'development',
        pid: process.pid
    });
};

// Shutdown logger
const logShutdown = (signal) => {
    logger.logInfo(`Server shutting down gracefully (${signal})`, 'Server Shutdown', {
        uptime: process.uptime(),
        signal
    });
};

module.exports = {
    requestLogger,
    errorLogger,
    asyncErrorHandler,
    performanceMonitor,
    mikrotikLogger,
    securityLogger,
    rateLimitLogger,
    healthLogger,
    validationErrorLogger,
    logStartup,
    logShutdown
};