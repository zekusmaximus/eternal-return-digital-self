/**
 * Integration Tests for Consolidated Systems
 *
 * Tests the interaction between the consolidated 2-system architecture:
 * - ConsolidatedTriumvirateSystem (character convergence + endpoint progression)
 * - EnhancedStrangeAttractorSystem (thematic element evolution)
 * - SimplifiedUnifiedNarrativeSystem (coordination)
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

import { consolidatedTriumvirateSystem } from '../../services/ConsolidatedTriumvirateSystem';
import { enhancedStrangeAttractorSystem } from '../../services/EnhancedStrangeAttractorSystem';
import { simplifiedUnifiedNarrativeSystem } from '../../services/SimplifiedUnifiedNarrativeSystem';
import { clearAllCaches } from '../../utils/SimpleCache';
import { ReaderState } from '../../store/slices/readerSlice';
import { NodeState, Character, StrangeAttractor, EndpointOrientation } from '../../types';

// Global mock data for all tests
let mockReaderState: ReaderState;
let mockNodes: Record<string, NodeState>;

// Initialize mock data function
function initializeMockData() {
    // Clear all system caches
    clearAllCaches();

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
}

describe('Consolidated Systems Integration', () => {
  beforeEach(() => {
    initializeMockData();
  });

  describe('Consolidated Triumvirate System', () => {
    it('should calculate consolidated state with character convergence and endpoint progression', () => {
      const consolidatedState = consolidatedTriumvirateSystem.calculateConsolidatedState(mockReaderState, mockNodes);

      // Test character convergence functionality
      expect(consolidatedState.isActive).toBe(true);
      expect(consolidatedState.convergenceLevel).toBeGreaterThan(0);
      expect(consolidatedState.dominantPerspective).toBe('Archaeologist');
      expect(consolidatedState.relationships).toBeDefined();
      expect(Object.keys(consolidatedState.relationships)).toHaveLength(3);

      // Test integrated endpoint progression functionality
      expect(consolidatedState.endpointProgressions).toBeDefined();
      expect(consolidatedState.endpointProgressions.past).toBeDefined();
      expect(consolidatedState.endpointProgressions.present).toBeDefined();
      expect(consolidatedState.endpointProgressions.future).toBeDefined();
      
      // Past endpoint should have highest progress due to Archaeologist focus
      expect(consolidatedState.endpointProgressions.past.currentProgress).toBeGreaterThan(
        consolidatedState.endpointProgressions.present.currentProgress
      );
      
      expect(consolidatedState.dominantEndpoint).toBe('past');
      expect(consolidatedState.narrativeCoherence).toBeGreaterThan(0);
    });

    it('should handle milestone detection and progression', () => {
      const consolidatedState = consolidatedTriumvirateSystem.calculateConsolidatedState(mockReaderState, mockNodes);
      
      // Check that milestones are initialized
      const pastProgression = consolidatedState.endpointProgressions.past;
      expect(pastProgression.milestones).toBeDefined();
      expect(pastProgression.milestones.length).toBeGreaterThan(0);
      
      // Check milestone structure
      const firstMilestone = pastProgression.milestones[0];
      expect(firstMilestone.id).toBeDefined();
      expect(firstMilestone.name).toBeDefined();
      expect(firstMilestone.requiredProgress).toBeGreaterThan(0);
      expect(typeof firstMilestone.isReached).toBe('boolean');
    });

    it('should provide endpoint readiness detection', () => {
      const consolidatedState = consolidatedTriumvirateSystem.calculateConsolidatedState(mockReaderState, mockNodes);
      
      const readyEndpoint = consolidatedTriumvirateSystem.isEndpointReady(consolidatedState);
      expect(typeof readyEndpoint === 'string' || readyEndpoint === null).toBe(true);
      
      if (readyEndpoint) {
        expect(['past', 'present', 'future']).toContain(readyEndpoint);
      }
    });
  });

  describe('Enhanced Strange Attractor System', () => {
    it('should work with consolidated triumvirate state', () => {
      const consolidatedState = consolidatedTriumvirateSystem.calculateConsolidatedState(mockReaderState, mockNodes);
      
      // Convert to compatible format for attractor system
      const compatibleTriumvirateState = {
        isActive: consolidatedState.isActive,
        convergenceLevel: consolidatedState.convergenceLevel,
        narrativeTension: consolidatedState.narrativeTension,
        dominantPerspective: consolidatedState.dominantPerspective,
        relationships: consolidatedState.relationships,
        revelationThreshold: consolidatedState.revelationThreshold,
        convergenceMoments: consolidatedState.convergenceMoments,
        lastUpdate: consolidatedState.lastUpdate
      };

      const attractorState = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
        mockReaderState,
        mockNodes,
        compatibleTriumvirateState
      );

      expect(attractorState.globalResonance).toBeGreaterThan(0);
      expect(attractorState.evolutionMomentum).toBeGreaterThan(0);
      expect(Object.keys(attractorState.revealableAttractors)).toHaveLength(20); // All attractors
      
      // Check that engaged attractors are revealed
      const memoryFragmentAttractor = attractorState.revealableAttractors['memory-fragment'];
      expect(memoryFragmentAttractor.isRevealed).toBe(true);
      expect(memoryFragmentAttractor.evolutionStage).not.toBe('dormant');
    });
  });

  describe('Simplified Unified Narrative System', () => {
    it('should coordinate both consolidated systems', () => {
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.triumvirate).toBeDefined();
      expect(unifiedState.attractors).toBeDefined();
      expect(unifiedState.overallCoherence).toBeGreaterThan(0);
      expect(unifiedState.narrativeTension).toBeGreaterThan(0);
      expect(unifiedState.emergentComplexity).toBeGreaterThan(0);
    });

    it('should detect cross-system events', () => {
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);

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
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.suggestedActions).toBeDefined();
      expect(Array.isArray(unifiedState.suggestedActions)).toBe(true);
      
      if (unifiedState.suggestedActions.length > 0) {
        const guidance = unifiedState.suggestedActions[0];
        expect(guidance.type).toMatch(/navigation|exploration|reflection|choice/);
        expect(guidance.priority).toMatch(/low|medium|high|critical/);
        expect(guidance.message).toBeDefined();
        expect(guidance.source).toMatch(/triumvirate|attractors|unified/);
      }
    });

    it('should calculate revelation readiness across systems', () => {
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);

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

    it('should maintain system synchronization status', () => {
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);

      expect(unifiedState.systemSyncStatus).toBeDefined();
      expect(unifiedState.systemSyncStatus.triumvirate).toBeDefined();
      expect(unifiedState.systemSyncStatus.attractors).toBeDefined();
    });
  });

  describe('Performance and Caching', () => {
    it('should use caching effectively across all systems', () => {
      const startTime = Date.now();
      
      // First calculation
      simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      const firstCalculationTime = Date.now() - startTime;
      
      const secondStartTime = Date.now();
      
      // Second calculation (should use cache)
      simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      const secondCalculationTime = Date.now() - secondStartTime;
      
      // Second calculation should be significantly faster due to caching
      expect(secondCalculationTime).toBeLessThan(firstCalculationTime);
    });

    it('should handle cache invalidation correctly', () => {
      // Calculate initial state
      const state1 = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      
      // Clear caches
      simplifiedUnifiedNarrativeSystem.clearCache();
      
      // Calculate again - should recalculate
      const state2 = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      
      // States should be equivalent but not identical objects
      expect(state1.overallCoherence).toBeCloseTo(state2.overallCoherence, 2);
      expect(state1.narrativeTension).toBeCloseTo(state2.narrativeTension, 2);
    });
  });

  describe('Narrative Phase Detection', () => {
    it('should correctly identify narrative phase', () => {
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      const phase = simplifiedUnifiedNarrativeSystem.getNarrativePhase(unifiedState);

      expect(phase).toMatch(/exploration|convergence|revelation|transcendence/);
    });

    it('should detect when revelations are ready', () => {
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      const isReady = simplifiedUnifiedNarrativeSystem.isRevelationReady(unifiedState);

      expect(typeof isReady).toBe('boolean');
    });

    it('should provide primary guidance when available', () => {
      const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      const primaryGuidance = simplifiedUnifiedNarrativeSystem.getPrimaryGuidance(unifiedState);

      if (primaryGuidance) {
        expect(primaryGuidance.type).toBeDefined();
        expect(primaryGuidance.priority).toBeDefined();
        expect(primaryGuidance.message).toBeDefined();
      }
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
        simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(incompleteReaderState, mockNodes);
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
        simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(emptyReaderState, mockNodes);
      }).not.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should allow configuration updates', () => {
      const originalConfig = simplifiedUnifiedNarrativeSystem.getConfig();
      
      simplifiedUnifiedNarrativeSystem.updateConfig({
        convergenceMomentThreshold: 0.9
      });
      
      const updatedConfig = simplifiedUnifiedNarrativeSystem.getConfig();
      expect(updatedConfig.convergenceMomentThreshold).toBe(0.9);
      expect(updatedConfig.attractorEvolutionThreshold).toBe(originalConfig.attractorEvolutionThreshold);
    });

    it('should clear caches when configuration changes', () => {
      // Calculate initial state
      simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      
      // Update configuration (should clear caches)
      simplifiedUnifiedNarrativeSystem.updateConfig({
        convergenceMomentThreshold: 0.9
      });
      
      // Should recalculate with new configuration
      const state = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
      expect(state).toBeDefined();
    });
  });
});

describe('System Consolidation Benefits', () => {
  beforeEach(() => {
    initializeMockData();
  });

  it('should demonstrate reduced complexity compared to 4-system architecture', () => {
    // Test that we can achieve the same functionality with fewer systems
    const unifiedState = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
    
    // Should have all essential functionality
    expect(unifiedState.triumvirate.convergenceLevel).toBeDefined(); // Character convergence
    expect(unifiedState.triumvirate.endpointProgressions).toBeDefined(); // Endpoint progression
    expect(unifiedState.attractors.globalResonance).toBeDefined(); // Attractor evolution
    expect(unifiedState.overallCoherence).toBeDefined(); // Cross-system coordination
    
    // Should provide guidance and revelation readiness
    expect(unifiedState.suggestedActions).toBeDefined();
    expect(unifiedState.revelationReadiness).toBeDefined();
  });

  it('should maintain performance with simplified architecture', () => {
    const startTime = Date.now();
    
    // Calculate unified state
    const state = simplifiedUnifiedNarrativeSystem.calculateSimplifiedUnifiedNarrativeState(mockReaderState, mockNodes);
    
    const calculationTime = Date.now() - startTime;
    
    // Should complete within reasonable time
    expect(calculationTime).toBeLessThan(100); // 100ms threshold
    expect(state).toBeDefined();
  });
});