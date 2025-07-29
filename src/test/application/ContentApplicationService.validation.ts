/**
 * Validation tests for ContentApplicationService
 * Tests the application layer orchestration and use cases
 */

import { ContentApplicationService } from '../../application/services/ContentApplicationService';
import { NavigateToNodeUseCase } from '../../application/usecases/NavigateToNodeUseCase';
import { GetContentUseCase } from '../../application/usecases/GetContentUseCase';

// Mock dispatch and getState functions
const createMockDispatch = () => {
  const actions: unknown[] = [];
  const dispatch = (action: unknown) => {
    actions.push(action);
    return Promise.resolve(action);
  };
  dispatch.actions = actions;
  return dispatch as unknown as any;
};

const createMockGetState = () => {
  return () => ({
    transformation: {
      contexts: {},
      results: {},
      loading: false,
      error: null,
    },
    reader: {
      currentNodeId: null,
      previousNodeId: null,
      visitedNodes: [],
      visitCounts: {},
      currentCharacter: null,
      previousCharacter: null,
      currentTemporalLayer: null,
      engagedAttractors: [],
      hasRevisitPattern: false,
      hasCharacterTransition: false,
    },
    content: {
      rawContent: {},
      transformedContent: {},
      loading: {},
      errors: {},
    },
    interface: {
      viewMode: 'constellation' as const,
      showMiniConstellation: true,
      showMetaInterface: false,
      hoveredNodeId: null,
      selectedNodeId: null,
      lastInteraction: 0,
      showStrangeAttractors: false,
      constellationZoom: 1,
      constellationRotation: { x: 0, y: 0, z: 0 },
      textSize: 'medium' as const,
      highContrast: false,
      animations: 'full' as const,
      transitionSpeed: 500,
      helpModalOpen: false,
      aboutModalOpen: false,
      isInitialChoicePhase: true,
    },
  });
};

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
  defined: (actual: unknown, message?: string): void => {
    if (actual === undefined || actual === null) {
      throw new Error(message || `Expected value to be defined`);
    }
  },
  isTrue: (actual: boolean, message?: string): void => {
    if (actual !== true) {
      throw new Error(message || `Expected true, got ${actual}`);
    }
  },
  isFalse: (actual: boolean, message?: string): void => {
    if (actual !== false) {
      throw new Error(message || `Expected false, got ${actual}`);
    }
  },
};

/**
 * Run a single test
 */
function runTest(name: string, testFn: () => void | Promise<void>): Promise<TestResult> {
  return Promise.resolve().then(async () => {
    try {
      await testFn();
      return { name, passed: true };
    } catch (error) {
      return { 
        name, 
        passed: false, 
        error: error instanceof Error ? error.message : String(error) 
      };
    }
  });
}

/**
 * Run a test suite
 */
async function runTestSuite(
  suiteName: string, 
  tests: Array<{ name: string; fn: () => void | Promise<void> }>
): Promise<TestSuiteResult> {
  const results = await Promise.all(tests.map(test => runTest(test.name, test.fn)));
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
 * ContentApplicationService tests
 */
export async function validateContentApplicationService(): Promise<TestSuiteResult> {
  return runTestSuite('ContentApplicationService', [
    {
      name: 'should create service instance',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        assert.defined(service);
      }
    },
    {
      name: 'should build transformation context',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        
        // Access private method through any cast for testing
        const context = (service as unknown as any).buildTransformationContext('test-node');
        assert.defined(context);
        assert.equals(context.nodeId, 'test-node');
      }
    },
    {
      name: 'should get current content',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        
        const content = service.getCurrentContent('test-node');
        assert.equals(content, null); // No content initially
      }
    },
    {
      name: 'should check loading state',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        
        const isLoading = service.isContentLoading('test-node');
        assert.isFalse(isLoading); // Not loading initially
      }
    },
    {
      name: 'should get transformation stats',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        
        const stats = service.getTransformationStats();
        assert.defined(stats);
        assert.equals(stats.totalTransformed, 0);
        assert.equals(stats.totalCached, 0);
        assert.equals(stats.averageTransformationTime, 0);
      }
    },
  ]);
}

/**
 * NavigateToNodeUseCase tests
 */
export async function validateNavigateToNodeUseCase(): Promise<TestSuiteResult> {
  return runTestSuite('NavigateToNodeUseCase', [
    {
      name: 'should create use case instance',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        const useCase = new NavigateToNodeUseCase(service);
        assert.defined(useCase);
      }
    },
    {
      name: 'should execute navigation request',
      fn: async () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        const useCase = new NavigateToNodeUseCase(service);
        
        const request = {
          nodeId: 'test-node',
          character: 'Archaeologist' as const,
          temporalLayer: 'past' as const,
          contentSource: 'test.md',
          attractors: ['memory-fragment' as const],
        };
        
        const response = await useCase.execute(request);
        assert.defined(response);
        assert.isTrue(response.success);
      }
    },
  ]);
}

/**
 * GetContentUseCase tests
 */
export async function validateGetContentUseCase(): Promise<TestSuiteResult> {
  return runTestSuite('GetContentUseCase', [
    {
      name: 'should create use case instance',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        const useCase = new GetContentUseCase(service);
        assert.defined(useCase);
      }
    },
    {
      name: 'should execute get content request',
      fn: () => {
        const dispatch = createMockDispatch();
        const getState = createMockGetState();
        const service = new ContentApplicationService(dispatch, getState);
        const useCase = new GetContentUseCase(service);
        
        const request = { nodeId: 'test-node' };
        const response = useCase.execute(request);
        
        assert.defined(response);
        assert.isTrue(response.success);
        assert.isFalse(response.isLoading);
      }
    },
  ]);
}

/**
 * Run all application layer validation tests
 */
export async function runAllApplicationValidationTests(): Promise<{
  suites: TestSuiteResult[];
  totalPassed: number;
  totalFailed: number;
  totalTests: number;
}> {
  const suites = await Promise.all([
    validateContentApplicationService(),
    validateNavigateToNodeUseCase(),
    validateGetContentUseCase(),
  ]);

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
export function printApplicationTestResults(results: Awaited<ReturnType<typeof runAllApplicationValidationTests>>): void {
  console.log('\n=== Application Layer Validation Results ===\n');
  
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
export const ApplicationLayerValidation = {
  runAllApplicationValidationTests,
  printApplicationTestResults,
  validateContentApplicationService,
  validateNavigateToNodeUseCase,
  validateGetContentUseCase,
};