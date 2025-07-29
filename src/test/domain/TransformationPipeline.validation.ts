/**
 * Validation tests for the unified TransformationPipeline
 * Simple validation functions that can be run without external test frameworks
 */

import { createTransformationPipeline } from '../../domain/services/TransformationPipeline';
import { TransformationContext } from '../../domain/models/TransformationContext';
import { RuleBuilder } from '../../domain/services/RuleBuilder';
import { Conditions } from '../../domain/services/Conditions';
import { Transformations } from '../../domain/services/Transformations';

// Simple test result interface
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

// Test suite results
interface TestSuiteResult {
  suiteName: string;
  results: TestResult[];
  passed: number;
  failed: number;
  total: number;
}

/**
 * Simple assertion functions
 */
const assert = {
  equals: (actual: unknown, expected: unknown, message?: string): void => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  contains: (actual: string, expected: string, message?: string): void => {
    if (!actual.includes(expected)) {
      throw new Error(message || `Expected "${actual}" to contain "${expected}"`);
    }
  },
  defined: (actual: unknown, message?: string): void => {
    if (actual === undefined || actual === null) {
      throw new Error(message || `Expected value to be defined`);
    }
  },
  lessThan: (actual: number, expected: number, message?: string): void => {
    if (actual >= expected) {
      throw new Error(message || `Expected ${actual} to be less than ${expected}`);
    }
  },
  length: (actual: unknown[], expected: number, message?: string): void => {
    if (actual.length !== expected) {
      throw new Error(message || `Expected array length ${expected}, got ${actual.length}`);
    }
  },
};

/**
 * Run a single test
 */
