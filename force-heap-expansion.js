// Force heap expansion utility
function forceHeapExpansion() {
    console.log('[HEAP-EXPANSION] Starting aggressive heap expansion...');
    
    const beforeMem = process.memoryUsage();
    console.log(`[HEAP-EXPANSION] Before - Used: ${(beforeMem.heapUsed/1024/1024).toFixed(2)}MB, Total: ${(beforeMem.heapTotal/1024/1024).toFixed(2)}MB`);
    
    // Create large arrays to force heap expansion
    const arrays = [];
    
    try {
        // Force allocation in chunks
        for (let i = 0; i < 5; i++) {
            arrays.push(new Array(10000000).fill(null));
            
            // Check memory after each allocation
            const currentMem = process.memoryUsage();
            console.log(`[HEAP-EXPANSION] Chunk ${i+1} - Used: ${(currentMem.heapUsed/1024/1024).toFixed(2)}MB, Total: ${(currentMem.heapTotal/1024/1024).toFixed(2)}MB`);
            
            // Small delay to allow heap to adjust
            setTimeout(() => {}, 10);
        }
        
        // Hold the memory for a moment to force expansion
        setTimeout(() => {
            // Clear the arrays
            arrays.forEach((arr, index) => {
                arr.length = 0;
                arrays[index] = null;
            });
            arrays.length = 0;
            
            // Force GC after clearing
            if (global.gc) {
                global.gc();
                
                const afterMem = process.memoryUsage();
                const usagePercent = (afterMem.heapUsed / afterMem.heapTotal) * 100;
                
                console.log(`[HEAP-EXPANSION] After cleanup - Used: ${(afterMem.heapUsed/1024/1024).toFixed(2)}MB, Total: ${(afterMem.heapTotal/1024/1024).toFixed(2)}MB`);
                console.log(`[HEAP-EXPANSION] New usage percentage: ${usagePercent.toFixed(2)}%`);
                console.log(`[HEAP-EXPANSION] Heap expanded by: ${((afterMem.heapTotal - beforeMem.heapTotal)/1024/1024).toFixed(2)}MB`);
            }
        }, 1000);
        
    } catch (error) {
        console.error('[HEAP-EXPANSION] Error during expansion:', error.message);
    }
}

module.exports = { forceHeapExpansion };