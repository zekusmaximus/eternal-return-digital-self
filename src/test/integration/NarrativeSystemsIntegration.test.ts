/**
 * Comprehensive Integration Tests for Narrative Systems
 *
 * Tests the interaction between Triumvirate, Enhanced Strange Attractor,
 * Enhanced Endpoint Progression, and Unified Narrative systems.
 */

// Jest global type declarations
declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function expect(actual: unknown): {
    toBe(expected: unknown): void;
    toHaveLength(length: number): void;
    toContain(item: unknown): void;
    toBeDefined(): void;
    toBeLessThan(value: number): void;
    toBeCloseTo(value: number, precision?: number): void;
    toBeGreaterThan(value: number): void;
    toBeGreaterThanOrEqual(value: number): void;
    toBeLessThanOrEqual(value: number): void;
    toMatch(pattern: RegExp | string): void;
    not: {
      toBe(expected: unknown): void;
      toThrow(): void;
    };
  };
  function expect(fn: () => void): {
    not: {
      toThrow(): void;
    };
  };
}

import { triumvirateSystem } from '../../services/TriumvirateSystem';
import { enhancedStrangeAttractorSystem } from '../../services/EnhancedStrangeAttractorSystem';
import { enhancedEndpointProgressionSystem } from '../../services/EnhancedEndpointProgressionSystem';
import { unifiedNarrativeSystem } from '../../services/UnifiedNarrativeSystem';
import { ReaderState } from '../../store/slices/readerSlice';
import { NodeState, Character, StrangeAttractor, EndpointOrientation } from '../../types';

