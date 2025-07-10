const fs = require('fs');
const path = require('path');
const os = require('os');

class Logger {
    constructor() {
        this.logDir = path.join(__dirname, '../../logs');
        this.errorLogFile = path.join(this.logDir, 'errors.log');
        this.accessLogFile = path.join(this.logDir, 'access.log');
        this.performanceLogFile = path.join(this.logDir, 'performance.log');
        this.apiMetrics = {
            totalRequests: 0,
            errorCount: 0,
            slowRequests: 0,
            endpoints: new Map(),
            startTime: new Date()
        };
        
        this.initializeLogDirectory();
        this.startMetricsCleanup();
    }

    initializeLogDirectory() {
        try {
            if (!fs.existsSync(this.logDir)) {
                fs.mkdirSync(this.logDir, { recursive: true });
                console.log(`[LOGGER] Log directory created: ${this.logDir}`);
            }
        } catch (error) {
            console.error(`[LOGGER] Failed to create log directory:`, error.message);
        }
    }

    formatTimestamp() {
        return new Date().toISOString();
    }

    getSystemInfo() {
        return {
            timestamp: this.formatTimestamp(),
            uptime: process.uptime(),
            systemUptime: os.uptime(),
            memoryUsage: process.memoryUsage(),
            systemMemory: {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
            },
            cpuUsage: process.cpuUsage(),
            platform: os.platform(),
            arch: os.arch(),
            nodeVersion: process.version,
            loadAverage: os.loadavg()
        };
    }

    logError(error, req = null, context = null) {
        const timestamp = this.formatTimestamp();
        const logEntry = {
            timestamp,
            level: 'ERROR',
            message: error.message || error,
            stack: error.stack || null,
            context: context || 'Unknown',
            request: req ? {
                method: req.method,
                url: req.url,
                ip: req.ip || req.connection?.remoteAddress,
                userAgent: req.headers['user-agent'],
                mikrotikIP: req.query?.ip || req.body?.ip,
                headers: {
                    'content-type': req.headers['content-type'],
                    'authorization': req.headers['authorization'] ? '[PRESENT]' : '[ABSENT]'
                }
            } : null,
            systemInfo: this.getSystemInfo()
        };

        // Console log
        console.error(`[ERROR] [${timestamp}] ${logEntry.message}`);
        if (req) {
            console.error(`[ERROR] Request: ${req.method} ${req.url} from ${req.ip || 'unknown'}`);
        }

        // File log
        this.writeToFile(this.errorLogFile, logEntry);

        // Update metrics
        this.apiMetrics.errorCount++;

        return logEntry;
    }

    logAccess(req, res, responseTime) {
        const timestamp = this.formatTimestamp();
        const logEntry = {
            timestamp,
            level: 'ACCESS',
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            responseTime: responseTime,
            ip: req.ip || req.connection?.remoteAddress,
            userAgent: req.headers['user-agent'],
            mikrotikIP: req.query?.ip || req.body?.ip,
            contentLength: res.get('Content-Length') || 0,
            referrer: req.headers['referer'] || req.headers['referrer'],
            endpoint: `${req.method} ${req.route?.path || req.url}`,
            success: res.statusCode < 400
        };

        // Console log for non-static files
        if (!req.url.match(/\.(css|js|png|jpg|jpeg|gif|ico|svg)$/)) {
            const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
            console.log(`[ACCESS] [${timestamp}] ${statusColor}${res.statusCode}\x1b[0m ${req.method} ${req.url} - ${responseTime}ms - ${req.ip || 'unknown'}`);
        }

        // File log
        this.writeToFile(this.accessLogFile, logEntry);

        // Update metrics
        this.updateMetrics(logEntry);

        return logEntry;
    }

