// Memory Keeper - Mantém memória RAM fixa alocada permanentemente
class MemoryKeeper {
    constructor(targetSizeMB = 512) {
        this.targetSize = targetSizeMB * 1024 * 1024; // Convert to bytes
        this.memoryBlocks = [];
        this.isActive = true;
        this.blockSize = 50 * 1024 * 1024; // 50MB per block
        this.maintainInterval = null;
        
        console.log(`[MEMORY-KEEPER] Initialized with target: ${targetSizeMB}MB`);
        this.allocateInitialMemory();
        this.startMaintenance();
    }
    
    allocateInitialMemory() {
        console.log(`[MEMORY-KEEPER] Allocating initial memory blocks...`);
        
        const blocksNeeded = Math.ceil(this.targetSize / this.blockSize);
        
        for (let i = 0; i < blocksNeeded; i++) {
            try {
                // Create persistent memory blocks that won't be GC'd
                const block = {
                    id: i,
                    data: new ArrayBuffer(this.blockSize),
                    timestamp: Date.now(),
                    persistent: true
                };
                
                // Fill with some data to prevent optimization
                const view = new Uint8Array(block.data);
                for (let j = 0; j < view.length; j += 1000) {
                    view[j] = Math.floor(Math.random() * 255);
                }
                
                this.memoryBlocks.push(block);
                
                const currentMem = process.memoryUsage();
                console.log(`[MEMORY-KEEPER] Block ${i + 1}/${blocksNeeded} allocated - Heap: ${(currentMem.heapTotal/1024/1024).toFixed(2)}MB`);
                
            } catch (error) {
                console.error(`[MEMORY-KEEPER] Failed to allocate block ${i}:`, error.message);
                break;
            }
        }
        
        const finalMem = process.memoryUsage();
        const usagePercent = (finalMem.heapUsed / finalMem.heapTotal) * 100;
        
        console.log(`[MEMORY-KEEPER] Initial allocation complete:`);
        console.log(`[MEMORY-KEEPER] - Blocks allocated: ${this.memoryBlocks.length}`);
        console.log(`[MEMORY-KEEPER] - Heap total: ${(finalMem.heapTotal/1024/1024).toFixed(2)}MB`);
        console.log(`[MEMORY-KEEPER] - Heap used: ${(finalMem.heapUsed/1024/1024).toFixed(2)}MB (${usagePercent.toFixed(1)}%)`);
    }
    
    maintainMemory() {
        if (!this.isActive) return;
        
        const currentMem = process.memoryUsage();
        const currentHeapMB = currentMem.heapTotal / 1024 / 1024;
        const targetMB = this.targetSize / 1024 / 1024;
        
        // If heap shrunk significantly, reallocate
        if (currentHeapMB < targetMB * 0.7) {
            console.log(`[MEMORY-KEEPER] Heap shrunk to ${currentHeapMB.toFixed(2)}MB, reallocating...`);
            this.reallocateMemory();
        }
        
        // Refresh memory blocks to prevent GC
        this.refreshMemoryBlocks();
    }
    
    reallocateMemory() {
        console.log(`[MEMORY-KEEPER] Reallocating memory to maintain target size...`);
        
        const currentMem = process.memoryUsage();
        const currentHeapMB = currentMem.heapTotal / 1024 / 1024;
        const targetMB = this.targetSize / 1024 / 1024;
        const neededMB = targetMB - currentHeapMB;
        
        if (neededMB > 0) {
            const additionalBlocks = Math.ceil((neededMB * 1024 * 1024) / this.blockSize);
            
            for (let i = 0; i < additionalBlocks; i++) {
                try {
                    const blockId = this.memoryBlocks.length;
                    const block = {
                        id: blockId,
                        data: new ArrayBuffer(this.blockSize),
                        timestamp: Date.now(),
                        persistent: true
                    };
                    
                    // Fill with data
                    const view = new Uint8Array(block.data);
                    for (let j = 0; j < view.length; j += 1000) {
                        view[j] = (Date.now() + j) % 255;
                    }
                    
                    this.memoryBlocks.push(block);
                    
                } catch (error) {
                    console.error(`[MEMORY-KEEPER] Failed to reallocate block:`, error.message);
                    break;
                }
            }
            
            const newMem = process.memoryUsage();
            console.log(`[MEMORY-KEEPER] Reallocation complete - New heap: ${(newMem.heapTotal/1024/1024).toFixed(2)}MB`);
        }
    }
    
    refreshMemoryBlocks() {
        // Touch memory blocks to keep them active
        const now = Date.now();
        
        this.memoryBlocks.forEach((block, index) => {
            if (block.data && block.persistent) {
                // Periodically write to memory to keep it hot
                const view = new Uint8Array(block.data);
                const randomIndex = Math.floor(Math.random() * (view.length - 1000));
                view[randomIndex] = now % 255;
                
                block.timestamp = now;
            }
        });
    }
    
    startMaintenance() {
        // Run maintenance every 2 minutes
        this.maintainInterval = setInterval(() => {
            this.maintainMemory();
        }, 2 * 60 * 1000);
        
        console.log(`[MEMORY-KEEPER] Maintenance started - checking every 2 minutes`);
    }
    
    getStatus() {
        const currentMem = process.memoryUsage();
        return {
            targetSizeMB: this.targetSize / 1024 / 1024,
            currentHeapMB: currentMem.heapTotal / 1024 / 1024,
            currentUsedMB: currentMem.heapUsed / 1024 / 1024,
            usagePercent: (currentMem.heapUsed / currentMem.heapTotal) * 100,
            blocksAllocated: this.memoryBlocks.length,
            blockSizeMB: this.blockSize / 1024 / 1024,
            isActive: this.isActive
        };
    }
    
    forceExpansion() {
        console.log(`[MEMORY-KEEPER] Force expansion requested...`);
        this.reallocateMemory();
        
        // Force GC after expansion to clean up temporary objects
        setTimeout(() => {
            if (global.gc) {
                global.gc();
                console.log(`[MEMORY-KEEPER] Post-expansion GC completed`);
            }
        }, 1000);
    }
    
    shutdown() {
        console.log(`[MEMORY-KEEPER] Shutting down...`);
        this.isActive = false;
        
        if (this.maintainInterval) {
            clearInterval(this.maintainInterval);
        }
        
        // Don't clear memory blocks - let them persist
        console.log(`[MEMORY-KEEPER] Shutdown complete - memory blocks preserved`);
    }
}

module.exports = { MemoryKeeper };