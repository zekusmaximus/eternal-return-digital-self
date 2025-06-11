/**
 * Test script to validate that the infinite loop fix is working
 * This script will navigate through the application and monitor for infinite loops
 */

console.log('🧪 Testing infinite loop fix...');

// Wait for page to load
setTimeout(() => {
    console.log('📊 Checking for infinite loop indicators...');
    
    // Check for excessive console logging
    const initialConsoleCount = performance.now();
    let consoleWarnings = 0;
    let transformationCounts = [];
    
    // Override console.log to monitor excessive logging
    const originalLog = console.log;
    console.log = function(...args) {
        if (args[0] && typeof args[0] === 'string') {
            if (args[0].includes('[TransformationService]') || 
                args[0].includes('[useNodeState]') ||
                args[0].includes('transformation')) {
                consoleWarnings++;
                
                // Check for transformation count patterns
                const match = args[0].match(/totalTransformations: (\d+)/);
                if (match) {
                    transformationCounts.push(parseInt(match[1]));
                }
            }
        }
        originalLog.apply(console, args);
    };
    
    // Test navigation to trigger transformations
    console.log('🔄 Testing navigation and transformations...');
    
    // Look for nodes to navigate to
    setTimeout(() => {
        const navButtons = document.querySelectorAll('[data-node-id]');
        console.log(`📍 Found ${navButtons.length} navigation targets`);
        
        if (navButtons.length > 0) {
            // Click on the first available node
            navButtons[0].click();
            console.log('🖱️ Clicked on node:', navButtons[0].getAttribute('data-node-id'));
            
            // Wait and check for infinite loop signs
            setTimeout(() => {
                console.log('📈 Analysis Results:');
                console.log(`- Console warnings: ${consoleWarnings}`);
                console.log(`- Transformation counts: [${transformationCounts.slice(-5).join(', ')}]`);
                
                // Check for infinite loop indicators
                const hasInfiniteLoop = consoleWarnings > 100 || 
                                       transformationCounts.length > 50 ||
                                       transformationCounts.some(count => count > 200);
                
                if (hasInfiniteLoop) {
                    console.error('❌ INFINITE LOOP DETECTED!');
                    console.error('Indicators:', {
                        excessiveLogging: consoleWarnings > 100,
                        excessiveTransformations: transformationCounts.some(count => count > 200),
                        rapidFireTransformations: transformationCounts.length > 50
                    });
                } else {
                    console.log('✅ No infinite loop detected');
                    console.log('🎉 Fix appears to be working!');
                }
                
                // Restore original console.log
                console.log = originalLog;
            }, 5000);
        } else {
            console.log('⚠️ No navigation targets found');
        }
    }, 2000);
}, 1000);
