/**
 * Triumvirate System
 * 
 * Manages the convergence of three character perspectives (Archaeologist, Algorithm, LastHuman)
 * toward a unified consciousness. Tracks character relationships, narrative tension, and
 * convergence progression to create emergent storytelling moments.
 */

import {
  Character,
  StrangeAttractor,
  NodeState,
  EndpointOrientation
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
// PathAnalyzer will be integrated in future enhancements
// import { pathAnalyzer } from './PathAnalyzer';

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
 * Core state of the triumvirate system
 */
export interface TriumvirateState {
  // Character relationship matrix
  relationships: Record<Character, Record<Character, CharacterRelationship>>;
  
  // Overall convergence metrics
  convergenceLevel: number; // 0-1: Overall unity of the three perspectives
  dominantPerspective: Character | null; // Currently dominant character perspective
  narrativeTension: number; // 0-1: Tension between separation and unity
  
  // Revelation and progression
  revelationThreshold: number; // 0-1: How close to major revelation
  convergenceMoments: ConvergenceMoment[]; // Historical convergence events
  
  // System state
  isActive: boolean; // Whether triumvirate dynamics are engaged
  lastUpdate: number; // Timestamp of last calculation
}

/**
 * Configuration for triumvirate behavior
 */
export interface TriumvirateConfig {
  convergenceThreshold: number; // Minimum convergence for revelation
  tensionDecayRate: number; // How quickly tension decreases
  resonanceGrowthRate: number; // How quickly resonance builds
  bleedIntensityMultiplier: number; // Amplification for character bleed
  momentumFactor: number; // How much previous convergence affects future
}

/**
 * Service class that manages the triumvirate system
 */
export class TriumvirateSystem {
  private config: TriumvirateConfig = {
    convergenceThreshold: 0.75,
    tensionDecayRate: 0.95,
    resonanceGrowthRate: 1.05,
    bleedIntensityMultiplier: 1.2,
    momentumFactor: 0.8
  };

  // Cache for expensive calculations
  private calculationCache: {
    timestamp: number;
    state: TriumvirateState;
  } | null = null;

  private readonly CACHE_EXPIRATION = 3000; // 3 seconds

  /**
   * Calculates the current triumvirate state based on reader journey
   */
  calculateTriumvirateState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): TriumvirateState {
    const now = Date.now();
    
    // Check cache first
    if (this.calculationCache && 
        now - this.calculationCache.timestamp < this.CACHE_EXPIRATION) {
      return this.calculationCache.state;
    }

    // Calculate fresh state
    const state = this.calculateTriumvirateStateInternal(readerState, nodes);
    
    // Update cache
    this.calculationCache = {
      timestamp: now,
      state
    };

    return state;
  }

  /**
   * Internal calculation logic for triumvirate state
   */
  private calculateTriumvirateStateInternal(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): TriumvirateState {
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

    return {
      relationships,
      convergenceLevel,
      dominantPerspective,
      narrativeTension,
      revelationThreshold,
      convergenceMoments,
      isActive: detailedVisits.length >= 3, // Activate after sufficient exploration
      lastUpdate: Date.now()
    };
  }

  /**
   * Initializes the character relationships matrix
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
   * Calculates character relationships based on reader transitions
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
   * Calculates overall convergence level of the triumvirate
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
   * Determines the currently dominant character perspective
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
    const dominanceRatio = maxFocus / totalFocus;

    return dominanceRatio > 0.5 ? dominant : null;
  }

  /**
   * Calculates narrative tension between unity and separation
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
   * Calculates how close the reader is to a major revelation
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
   * Detects significant convergence moments in the reader's journey
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
   * Determines the type of convergence moment based on context
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
   * Checks if the triumvirate has reached a convergence threshold
   */
  isConvergenceReached(triumvirateState: TriumvirateState): boolean {
    return triumvirateState.convergenceLevel >= this.config.convergenceThreshold &&
           triumvirateState.revelationThreshold >= 0.8;
  }

  /**
   * Gets the next suggested endpoint based on triumvirate state
   */
  getSuggestedEndpoint(triumvirateState: TriumvirateState): EndpointOrientation | null {
    if (!this.isConvergenceReached(triumvirateState)) {
      return null;
    }

    // Determine endpoint based on dominant perspective and convergence pattern
    const { dominantPerspective, convergenceLevel } = triumvirateState;

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
   * Clears the calculation cache (useful for testing or forced recalculation)
   */
  clearCache(): void {
    this.calculationCache = null;
  }

  /**
   * Updates configuration for triumvirate behavior
   */
  updateConfig(newConfig: Partial<TriumvirateConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearCache(); // Force recalculation with new config
  }

  /**
   * Gets current configuration
   */
  getConfig(): TriumvirateConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const triumvirateSystem = new TriumvirateSystem();