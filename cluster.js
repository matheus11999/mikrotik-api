const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isMaster) {
    console.log(`[CLUSTER] Master process ${process.pid} is running`);
    console.log(`[CLUSTER] Detected ${numCPUs} CPU cores`);
    console.log(`[CLUSTER] Starting ${numCPUs} worker processes...`);
    
    // Fork workers
    for (let i = 0; i < numCPUs; i++) {
        const worker = cluster.fork();
        console.log(`[CLUSTER] Worker ${worker.process.pid} started (${i + 1}/${numCPUs})`);
    }
    
    // Handle worker exits
    cluster.on('exit', (worker, code, signal) => {
        console.log(`[CLUSTER] Worker ${worker.process.pid} died with code ${code} and signal ${signal}`);
        console.log('[CLUSTER] Starting a new worker...');
        const newWorker = cluster.fork();
        console.log(`[CLUSTER] New worker ${newWorker.process.pid} started`);
    });
    
    // Graceful shutdown
    process.on('SIGTERM', () => {
        console.log('[CLUSTER] Master received SIGTERM, shutting down workers...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
    });
    
    process.on('SIGINT', () => {
        console.log('[CLUSTER] Master received SIGINT, shutting down workers...');
        for (const id in cluster.workers) {
            cluster.workers[id].kill();
        }
        process.exit(0);
    });
    
} else {
    // Worker process
    console.log(`[CLUSTER] Worker ${process.pid} starting MikroTik API...`);
    require('./app.js');
    
    console.log(`[CLUSTER] Worker ${process.pid} started successfully`);
}