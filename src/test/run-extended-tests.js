/**
 * Test runner for the extended TransformationEngine tests
 * Run this to test all the new transformation functionality
 */

console.log('🚀 Starting Extended TransformationEngine Test Suite...\n');

// Import the test file to run it
try {
  require('./TransformationEngine.extended.test');
  console.log('\n✅ All tests completed successfully!');
} catch (error) {
  console.error('\n❌ Test execution failed:', error);
  process.exit(1);
}
