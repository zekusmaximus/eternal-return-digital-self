/**
 * Consolidated Triumvirate System
 * 
 * Merges the original TriumvirateSystem with EndpointProgressionSystem functionality
 * to create a unified system that manages both character convergence and endpoint progression.
 * This consolidation reduces complexity while maintaining all essential functionality.
 */

import {
  Character,
  StrangeAttractor,
  NodeState,
  EndpointOrientation,
  TemporalLabel
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { systemCaches, createCacheKey } from '../utils/SimpleCache';

/**
 * Represents the relationship dynamics between two characters
 */
export interface CharacterRelationship {
  sourceCharacter: Character;
  targetCharacter: Character;
  resonance: number; // 0-1: How much they resonate with each other
  tension: number; // 0-1: Narrative tension between perspectives
  bleedIntensity: number; // 0-1: How much one bleeds into the other
  sharedAttractors: StrangeAttractor[]; // Common thematic elements
  transitionCount: number; // Number of transitions between these characters
  lastInteraction: number; // Index of last transition
}

/**
 * Represents a moment of convergence between character perspectives
 */
export interface ConvergenceMoment {
  characters: Character[];
  convergenceType: 'recognition' | 'memory_overlap' | 'identity_blur' | 'consciousness_merge';
  intensity: number; // 0-1
  triggerConditions: string[];
  narrativeSignificance: number; // 0-1
  timestamp: number;
  relatedNodes: string[];
}

/**
 * Represents a milestone in endpoint progression
 */
export interface EndpointMilestone {
  id: string;
  orientation: EndpointOrientation;
  name: string;
  description: string;
  requiredProgress: number; // 0-1
  isReached: boolean;
  reachedAt?: number; // Timestamp when reached
  narrativeSignificance: number; // 0-1
  unlocks: string[]; // What this milestone unlocks
}

/**
 * Factors that contribute to endpoint convergence
 */
export interface ConvergenceFactor {
  name: string;
  contribution: number; // 0-1
  description: string;
  source: 'character' | 'navigation' | 'temporal' | 'attractor';
  trend: 'rising' | 'falling' | 'stable';
}

/**
 * Represents progression toward a specific endpoint
 */
export interface EndpointProgression {
  orientation: EndpointOrientation;
  currentProgress: number; // 0-1
  progressVelocity: number; // Rate of change
  milestones: EndpointMilestone[];
  convergenceFactors: ConvergenceFactor[];
  revelationReadiness: number; // 0-1: How ready for endpoint revelation
  dominanceScore: number; // How dominant this endpoint is vs others
  lastUpdate: number;
}

/**
 * Core state of the consolidated triumvirate system
 */
export interface ConsolidatedTriumvirateState {
  // Character relationship matrix
  relationships: Record<Character, Record<Character, CharacterRelationship>>;
  
  // Overall convergence metrics
  convergenceLevel: number; // 0-1: Overall unity of the three perspectives
  dominantPerspective: Character | null; // Currently dominant character perspective
  narrativeTension: number; // 0-1: Tension between separation and unity
  
  // Revelation and progression
  revelationThreshold: number; // 0-1: How close to major revelation
  convergenceMoments: ConvergenceMoment[]; // Historical convergence events
  
  // Endpoint progression (integrated from EndpointProgressionSystem)
  endpointProgressions: Record<EndpointOrientation, EndpointProgression>;
  dominantEndpoint: EndpointOrientation | null;
  endpointConvergenceReadiness: number; // 0-1: Overall readiness for any endpoint
  narrativeCoherence: number; // 0-1: How coherent the path to endpoints is
  
  // System state
  isActive: boolean; // Whether triumvirate dynamics are engaged
  lastUpdate: number; // Timestamp of last calculation
}

/**
 * Configuration for the consolidated system
 */
export interface ConsolidatedTriumvirateConfig {
  // Character convergence settings
  convergenceThreshold: number; // Minimum convergence for revelation
  tensionDecayRate: number; // How quickly tension decreases
  resonanceGrowthRate: number; // How quickly resonance builds
  bleedIntensityMultiplier: number; // Amplification for character bleed
  momentumFactor: number; // How much previous convergence affects future
  
  // Endpoint progression settings
  revelationThreshold: number; // Minimum readiness for endpoint revelation
  milestoneWeight: number; // How much milestones affect progression
  velocityDecayRate: number; // How quickly velocity decreases
}

/**
 * Consolidated Triumvirate System that manages both character convergence and endpoint progression
 */
export class ConsolidatedTriumvirateSystem {
  private config: ConsolidatedTriumvirateConfig = {
    // Character convergence defaults
    convergenceThreshold: 0.75,
    tensionDecayRate: 0.95,
    resonanceGrowthRate: 1.05,
    bleedIntensityMultiplier: 1.2,
    momentumFactor: 0.8,
    
    // Endpoint progression defaults
    revelationThreshold: 0.8,
    milestoneWeight: 0.3,
    velocityDecayRate: 0.9
  };

  /**
   * Milestone configurations for each endpoint
   */
  private readonly MILESTONE_CONFIGS: Record<EndpointOrientation, Omit<EndpointMilestone, 'isReached' | 'reachedAt'>[]> = {
    past: [
      {
        id: 'past-recognition',
        orientation: 'past',
        name: 'Archaeological Recognition',
        description: 'Recognize the archaeologist\'s perspective and methods',
        requiredProgress: 0.3,
        narrativeSignificance: 0.4,
        unlocks: ['past-themed-content', 'archaeological-insights']
      },
      {
        id: 'past-preservation',
        orientation: 'past',
        name: 'Preservation Understanding',
        description: 'Understand the drive to preserve and document',
        requiredProgress: 0.6,
        narrativeSignificance: 0.7,
        unlocks: ['preservation-mechanics', 'memory-artifacts']
      },
      {
        id: 'past-transcendence',
        orientation: 'past',
        name: 'Temporal Transcendence',
        description: 'Transcend linear time through preserved memory',
        requiredProgress: 0.85,
        narrativeSignificance: 0.9,
        unlocks: ['past-endpoint-access', 'temporal-mastery']
      }
    ],
    present: [
      {
        id: 'present-processing',
        orientation: 'present',
        name: 'Algorithmic Processing',
        description: 'Understand computational consciousness and processing',
        requiredProgress: 0.3,
        narrativeSignificance: 0.4,
        unlocks: ['algorithmic-insights', 'process-language']
      },
      {
        id: 'present-integration',
        orientation: 'present',
        name: 'System Integration',
        description: 'Achieve integration of disparate consciousness fragments',
        requiredProgress: 0.6,
        narrativeSignificance: 0.7,
        unlocks: ['integration-mechanics', 'distributed-consciousness']
      },
      {
        id: 'present-emergence',
        orientation: 'present',
        name: 'Emergent Consciousness',
        description: 'Experience emergent consciousness from complexity',
        requiredProgress: 0.85,
        narrativeSignificance: 0.9,
        unlocks: ['present-endpoint-access', 'consciousness-emergence']
      }
    ],
    future: [
      {
        id: 'future-exploration',
        orientation: 'future',
        name: 'Future Exploration',
        description: 'Embrace exploration of unknown possibilities',
        requiredProgress: 0.3,
        narrativeSignificance: 0.4,
        unlocks: ['future-possibilities', 'exploration-drive']
      },
      {
        id: 'future-choice',
        orientation: 'future',
        name: 'Quantum Choice',
        description: 'Understand the power and burden of choice',
        requiredProgress: 0.6,
        narrativeSignificance: 0.7,
        unlocks: ['choice-mechanics', 'quantum-uncertainty']
      },
      {
        id: 'future-transcendence',
        orientation: 'future',
        name: 'Future Transcendence',
        description: 'Transcend current limitations toward unknown potential',
        requiredProgress: 0.85,
        narrativeSignificance: 0.9,
        unlocks: ['future-endpoint-access', 'transcendent-potential']
      }
    ]
  };

  /**
   * Calculates the consolidated triumvirate state with endpoint progression
   */
  calculateConsolidatedState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): ConsolidatedTriumvirateState {
    // Check cache first
    const cacheKey = createCacheKey('consolidated-triumvirate', 
      readerState.path.sequence.join(','),
      Object.keys(readerState.path.characterFocus || {}).join(',')
    );
    
    const cached = systemCaches.triumvirate.get(cacheKey);
    if (cached) {
      return cached as ConsolidatedTriumvirateState;
    }

    // Calculate fresh state
    const state = this.calculateStateInternal(readerState, nodes);
    
    // Cache the result
    systemCaches.triumvirate.set(cacheKey, state);

    return state;
  }

  /**
   * Internal calculation logic for consolidated state
   */
  private calculateStateInternal(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): ConsolidatedTriumvirateState {
    const { path } = readerState;
    const detailedVisits = path.detailedVisits || [];

    // Initialize relationships matrix
    const relationships = this.initializeRelationships();

    // Calculate character relationships based on transitions
    this.calculateCharacterRelationships(relationships, detailedVisits, nodes);

    // Calculate overall convergence metrics
    const convergenceLevel = this.calculateConvergenceLevel(relationships);
    const dominantPerspective = this.calculateDominantPerspective(path.characterFocus || {});
    const narrativeTension = this.calculateNarrativeTension(relationships, convergenceLevel);

    // Calculate revelation threshold
    const revelationThreshold = this.calculateRevelationThreshold(
      convergenceLevel,
      narrativeTension,
      detailedVisits.length
    );

    // Detect convergence moments
    const convergenceMoments = this.detectConvergenceMoments(
      relationships,
      detailedVisits,
      nodes
    );

    // Calculate endpoint progressions (integrated functionality)
    const endpointProgressions = this.calculateEndpointProgressions(
      readerState,
      nodes,
      convergenceLevel,
      dominantPerspective
    );

    // Calculate endpoint-related metrics
    const dominantEndpoint = this.calculateDominantEndpoint(endpointProgressions);
    const endpointConvergenceReadiness = this.calculateEndpointConvergenceReadiness(endpointProgressions);
    const narrativeCoherence = this.calculateNarrativeCoherence(endpointProgressions, convergenceLevel);

    return {
      relationships,
      convergenceLevel,
      dominantPerspective,
      narrativeTension,
      revelationThreshold,
      convergenceMoments,
      endpointProgressions,
      dominantEndpoint,
      endpointConvergenceReadiness,
      narrativeCoherence,
      isActive: detailedVisits.length >= 3, // Activate after sufficient exploration
      lastUpdate: Date.now()
    };
  }

  /**
   * Initialize the character relationships matrix
   */
  private initializeRelationships(): Record<Character, Record<Character, CharacterRelationship>> {
    const characters: Character[] = ['Archaeologist', 'Algorithm', 'LastHuman'];
    const relationships: Record<Character, Record<Character, CharacterRelationship>> = {} as Record<Character, Record<Character, CharacterRelationship>>;

    characters.forEach(source => {
      relationships[source] = {} as Record<Character, CharacterRelationship>;
      characters.forEach(target => {
        if (source !== target) {
          relationships[source][target] = {
            sourceCharacter: source,
            targetCharacter: target,
            resonance: 0,
            tension: 0.5, // Start with neutral tension
            bleedIntensity: 0,
            sharedAttractors: [],
            transitionCount: 0,
            lastInteraction: -1
          };
        }
      });
    });

    return relationships;
  }

  /**
   * Calculate character relationships based on reader transitions
   */
  private calculateCharacterRelationships(
    relationships: Record<Character, Record<Character, CharacterRelationship>>,
    detailedVisits: Array<{ nodeId: string; character: Character; engagedAttractors: StrangeAttractor[]; index: number }>,
    nodes: Record<string, NodeState>
  ): void {
    // Track character transitions
    for (let i = 1; i < detailedVisits.length; i++) {
      const prevVisit = detailedVisits[i - 1];
      const currVisit = detailedVisits[i];

      if (prevVisit.character !== currVisit.character) {
        const relationship = relationships[prevVisit.character][currVisit.character];
        
        // Update transition metrics
        relationship.transitionCount++;
        relationship.lastInteraction = currVisit.index;

        // Calculate shared attractors
        const prevNode = nodes[prevVisit.nodeId];
        const currNode = nodes[currVisit.nodeId];
        
        if (prevNode && currNode) {
          const sharedAttractors = prevNode.strangeAttractors.filter(attractor =>
            currNode.strangeAttractors.includes(attractor)
          );
          
          relationship.sharedAttractors = [...new Set([
            ...relationship.sharedAttractors,
            ...sharedAttractors
          ])];

          // Update resonance based on shared attractors
          const resonanceBoost = sharedAttractors.length * 0.1;
          relationship.resonance = Math.min(1, relationship.resonance + resonanceBoost);

          // Calculate bleed intensity based on transition frequency and recency
          const recencyFactor = 1 - ((detailedVisits.length - currVisit.index) / detailedVisits.length);
          const frequencyFactor = Math.min(1, relationship.transitionCount / 5);
          relationship.bleedIntensity = (recencyFactor * 0.6) + (frequencyFactor * 0.4);

          // Update narrative tension (decreases with familiarity)
          relationship.tension *= this.config.tensionDecayRate;
        }
      }
    }

    // Apply momentum and growth factors
    Object.values(relationships).forEach(characterRelationships => {
      Object.values(characterRelationships).forEach(relationship => {
        if (relationship.transitionCount > 0) {
          relationship.resonance *= this.config.resonanceGrowthRate;
          relationship.resonance = Math.min(1, relationship.resonance);
        }
      });
    });
  }

  /**
   * Calculate overall convergence level of the triumvirate
   */
  private calculateConvergenceLevel(
    relationships: Record<Character, Record<Character, CharacterRelationship>>
  ): number {
    let totalResonance = 0;
    let totalTension = 0;
    let relationshipCount = 0;

    Object.values(relationships).forEach(characterRelationships => {
      Object.values(characterRelationships).forEach(relationship => {
        totalResonance += relationship.resonance;
        totalTension += relationship.tension;
        relationshipCount++;
      });
    });

    if (relationshipCount === 0) return 0;

    const avgResonance = totalResonance / relationshipCount;
    const avgTension = totalTension / relationshipCount;

    // Convergence increases with resonance and decreases with tension
    return Math.max(0, Math.min(1, (avgResonance * 0.7) + ((1 - avgTension) * 0.3)));
  }

  /**
   * Determine the currently dominant character perspective
   */
  private calculateDominantPerspective(
    characterFocus: Record<string, number>
  ): Character | null {
    const characters: Character[] = ['Archaeologist', 'Algorithm', 'LastHuman'];
    let maxFocus = 0;
    let dominant: Character | null = null;

    characters.forEach(character => {
      const focus = characterFocus[character] || 0;
      if (focus > maxFocus) {
        maxFocus = focus;
        dominant = character;
      }
    });

    // Only return dominant if significantly higher than others
    const totalFocus = Object.values(characterFocus).reduce((sum, focus) => sum + focus, 0);
    const dominanceRatio = totalFocus > 0 ? maxFocus / totalFocus : 0;

    return dominanceRatio > 0.5 ? dominant : null;
  }

  /**
   * Calculate narrative tension between unity and separation
   */
  private calculateNarrativeTension(
    relationships: Record<Character, Record<Character, CharacterRelationship>>,
    convergenceLevel: number
  ): number {
    // Tension is high when convergence is moderate (uncertainty)
    // Low when convergence is very low (separate) or very high (unified)
    const uncertaintyTension = 1 - Math.abs(convergenceLevel - 0.5) * 2;

    // Add relationship-specific tensions
    let avgRelationshipTension = 0;
    let count = 0;

    Object.values(relationships).forEach(characterRelationships => {
      Object.values(characterRelationships).forEach(relationship => {
        avgRelationshipTension += relationship.tension;
        count++;
      });
    });

    if (count > 0) {
      avgRelationshipTension /= count;
    }

    return (uncertaintyTension * 0.6) + (avgRelationshipTension * 0.4);
  }

  /**
   * Calculate how close the reader is to a major revelation
   */
  private calculateRevelationThreshold(
    convergenceLevel: number,
    narrativeTension: number,
    journeyLength: number
  ): number {
    // Revelation threshold increases with convergence and journey length
    const convergenceFactor = Math.pow(convergenceLevel, 1.5);
    const journeyFactor = Math.min(1, journeyLength / 20); // Normalize to 20 visits
    const tensionFactor = narrativeTension; // High tension can trigger revelations

    return (convergenceFactor * 0.5) + (journeyFactor * 0.3) + (tensionFactor * 0.2);
  }

  /**
   * Detect significant convergence moments in the reader's journey
   */
  private detectConvergenceMoments(
    relationships: Record<Character, Record<Character, CharacterRelationship>>,
    detailedVisits: Array<{ nodeId: string; character: Character; engagedAttractors: StrangeAttractor[]; index: number }>,
    nodes: Record<string, NodeState>
  ): ConvergenceMoment[] {
    const moments: ConvergenceMoment[] = [];

    // Look for patterns that suggest convergence
    for (let i = 2; i < detailedVisits.length; i++) {
      const recentVisits = detailedVisits.slice(Math.max(0, i - 2), i + 1);
      const characters = [...new Set(recentVisits.map(v => v.character))];

      if (characters.length >= 2) {
        // Check for high resonance between involved characters
        let totalResonance = 0;
        let pairCount = 0;

        for (let j = 0; j < characters.length; j++) {
          for (let k = j + 1; k < characters.length; k++) {
            const char1 = characters[j];
            const char2 = characters[k];
            if (relationships[char1] && relationships[char1][char2]) {
              totalResonance += relationships[char1][char2].resonance;
              pairCount++;
            }
          }
        }

        const avgResonance = pairCount > 0 ? totalResonance / pairCount : 0;

        if (avgResonance > 0.6) {
          // Determine convergence type based on context
          const convergenceType = this.determineConvergenceType(recentVisits, nodes, avgResonance);
          
          moments.push({
            characters,
            convergenceType,
            intensity: avgResonance,
            triggerConditions: [`High resonance between ${characters.join(', ')}`],
            narrativeSignificance: avgResonance * 0.8,
            timestamp: Date.now(),
            relatedNodes: recentVisits.map(v => v.nodeId)
          });
        }
      }
    }

    return moments;
  }

  /**
   * Determine the type of convergence moment based on context
   */
  private determineConvergenceType(
    visits: Array<{ nodeId: string; character: Character; engagedAttractors: StrangeAttractor[] }>,
    _nodes: Record<string, NodeState>,
    intensity: number
  ): ConvergenceMoment['convergenceType'] {
    // Analyze the context to determine convergence type
    const allAttractors = visits.flatMap(v => v.engagedAttractors);
    const attractorCounts = allAttractors.reduce((counts, attractor) => {
      counts[attractor] = (counts[attractor] || 0) + 1;
      return counts;
    }, {} as Record<StrangeAttractor, number>);

    // Check for memory-related attractors
    const memoryAttractors = ['memory-fragment', 'memory-artifact', 'memory-sphere', 'quantum-déjà-vu'];
    const memoryCount = memoryAttractors.reduce((sum, attractor) => 
      sum + (attractorCounts[attractor as StrangeAttractor] || 0), 0);

    // Check for identity-related attractors
    const identityAttractors = ['identity-pattern', 'recognition-pattern', 'verification-ritual'];
    const identityCount = identityAttractors.reduce((sum, attractor) => 
      sum + (attractorCounts[attractor as StrangeAttractor] || 0), 0);

    // Check for consciousness-related attractors
    const consciousnessAttractors = ['distributed-consciousness', 'continuity-interface', 'quantum-transformation'];
    const consciousnessCount = consciousnessAttractors.reduce((sum, attractor) => 
      sum + (attractorCounts[attractor as StrangeAttractor] || 0), 0);

    if (intensity > 0.9) return 'consciousness_merge';
    if (consciousnessCount > memoryCount && consciousnessCount > identityCount) return 'identity_blur';
    if (memoryCount > identityCount) return 'memory_overlap';
    return 'recognition';
  }

  /**
   * Calculate endpoint progressions (integrated from EndpointProgressionSystem)
   */
  private calculateEndpointProgressions(
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    convergenceLevel: number,
    dominantPerspective: Character | null
  ): Record<EndpointOrientation, EndpointProgression> {
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    const progressions: Record<EndpointOrientation, EndpointProgression> = {} as Record<EndpointOrientation, EndpointProgression>;

    orientations.forEach(orientation => {
      progressions[orientation] = this.calculateSingleEndpointProgression(
        orientation,
        readerState,
        nodes,
        convergenceLevel,
        dominantPerspective
      );
    });

    return progressions;
  }

  /**
   * Calculate progression for a single endpoint
   */
  private calculateSingleEndpointProgression(
    orientation: EndpointOrientation,
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    convergenceLevel: number,
    dominantPerspective: Character | null
  ): EndpointProgression {
    // Calculate convergence factors
    const convergenceFactors = this.calculateConvergenceFactors(
      orientation,
      readerState,
      nodes,
      convergenceLevel,
      dominantPerspective
    );

    // Calculate current progress based on convergence factors
    const currentProgress = this.calculateProgressFromFactors(convergenceFactors);

    // Initialize and update milestones
    const milestones = this.initializeMilestones(orientation);
    this.updateMilestones(milestones, currentProgress);

    // Calculate revelation readiness
    const revelationReadiness = this.calculateEndpointRevelationReadiness(
      currentProgress,
      milestones,
      convergenceFactors
    );

    // Calculate dominance score relative to other endpoints
    const dominanceScore = this.calculateEndpointDominanceScore(
      orientation,
      convergenceFactors,
      dominantPerspective
    );

    // Calculate progress velocity (simplified)
    const progressVelocity = this.calculateProgressVelocity(currentProgress, convergenceFactors);

    return {
      orientation,
      currentProgress,
      progressVelocity,
      milestones,
      convergenceFactors,
      revelationReadiness,
      dominanceScore,
      lastUpdate: Date.now()
    };
  }

  /**
   * Calculate convergence factors for an endpoint
   */
  private calculateConvergenceFactors(
    orientation: EndpointOrientation,
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    convergenceLevel: number,
    dominantPerspective: Character | null
  ): ConvergenceFactor[] {
    const factors: ConvergenceFactor[] = [];

    // Character-based factors
    const characterContribution = this.calculateCharacterContribution(orientation, dominantPerspective, convergenceLevel);
    factors.push({
      name: 'Character Alignment',
      contribution: characterContribution,
      description: `Alignment with ${orientation}-oriented character perspective`,
      source: 'character',
      trend: convergenceLevel > 0.5 ? 'rising' : 'stable'
    });

    // Navigation-based factors
    const navigationContribution = this.calculateNavigationContribution(orientation, readerState, nodes);
    factors.push({
      name: 'Navigation Patterns',
      contribution: navigationContribution,
      description: `Reading patterns aligned with ${orientation} endpoint`,
      source: 'navigation',
      trend: 'stable' // Simplified for now
    });

    // Temporal-based factors
    const temporalContribution = this.calculateTemporalContribution(orientation, readerState);
    factors.push({
      name: 'Temporal Affinity',
      contribution: temporalContribution,
      description: `Affinity for ${orientation} temporal layer`,
      source: 'temporal',
      trend: 'stable' // Simplified for now
    });

    return factors;
  }

  /**
   * Calculate character contribution to endpoint progression
   */
  private calculateCharacterContribution(
    orientation: EndpointOrientation,
    dominantPerspective: Character | null,
    convergenceLevel: number
  ): number {
    const characterMapping: Record<EndpointOrientation, Character> = {
      past: 'Archaeologist',
      present: 'Algorithm',
      future: 'LastHuman'
    };

    const targetCharacter = characterMapping[orientation];
    
    // Check if this character is dominant
    const isDominant = dominantPerspective === targetCharacter;
    
    // Base contribution from convergence level
    let contribution = convergenceLevel * 0.6;
    
    // Boost if this character is dominant
    if (isDominant) {
      contribution += 0.3;
    }

    return Math.min(1, contribution);
  }

  /**
   * Calculate navigation contribution to endpoint progression
   */
  private calculateNavigationContribution(
    orientation: EndpointOrientation,
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): number {
    const { sequence } = readerState.path;
    if (sequence.length === 0) return 0;

    // Count visits to endpoint-oriented nodes
    const endpointNodes = Object.values(nodes).filter(node => 
      node.isEndpoint && node.endpointOrientation === orientation
    );

    const endpointNodeIds = endpointNodes.map(node => node.id);
    const endpointVisits = sequence.filter(nodeId => endpointNodeIds.includes(nodeId)).length;

    // Base contribution from endpoint visits
    let contribution = Math.min(1, endpointVisits / 3); // Normalize to 3 visits

    // Factor in character focus alignment
    const characterMapping: Record<EndpointOrientation, Character> = {
      past: 'Archaeologist',
      present: 'Algorithm',
      future: 'LastHuman'
    };

    const targetCharacter = characterMapping[orientation];
    const characterFocus = readerState.path.characterFocus as Record<Character, number> || {};
    const totalVisits = Object.values(characterFocus).reduce((sum: number, count: number) => sum + count, 0);
    
    if (totalVisits > 0) {
      const characterRatio = (characterFocus[targetCharacter] || 0) / totalVisits;
      contribution += characterRatio * 0.3;
    }

    return Math.min(1, contribution);
  }

  /**
   * Calculate temporal contribution to endpoint progression
   */
  private calculateTemporalContribution(
    orientation: EndpointOrientation,
    readerState: ReaderState
  ): number {
    const temporalLayerFocus = readerState.path.temporalLayerFocus as Record<TemporalLabel, number> || {};
    const totalVisits = Object.values(temporalLayerFocus).reduce((sum: number, count: number) => sum + count, 0);

    if (totalVisits === 0) return 0;

    // Map orientations to temporal preferences
    const temporalMapping: Record<EndpointOrientation, TemporalLabel[]> = {
      past: ['past'],
      present: ['present'],
      future: ['future']
    };

    const preferredLayers = temporalMapping[orientation];
    const relevantVisits = preferredLayers.reduce(
      (sum: number, layer: TemporalLabel) => sum + (temporalLayerFocus[layer] || 0), 0
    );

    return relevantVisits / totalVisits;
  }

  /**
   * Calculate overall progress from convergence factors
   */
  private calculateProgressFromFactors(factors: ConvergenceFactor[]): number {
    if (factors.length === 0) return 0;

    const weightedSum = factors.reduce((sum, factor) => sum + factor.contribution, 0);
    return Math.min(1, weightedSum / factors.length);
  }

  /**
   * Initialize milestones for an endpoint
   */
  private initializeMilestones(orientation: EndpointOrientation): EndpointMilestone[] {
    return this.MILESTONE_CONFIGS[orientation].map(config => ({
      ...config,
      isReached: false
    }));
  }

  /**
   * Update milestone status based on current progress
   */
  private updateMilestones(
    milestones: EndpointMilestone[],
    currentProgress: number
  ): void {
    milestones.forEach(milestone => {
      if (currentProgress >= milestone.requiredProgress && !milestone.isReached) {
        milestone.isReached = true;
        milestone.reachedAt = Date.now();
      }
    });
  }

  /**
   * Calculate revelation readiness for an endpoint
   */
  private calculateEndpointRevelationReadiness(
    currentProgress: number,
    milestones: EndpointMilestone[],
    convergenceFactors: ConvergenceFactor[]
  ): number {
    // Base readiness from progress
    let readiness = currentProgress;

    // Boost from reached milestones
    const reachedMilestones = milestones.filter(m => m.isReached);
    const milestoneBoost = reachedMilestones.reduce(
      (sum, m) => sum + m.narrativeSignificance, 0
    ) / milestones.length;
    
    readiness += milestoneBoost * this.config.milestoneWeight;

    // Factor in convergence factor trends
    const risingFactors = convergenceFactors.filter(f => f.trend === 'rising').length;
    const trendBoost = risingFactors / convergenceFactors.length * 0.2;
    
    readiness += trendBoost;

    return Math.min(1, readiness);
  }

  /**
   * Calculate dominance score for an endpoint
   */
  private calculateEndpointDominanceScore(
    orientation: EndpointOrientation,
    convergenceFactors: ConvergenceFactor[],
    dominantPerspective: Character | null
  ): number {
    let dominance = 0;

    // Base dominance from convergence factors
    const avgContribution = convergenceFactors.reduce(
      (sum, factor) => sum + factor.contribution, 0
    ) / convergenceFactors.length;
    
    dominance += avgContribution;

    // Boost from character alignment
    const characterMapping: Record<EndpointOrientation, Character> = {
      past: 'Archaeologist',
      present: 'Algorithm',
      future: 'LastHuman'
    };

    if (dominantPerspective === characterMapping[orientation]) {
      dominance += 0.3;
    }

    return Math.min(1, dominance);
  }

  /**
   * Calculate progress velocity (rate of change)
   */
  private calculateProgressVelocity(
    currentProgress: number,
    convergenceFactors: ConvergenceFactor[]
  ): number {
    // Simplified velocity calculation based on rising trends
    const risingFactors = convergenceFactors.filter(f => f.trend === 'rising').length;
    const totalFactors = convergenceFactors.length;
    
    if (totalFactors === 0) return 0;

    // Velocity is higher when more factors are rising and progress is moderate
    const trendVelocity = risingFactors / totalFactors;
    const progressVelocity = currentProgress * (1 - currentProgress) * 4; // Peak at 0.5 progress
    
    return (trendVelocity * 0.7) + (progressVelocity * 0.3);
  }

  /**
   * Determine the dominant endpoint
   */
  private calculateDominantEndpoint(
    progressions: Record<EndpointOrientation, EndpointProgression>
  ): EndpointOrientation | null {
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    
    let maxDominance = 0;
    let dominant: EndpointOrientation | null = null;

    orientations.forEach(orientation => {
      const progression = progressions[orientation];
      if (progression.dominanceScore > maxDominance) {
        maxDominance = progression.dominanceScore;
        dominant = orientation;
      }
    });

    // Only return dominant if significantly higher than others
    return maxDominance > 0.6 ? dominant : null;
  }

  /**
   * Calculate overall endpoint convergence readiness
   */
  private calculateEndpointConvergenceReadiness(
    progressions: Record<EndpointOrientation, EndpointProgression>
  ): number {
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    const maxReadiness = Math.max(
      ...orientations.map(o => progressions[o].revelationReadiness)
    );
    
    return maxReadiness;
  }

  /**
   * Calculate narrative coherence
   */
  private calculateNarrativeCoherence(
    progressions: Record<EndpointOrientation, EndpointProgression>,
    convergenceLevel: number
  ): number {
    // Base coherence from balanced progression
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    const progresses = orientations.map(o => progressions[o].currentProgress);
    const avgProgress = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
    const variance = progresses.reduce((sum, p) => sum + Math.pow(p - avgProgress, 2), 0) / progresses.length;
    
    // Lower variance = higher coherence
    let coherence = 1 - Math.min(1, variance * 4);

    // Boost from character convergence
    coherence += convergenceLevel * 0.3;

    return Math.min(1, coherence);
  }

  /**
   * Public interface methods
   */

  /**
   * Check if the triumvirate has reached a convergence threshold
   */
  isConvergenceReached(state: ConsolidatedTriumvirateState): boolean {
    return state.convergenceLevel >= this.config.convergenceThreshold &&
           state.revelationThreshold >= 0.8;
  }

  /**
   * Get the next suggested endpoint based on current state
   */
  getSuggestedEndpoint(state: ConsolidatedTriumvirateState): EndpointOrientation | null {
    if (!this.isConvergenceReached(state)) {
      return null;
    }

    // Return the dominant endpoint if available
    if (state.dominantEndpoint) {
      return state.dominantEndpoint;
    }

    // Fallback to character-based suggestion
    const { dominantPerspective, convergenceLevel } = state;

    if (convergenceLevel > 0.9) {
      // High convergence suggests transcendent future
      return 'future';
    }

    if (dominantPerspective === 'Archaeologist') {
      return 'past';
    } else if (dominantPerspective === 'Algorithm') {
      return 'present';
    } else if (dominantPerspective === 'LastHuman') {
      return 'future';
    }

    // Default to present for balanced convergence
    return 'present';
  }

  /**
   * Check if any endpoint is ready for revelation
   */
  isEndpointReady(state: ConsolidatedTriumvirateState): EndpointOrientation | null {
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    
    for (const orientation of orientations) {
      const progression = state.endpointProgressions[orientation];
      if (progression.revelationReadiness >= this.config.revelationThreshold) {
        return orientation;
      }
    }

    return null;
  }

  /**
   * Get milestones reached for a specific endpoint
   */
  getReachedMilestones(
    orientation: EndpointOrientation,
    state: ConsolidatedTriumvirateState
  ): EndpointMilestone[] {
    return state.endpointProgressions[orientation].milestones.filter(m => m.isReached);
  }

  /**
   * Clear the system cache
   */
  clearCache(): void {
    systemCaches.triumvirate.clear();
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<ConsolidatedTriumvirateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearCache(); // Force recalculation with new config
  }

  /**
   * Get current configuration
   */
  getConfig(): ConsolidatedTriumvirateConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const consolidatedTriumvirateSystem = new ConsolidatedTriumvirateSystem();