describe('Narrative Systems Integration', () => {
  let mockReaderState: ReaderState;
  let mockNodes: Record<string, NodeState>;

  beforeEach(() => {
    // Clear all system caches
    triumvirateSystem.clearCache();
    enhancedStrangeAttractorSystem.clearCache();
    enhancedEndpointProgressionSystem.clearCache();
    unifiedNarrativeSystem.clearCache();

    // Create mock reader state with comprehensive path data
    mockReaderState = {
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

    // Create mock nodes
    mockNodes = {
      'arch-discovery': {
        id: 'arch-discovery',
        title: 'Patterns in Decay',
        character: 'Archaeologist' as Character,
        temporalValue: 1,
        initialConnections: ['algo-awakening', 'human-discovery'],
        contentSource: 'arch-discovery.md',
        coreConcept: 'Archaeological discovery',
        strangeAttractors: ['memory-fragment', 'recursion-pattern'] as StrangeAttractor[],
        transformationThresholds: { visit: 1, revisit: 2, complex: 4, fragmented: 7 },
        visitCount: 2,
        visitState: 'revisited' as const,
        currentState: 'revisited' as const,
        revealedConnections: ['algo-awakening', 'human-discovery'],
        transformations: [],
        content: null,
        enhancedContent: null,
        currentContent: null,
        originalContent: null,
        lastTransformedContent: null,
        appliedTransformationIds: [],
        contentVersion: 0,
        transformationState: 'clean' as const
      },
      'algo-awakening': {
        id: 'algo-awakening',
        title: 'First Consciousness',
        character: 'Algorithm' as Character,
        temporalValue: 5,
        initialConnections: ['arch-discovery', 'human-discovery'],
        contentSource: 'algo-awakening.md',
        coreConcept: 'Algorithmic awakening',
        strangeAttractors: ['recursion-pattern', 'process-language'] as StrangeAttractor[],
        transformationThresholds: { visit: 1, revisit: 2, complex: 4, fragmented: 7 },
        visitCount: 1,
        visitState: 'visited' as const,
        currentState: 'visited' as const,
        revealedConnections: ['arch-discovery', 'human-discovery'],
        transformations: [],
        content: null,
        enhancedContent: null,
        currentContent: null,
        originalContent: null,
        lastTransformedContent: null,
        appliedTransformationIds: [],
        contentVersion: 0,
        transformationState: 'clean' as const
      },
      'human-discovery': {
        id: 'human-discovery',
        title: 'Ruins of Memory',
        character: 'LastHuman' as Character,
        temporalValue: 9,
        initialConnections: ['arch-discovery', 'algo-awakening'],
        contentSource: 'human-discovery.md',
        coreConcept: 'Human discovery',
        strangeAttractors: ['identity-pattern', 'quantum-choice'] as StrangeAttractor[],
        transformationThresholds: { visit: 1, revisit: 2, complex: 4, fragmented: 7 },
        visitCount: 1,
        visitState: 'visited' as const,
        currentState: 'visited' as const,
        revealedConnections: ['arch-discovery', 'algo-awakening'],
        transformations: [],
        content: null,
        enhancedContent: null,
        currentContent: null,
        originalContent: null,
        lastTransformedContent: null,
        appliedTransformationIds: [],
        contentVersion: 0,
        transformationState: 'clean' as const
      },
      'arch-loss': {
        id: 'arch-loss',
        title: 'The Limits of Preservation',
        character: 'Archaeologist' as Character,
        temporalValue: 4,
        initialConnections: ['arch-discovery'],
        contentSource: 'arch-loss.md',
        coreConcept: 'Archaeological loss',
        strangeAttractors: ['verification-ritual', 'system-decay'] as StrangeAttractor[],
        transformationThresholds: { visit: 1, revisit: 2, complex: 4, fragmented: 7 },
        isEndpoint: true,
        endpointOrientation: 'past' as EndpointOrientation,
        visitCount: 1,
        visitState: 'visited' as const,
        currentState: 'visited' as const,
        revealedConnections: ['arch-discovery'],
        transformations: [],
        content: null,
        enhancedContent: null,
        currentContent: null,
        originalContent: null,
        lastTransformedContent: null,
        appliedTransformationIds: [],
        contentVersion: 0,
        transformationState: 'clean' as const
      }
    };
  });

  describe('Individual System Functionality', () => {
    it('should calculate triumvirate state correctly', () => {
      const triumvirateState = triumvirateSystem.calculateTriumvirateState(mockReaderState, mockNodes);

      expect(triumvirateState.isActive).toBe(true);
      expect(triumvirateState.convergenceLevel).toBeGreaterThan(0);
      expect(triumvirateState.dominantPerspective).toBe('Archaeologist');
      expect(triumvirateState.relationships).toBeDefined();
      expect(Object.keys(triumvirateState.relationships)).toHaveLength(3);
    });

    it('should calculate enhanced attractor state correctly', () => {
      const triumvirateState = triumvirateSystem.calculateTriumvirateState(mockReaderState, mockNodes);
      const attractorState = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
        mockReaderState,
        mockNodes,
        triumvirateState
      );

      expect(attractorState.globalResonance).toBeGreaterThan(0);
      expect(attractorState.evolutionMomentum).toBeGreaterThan(0);
      expect(Object.keys(attractorState.revealableAttractors)).toHaveLength(20); // All attractors
      
      // Check that engaged attractors are revealed
      const memoryFragmentAttractor = attractorState.revealableAttractors['memory-fragment'];
      expect(memoryFragmentAttractor.isRevealed).toBe(true);
      expect(memoryFragmentAttractor.evolutionStage).not.toBe('dormant');
    });

    it('should calculate endpoint progression state correctly', () => {
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

      expect(endpointState.dominantEndpoint).toBe('past');
      expect(endpointState.convergenceReadiness).toBeGreaterThan(0);
      expect(endpointState.narrativeCoherence).toBeGreaterThan(0);
      
      // Past endpoint should have highest progress due to Archaeologist focus
      expect(endpointState.progressions.past.currentProgress).toBeGreaterThan(
        endpointState.progressions.present.currentProgress
      );
    });
  });

  describe('Cross-System Integration', () => {
    it('should calculate unified narrative state with all systems', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.triumvirate).toBeDefined();
      expect(unifiedState.attractors).toBeDefined();
      expect(unifiedState.endpoints).toBeDefined();
      expect(unifiedState.overallCoherence).toBeGreaterThan(0);
      expect(unifiedState.narrativeTension).toBeGreaterThan(0);
      expect(unifiedState.emergentComplexity).toBeGreaterThan(0);
    });

    it('should detect cross-system events', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.recentEvents).toBeDefined();
      expect(Array.isArray(unifiedState.recentEvents)).toBe(true);
      
      // Should detect some events given the mock data
      if (unifiedState.recentEvents.length > 0) {
        const event = unifiedState.recentEvents[0];
        expect(event.id).toBeDefined();
        expect(event.type).toBeDefined();
        expect(event.narrativeImpact).toBeGreaterThanOrEqual(0);
        expect(event.narrativeImpact).toBeLessThanOrEqual(1);
      }
    });

    it('should generate narrative guidance', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.suggestedActions).toBeDefined();
      expect(Array.isArray(unifiedState.suggestedActions)).toBe(true);
      
      if (unifiedState.suggestedActions.length > 0) {
        const guidance = unifiedState.suggestedActions[0];
        expect(guidance.type).toMatch(/navigation|exploration|reflection|choice/);
        expect(guidance.priority).toMatch(/low|medium|high|critical/);
        expect(guidance.message).toBeDefined();
        expect(guidance.source).toMatch(/triumvirate|attractors|endpoints|unified/);
      }
    });

    it('should calculate revelation readiness across systems', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.revelationReadiness).toBeDefined();
      expect(typeof unifiedState.revelationReadiness).toBe('object');
      
      // Should have readiness values for different revelation types
      expect(unifiedState.revelationReadiness['character-convergence']).toBeDefined();
      expect(unifiedState.revelationReadiness['identity-unity']).toBeDefined();
      
      // Check that values are in valid range
      Object.values(unifiedState.revelationReadiness).forEach(readiness => {
        expect(readiness).toBeGreaterThanOrEqual(0);
        expect(readiness).toBeLessThanOrEqual(1);
      });
    });
  });

  describe('System Synchronization', () => {
    it('should maintain system synchronization status', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.systemSyncStatus).toBeDefined();
      expect(unifiedState.systemSyncStatus.triumvirate).toBeDefined();
      expect(unifiedState.systemSyncStatus.attractors).toBeDefined();
      expect(unifiedState.systemSyncStatus.endpoints).toBeDefined();
    });

    it('should handle cache invalidation correctly', () => {
      // Calculate initial state
      const state1 = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      
      // Clear caches
      unifiedNarrativeSystem.clearCache();
      
      // Calculate again - should recalculate
      const state2 = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      
      // States should be equivalent but not identical objects
      expect(state1.overallCoherence).toBeCloseTo(state2.overallCoherence, 2);
      expect(state1.narrativeTension).toBeCloseTo(state2.narrativeTension, 2);
    });
  });

  describe('Narrative Phase Detection', () => {
    it('should correctly identify narrative phase', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      const phase = unifiedNarrativeSystem.getNarrativePhase(unifiedState);

      expect(phase).toMatch(/exploration|convergence|revelation|transcendence/);
    });

    it('should detect when revelations are ready', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      const isReady = unifiedNarrativeSystem.isRevelationReady(unifiedState);

      expect(typeof isReady).toBe('boolean');
    });

    it('should provide primary guidance when available', () => {
      const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      const primaryGuidance = unifiedNarrativeSystem.getPrimaryGuidance(unifiedState);

      if (primaryGuidance) {
        expect(primaryGuidance.type).toBeDefined();
        expect(primaryGuidance.priority).toBeDefined();
        expect(primaryGuidance.message).toBeDefined();
      }
    });
  });

  describe('Performance and Caching', () => {
    it('should use caching effectively', () => {
      const startTime = Date.now();
      
      // First calculation
      unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      const firstCalculationTime = Date.now() - startTime;
      
      const secondStartTime = Date.now();
      
      // Second calculation (should use cache)
      unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      const secondCalculationTime = Date.now() - secondStartTime;
      
      // Second calculation should be significantly faster due to caching
      expect(secondCalculationTime).toBeLessThan(firstCalculationTime);
    });

    it('should handle large numbers of nodes efficiently', () => {
      // Create a larger set of mock nodes
      const largeNodeSet: Record<string, NodeState> = {};
      for (let i = 0; i < 50; i++) {
        largeNodeSet[`node-${i}`] = {
          ...mockNodes['arch-discovery'],
          id: `node-${i}`,
          title: `Node ${i}`
        };
      }

      const startTime = Date.now();
      unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, largeNodeSet);
      const calculationTime = Date.now() - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(calculationTime).toBeLessThan(1000); // 1 second
    });
  });

  describe('Error Handling', () => {
    it('should handle missing node data gracefully', () => {
      const incompleteReaderState = {
        ...mockReaderState,
        path: {
          ...mockReaderState.path,
          sequence: ['nonexistent-node']
        }
      };

      expect(() => {
        unifiedNarrativeSystem.calculateUnifiedNarrativeState(incompleteReaderState, mockNodes);
      }).not.toThrow();
    });

    it('should handle empty reader state gracefully', () => {
      const emptyReaderState: ReaderState = {
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

      expect(() => {
        unifiedNarrativeSystem.calculateUnifiedNarrativeState(emptyReaderState, mockNodes);
      }).not.toThrow();
    });

    it('should handle corrupted data gracefully', () => {
      const corruptedReaderState = {
        ...mockReaderState,
        path: {
          ...mockReaderState.path,
          detailedVisits: undefined
        }
      };

      expect(() => {
        unifiedNarrativeSystem.calculateUnifiedNarrativeState(corruptedReaderState, mockNodes);
      }).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should allow configuration updates', () => {
      const originalConfig = unifiedNarrativeSystem.getConfig();
      
      unifiedNarrativeSystem.updateConfig({
        convergenceMomentThreshold: 0.9
      });
      
      const updatedConfig = unifiedNarrativeSystem.getConfig();
      expect(updatedConfig.convergenceMomentThreshold).toBe(0.9);
      expect(updatedConfig.attractorEvolutionThreshold).toBe(originalConfig.attractorEvolutionThreshold);
    });

    it('should clear caches when configuration changes', () => {
      // Calculate initial state
      unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      
      // Update configuration (should clear caches)
      unifiedNarrativeSystem.updateConfig({
        convergenceMomentThreshold: 0.9
      });
      
      // Should recalculate with new configuration
      const state = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
      expect(state).toBeDefined();
    });
  });
});

