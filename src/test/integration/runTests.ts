/**
 * Test execution script for Narrative Systems Integration
 * 
 * This script runs the comprehensive test suite for the integrated
 * Triumvirate, Enhanced Strange Attractor, Enhanced Endpoint Progression,
 * and Unified Narrative systems.
 */

import { runNarrativeSystemsTests } from '../../archive/legacy-4-system-architecture/tests/NarrativeSystemsTestRunner';

/**
 * Main execution function
 */
async function main(): Promise<void> {
  try {
    console.log('🔧 Initializing Narrative Systems Test Suite...\n');
    
    // Run all tests
    await runNarrativeSystemsTests();
    
    console.log('\n✨ Test execution completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n💥 Test execution failed:');
    console.error(error instanceof Error ? error.message : String(error));
    
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

// Execute if this file is run directly
if (require.main === module) {
  main();
}

export { main as runTests };