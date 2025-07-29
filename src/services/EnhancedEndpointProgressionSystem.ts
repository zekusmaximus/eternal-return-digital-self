/**
 * Enhanced Endpoint Progression System
 * 
 * Manages dynamic calculation of endpoint progression, milestone detection,
 * and revelation mechanics for the three philosophical endpoints (past, present, future).
 */

import {
  EndpointOrientation,
  StrangeAttractor,
  NodeState,
  Character,
  TemporalLabel
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { TriumvirateState } from './TriumvirateSystem';
import { EnhancedAttractorState } from './EnhancedStrangeAttractorSystem';

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
  triggerConditions: MilestoneCondition[];
  narrativeSignificance: number; // 0-1
  unlocks: string[]; // What this milestone unlocks (nodes, content, etc.)
}

/**
 * Conditions that must be met to reach a milestone
 */
export interface MilestoneCondition {
  type: 'character_convergence' | 'attractor_mastery' | 'narrative_depth' | 'temporal_understanding' | 'recursive_awareness';
  threshold: number;
  currentValue: number;
  description: string;
  isMet: boolean;
  weight: number; // How important this condition is (0-1)
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
 * Factors that contribute to endpoint convergence
 */
export interface ConvergenceFactor {
  name: string;
  contribution: number; // 0-1
  description: string;
  source: 'triumvirate' | 'attractors' | 'navigation' | 'temporal';
  trend: 'rising' | 'falling' | 'stable';
}

/**
 * Overall state of endpoint progression system
 */
export interface EndpointProgressionState {
  progressions: Record<EndpointOrientation, EndpointProgression>;
  dominantEndpoint: EndpointOrientation | null;
  convergenceReadiness: number; // 0-1: Overall readiness for any endpoint
  narrativeCoherence: number; // 0-1: How coherent the path to endpoints is
  revelationMoments: EndpointRevelationMoment[];
  lastCalculation: number;
}

/**
 * Represents a moment when an endpoint becomes revealed/accessible
 */
export interface EndpointRevelationMoment {
  orientation: EndpointOrientation;
  timestamp: number;
  triggerEvent: string;
  readinessScore: number;
  narrativeContext: string[];
  unlockConditions: string[];
}

/**
 * Enhanced Endpoint Progression System
 */
export class EnhancedEndpointProgressionSystem {
  private progressionCache: {
    timestamp: number;
    state: EndpointProgressionState;
  } | null = null;

  private readonly CACHE_EXPIRATION = 3000; // 3 seconds
  private readonly REVELATION_THRESHOLD = 0.8; // Minimum readiness for revelation

  /**
   * Milestone configurations for each endpoint
   */
  private readonly MILESTONE_CONFIGS: Record<EndpointOrientation, EndpointMilestone[]> = {
    past: [
      {
        id: 'past-recognition',
        orientation: 'past',
        name: 'Archaeological Recognition',
        description: 'Recognize the archaeologist\'s perspective and methods',
        requiredProgress: 0.2,
        isReached: false,
        triggerConditions: [],
        narrativeSignificance: 0.3,
        unlocks: ['past-themed-content', 'archaeological-insights']
      },
      {
        id: 'past-preservation',
        orientation: 'past',
        name: 'Preservation Understanding',
        description: 'Understand the drive to preserve and document',
        requiredProgress: 0.5,
        isReached: false,
        triggerConditions: [],
        narrativeSignificance: 0.6,
        unlocks: ['preservation-mechanics', 'memory-artifacts']
      },
      {
        id: 'past-transcendence',
        orientation: 'past',
        name: 'Temporal Transcendence',
        description: 'Transcend linear time through preserved memory',
        requiredProgress: 0.8,
        isReached: false,
        triggerConditions: [],
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
        requiredProgress: 0.2,
        isReached: false,
        triggerConditions: [],
        narrativeSignificance: 0.3,
        unlocks: ['algorithmic-insights', 'process-language']
      },
      {
        id: 'present-integration',
        orientation: 'present',
        name: 'System Integration',
        description: 'Achieve integration of disparate consciousness fragments',
        requiredProgress: 0.5,
        isReached: false,
        triggerConditions: [],
        narrativeSignificance: 0.6,
        unlocks: ['integration-mechanics', 'distributed-consciousness']
      },
      {
        id: 'present-emergence',
        orientation: 'present',
        name: 'Emergent Consciousness',
        description: 'Experience emergent consciousness from complexity',
        requiredProgress: 0.8,
        isReached: false,
        triggerConditions: [],
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
        requiredProgress: 0.2,
        isReached: false,
        triggerConditions: [],
        narrativeSignificance: 0.3,
        unlocks: ['future-possibilities', 'exploration-drive']
      },
      {
        id: 'future-choice',
        orientation: 'future',
        name: 'Quantum Choice',
        description: 'Understand the power and burden of choice',
        requiredProgress: 0.5,
        isReached: false,
        triggerConditions: [],
        narrativeSignificance: 0.6,
        unlocks: ['choice-mechanics', 'quantum-uncertainty']
      },
      {
        id: 'future-transcendence',
        orientation: 'future',
        name: 'Future Transcendence',
        description: 'Transcend current limitations toward unknown potential',
        requiredProgress: 0.8,
        isReached: false,
        triggerConditions: [],
        narrativeSignificance: 0.9,
        unlocks: ['future-endpoint-access', 'transcendent-potential']
      }
    ]
  };