describe('System Integration Edge Cases', () => {
  let mockReaderState: ReaderState;
  let mockNodes: Record<string, NodeState>;

  beforeEach(() => {
    // Create edge case scenarios
    mockReaderState = {
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

    mockNodes = {};
  });

  it('should handle completely empty state', () => {
    const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
    
    expect(unifiedState.overallCoherence).toBe(0);
    expect(unifiedState.emergentComplexity).toBe(0);
    expect(unifiedState.suggestedActions).toHaveLength(0);
  });

  it('should handle maximum convergence scenario', () => {
    // Create scenario with maximum convergence
    mockReaderState.path.sequence = ['arch-discovery', 'algo-awakening', 'human-discovery'];
    mockReaderState.path.characterFocus = {
      'Archaeologist': 10,
      'Algorithm': 10,
      'LastHuman': 10
    } as Record<Character, number>;
    mockReaderState.endpointProgress = { past: 100, present: 100, future: 100 };

    const unifiedState = unifiedNarrativeSystem.calculateUnifiedNarrativeState(mockReaderState, mockNodes);
    
    expect(unifiedState.overallCoherence).toBeGreaterThan(0.5);
    expect(unifiedNarrativeSystem.getNarrativePhase(unifiedState)).toMatch(/convergence|revelation|transcendence/);
  });
});