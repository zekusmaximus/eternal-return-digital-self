/**
 * Comprehensive test runner for the new architecture
 * Runs all validation tests and provides consolidated reporting
 */

import { TransformationPipelineValidation } from './domain/TransformationPipeline.validation';
import { ApplicationLayerValidation } from './application/ContentApplicationService.validation';

// Test suite result interface
interface TestSuiteResult {
  suiteName: string;
  results: Array<{ name: string; passed: boolean; error?: string }>;
  passed: number;
  failed: number;
  total: number;
}

// Overall test results
interface OverallTestResults {
  domainLayer: {
    suites: TestSuiteResult[];
    totalPassed: number;
    totalFailed: number;
    totalTests: number;
  };
  applicationLayer: {
    suites: TestSuiteResult[];
    totalPassed: number;
    totalFailed: number;
    totalTests: number;
  };
  overallPassed: number;
  overallFailed: number;
  overallTotal: number;
  success: boolean;
}

/**
 * Run all validation tests for the new architecture
 */
export async function runAllArchitectureTests(): Promise<OverallTestResults> {
  console.log('🚀 Starting comprehensive architecture validation tests...\n');

  // Run domain layer tests
  console.log('📦 Testing Domain Layer...');
  const domainResults = TransformationPipelineValidation.runAllValidationTests();
  
  // Run application layer tests
  console.log('🔧 Testing Application Layer...');
  const applicationResults = await ApplicationLayerValidation.runAllApplicationValidationTests();

  // Calculate overall results
  const overallPassed = domainResults.totalPassed + applicationResults.totalPassed;
  const overallFailed = domainResults.totalFailed + applicationResults.totalFailed;
  const overallTotal = domainResults.totalTests + applicationResults.totalTests;
  const success = overallFailed === 0;

  return {
    domainLayer: domainResults,
    applicationLayer: applicationResults,
    overallPassed,
    overallFailed,
    overallTotal,
    success,
  };
}

/**
 * Print comprehensive test results
 */
export function printComprehensiveResults(results: OverallTestResults): void {
  console.log('\n' + '='.repeat(60));
  console.log('🏗️  NEW ARCHITECTURE VALIDATION RESULTS');
  console.log('='.repeat(60));

  // Domain Layer Results
  console.log('\n📦 DOMAIN LAYER RESULTS:');
  console.log(`   Tests: ${results.domainLayer.totalPassed}/${results.domainLayer.totalTests} passed`);
  
  results.domainLayer.suites.forEach(suite => {
    const status = suite.failed === 0 ? '✅' : '❌';
    console.log(`   ${status} ${suite.suiteName}: ${suite.passed}/${suite.total}`);
    
    if (suite.failed > 0) {
      suite.results.filter(r => !r.passed).forEach(result => {
        console.log(`      ❌ ${result.name}`);
        if (result.error) {
          console.log(`         Error: ${result.error}`);
        }
      });
    }
  });

  // Application Layer Results
  console.log('\n🔧 APPLICATION LAYER RESULTS:');
  console.log(`   Tests: ${results.applicationLayer.totalPassed}/${results.applicationLayer.totalTests} passed`);
  
  results.applicationLayer.suites.forEach(suite => {
    const status = suite.failed === 0 ? '✅' : '❌';
    console.log(`   ${status} ${suite.suiteName}: ${suite.passed}/${suite.total}`);
    
    if (suite.failed > 0) {
      suite.results.filter(r => !r.passed).forEach(result => {
        console.log(`      ❌ ${result.name}`);
        if (result.error) {
          console.log(`         Error: ${result.error}`);
        }
      });
    }
  });

  // Overall Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 OVERALL SUMMARY:');
  console.log(`   Total Tests: ${results.overallTotal}`);
  console.log(`   Passed: ${results.overallPassed}`);
  console.log(`   Failed: ${results.overallFailed}`);
  console.log(`   Success Rate: ${Math.round((results.overallPassed / results.overallTotal) * 100)}%`);

  if (results.success) {
    console.log('\n🎉 ALL TESTS PASSED! New architecture is validated.');
    console.log('✅ Ready for deployment with feature flags.');
  } else {
    console.log('\n⚠️  Some tests failed. Review and fix issues before deployment.');
    console.log('❌ Architecture validation incomplete.');
  }

  console.log('='.repeat(60));
}