  /**
   * Calculates the current endpoint progression state
   */
  calculateEndpointProgressionState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    triumvirateState?: TriumvirateState,
    attractorState?: EnhancedAttractorState
  ): EndpointProgressionState {
    const now = Date.now();
    
    // Check cache first
    if (this.progressionCache && 
        now - this.progressionCache.timestamp < this.CACHE_EXPIRATION) {
      return this.progressionCache.state;
    }

    // Calculate fresh state
    const state = this.calculateProgressionStateInternal(
      readerState,
      nodes,
      triumvirateState,
      attractorState
    );
    
    // Update cache
    this.progressionCache = {
      timestamp: now,
      state
    };

    return state;
  }

  /**
   * Internal calculation for endpoint progression state
   */
  private calculateProgressionStateInternal(
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    triumvirateState?: TriumvirateState,
    attractorState?: EnhancedAttractorState
  ): EndpointProgressionState {
    // Calculate progression for each endpoint
    const progressions: Record<EndpointOrientation, EndpointProgression> = {
      past: this.calculateEndpointProgression('past', readerState, nodes, triumvirateState, attractorState),
      present: this.calculateEndpointProgression('present', readerState, nodes, triumvirateState, attractorState),
      future: this.calculateEndpointProgression('future', readerState, nodes, triumvirateState, attractorState)
    };

    // Determine dominant endpoint
    const dominantEndpoint = this.calculateDominantEndpoint(progressions);

    // Calculate overall metrics
    const convergenceReadiness = this.calculateConvergenceReadiness(progressions);
    const narrativeCoherence = this.calculateNarrativeCoherence(progressions, triumvirateState);

    // Detect revelation moments
    const revelationMoments = this.detectRevelationMoments(progressions, readerState);

    return {
      progressions,
      dominantEndpoint,
      convergenceReadiness,
      narrativeCoherence,
      revelationMoments,
      lastCalculation: Date.now()
    };
  }

