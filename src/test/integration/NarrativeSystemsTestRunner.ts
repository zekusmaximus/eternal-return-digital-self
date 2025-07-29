/**
 * Custom Test Runner for Narrative Systems Integration
 * 
 * A comprehensive testing framework that validates the interaction between
 * Triumvirate, Enhanced Strange Attractor, Enhanced Endpoint Progression,
 * and Unified Narrative systems without requiring external test frameworks.
 */

import { triumvirateSystem } from '../../services/TriumvirateSystem';
import { enhancedStrangeAttractorSystem } from '../../services/EnhancedStrangeAttractorSystem';
import { enhancedEndpointProgressionSystem } from '../../services/EnhancedEndpointProgressionSystem';
import { unifiedNarrativeSystem } from '../../services/UnifiedNarrativeSystem';
import { ReaderState } from '../../store/slices/readerSlice';
import { NodeState, Character, StrangeAttractor, EndpointOrientation } from '../../types';

/**
 * Test result interface
 */
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
  details?: Record<string, unknown>;
}

/**
 * Test suite interface
 */
interface TestSuite {
  name: string;
  tests: TestResult[];
  passed: number;
  failed: number;
  duration: number;
}

/**
 * Custom assertion functions
 */
class Assertions {
  static assertTrue(condition: boolean, message: string): void {
    if (!condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  static assertFalse(condition: boolean, message: string): void {
    if (condition) {
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  static assertEqual<T>(actual: T, expected: T, message: string): void {
    if (actual !== expected) {
      throw new Error(`Assertion failed: ${message}. Expected: ${expected}, Actual: ${actual}`);
    }
  }

  static assertNotEqual<T>(actual: T, expected: T, message: string): void {
    if (actual === expected) {
      throw new Error(`Assertion failed: ${message}. Values should not be equal: ${actual}`);
    }
  }

  static assertGreaterThan(actual: number, expected: number, message: string): void {
    if (actual <= expected) {
      throw new Error(`Assertion failed: ${message}. Expected ${actual} > ${expected}`);
    }
  }

  static assertLessThan(actual: number, expected: number, message: string): void {
    if (actual >= expected) {
      throw new Error(`Assertion failed: ${message}. Expected ${actual} < ${expected}`);
    }
  }

  static assertBetween(actual: number, min: number, max: number, message: string): void {
    if (actual < min || actual > max) {
      throw new Error(`Assertion failed: ${message}. Expected ${actual} to be between ${min} and ${max}`);
    }
  }

  static assertDefined<T>(value: T, message: string): void {
    if (value === undefined || value === null) {
      throw new Error(`Assertion failed: ${message}. Value should be defined`);
    }
  }

  static assertUndefined<T>(value: T, message: string): void {
    if (value !== undefined) {
      throw new Error(`Assertion failed: ${message}. Value should be undefined`);
    }
  }

  static assertArrayLength<T>(array: T[], expectedLength: number, message: string): void {
    if (!Array.isArray(array)) {
      throw new Error(`Assertion failed: ${message}. Value is not an array`);
    }
    if (array.length !== expectedLength) {
      throw new Error(`Assertion failed: ${message}. Expected length ${expectedLength}, got ${array.length}`);
    }
  }

  static assertObjectHasProperty(obj: Record<string, unknown>, property: string, message: string): void {
    if (!obj || typeof obj !== 'object' || !(property in obj)) {
      throw new Error(`Assertion failed: ${message}. Object does not have property '${property}'`);
    }
  }

  static assertMatches(actual: string, pattern: RegExp, message: string): void {
    if (!pattern.test(actual)) {
      throw new Error(`Assertion failed: ${message}. '${actual}' does not match pattern ${pattern}`);
    }
  }
}

/**
 * Mock data factory for tests
 */
class MockDataFactory {
  static createMockReaderState(): ReaderState {
    return {
      path: {
        sequence: ['arch-discovery', 'algo-awakening', 'human-discovery', 'arch-loss'],
        revisitPatterns: {
          'arch-discovery': 2,
          'algo-awakening': 1,
          'human-discovery': 1,
          'arch-loss': 1
        },
        attractorsEngaged: {
          'memory-fragment': 3,
          'recursion-pattern': 2,
          'identity-pattern': 1
        } as Record<StrangeAttractor, number>,
        detailedVisits: [
          {
            nodeId: 'arch-discovery',
            character: 'Archaeologist' as Character,
            temporalLayer: 'past' as const,
            engagedAttractors: ['memory-fragment', 'recursion-pattern'] as StrangeAttractor[],
            index: 0,
            revisitCount: 1
          },
          {
            nodeId: 'algo-awakening',
            character: 'Algorithm' as Character,
            temporalLayer: 'present' as const,
            engagedAttractors: ['recursion-pattern'] as StrangeAttractor[],
            index: 1,
            revisitCount: 1
          },
          {
            nodeId: 'human-discovery',
            character: 'LastHuman' as Character,
            temporalLayer: 'future' as const,
            engagedAttractors: ['identity-pattern'] as StrangeAttractor[],
            index: 2,
            revisitCount: 1
          },
          {
            nodeId: 'arch-discovery',
            character: 'Archaeologist' as Character,
            temporalLayer: 'past' as const,
            engagedAttractors: ['memory-fragment'] as StrangeAttractor[],
            index: 3,
            revisitCount: 2
          }
        ],
        transitions: [
          {
            from: 'arch-discovery',
            to: 'algo-awakening',
            attractorsEngaged: ['recursion-pattern'] as StrangeAttractor[]
          },
          {
            from: 'algo-awakening',
            to: 'human-discovery',
            attractorsEngaged: ['identity-pattern'] as StrangeAttractor[]
          },
          {
            from: 'human-discovery',
            to: 'arch-discovery',
            attractorsEngaged: ['memory-fragment'] as StrangeAttractor[]
          }
        ],
        characterFocus: {
          'Archaeologist': 2,
          'Algorithm': 1,
          'LastHuman': 1
        } as Record<Character, number>,
        temporalLayerFocus: {
          'past': 2,
          'present': 1,
          'future': 1
        },
        patternSequences: {
          repeatedSequences: [['arch-discovery']],
          characterSequences: [['Archaeologist', 'Algorithm', 'LastHuman', 'Archaeologist'] as Character[]],
          temporalSequences: [['past', 'present', 'future', 'past']]
        }
      },
      currentNodeId: 'arch-loss',
      previousNodeId: 'arch-discovery',
      endpointProgress: {
        past: 60,
        present: 30,
        future: 20
      },
      attractorEngagement: {
        'memory-fragment': 75,
        'recursion-pattern': 50,
        'identity-pattern': 25
      } as Record<StrangeAttractor, number>
    };
  }

  static createMockNodes(): Record<string, NodeState> {
    const baseNode: Omit<NodeState, 'id' | 'title' | 'character' | 'strangeAttractors' | 'temporalValue'> = {
      initialConnections: [],
      contentSource: 'test.md',
      coreConcept: 'Test concept',
      transformationThresholds: { visit: 1, revisit: 2, complex: 4, fragmented: 7 },
      visitCount: 1,
      visitState: 'visited' as const,
      currentState: 'visited' as const,
      revealedConnections: [],
      transformations: [],
      content: null,
      enhancedContent: null,
      currentContent: null,
      originalContent: null,
      lastTransformedContent: null,
      appliedTransformationIds: [],
      contentVersion: 0,
      transformationState: 'clean' as const
    };

    return {
      'arch-discovery': {
        ...baseNode,
        id: 'arch-discovery',
        title: 'Patterns in Decay',
        character: 'Archaeologist' as Character,
        temporalValue: 1,
        strangeAttractors: ['memory-fragment', 'recursion-pattern'] as StrangeAttractor[],
        visitCount: 2,
        visitState: 'revisited' as const,
        currentState: 'revisited' as const
      },
      'algo-awakening': {
        ...baseNode,
        id: 'algo-awakening',
        title: 'First Consciousness',
        character: 'Algorithm' as Character,
        temporalValue: 5,
        strangeAttractors: ['recursion-pattern', 'process-language'] as StrangeAttractor[]
      },
      'human-discovery': {
        ...baseNode,
        id: 'human-discovery',
        title: 'Ruins of Memory',
        character: 'LastHuman' as Character,
        temporalValue: 9,
        strangeAttractors: ['identity-pattern', 'quantum-choice'] as StrangeAttractor[]
      },
      'arch-loss': {
        ...baseNode,
        id: 'arch-loss',
        title: 'The Limits of Preservation',
        character: 'Archaeologist' as Character,
        temporalValue: 4,
        strangeAttractors: ['verification-ritual', 'system-decay'] as StrangeAttractor[],
        isEndpoint: true,
        endpointOrientation: 'past' as EndpointOrientation
      }
    };
  }

  static createEmptyReaderState(): ReaderState {
    return {
      path: {
        sequence: [],
        revisitPatterns: {},
        attractorsEngaged: {} as Record<StrangeAttractor, number>,
        detailedVisits: [],
        transitions: [],
        characterFocus: {} as Record<Character, number>,
        temporalLayerFocus: { past: 0, present: 0, future: 0 },
        patternSequences: {
          repeatedSequences: [],
          characterSequences: [],
          temporalSequences: []
        }
      },
      currentNodeId: null,
      previousNodeId: null,
      endpointProgress: { past: 0, present: 0, future: 0 },
      attractorEngagement: {} as Record<StrangeAttractor, number>
    };
  }
}

/**
 * Main test runner class
 */
export class NarrativeSystemsTestRunner {
  private testSuites: TestSuite[] = [];

  /**
   * Run a single test
   */
  private async runTest(name: string, testFn: () => void | Promise<void>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      await testFn();
      return {
        name,
        passed: true,
        duration: Date.now() - startTime
      };
    } catch (error) {
      return {
        name,
        passed: false,
        error: error instanceof Error ? error.message : String(error),
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Run a test suite
   */
  private async runTestSuite(suiteName: string, tests: Array<{ name: string; fn: () => void | Promise<void> }>): Promise<TestSuite> {
    const startTime = Date.now();
    const results: TestResult[] = [];

    for (const test of tests) {
      const result = await this.runTest(test.name, test.fn);
      results.push(result);
    }

    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    return {
      name: suiteName,
      tests: results,
      passed,
      failed,
      duration: Date.now() - startTime
    };
  }

  /**
   * Individual System Tests
   */
  private async testIndividualSystems(): Promise<TestSuite> {
    const mockReaderState = MockDataFactory.createMockReaderState();
    const mockNodes = MockDataFactory.createMockNodes();

    return this.runTestSuite('Individual System Functionality', [
      {
        name: 'Triumvirate System Calculation',
        fn: () => {
          // Clear cache to ensure fresh calculation
          triumvirateSystem.clearCache();
          
          const triumvirateState = triumvirateSystem.calculateTriumvirateState(mockReaderState, mockNodes);

          Assertions.assertTrue(triumvirateState.isActive, 'Triumvirate should be active');
          Assertions.assertGreaterThan(triumvirateState.convergenceLevel, 0, 'Convergence level should be greater than 0');
          Assertions.assertEqual(triumvirateState.dominantPerspective, 'Archaeologist', 'Dominant perspective should be Archaeologist');
          Assertions.assertDefined(triumvirateState.relationships, 'Relationships should be defined');
          Assertions.assertArrayLength(Object.keys(triumvirateState.relationships), 3, 'Should have 3 character relationships');
        }
      },
      {
        name: 'Enhanced Attractor System Calculation',
        fn: () => {
          enhancedStrangeAttractorSystem.clearCache();
          
          const triumvirateState = triumvirateSystem.calculateTriumvirateState(mockReaderState, mockNodes);
          const attractorState = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
            mockReaderState,
            mockNodes,
            triumvirateState
          );

          Assertions.assertGreaterThan(attractorState.globalResonance, 0, 'Global resonance should be greater than 0');
          Assertions.assertGreaterThan(attractorState.evolutionMomentum, 0, 'Evolution momentum should be greater than 0');
          Assertions.assertArrayLength(Object.keys(attractorState.revealableAttractors), 20, 'Should have all 20 attractors');
          
          // Check that engaged attractors are revealed
          const memoryFragmentAttractor = attractorState.revealableAttractors['memory-fragment'];
          Assertions.assertTrue(memoryFragmentAttractor.isRevealed, 'Memory fragment attractor should be revealed');
          Assertions.assertNotEqual(memoryFragmentAttractor.evolutionStage, 'dormant', 'Memory fragment attractor should not be dormant');
        }
      },
      {
        name: 'Enhanced Endpoint Progression Calculation',
        fn: () => {
          enhancedEndpointProgressionSystem.clearCache();
          
          const triumvirateState = triumvirateSystem.calculateTriumvirateState(mockReaderState, mockNodes);
          const attractorState = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
            mockReaderState,
            mockNodes,
            triumvirateState
          );
          const endpointState = enhancedEndpointProgressionSystem.calculateEndpointProgressionState(
            mockReaderState,
            mockNodes,
            triumvirateState,
            attractorState
          );

          Assertions.assertEqual(endpointState.dominantEndpoint, 'past', 'Dominant endpoint should be past');
          Assertions.assertGreaterThan(endpointState.convergenceReadiness, 0, 'Convergence readiness should be greater than 0');
          Assertions.assertGreaterThan(endpointState.narrativeCoherence, 0, 'Narrative coherence should be greater than 0');
          
          // Past endpoint should have highest progress due to Archaeologist focus
          Assertions.assertGreaterThan(
            endpointState.progressions.past.currentProgress,
            endpointState.progressions.present.currentProgress,
            'Past endpoint should have higher progress than present'
          );
        }
      }
    ]);
  }

  /**
   * Cross-System Integration Tests
   */
  private async testCrossSystemIntegration(): Promise<TestSuite> {
    const mockReaderState = MockDataFactory.createMockReaderState();
    const mockNodes = MockDataFactory.createMockNodes();

    return this.runTestSuite('Cross-System Integration', [
      {
        name: 'Unified Narrative State Calculation',
        fn: () => {
          unifiedNarrativeSystem.clearCache();
          
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

          Assertions.assertDefined(unifiedState.triumvirate, 'Triumvirate state should be defined');
          Assertions.assertDefined(unifiedState.attractors, 'Attractor state should be defined');
          Assertions.assertDefined(unifiedState.endpoints, 'Endpoint state should be defined');
          Assertions.assertGreaterThan(unifiedState.overallCoherence, 0, 'Overall coherence should be greater than 0');
          Assertions.assertGreaterThan(unifiedState.narrativeTension, 0, 'Narrative tension should be greater than 0');
          Assertions.assertGreaterThan(unifiedState.emergentComplexity, 0, 'Emergent complexity should be greater than 0');
        }
      },
      {
        name: 'Cross-System Event Detection',
        fn: () => {
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

          Assertions.assertDefined(unifiedState.recentEvents, 'Recent events should be defined');
          Assertions.assertTrue(Array.isArray(unifiedState.recentEvents), 'Recent events should be an array');
          
          // Validate event structure if events exist
          if (unifiedState.recentEvents.length > 0) {
            const event = unifiedState.recentEvents[0];
            Assertions.assertDefined(event.id, 'Event should have an ID');
            Assertions.assertDefined(event.type, 'Event should have a type');
            Assertions.assertBetween(event.narrativeImpact, 0, 1, 'Event narrative impact should be between 0 and 1');
          }
        }
      },
      {
        name: 'Narrative Guidance Generation',
        fn: () => {
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

          Assertions.assertDefined(unifiedState.suggestedActions, 'Suggested actions should be defined');
          Assertions.assertTrue(Array.isArray(unifiedState.suggestedActions), 'Suggested actions should be an array');
          
          // Validate guidance structure if guidance exists
          if (unifiedState.suggestedActions.length > 0) {
            const guidance = unifiedState.suggestedActions[0];
            Assertions.assertMatches(guidance.type, /navigation|exploration|reflection|choice/, 'Guidance type should be valid');
            Assertions.assertMatches(guidance.priority, /low|medium|high|critical/, 'Guidance priority should be valid');
            Assertions.assertDefined(guidance.message, 'Guidance should have a message');
            Assertions.assertMatches(guidance.source, /triumvirate|attractors|endpoints|unified/, 'Guidance source should be valid');
          }
        }
      },
      {
        name: 'Revelation Readiness Calculation',
        fn: () => {
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

          Assertions.assertDefined(unifiedState.revelationReadiness, 'Revelation readiness should be defined');
          Assertions.assertEqual(typeof unifiedState.revelationReadiness, 'object', 'Revelation readiness should be an object');
          
          // Should have readiness values for different revelation types
          Assertions.assertDefined(unifiedState.revelationReadiness['character-convergence'], 'Character convergence readiness should be defined');
          Assertions.assertDefined(unifiedState.revelationReadiness['identity-unity'], 'Identity unity readiness should be defined');
          
          // Check that values are in valid range
          Object.values(unifiedState.revelationReadiness).forEach((readiness, index) => {
            Assertions.assertBetween(readiness, 0, 1, `Revelation readiness value ${index} should be between 0 and 1`);
          });
        }
      }
    ]);
  }

  /**
   * Performance and Caching Tests
   */
  private async testPerformanceAndCaching(): Promise<TestSuite> {
    const mockReaderState = MockDataFactory.createMockReaderState();
    const mockNodes = MockDataFactory.createMockNodes();

    return this.runTestSuite('Performance and Caching', [
      {
        name: 'Caching Effectiveness',
        fn: () => {
          unifiedNarrativeSystem.clearCache();
          
          const startTime1 = Date.now();
          unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
          const firstCalculationTime = Date.now() - startTime1;
          
          const startTime2 = Date.now();
          unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
          const secondCalculationTime = Date.now() - startTime2;
          
          // Second calculation should be faster due to caching
          Assertions.assertLessThan(secondCalculationTime, firstCalculationTime, 'Second calculation should be faster due to caching');
        }
      },
      {
        name: 'Large Dataset Performance',
        fn: () => {
          // Create a larger set of mock nodes
          const largeNodeSet: Record<string, NodeState> = {};
          const baseNode = MockDataFactory.createMockNodes()['arch-discovery'];
          
          for (let i = 0; i < 50; i++) {
            largeNodeSet[`node-${i}`] = {
              ...baseNode,
              id: `node-${i}`,
              title: `Node ${i}`
            };
          }

          const startTime = Date.now();
          unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, largeNodeSet);
          const calculationTime = Date.now() - startTime;

          // Should complete within reasonable time
          Assertions.assertLessThan(calculationTime, 1000, 'Large dataset calculation should complete within 1 second');
        }
      }
    ]);
  }

  /**
   * Error Handling Tests
   */
  private async testErrorHandling(): Promise<TestSuite> {
    const mockNodes = MockDataFactory.createMockNodes();

    return this.runTestSuite('Error Handling', [
      {
        name: 'Empty Reader State Handling',
        fn: () => {
          const emptyReaderState = MockDataFactory.createEmptyReaderState();
          
          // Should not throw an error
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(emptyReaderState, mockNodes);
          
          Assertions.assertEqual(unifiedState.overallCoherence, 0, 'Overall coherence should be 0 for empty state');
          Assertions.assertEqual(unifiedState.emergentComplexity, 0, 'Emergent complexity should be 0 for empty state');
          Assertions.assertArrayLength(unifiedState.suggestedActions, 0, 'Should have no suggested actions for empty state');
        }
      },
      {
        name: 'Missing Node Data Handling',
        fn: () => {
          const incompleteReaderState = {
            ...MockDataFactory.createMockReaderState(),
            path: {
              ...MockDataFactory.createMockReaderState().path,
              sequence: ['nonexistent-node']
            }
          };

          // Should not throw an error
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(incompleteReaderState, mockNodes);
          Assertions.assertDefined(unifiedState, 'Unified state should be defined even with missing nodes');
        }
      }
    ]);
  }

  /**
   * System Synchronization Tests
   */
  private async testSystemSynchronization(): Promise<TestSuite> {
    const mockReaderState = MockDataFactory.createMockReaderState();
    const mockNodes = MockDataFactory.createMockNodes();

    return this.runTestSuite('System Synchronization', [
      {
        name: 'System Sync Status',
        fn: () => {
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

          Assertions.assertDefined(unifiedState.systemSyncStatus, 'System sync status should be defined');
          Assertions.assertDefined(unifiedState.systemSyncStatus.triumvirate, 'Triumvirate sync status should be defined');
          Assertions.assertDefined(unifiedState.systemSyncStatus.attractors, 'Attractor sync status should be defined');
          Assertions.assertDefined(unifiedState.systemSyncStatus.endpoints, 'Endpoint sync status should be defined');
        }
      },
      {
        name: 'Cache Invalidation',
        fn: () => {
          // Calculate initial state
          const state1 = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
          
          // Clear caches
          unifiedNarrativeSystem.clearCache();
          
          // Calculate again - should recalculate
          const state2 = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
          
          // States should be equivalent (within tolerance)
          const coherenceDiff = Math.abs(state1.overallCoherence - state2.overallCoherence);
          const tensionDiff = Math.abs(state1.narrativeTension - state2.narrativeTension);
          
          Assertions.assertLessThan(coherenceDiff, 0.01, 'Coherence values should be nearly identical after cache clear');
          Assertions.assertLessThan(tensionDiff, 0.01, 'Tension values should be nearly identical after cache clear');
        }
      }
    ]);
  }

  /**
   * Narrative Phase Detection Tests
   */
  private async testNarrativePhaseDetection(): Promise<TestSuite> {
    const mockReaderState = MockDataFactory.createMockReaderState();
    const mockNodes = MockDataFactory.createMockNodes();

    return this.runTestSuite('Narrative Phase Detection', [
      {
        name: 'Phase Identification',
        fn: () => {
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
          const phase = unifiedNarrativeSystem.getNarrativePhase(unifiedState);

          Assertions.assertMatches(phase, /exploration|convergence|revelation|transcendence/, 'Phase should be a valid narrative phase');
        }
      },
      {
        name: 'Revelation Readiness Detection',
        fn: () => {
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
          const isReady = unifiedNarrativeSystem.isRevelationReady(unifiedState);

          Assertions.assertEqual(typeof isReady, 'boolean', 'Revelation readiness should be a boolean');
        }
      },
      {
        name: 'Primary Guidance Provision',
        fn: () => {
          const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
          const primaryGuidance = unifiedNarrativeSystem.getPrimaryGuidance(unifiedState);

          if (primaryGuidance) {
            Assertions.assertDefined(primaryGuidance.type, 'Primary guidance should have a type');
            Assertions.assertDefined(primaryGuidance.priority, 'Primary guidance should have a priority');
            Assertions.assertDefined(primaryGuidance.message, 'Primary guidance should have a message');
          }
        }
      }
    ]);
  }

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log('🚀 Starting Narrative Systems Integration Tests...\n');

    // Clear all caches before starting
    triumvirateSystem.clearCache();
    enhancedStrangeAttractorSystem.clearCache();
    enhancedEndpointProgressionSystem.clearCache();
    unifiedNarrativeSystem.clearCache();

    const testSuites = [
      await this.testIndividualSystems(),
      await this.testCrossSystemIntegration(),
      await this.testPerformanceAndCaching(),
      await this.testErrorHandling(),
      await this.testSystemSynchronization(),
      await this.testNarrativePhaseDetection()
    ];

    this.testSuites = testSuites;
    this.printResults();
  }

  /**
   * Print test results
   */
  private printResults(): void {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalDuration = 0;

    console.log('📊 Test Results Summary\n');
    console.log('=' .repeat(80));

    this.testSuites.forEach(suite => {
      totalTests += suite.tests.length;
      totalPassed += suite.passed;
      totalFailed += suite.failed;
      totalDuration += suite.duration;

      const status = suite.failed === 0 ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${suite.name} (${suite.passed}/${suite.tests.length} passed, ${suite.duration}ms)`);

      // Show failed tests
      suite.tests.forEach(test => {
        if (!test.passed) {
          console.log(`  ❌ ${test.name}: ${test.error}`);
        }
      });

      console.log('');
    });

    console.log('=' .repeat(80));
    console.log(`📈 Overall Results:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${totalPassed} (${Math.round((totalPassed / totalTests) * 100)}%)`);
    console.log(`   Failed: ${totalFailed} (${Math.round((totalFailed / totalTests) * 100)}%)`);
    console.log(`   Duration: ${totalDuration}ms`);
    console.log(`   Status: ${totalFailed === 0 ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  }

  /**
   * Get test results summary
   */
  getResults(): { totalTests: number; totalPassed: number; totalFailed: number; totalDuration: number } {
    const totalTests = this.testSuites.reduce((sum, suite) => sum + suite.tests.length, 0);
    const totalPassed = this.testSuites.reduce((sum, suite) => sum + suite.passed, 0);
    const totalFailed = this.testSuites.reduce((sum, suite) => sum + suite.failed, 0);
    const totalDuration = this.testSuites.reduce((sum, suite) => sum + suite.duration, 0);

    return { totalTests, totalPassed, totalFailed, totalDuration };
  }
}

/**
 * Export a singleton instance for easy use
 */
export const narrativeSystemsTestRunner = new NarrativeSystemsTestRunner();

/**
 * Convenience function to run all tests
 */
export async function runNarrativeSystemsTests(): Promise<void> {
  await narrativeSystemsTestRunner.runAllTests();
}