    logPerformance(operation, duration, details = {}) {
        const timestamp = this.formatTimestamp();
        const logEntry = {
            timestamp,
            level: 'PERFORMANCE',
            operation,
            duration,
            details,
            systemInfo: {
                memoryUsage: process.memoryUsage(),
                cpuUsage: process.cpuUsage()
            }
        };

        // Console log for slow operations
        if (duration > 5000) { // 5 seconds
            console.warn(`[PERFORMANCE] [${timestamp}] SLOW OPERATION: ${operation} took ${duration}ms`);
        }

        // File log
        this.writeToFile(this.performanceLogFile, logEntry);

        return logEntry;
    }

    logInfo(message, context = null, details = {}) {
        const timestamp = this.formatTimestamp();
        const logEntry = {
            timestamp,
            level: 'INFO',
            message,
            context,
            details
        };

        console.log(`[INFO] [${timestamp}] ${message}`);
        this.writeToFile(this.accessLogFile, logEntry);

        return logEntry;
    }

    logWarning(message, context = null, details = {}) {
        const timestamp = this.formatTimestamp();
        const logEntry = {
            timestamp,
            level: 'WARNING',
            message,
            context,
            details
        };

        console.warn(`[WARNING] [${timestamp}] ${message}`);
        this.writeToFile(this.errorLogFile, logEntry);

        return logEntry;
    }

    updateMetrics(logEntry) {
        this.apiMetrics.totalRequests++;
        
        if (logEntry.responseTime > 3000) {
            this.apiMetrics.slowRequests++;
        }

        // Track endpoint usage
        const endpoint = logEntry.endpoint;
        if (!this.apiMetrics.endpoints.has(endpoint)) {
            this.apiMetrics.endpoints.set(endpoint, {
                count: 0,
                errors: 0,
                totalResponseTime: 0,
                avgResponseTime: 0,
                slowRequests: 0
            });
        }

        const endpointStats = this.apiMetrics.endpoints.get(endpoint);
        endpointStats.count++;
        endpointStats.totalResponseTime += logEntry.responseTime;
        endpointStats.avgResponseTime = Math.round(endpointStats.totalResponseTime / endpointStats.count);

        if (!logEntry.success) {
            endpointStats.errors++;
        }

        if (logEntry.responseTime > 3000) {
            endpointStats.slowRequests++;
        }
    }

    getMetrics() {
        const uptime = process.uptime();
        const requestsPerMinute = Math.round((this.apiMetrics.totalRequests / uptime) * 60);
        const errorRate = this.apiMetrics.totalRequests > 0 ? 
            ((this.apiMetrics.errorCount / this.apiMetrics.totalRequests) * 100).toFixed(2) : 0;

        return {
            ...this.apiMetrics,
            uptime: uptime,
            requestsPerMinute,
            errorRate: parseFloat(errorRate),
            systemInfo: this.getSystemInfo(),
            endpointsArray: Array.from(this.apiMetrics.endpoints.entries()).map(([endpoint, stats]) => ({
                endpoint,
                ...stats,
                errorRate: stats.count > 0 ? ((stats.errors / stats.count) * 100).toFixed(2) : 0
            })).sort((a, b) => b.count - a.count)
        };
    }

    getRecentLogs(type = 'errors', limit = 100) {
        let logFile;
        switch (type) {
            case 'errors':
                logFile = this.errorLogFile;
                break;
            case 'access':
                logFile = this.accessLogFile;
                break;
            case 'performance':
                logFile = this.performanceLogFile;
                break;
            default:
                logFile = this.errorLogFile;
        }

        try {
            if (!fs.existsSync(logFile)) {
                return [];
            }

            const content = fs.readFileSync(logFile, 'utf8');
            const lines = content.trim().split('\n').filter(line => line.trim());
            
            return lines
                .slice(-limit)
                .map(line => {
                    try {
                        return JSON.parse(line);
                    } catch (error) {
                        return { 
                            timestamp: new Date().toISOString(), 
                            level: 'ERROR', 
                            message: 'Failed to parse log entry',
                            originalLine: line 
                        };
                    }
                })
                .reverse(); // Most recent first
        } catch (error) {
            console.error(`[LOGGER] Failed to read log file ${logFile}:`, error.message);
            return [];
        }
    }

