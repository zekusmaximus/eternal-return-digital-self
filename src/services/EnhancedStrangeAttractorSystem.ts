/**
 * Enhanced Strange Attractor System
 * 
 * Extends the existing StrangeAttractorSystem with dynamic revelation mechanics,
 * attractor evolution, and cross-system integration capabilities.
 */

import {
  StrangeAttractor,
  NodeState
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { strangeAttractorSystem } from './StrangeAttractorSystem';
import { ConsolidatedTriumvirateState } from './ConsolidatedTriumvirateSystem';

// Import AttractorEngagement interface from PathAnalyzer since it's not exported from StrangeAttractorSystem
import { AttractorEngagement } from './PathAnalyzer';

/**
 * Represents an attractor that can be dynamically revealed
 */
export interface RevealableAttractor {
  attractor: StrangeAttractor;
  isRevealed: boolean;
  revelationConditions: AttractorRevelationCondition[];
  revelationProgress: number; // 0-1
  evolutionStage: AttractorEvolutionStage;
  influenceRadius: number; // How many nodes this attractor can influence
  resonanceStrength: number; // Current strength of the attractor
}

/**
 * Conditions that can trigger attractor revelation
 */
export interface AttractorRevelationCondition {
  type: 'engagement_threshold' | 'character_convergence' | 'temporal_pattern' | 'narrative_milestone';
  threshold: number;
  currentValue: number;
  description: string;
  isMet: boolean;
}

/**
 * Evolution stages for attractors
 */
export type AttractorEvolutionStage = 
  | 'dormant'      // Not yet engaged
  | 'emerging'     // Beginning to show influence
  | 'active'       // Fully active and influencing content
  | 'dominant'     // Strongly influencing multiple nodes
  | 'transcendent' // Evolved beyond normal influence patterns;

/**
 * Represents cross-node attractor influence
 */
export interface AttractorInfluence {
  sourceNodeId: string;
  targetNodeId: string;
  attractor: StrangeAttractor;
  influenceStrength: number; // 0-1
  influenceType: 'thematic_resonance' | 'narrative_echo' | 'character_bleed' | 'temporal_bridge';
  manifestation: AttractorManifestation;
}

/**
 * How an attractor manifests its influence
 */
export interface AttractorManifestation {
  visualCues: string[]; // CSS classes or visual indicators
  contentModifications: string[]; // Text transformations
  narrativeHints: string[]; // Subtle story connections
  readerGuidance: string[]; // Navigation suggestions
}

/**
 * Enhanced attractor system state
 */
export interface EnhancedAttractorState {
  revealableAttractors: Record<StrangeAttractor, RevealableAttractor>;
  activeInfluences: AttractorInfluence[];
  globalResonance: number; // Overall attractor activity level
  evolutionMomentum: number; // Rate of attractor evolution
  lastEvolutionEvent: number; // Timestamp of last evolution
}

/**
 * Enhanced Strange Attractor System with dynamic capabilities
 */
export class EnhancedStrangeAttractorSystem {
  private evolutionCache: {
    timestamp: number;
    state: EnhancedAttractorState;
  } | null = null;

  private readonly CACHE_EXPIRATION = 2000; // 2 seconds
  // private readonly EVOLUTION_COOLDOWN = 5000; // 5 seconds between evolutions - Reserved for future use

  /**
   * All possible strange attractors with their base configurations
   */
  private readonly ATTRACTOR_CONFIGS: Record<StrangeAttractor, {
    baseInfluenceRadius: number;
    evolutionThresholds: Record<AttractorEvolutionStage, number>;
    revelationDifficulty: number;
  }> = {
    'recursion-pattern': {
      baseInfluenceRadius: 2,
      evolutionThresholds: { dormant: 0, emerging: 0.2, active: 0.5, dominant: 0.8, transcendent: 0.95 },
      revelationDifficulty: 0.3
    },
    'memory-fragment': {
      baseInfluenceRadius: 3,
      evolutionThresholds: { dormant: 0, emerging: 0.15, active: 0.4, dominant: 0.7, transcendent: 0.9 },
      revelationDifficulty: 0.2
    },
    'verification-ritual': {
      baseInfluenceRadius: 1,
      evolutionThresholds: { dormant: 0, emerging: 0.3, active: 0.6, dominant: 0.85, transcendent: 0.98 },
      revelationDifficulty: 0.5
    },
    'identity-pattern': {
      baseInfluenceRadius: 2,
      evolutionThresholds: { dormant: 0, emerging: 0.25, active: 0.5, dominant: 0.75, transcendent: 0.92 },
      revelationDifficulty: 0.4
    },
    'recursion-chamber': {
      baseInfluenceRadius: 1,
      evolutionThresholds: { dormant: 0, emerging: 0.4, active: 0.7, dominant: 0.9, transcendent: 0.99 },
      revelationDifficulty: 0.6
    },
    'process-language': {
      baseInfluenceRadius: 3,
      evolutionThresholds: { dormant: 0, emerging: 0.2, active: 0.45, dominant: 0.7, transcendent: 0.88 },
      revelationDifficulty: 0.35
    },
    'autonomous-fragment': {
      baseInfluenceRadius: 2,
      evolutionThresholds: { dormant: 0, emerging: 0.3, active: 0.55, dominant: 0.8, transcendent: 0.95 },
      revelationDifficulty: 0.45
    },
    'quantum-perception': {
      baseInfluenceRadius: 4,
      evolutionThresholds: { dormant: 0, emerging: 0.1, active: 0.3, dominant: 0.6, transcendent: 0.85 },
      revelationDifficulty: 0.25
    },
    'distributed-consciousness': {
      baseInfluenceRadius: 5,
      evolutionThresholds: { dormant: 0, emerging: 0.15, active: 0.35, dominant: 0.65, transcendent: 0.9 },
      revelationDifficulty: 0.3
    },
    'recursive-loop': {
      baseInfluenceRadius: 2,
      evolutionThresholds: { dormant: 0, emerging: 0.25, active: 0.5, dominant: 0.8, transcendent: 0.96 },
      revelationDifficulty: 0.4
    },
    'quantum-uncertainty': {
      baseInfluenceRadius: 3,
      evolutionThresholds: { dormant: 0, emerging: 0.2, active: 0.4, dominant: 0.7, transcendent: 0.9 },
      revelationDifficulty: 0.35
    },
    'continuity-interface': {
      baseInfluenceRadius: 3,
      evolutionThresholds: { dormant: 0, emerging: 0.3, active: 0.6, dominant: 0.85, transcendent: 0.97 },
      revelationDifficulty: 0.5
    },
    'system-decay': {
      baseInfluenceRadius: 4,
      evolutionThresholds: { dormant: 0, emerging: 0.1, active: 0.25, dominant: 0.5, transcendent: 0.8 },
      revelationDifficulty: 0.2
    },
    'quantum-transformation': {
      baseInfluenceRadius: 4,
      evolutionThresholds: { dormant: 0, emerging: 0.2, active: 0.45, dominant: 0.75, transcendent: 0.93 },
      revelationDifficulty: 0.4
    },
    'memory-artifact': {
      baseInfluenceRadius: 2,
      evolutionThresholds: { dormant: 0, emerging: 0.25, active: 0.5, dominant: 0.75, transcendent: 0.9 },
      revelationDifficulty: 0.3
    },
    'recursive-symbol': {
      baseInfluenceRadius: 2,
      evolutionThresholds: { dormant: 0, emerging: 0.3, active: 0.6, dominant: 0.85, transcendent: 0.95 },
      revelationDifficulty: 0.45
    },
    'recognition-pattern': {
      baseInfluenceRadius: 3,
      evolutionThresholds: { dormant: 0, emerging: 0.15, active: 0.4, dominant: 0.7, transcendent: 0.88 },
      revelationDifficulty: 0.25
    },
    'memory-sphere': {
      baseInfluenceRadius: 3,
      evolutionThresholds: { dormant: 0, emerging: 0.2, active: 0.45, dominant: 0.75, transcendent: 0.92 },
      revelationDifficulty: 0.35
    },
    'quantum-déjà-vu': {
      baseInfluenceRadius: 4,
      evolutionThresholds: { dormant: 0, emerging: 0.1, active: 0.3, dominant: 0.6, transcendent: 0.85 },
      revelationDifficulty: 0.2
    },
    'quantum-choice': {
      baseInfluenceRadius: 5,
      evolutionThresholds: { dormant: 0, emerging: 0.15, active: 0.35, dominant: 0.65, transcendent: 0.9 },
      revelationDifficulty: 0.3
    }
  };

  /**
   * Calculates the enhanced attractor state with dynamic revelation and evolution
   */
  calculateEnhancedAttractorState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    triumvirateState?: ConsolidatedTriumvirateState
  ): EnhancedAttractorState {
    const now = Date.now();
    
    // Check cache first
    if (this.evolutionCache && 
        now - this.evolutionCache.timestamp < this.CACHE_EXPIRATION) {
      return this.evolutionCache.state;
    }

    // Calculate fresh state
    const state = this.calculateEnhancedStateInternal(readerState, nodes, triumvirateState);
    
    // Update cache
    this.evolutionCache = {
      timestamp: now,
      state
    };

    return state;
  }

  /**
   * Internal calculation for enhanced attractor state
   */
  private calculateEnhancedStateInternal(
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    triumvirateState?: ConsolidatedTriumvirateState
  ): EnhancedAttractorState {
    // Get base attractor engagements
    const baseEngagements = strangeAttractorSystem.calculateAttractorEngagement(readerState, nodes);
    
    // Initialize revealable attractors
    const revealableAttractors = this.initializeRevealableAttractors(baseEngagements, triumvirateState);
    
    // Update revelation progress and evolution stages
    this.updateAttractorEvolution(revealableAttractors, baseEngagements, readerState, triumvirateState);
    
    // Calculate cross-node influences
    const activeInfluences = this.calculateAttractorInfluences(revealableAttractors, nodes, readerState);
    
    // Calculate global metrics
    const globalResonance = this.calculateGlobalResonance(revealableAttractors);
    const evolutionMomentum = this.calculateEvolutionMomentum(revealableAttractors, baseEngagements);

    return {
      revealableAttractors,
      activeInfluences,
      globalResonance,
      evolutionMomentum,
      lastEvolutionEvent: Date.now()
    };
  }

  /**
   * Initializes revealable attractors based on current engagements
   */
  private initializeRevealableAttractors(
    engagements: AttractorEngagement[],
    triumvirateState?: ConsolidatedTriumvirateState
  ): Record<StrangeAttractor, RevealableAttractor> {
    const revealableAttractors: Record<StrangeAttractor, RevealableAttractor> = {} as Record<StrangeAttractor, RevealableAttractor>;

    // Initialize all possible attractors
    Object.keys(this.ATTRACTOR_CONFIGS).forEach(attractorKey => {
      const attractor = attractorKey as StrangeAttractor;
      const config = this.ATTRACTOR_CONFIGS[attractor];
      const engagement = engagements.find(e => e.attractor === attractor);

      revealableAttractors[attractor] = {
        attractor,
        isRevealed: engagement ? engagement.engagementScore > 20 : false,
        revelationConditions: this.createRevelationConditions(attractor, engagement, triumvirateState),
        revelationProgress: engagement ? Math.min(1, engagement.engagementScore / 100) : 0,
        evolutionStage: this.determineEvolutionStage(attractor, engagement?.engagementScore || 0),
        influenceRadius: config.baseInfluenceRadius,
        resonanceStrength: engagement ? engagement.engagementScore / 100 : 0
      };
    });

    return revealableAttractors;
  }

  /**
   * Creates revelation conditions for an attractor
   */
  private createRevelationConditions(
    attractor: StrangeAttractor,
    engagement?: AttractorEngagement,
    triumvirateState?: ConsolidatedTriumvirateState
  ): AttractorRevelationCondition[] {
    const conditions: AttractorRevelationCondition[] = [];
    const config = this.ATTRACTOR_CONFIGS[attractor];

    // Base engagement threshold condition
    const engagementScore = engagement?.engagementScore || 0;
    const engagementThreshold = config.revelationDifficulty * 100;
    
    conditions.push({
      type: 'engagement_threshold',
      threshold: engagementThreshold,
      currentValue: engagementScore,
      description: `Reach ${engagementThreshold}% engagement with ${attractor}`,
      isMet: engagementScore >= engagementThreshold
    });

    // Character convergence condition (if triumvirate state available)
    if (triumvirateState) {
      const convergenceThreshold = 0.5;
      conditions.push({
        type: 'character_convergence',
        threshold: convergenceThreshold,
        currentValue: triumvirateState.convergenceLevel,
        description: `Achieve ${Math.round(convergenceThreshold * 100)}% character convergence`,
        isMet: triumvirateState.convergenceLevel >= convergenceThreshold
      });
    }

    return conditions;
  }

  /**
   * Determines the evolution stage of an attractor
   */
  private determineEvolutionStage(
    attractor: StrangeAttractor,
    engagementScore: number
  ): AttractorEvolutionStage {
    const config = this.ATTRACTOR_CONFIGS[attractor];
    const normalizedScore = engagementScore / 100;

    if (normalizedScore >= config.evolutionThresholds.transcendent) return 'transcendent';
    if (normalizedScore >= config.evolutionThresholds.dominant) return 'dominant';
    if (normalizedScore >= config.evolutionThresholds.active) return 'active';
    if (normalizedScore >= config.evolutionThresholds.emerging) return 'emerging';
    return 'dormant';
  }

  /**
   * Updates attractor evolution based on current conditions
   */
  private updateAttractorEvolution(
    revealableAttractors: Record<StrangeAttractor, RevealableAttractor>,
    engagements: AttractorEngagement[],
    _readerState: ReaderState,
    triumvirateState?: ConsolidatedTriumvirateState
  ): void {
    Object.values(revealableAttractors).forEach(revealableAttractor => {
      const engagement = engagements.find(e => e.attractor === revealableAttractor.attractor);
      
      // Update revelation progress
      const metConditions = revealableAttractor.revelationConditions.filter(c => c.isMet).length;
      const totalConditions = revealableAttractor.revelationConditions.length;
      revealableAttractor.revelationProgress = totalConditions > 0 ? metConditions / totalConditions : 0;

      // Update revelation status
      revealableAttractor.isRevealed = revealableAttractor.revelationProgress >= 0.8;

      // Update evolution stage
      const newStage = this.determineEvolutionStage(
        revealableAttractor.attractor,
        engagement?.engagementScore || 0
      );
      revealableAttractor.evolutionStage = newStage;

      // Update influence radius based on evolution
      const config = this.ATTRACTOR_CONFIGS[revealableAttractor.attractor];
      const evolutionMultiplier = this.getEvolutionMultiplier(newStage);
      revealableAttractor.influenceRadius = Math.round(config.baseInfluenceRadius * evolutionMultiplier);

      // Update resonance strength
      revealableAttractor.resonanceStrength = this.calculateResonanceStrength(
        revealableAttractor,
        engagement,
        triumvirateState
      );
    });
  }

  /**
   * Gets the multiplier for influence radius based on evolution stage
   */
  private getEvolutionMultiplier(stage: AttractorEvolutionStage): number {
    switch (stage) {
      case 'dormant': return 0.5;
      case 'emerging': return 0.8;
      case 'active': return 1.0;
      case 'dominant': return 1.5;
      case 'transcendent': return 2.0;
      default: return 1.0;
    }
  }

  /**
   * Calculates resonance strength for an attractor
   */
  private calculateResonanceStrength(
    revealableAttractor: RevealableAttractor,
    engagement?: AttractorEngagement,
    triumvirateState?: ConsolidatedTriumvirateState
  ): number {
    let baseStrength = engagement ? engagement.engagementScore / 100 : 0;

    // Boost from evolution stage
    const evolutionBoost = this.getEvolutionMultiplier(revealableAttractor.evolutionStage) - 1;
    baseStrength += evolutionBoost * 0.2;

    // Boost from triumvirate convergence
    if (triumvirateState && triumvirateState.convergenceLevel > 0.5) {
      baseStrength += (triumvirateState.convergenceLevel - 0.5) * 0.3;
    }

    return Math.min(1, baseStrength);
  }

  /**
   * Calculates cross-node attractor influences
   */
  private calculateAttractorInfluences(
    revealableAttractors: Record<StrangeAttractor, RevealableAttractor>,
    nodes: Record<string, NodeState>,
    readerState: ReaderState
  ): AttractorInfluence[] {
    const influences: AttractorInfluence[] = [];
    const visitedNodes = readerState.path.sequence;

    // Only calculate influences for active or higher evolution stages
    const activeAttractors = Object.values(revealableAttractors).filter(
      ra => ['active', 'dominant', 'transcendent'].includes(ra.evolutionStage)
    );

    activeAttractors.forEach(revealableAttractor => {
      const sourceNodes = visitedNodes.filter(nodeId => {
        const node = nodes[nodeId];
        return node && node.strangeAttractors.includes(revealableAttractor.attractor);
      });

      sourceNodes.forEach(sourceNodeId => {
        // Find potential target nodes within influence radius
        const potentialTargets = this.findNodesWithinInfluenceRadius(
          sourceNodeId,
          revealableAttractor.influenceRadius,
          nodes,
          visitedNodes
        );

        potentialTargets.forEach(targetNodeId => {
          if (sourceNodeId !== targetNodeId) {
            const influence = this.createAttractorInfluence(
              sourceNodeId,
              targetNodeId,
              revealableAttractor,
              nodes
            );
            
            if (influence) {
              influences.push(influence);
            }
          }
        });
      });
    });

    return influences;
  }

  /**
   * Finds nodes within the influence radius of a source node
   */
  private findNodesWithinInfluenceRadius(
    sourceNodeId: string,
    radius: number,
    nodes: Record<string, NodeState>,
    visitedNodes: string[]
  ): string[] {
    // For now, use a simple approach based on node connections and visit order
    // In a more sophisticated implementation, this could use graph distance
    
    const sourceNode = nodes[sourceNodeId];
    if (!sourceNode) return [];

    const candidates = new Set<string>();
    
    // Add directly connected nodes
    sourceNode.revealedConnections.forEach(nodeId => candidates.add(nodeId));
    
    // Add nodes visited near this one in the sequence
    const sourceIndex = visitedNodes.indexOf(sourceNodeId);
    if (sourceIndex !== -1) {
      for (let i = Math.max(0, sourceIndex - radius); i <= Math.min(visitedNodes.length - 1, sourceIndex + radius); i++) {
        candidates.add(visitedNodes[i]);
      }
    }

    return Array.from(candidates).filter(nodeId => nodes[nodeId]);
  }

  /**
   * Creates an attractor influence between two nodes
   */
  private createAttractorInfluence(
    sourceNodeId: string,
    targetNodeId: string,
    revealableAttractor: RevealableAttractor,
    nodes: Record<string, NodeState>
  ): AttractorInfluence | null {
    const sourceNode = nodes[sourceNodeId];
    const targetNode = nodes[targetNodeId];
    
    if (!sourceNode || !targetNode) return null;

    // Calculate influence strength based on various factors
    const influenceStrength = this.calculateInfluenceStrength(
      sourceNode,
      targetNode,
      revealableAttractor
    );

    if (influenceStrength < 0.1) return null; // Too weak to matter

    // Determine influence type
    const influenceType = this.determineInfluenceType(sourceNode, targetNode, revealableAttractor.attractor);

    // Create manifestation
    const manifestation = this.createAttractorManifestation(
      revealableAttractor.attractor,
      influenceType,
      influenceStrength
    );

    return {
      sourceNodeId,
      targetNodeId,
      attractor: revealableAttractor.attractor,
      influenceStrength,
      influenceType,
      manifestation
    };
  }

  /**
   * Calculates the strength of influence between two nodes
   */
  private calculateInfluenceStrength(
    sourceNode: NodeState,
    targetNode: NodeState,
    revealableAttractor: RevealableAttractor
  ): number {
    let strength = revealableAttractor.resonanceStrength;

    // Boost if target node also has this attractor
    if (targetNode.strangeAttractors.includes(revealableAttractor.attractor)) {
      strength *= 1.5;
    }

    // Boost if nodes share other attractors
    const sharedAttractors = sourceNode.strangeAttractors.filter(attractor =>
      targetNode.strangeAttractors.includes(attractor)
    );
    strength += sharedAttractors.length * 0.1;

    // Character relationship factor
    if (sourceNode.character !== targetNode.character) {
      strength *= 1.2; // Cross-character influences are more interesting
    }

    return Math.min(1, strength);
  }

  /**
   * Determines the type of influence between nodes
   */
  private determineInfluenceType(
    sourceNode: NodeState,
    targetNode: NodeState,
    attractor: StrangeAttractor
  ): AttractorInfluence['influenceType'] {
    // Character-based determination
    if (sourceNode.character !== targetNode.character) {
      return 'character_bleed';
    }

    // Temporal-based determination
    const temporalDistance = Math.abs(sourceNode.temporalValue - targetNode.temporalValue);
    if (temporalDistance > 3) {
      return 'temporal_bridge';
    }

    // Attractor-specific determination
    const memoryAttractors = ['memory-fragment', 'memory-artifact', 'memory-sphere'];
    if (memoryAttractors.includes(attractor)) {
      return 'narrative_echo';
    }

    return 'thematic_resonance';
  }

  /**
   * Creates manifestation details for an attractor influence
   */
  private createAttractorManifestation(
    attractor: StrangeAttractor,
    influenceType: AttractorInfluence['influenceType'],
    strength: number
  ): AttractorManifestation {
    const intensityClass = strength > 0.7 ? 'high' : strength > 0.4 ? 'medium' : 'low';
    
    return {
      visualCues: [
        `attractor-${attractor}`,
        `influence-${influenceType}`,
        `intensity-${intensityClass}`
      ],
      contentModifications: [
        `Subtle ${attractor.replace('-', ' ')} resonance`,
        `${influenceType.replace('_', ' ')} effect`
      ],
      narrativeHints: [
        `Connection to ${attractor.replace('-', ' ')} theme`,
        `Influence from related narrative elements`
      ],
      readerGuidance: [
        `Consider the ${attractor.replace('-', ' ')} pattern`,
        `Notice the thematic connections`
      ]
    };
  }

  /**
   * Calculates global resonance across all attractors
   */
  private calculateGlobalResonance(
    revealableAttractors: Record<StrangeAttractor, RevealableAttractor>
  ): number {
    const activeAttractors = Object.values(revealableAttractors).filter(
      ra => ra.evolutionStage !== 'dormant'
    );

    if (activeAttractors.length === 0) return 0;

    const totalResonance = activeAttractors.reduce(
      (sum, ra) => sum + ra.resonanceStrength,
      0
    );

    return totalResonance / activeAttractors.length;
  }

  /**
   * Calculates evolution momentum
   */
  private calculateEvolutionMomentum(
    revealableAttractors: Record<StrangeAttractor, RevealableAttractor>,
    engagements: AttractorEngagement[]
  ): number {
    // Count attractors with rising trends
    const risingAttractors = engagements.filter(e => e.trend === 'rising').length;
    const totalEngaged = engagements.length;

    if (totalEngaged === 0) return 0;

    // Factor in evolution stages
    const evolutionStageWeights = {
      dormant: 0,
      emerging: 0.2,
      active: 0.5,
      dominant: 0.8,
      transcendent: 1.0
    };

    const weightedEvolution = Object.values(revealableAttractors).reduce(
      (sum, ra) => sum + evolutionStageWeights[ra.evolutionStage],
      0
    );

    const avgEvolution = weightedEvolution / Object.keys(revealableAttractors).length;
    const trendMomentum = risingAttractors / totalEngaged;

    return (avgEvolution * 0.6) + (trendMomentum * 0.4);
  }

  /**
   * Gets attractors that should be revealed to the reader
   */
  getRevealedAttractors(enhancedState: EnhancedAttractorState): StrangeAttractor[] {
    return Object.values(enhancedState.revealableAttractors)
      .filter(ra => ra.isRevealed)
      .map(ra => ra.attractor);
  }

  /**
   * Gets active influences for a specific node
   */
  getNodeInfluences(
    nodeId: string,
    enhancedState: EnhancedAttractorState
  ): AttractorInfluence[] {
    return enhancedState.activeInfluences.filter(
      influence => influence.targetNodeId === nodeId
    );
  }

  /**
   * Clears the evolution cache
   */
  clearCache(): void {
    this.evolutionCache = null;
  }
}

// Export singleton instance
export const enhancedStrangeAttractorSystem = new EnhancedStrangeAttractorSystem();