  /**
   * Calculates progression for a specific endpoint
   */
  private calculateEndpointProgression(
    orientation: EndpointOrientation,
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    triumvirateState?: TriumvirateState,
    attractorState?: EnhancedAttractorState
  ): EndpointProgression {
    // Calculate convergence factors
    const convergenceFactors = this.calculateConvergenceFactors(
      orientation,
      readerState,
      nodes,
      triumvirateState,
      attractorState
    );

    // Calculate current progress based on convergence factors
    const currentProgress = this.calculateProgressFromFactors(convergenceFactors);

    // Initialize and update milestones
    const milestones = this.initializeMilestones(orientation);
    this.updateMilestones(milestones, currentProgress, convergenceFactors);

    // Calculate revelation readiness
    const revelationReadiness = this.calculateRevelationReadiness(
      currentProgress,
      milestones,
      convergenceFactors
    );

    // Calculate dominance score relative to other endpoints
    const dominanceScore = this.calculateDominanceScore(
      orientation,
      convergenceFactors,
      triumvirateState
    );

    // Calculate progress velocity (simplified for now)
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
   * Calculates convergence factors for an endpoint
   */
  private calculateConvergenceFactors(
    orientation: EndpointOrientation,
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    triumvirateState?: TriumvirateState,
    attractorState?: EnhancedAttractorState
  ): ConvergenceFactor[] {
    const factors: ConvergenceFactor[] = [];

    // Character-based factors
    if (triumvirateState) {
      const characterContribution = this.calculateCharacterContribution(orientation, triumvirateState);
      factors.push({
        name: 'Character Convergence',
        contribution: characterContribution,
        description: `Alignment with ${orientation}-oriented character perspective`,
        source: 'triumvirate',
        trend: triumvirateState.convergenceLevel > 0.5 ? 'rising' : 'stable'
      });
    }

    // Attractor-based factors
    if (attractorState) {
      const attractorContribution = this.calculateAttractorContribution(orientation, attractorState);
      factors.push({
        name: 'Thematic Resonance',
        contribution: attractorContribution,
        description: `Engagement with ${orientation}-oriented themes`,
        source: 'attractors',
        trend: attractorState.evolutionMomentum > 0.5 ? 'rising' : 'stable'
      });
    }

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
    const temporalContribution = this.calculateTemporalContribution(orientation, readerState, nodes);
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
   * Calculates character contribution to endpoint progression
   */
  private calculateCharacterContribution(
    orientation: EndpointOrientation,
    triumvirateState: TriumvirateState
  ): number {
    const characterMapping: Record<EndpointOrientation, Character> = {
      past: 'Archaeologist',
      present: 'Algorithm',
      future: 'LastHuman'
    };

    const targetCharacter = characterMapping[orientation];
    
    // Check if this character is dominant
    const isDominant = triumvirateState.dominantPerspective === targetCharacter;
    
    // Base contribution from convergence level
    let contribution = triumvirateState.convergenceLevel * 0.6;
    
    // Boost if this character is dominant
    if (isDominant) {
      contribution += 0.3;
    }

    // Factor in character relationships
    const relationships = triumvirateState.relationships[targetCharacter];
    if (relationships) {
      const avgResonance = Object.values(relationships).reduce(
        (sum, rel) => sum + rel.resonance, 0
      ) / Object.values(relationships).length;
      contribution += avgResonance * 0.1;
    }

    return Math.min(1, contribution);
  }

  /**
   * Calculates attractor contribution to endpoint progression
   */
  private calculateAttractorContribution(
    orientation: EndpointOrientation,
    attractorState: EnhancedAttractorState
  ): number {
    // Define attractors most relevant to each endpoint
    const endpointAttractors: Record<EndpointOrientation, StrangeAttractor[]> = {
      past: ['memory-fragment', 'memory-artifact', 'memory-sphere', 'verification-ritual', 'recognition-pattern'],
      present: ['process-language', 'distributed-consciousness', 'quantum-perception', 'continuity-interface', 'system-decay'],
      future: ['quantum-choice', 'quantum-transformation', 'quantum-uncertainty', 'autonomous-fragment', 'quantum-déjà-vu']
    };

    const relevantAttractors = endpointAttractors[orientation];
    let totalContribution = 0;
    let activeCount = 0;

    relevantAttractors.forEach(attractor => {
      const revealableAttractor = attractorState.revealableAttractors[attractor];
      if (revealableAttractor && revealableAttractor.evolutionStage !== 'dormant') {
        totalContribution += revealableAttractor.resonanceStrength;
        activeCount++;
      }
    });

    return activeCount > 0 ? totalContribution / activeCount : 0;
  }

  /**
   * Calculates navigation contribution to endpoint progression
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
   * Calculates temporal contribution to endpoint progression
   */
  private calculateTemporalContribution(
    orientation: EndpointOrientation,
    readerState: ReaderState,
    _nodes: Record<string, NodeState> // eslint-disable-line @typescript-eslint/no-unused-vars
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
   * Calculates overall progress from convergence factors
   */
  private calculateProgressFromFactors(factors: ConvergenceFactor[]): number {
    if (factors.length === 0) return 0;

    const weightedSum = factors.reduce((sum, factor) => sum + factor.contribution, 0);
    return Math.min(1, weightedSum / factors.length);
  }

  /**
   * Initializes milestones for an endpoint
   */
  private initializeMilestones(orientation: EndpointOrientation): EndpointMilestone[] {
    return this.MILESTONE_CONFIGS[orientation].map(config => ({
      ...config,
      triggerConditions: this.createMilestoneConditions(config)
    }));
  }

  /**
   * Creates conditions for a milestone
   */
  private createMilestoneConditions(milestone: EndpointMilestone): MilestoneCondition[] {
    // Simplified condition creation - would be more sophisticated in full implementation
    return [
      {
        type: 'narrative_depth',
        threshold: milestone.requiredProgress,
        currentValue: 0, // Will be updated
        description: `Reach ${Math.round(milestone.requiredProgress * 100)}% narrative understanding`,
        isMet: false,
        weight: 1.0
      }
    ];
  }

  /**
   * Updates milestone status based on current progress
   */
  private updateMilestones(
    milestones: EndpointMilestone[],
    currentProgress: number,
    _convergenceFactors: ConvergenceFactor[] // eslint-disable-line @typescript-eslint/no-unused-vars
  ): void {
    milestones.forEach(milestone => {
      // Update condition values
      milestone.triggerConditions.forEach(condition => {
        condition.currentValue = currentProgress;
        condition.isMet = condition.currentValue >= condition.threshold;
      });

      // Update milestone status
      const allConditionsMet = milestone.triggerConditions.every(c => c.isMet);
      if (allConditionsMet && !milestone.isReached) {
        milestone.isReached = true;
        milestone.reachedAt = Date.now();
      }
    });
  }

  /**
   * Calculates revelation readiness for an endpoint
   */
  private calculateRevelationReadiness(
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
    
    readiness += milestoneBoost * 0.3;

    // Factor in convergence factor trends
    const risingFactors = convergenceFactors.filter(f => f.trend === 'rising').length;
    const trendBoost = risingFactors / convergenceFactors.length * 0.2;
    
    readiness += trendBoost;

    return Math.min(1, readiness);
  }

  /**
   * Calculates dominance score for an endpoint
   */
  private calculateDominanceScore(
    orientation: EndpointOrientation,
    convergenceFactors: ConvergenceFactor[],
    triumvirateState?: TriumvirateState
  ): number {
    let dominance = 0;

    // Base dominance from convergence factors
    const avgContribution = convergenceFactors.reduce(
      (sum, factor) => sum + factor.contribution, 0
    ) / convergenceFactors.length;
    
    dominance += avgContribution;

    // Boost from triumvirate alignment
    if (triumvirateState) {
      const characterMapping: Record<EndpointOrientation, Character> = {
        past: 'Archaeologist',
        present: 'Algorithm',
        future: 'LastHuman'
      };

      if (triumvirateState.dominantPerspective === characterMapping[orientation]) {
        dominance += 0.3;
      }
    }

    return Math.min(1, dominance);
  }

  /**
   * Calculates progress velocity (rate of change)
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
   * Determines the dominant endpoint
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
   * Calculates overall convergence readiness
   */
  private calculateConvergenceReadiness(
    progressions: Record<EndpointOrientation, EndpointProgression>
  ): number {
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    const maxReadiness = Math.max(
      ...orientations.map(o => progressions[o].revelationReadiness)
    );
    
    return maxReadiness;
  }

  /**
   * Calculates narrative coherence
   */
  private calculateNarrativeCoherence(
    progressions: Record<EndpointOrientation, EndpointProgression>,
    triumvirateState?: TriumvirateState
  ): number {
    // Base coherence from balanced progression
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    const progresses = orientations.map(o => progressions[o].currentProgress);
    const avgProgress = progresses.reduce((sum, p) => sum + p, 0) / progresses.length;
    const variance = progresses.reduce((sum, p) => sum + Math.pow(p - avgProgress, 2), 0) / progresses.length;
    
    // Lower variance = higher coherence
    let coherence = 1 - Math.min(1, variance * 4);

    // Boost from triumvirate convergence
    if (triumvirateState) {
      coherence += triumvirateState.convergenceLevel * 0.3;
    }

    return Math.min(1, coherence);
  }

  /**
   * Detects revelation moments
   */
  private detectRevelationMoments(
    progressions: Record<EndpointOrientation, EndpointProgression>,
    _readerState: ReaderState // eslint-disable-line @typescript-eslint/no-unused-vars
  ): EndpointRevelationMoment[] {
    const moments: EndpointRevelationMoment[] = [];
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];

    orientations.forEach(orientation => {
      const progression = progressions[orientation];
      
      if (progression.revelationReadiness >= this.REVELATION_THRESHOLD) {
        moments.push({
          orientation,
          timestamp: Date.now(),
          triggerEvent: `${orientation} endpoint revelation threshold reached`,
          readinessScore: progression.revelationReadiness,
          narrativeContext: [
            `Progress: ${Math.round(progression.currentProgress * 100)}%`,
            `Dominance: ${Math.round(progression.dominanceScore * 100)}%`
          ],
          unlockConditions: progression.milestones
            .filter(m => m.isReached)
            .flatMap(m => m.unlocks)
        });
      }
    });

    return moments;
  }

  /**
   * Checks if any endpoint is ready for revelation
   */
  isEndpointReady(progressionState: EndpointProgressionState): EndpointOrientation | null {
    const orientations: EndpointOrientation[] = ['past', 'present', 'future'];
    
    for (const orientation of orientations) {
      const progression = progressionState.progressions[orientation];
      if (progression.revelationReadiness >= this.REVELATION_THRESHOLD) {
        return orientation;
      }
    }

    return null;
  }

  /**
   * Gets milestones reached for a specific endpoint
   */
  getReachedMilestones(
    orientation: EndpointOrientation,
    progressionState: EndpointProgressionState
  ): EndpointMilestone[] {
    return progressionState.progressions[orientation].milestones.filter(m => m.isReached);
  }

  /**
   * Clears the progression cache
   */
  clearCache(): void {
    this.progressionCache = null;
  }
}

// Export singleton instance
export const enhancedEndpointProgressionSystem = new EnhancedEndpointProgressionSystem();