    writeToFile(filePath, logEntry) {
        try {
            const logLine = JSON.stringify(logEntry) + '\n';
            fs.appendFileSync(filePath, logLine);
        } catch (error) {
            console.error(`[LOGGER] Failed to write to log file ${filePath}:`, error.message);
        }
    }

    // Clean up old metrics every hour to prevent memory issues
    startMetricsCleanup() {
        setInterval(() => {
            const now = Date.now();
            const oneHourAgo = now - (60 * 60 * 1000);
            
            // Reset metrics if they're getting too large
            if (this.apiMetrics.totalRequests > 100000) {
                this.logInfo('Resetting metrics due to size limit');
                this.apiMetrics = {
                    totalRequests: 0,
                    errorCount: 0,
                    slowRequests: 0,
                    endpoints: new Map(),
                    startTime: new Date()
                };
            }
        }, 60 * 60 * 1000); // 1 hour
    }

    // Get health status
    getHealthStatus() {
        const metrics = this.getMetrics();
        const health = {
            status: 'healthy',
            timestamp: this.formatTimestamp(),
            uptime: metrics.uptime,
            checks: {}
        };

        // Check error rate
        if (metrics.errorRate > 10) {
            health.status = 'unhealthy';
            health.checks.errorRate = { status: 'fail', value: metrics.errorRate, threshold: 10 };
        } else if (metrics.errorRate > 5) {
            health.status = 'degraded';
            health.checks.errorRate = { status: 'warn', value: metrics.errorRate, threshold: 5 };
        } else {
            health.checks.errorRate = { status: 'pass', value: metrics.errorRate, threshold: 10 };
        }

        // Check memory usage
        const memoryUsage = process.memoryUsage();
        const memoryUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
        
        if (memoryUsagePercent > 90) {
            health.status = 'unhealthy';
            health.checks.memory = { status: 'fail', value: memoryUsagePercent, threshold: 90 };
        } else if (memoryUsagePercent > 80) {
            if (health.status === 'healthy') health.status = 'degraded';
            health.checks.memory = { status: 'warn', value: memoryUsagePercent, threshold: 80 };
        } else {
            health.checks.memory = { status: 'pass', value: memoryUsagePercent, threshold: 90 };
        }

        // Check if we have too many slow requests
        const slowRequestsPercent = metrics.totalRequests > 0 ? 
            (metrics.slowRequests / metrics.totalRequests) * 100 : 0;
            
        if (slowRequestsPercent > 20) {
            health.status = 'unhealthy';
            health.checks.performance = { status: 'fail', value: slowRequestsPercent, threshold: 20 };
        } else if (slowRequestsPercent > 10) {
            if (health.status === 'healthy') health.status = 'degraded';
            health.checks.performance = { status: 'warn', value: slowRequestsPercent, threshold: 10 };
        } else {
            health.checks.performance = { status: 'pass', value: slowRequestsPercent, threshold: 20 };
        }

        return health;
    }

    // Rotate logs (keep last 7 days)
    rotateLogs() {
        const logFiles = [this.errorLogFile, this.accessLogFile, this.performanceLogFile];
        
        logFiles.forEach(logFile => {
            try {
                if (fs.existsSync(logFile)) {
                    const stats = fs.statSync(logFile);
                    const fileAge = Date.now() - stats.mtime.getTime();
                    const sevenDays = 7 * 24 * 60 * 60 * 1000;
                    
                    if (fileAge > sevenDays || stats.size > 100 * 1024 * 1024) { // 100MB
                        const backupFile = `${logFile}.${new Date().toISOString().split('T')[0]}`;
                        fs.renameSync(logFile, backupFile);
                        this.logInfo(`Log file rotated: ${logFile} -> ${backupFile}`);
                    }
                }
            } catch (error) {
                console.error(`[LOGGER] Failed to rotate log file ${logFile}:`, error.message);
            }
        });
    }
}

// Create singleton instance
const logger = new Logger();

// Rotate logs daily
setInterval(() => {
    logger.rotateLogs();
}, 24 * 60 * 60 * 1000); // 24 hours

module.exports = logger;