/**
 * Generate test report for documentation
 */
export function generateTestReport(results: OverallTestResults): string {
  const timestamp = new Date().toISOString();
  
  let report = `# Architecture Validation Test Report\n\n`;
  report += `**Generated:** ${timestamp}\n`;
  report += `**Overall Result:** ${results.success ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `**Total Tests:** ${results.overallPassed}/${results.overallTotal} passed\n\n`;

  // Domain Layer Section
  report += `## Domain Layer Results\n\n`;
  report += `**Tests:** ${results.domainLayer.totalPassed}/${results.domainLayer.totalTests} passed\n\n`;
  
  results.domainLayer.suites.forEach(suite => {
    report += `### ${suite.suiteName}\n`;
    report += `- **Status:** ${suite.failed === 0 ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- **Results:** ${suite.passed}/${suite.total} tests passed\n\n`;
    
    if (suite.failed > 0) {
      report += `**Failed Tests:**\n`;
      suite.results.filter(r => !r.passed).forEach(result => {
        report += `- ❌ ${result.name}\n`;
        if (result.error) {
          report += `  - Error: ${result.error}\n`;
        }
      });
      report += '\n';
    }
  });

  // Application Layer Section
  report += `## Application Layer Results\n\n`;
  report += `**Tests:** ${results.applicationLayer.totalPassed}/${results.applicationLayer.totalTests} passed\n\n`;
  
  results.applicationLayer.suites.forEach(suite => {
    report += `### ${suite.suiteName}\n`;
    report += `- **Status:** ${suite.failed === 0 ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- **Results:** ${suite.passed}/${suite.total} tests passed\n\n`;
    
    if (suite.failed > 0) {
      report += `**Failed Tests:**\n`;
      suite.results.filter(r => !r.passed).forEach(result => {
        report += `- ❌ ${result.name}\n`;
        if (result.error) {
          report += `  - Error: ${result.error}\n`;
        }
      });
      report += '\n';
    }
  });

  // Recommendations
  report += `## Recommendations\n\n`;
  if (results.success) {
    report += `✅ **All tests passed!** The new architecture is validated and ready for deployment.\n\n`;
    report += `**Next Steps:**\n`;
    report += `1. Enable feature flags for gradual rollout\n`;
    report += `2. Monitor performance in production\n`;
    report += `3. Collect user feedback\n`;
    report += `4. Plan migration of remaining components\n\n`;
  } else {
    report += `⚠️ **Some tests failed.** Address the following before deployment:\n\n`;
    report += `**Action Items:**\n`;
    report += `1. Fix failing tests identified above\n`;
    report += `2. Re-run validation tests\n`;
    report += `3. Consider additional testing for edge cases\n`;
    report += `4. Review error handling and fallback mechanisms\n\n`;
  }

  return report;
}

/**
 * Quick validation check for CI/CD
 */
export async function quickValidationCheck(): Promise<boolean> {
  try {
    const results = await runAllArchitectureTests();
    return results.success;
  } catch (error) {
    console.error('❌ Validation check failed:', error);
    return false;
  }
}

// Export main functions
export const ArchitectureTestRunner = {
  runAllArchitectureTests,
  printComprehensiveResults,
  generateTestReport,
  quickValidationCheck,
};

// Auto-run tests if this file is executed directly
if (typeof window === 'undefined' && require.main === module) {
  runAllArchitectureTests()
    .then(results => {
      printComprehensiveResults(results);
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}