function runTest(name: string, testFn: () => void): TestResult {
  try {
    testFn();
    return { name, passed: true };
  } catch (error) {
    return { 
      name, 
      passed: false, 
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

/**
 * Run a test suite
 */
function runTestSuite(suiteName: string, tests: Array<{ name: string; fn: () => void }>): TestSuiteResult {
  const results = tests.map(test => runTest(test.name, test.fn));
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  
  return {
    suiteName,
    results,
    passed,
    failed,
    total: results.length,
  };
}

/**
 * Create mock transformation context
 */
function createMockContext(): TransformationContext {
  return {
    nodeId: 'test-node',
    visitCount: 1,
    currentCharacter: 'Archaeologist',
    previousCharacter: undefined,
    readerPath: ['test-node'],
    attractorsEngaged: ['memory-fragment'],
    temporalLayer: 'past',
  };
}

/**
 * Basic transformation tests
 */
export function validateBasicTransformation(): TestSuiteResult {
  return runTestSuite('Basic Transformation', [
    {
      name: 'should return original content when no rules apply',
      fn: () => {
        const pipeline = createTransformationPipeline();
        const context = createMockContext();
        const content = 'This is test content';
        const result = pipeline.transform(content, context);
        assert.equals(result, content);
      }
    },
    {
      name: 'should apply simple replacement rule',
      fn: () => {
        const pipeline = createTransformationPipeline();
        const context = createMockContext();
        
        const rule = RuleBuilder
          .create('test-replace')
          .withName('Test Replace')
          .withPriority(10)
          .when(Conditions.visitCount(1))
          .apply(Transformations.replace('test', 'transformed'))
          .build();

        pipeline.addRule(rule);

        const content = 'This is test content';
        const result = pipeline.transform(content, context);
        assert.equals(result, 'This is transformed content');
      }
    },
    {
      name: 'should handle empty content gracefully',
      fn: () => {
        const pipeline = createTransformationPipeline();
        const context = createMockContext();
        const result = pipeline.transform('', context);
        assert.equals(result, '');
      }
    },
  ]);
}

/**
 * Rule management tests
 */
export function validateRuleManagement(): TestSuiteResult {
  return runTestSuite('Rule Management', [
    {
      name: 'should add and remove rules correctly',
      fn: () => {
        const pipeline = createTransformationPipeline();
        const context = createMockContext();
        
        const rule = RuleBuilder
          .create('test-rule')
          .withName('Test Rule')
          .withPriority(10)
          .when(Conditions.visitCount(1))
          .apply(Transformations.replace('test', 'transformed'))
          .build();

        pipeline.addRule(rule);
        assert.length(pipeline.getApplicableRules(context), 1);

        pipeline.removeRule('test-rule');
        assert.length(pipeline.getApplicableRules(context), 0);
      }
    },
    {
      name: 'should clear all rules',
      fn: () => {
        const pipeline = createTransformationPipeline();
        const context = createMockContext();
        
        const rule1 = RuleBuilder
          .create('rule-1')
          .withName('Rule 1')
          .withPriority(10)
          .when(Conditions.visitCount(1))
          .apply(Transformations.replace('test', 'transformed'))
          .build();

        const rule2 = RuleBuilder
          .create('rule-2')
          .withName('Rule 2')
          .withPriority(20)
          .when(Conditions.visitCount(1))
          .apply(Transformations.emphasize('content', 'bold'))
          .build();

        pipeline.addRule(rule1);
        pipeline.addRule(rule2);
        assert.length(pipeline.getApplicableRules(context), 2);

        pipeline.clearRules();
        assert.length(pipeline.getApplicableRules(context), 0);
      }
    },
  ]);
}

/**
 * Performance validation tests
 */
export function validatePerformance(): TestSuiteResult {
  return runTestSuite('Performance', [
    {
      name: 'should handle large content efficiently',
      fn: () => {
        const pipeline = createTransformationPipeline();
        const context = createMockContext();
        const largeContent = 'This is test content. '.repeat(1000);
        
        const start = performance.now();
        const result = pipeline.transform(largeContent, context);
        const end = performance.now();
        const duration = end - start;
        
        assert.defined(result);
        assert.lessThan(duration, 100); // Should complete in under 100ms
      }
    },
    {
      name: 'should handle many rules efficiently',
      fn: () => {
        const pipeline = createTransformationPipeline();
        const context = createMockContext();
        
        // Add many rules
        for (let i = 0; i < 100; i++) {
          const rule = RuleBuilder
            .create(`rule-${i}`)
            .withName(`Rule ${i}`)
            .withPriority(i)
            .when(Conditions.visitCount(999)) // Won't match, just testing rule evaluation
            .apply(Transformations.replace('test', 'transformed'))
            .build();
          pipeline.addRule(rule);
        }

        const content = 'This is test content';
        const start = performance.now();
        const result = pipeline.transform(content, context);
        const end = performance.now();
        const duration = end - start;
        
        assert.equals(result, content); // No rules should match
        assert.lessThan(duration, 50); // Should complete quickly even with many rules
      }
    },
  ]);
}

/**
 * Run all validation tests
 */
export function runAllValidationTests(): {
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  totalTests: number;
} {
  const suites = [
    validateBasicTransformation(),
    validateRuleManagement(),
    validatePerformance(),
  ];

  const totalPassed = suites.reduce((sum, suite) => sum + suite.passed, 0);
  const totalFailed = suites.reduce((sum, suite) => sum + suite.failed, 0);
  const totalTests = suites.reduce((sum, suite) => sum + suite.total, 0);

  return {
    suites,
    totalPassed,
    totalFailed,
    totalTests,
  };
}

/**
 * Print test results to console
 */
export function printTestResults(results: ReturnType<typeof runAllValidationTests>): void {
  console.log('\n=== TransformationPipeline Validation Results ===\n');
  
  results.suites.forEach(suite => {
    console.log(`${suite.suiteName}: ${suite.passed}/${suite.total} passed`);
    
    suite.results.forEach(result => {
      const status = result.passed ? '✓' : '✗';
      console.log(`  ${status} ${result.name}`);
      if (!result.passed && result.error) {
        console.log(`    Error: ${result.error}`);
      }
    });
    console.log('');
  });

  console.log(`Total: ${results.totalPassed}/${results.totalTests} tests passed`);
  
  if (results.totalFailed > 0) {
    console.log(`⚠️  ${results.totalFailed} tests failed`);
  } else {
    console.log('✅ All tests passed!');
  }
}

// Export for easy testing
export const TransformationPipelineValidation = {
  runAllValidationTests,
  printTestResults,
  validateBasicTransformation,
  validateRuleManagement,
  validatePerformance,
};