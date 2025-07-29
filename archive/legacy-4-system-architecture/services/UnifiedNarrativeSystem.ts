/**
 * Unified Narrative System
 * 
 * Integrates the Triumvirate, Enhanced Strange Attractor, and Enhanced Endpoint Progression
 * systems to create a cohesive narrative experience with cross-system coordination.
 */

import {
  NodeState,
  EndpointOrientation,
  StrangeAttractor,
  Character
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { consolidatedTriumvirateSystem, ConsolidatedTriumvirateState, EndpointProgression } from './ConsolidatedTriumvirateSystem';
import { enhancedStrangeAttractorSystem, EnhancedAttractorState } from './EnhancedStrangeAttractorSystem';
import { simplifiedUnifiedNarrativeSystem } from './SimplifiedUnifiedNarrativeSystem';

/**
 * Represents a cross-system event that affects multiple narrative systems
 */
export interface NarrativeEvent {
  id: string;
  type: 'convergence_moment' | 'attractor_evolution' | 'milestone_reached' | 'endpoint_revelation' | 'system_resonance';
  timestamp: number;
  source: 'triumvirate' | 'attractors' | 'endpoints' | 'unified';
  data: unknown;
  affectedSystems: ('triumvirate' | 'attractors' | 'endpoints')[];
  narrativeImpact: number; // 0-1
  description: string;
}

/**
 * Represents the overall narrative state across all systems
 */
export interface UnifiedNarrativeState {
  // Individual system states
  triumvirate: ConsolidatedTriumvirateState;
  attractors: EnhancedAttractorState;
  endpoints: Record<string, EndpointProgression>;
  
  // Cross-system metrics
  overallCoherence: number; // 0-1: How well systems work together
  narrativeTension: number; // 0-1: Overall dramatic tension
  emergentComplexity: number; // 0-1: Complexity arising from system interactions
  
  // Event tracking
  recentEvents: NarrativeEvent[];
  eventHistory: NarrativeEvent[];
  
  // Reader guidance
  suggestedActions: NarrativeGuidance[];
  revelationReadiness: Record<string, number>; // What's ready to be revealed
  
  // System synchronization
  lastUpdate: number;
  systemSyncStatus: Record<string, boolean>;
}

/**
 * Guidance provided to the reader based on narrative state
 */
export interface NarrativeGuidance {
  type: 'navigation' | 'exploration' | 'reflection' | 'choice';
  priority: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  suggestedNodes: string[];
  reasoning: string;
  source: 'triumvirate' | 'attractors' | 'endpoints' | 'unified';
}

/**
 * Configuration for cross-system interactions
 */
export interface UnifiedSystemConfig {
  // Event thresholds
  convergenceMomentThreshold: number;
  attractorEvolutionThreshold: number;
  milestoneReachedThreshold: number;
  
  // Synchronization settings
  maxEventHistory: number;
  eventProcessingDelay: number;
  
  // Narrative guidance settings
  maxGuidanceItems: number;
  guidancePriorityThreshold: number;
}

/**
 * Unified Narrative System that coordinates all narrative subsystems
 */
export class UnifiedNarrativeSystem {
  private config: UnifiedSystemConfig = {
    convergenceMomentThreshold: 0.7,
    attractorEvolutionThreshold: 0.6,
    milestoneReachedThreshold: 0.8,
    maxEventHistory: 50,
    eventProcessingDelay: 1000,
    maxGuidanceItems: 5,
    guidancePriorityThreshold: 0.5
  };

  private narrativeCache: {
    timestamp: number;
    state: UnifiedNarrativeState;
  } | null = null;

  private readonly CACHE_EXPIRATION = 2000; // 2 seconds
  private eventQueue: NarrativeEvent[] = [];
  private processingEvents = false;

  /**
   * Calculates the unified narrative state across all systems
   */
  calculateUnifiedNarrativeState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): UnifiedNarrativeState {
    const now = Date.now();
    
    // Check cache first
    if (this.narrativeCache && 
        now - this.narrativeCache.timestamp < this.CACHE_EXPIRATION) {
      return this.narrativeCache.state;
    }

    // Calculate fresh state
    const state = this.calculateUnifiedStateInternal(readerState, nodes);
    
    // Update cache
    this.narrativeCache = {
      timestamp: now,
      state
    };

    // Process any queued events
    this.processEventQueue();

    return state;
  }

  /**
   * Internal calculation for unified narrative state
   */
  private calculateUnifiedStateInternal(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): UnifiedNarrativeState {
    // Calculate individual system states using consolidated system
    const triumvirate = consolidatedTriumvirateSystem.calculateConsolidatedState(readerState, nodes);
    const endpoints = triumvirate.endpointProgressions;
    
    const attractors = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
      readerState,
      nodes,
      triumvirate
    );

    // Calculate cross-system metrics
    const overallCoherence = this.calculateOverallCoherence(triumvirate, attractors, endpoints);
    const narrativeTension = this.calculateNarrativeTension(triumvirate, attractors, endpoints);
    const emergentComplexity = this.calculateEmergentComplexity(triumvirate, attractors, endpoints);

    // Detect and process cross-system events
    const recentEvents = this.detectCrossSystemEvents(triumvirate, attractors, endpoints);
    
    // Generate narrative guidance
    const suggestedActions = this.generateNarrativeGuidance(
      triumvirate,
      attractors,
      endpoints,
      readerState,
      nodes
    );

    // Calculate revelation readiness
    const revelationReadiness = this.calculateRevelationReadiness(triumvirate, attractors, endpoints);

    // Check system synchronization
    const systemSyncStatus = this.checkSystemSynchronization(triumvirate, attractors, endpoints);

    return {
      triumvirate,
      attractors,
      endpoints,
      overallCoherence,
      narrativeTension,
      emergentComplexity,
      recentEvents,
      eventHistory: this.getEventHistory(),
      suggestedActions,
      revelationReadiness,
      lastUpdate: Date.now(),
      systemSyncStatus
    };
  }

  /**
   * Calculates overall coherence across all systems
   */
  private calculateOverallCoherence(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): number {
    // Base coherence from individual systems
    const triumvirateCoherence = triumvirate.convergenceLevel;
    const attractorCoherence = attractors.globalResonance;
    
    // Calculate endpoint coherence from progression values
    const endpointProgressions = Object.values(endpoints);
    const endpointCoherence = endpointProgressions.length > 0
      ? endpointProgressions.reduce((sum, ep) => sum + ep.currentProgress, 0) / endpointProgressions.length
      : 0;

    // Weight the coherence values
    const weightedCoherence = (
      triumvirateCoherence * 0.4 +
      attractorCoherence * 0.3 +
      endpointCoherence * 0.3
    );

    // Boost for system alignment
    const alignmentBonus = this.calculateSystemAlignment(triumvirate, attractors, endpoints);
    
    return Math.min(1, weightedCoherence + (alignmentBonus * 0.2));
  }

  /**
   * Calculates narrative tension across all systems
   */
  private calculateNarrativeTension(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): number {
    // Tension from individual systems
    const triumvirateTension = triumvirate.narrativeTension;
    const attractorTension = 1 - attractors.globalResonance; // Inverse of resonance
    const endpointTension = this.calculateEndpointTension(endpoints);

    // Combine tensions with weights
    return (
      triumvirateTension * 0.4 +
      attractorTension * 0.3 +
      endpointTension * 0.3
    );
  }

  /**
   * Calculates emergent complexity from system interactions
   */
  private calculateEmergentComplexity(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): number {
    // Count active elements across systems
    const activeRelationships = Object.values(triumvirate.relationships)
      .flatMap(rels => Object.values(rels))
      .filter(rel => rel.resonance > 0.3).length;

    const activeAttractors = Object.values(attractors.revealableAttractors)
      .filter(ra => ra.evolutionStage !== 'dormant').length;

    const activeEndpoints = Object.values(endpoints)
      .filter(prog => prog.currentProgress > 0.2).length;

    // Cross-system interactions
    const crossSystemInteractions =
      attractors.activeInfluences.length +
      triumvirate.convergenceMoments.length +
      Object.values(endpoints).reduce((sum, ep) => sum + ep.milestones.filter(m => m.isReached).length, 0);

    // Normalize to 0-1 scale
    const totalElements = activeRelationships + activeAttractors + activeEndpoints;
    const baseComplexity = Math.min(1, totalElements / 20); // Normalize to expected max
    const interactionComplexity = Math.min(1, crossSystemInteractions / 10);

    return (baseComplexity * 0.6) + (interactionComplexity * 0.4);
  }

  /**
   * Calculates system alignment bonus
   */
  private calculateSystemAlignment(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): number {
    let alignment = 0;

    // Check if dominant endpoint aligns with dominant character
    const dominantCharacter = triumvirate.dominantPerspective;
    
    // Find the endpoint with highest progress
    const dominantEndpoint = Object.entries(endpoints)
      .reduce((max, [orientation, progression]) =>
        progression.currentProgress > max.progress
          ? { orientation: orientation as EndpointOrientation, progress: progression.currentProgress }
          : max,
        { orientation: null as EndpointOrientation | null, progress: 0 }
      ).orientation;

    if (dominantEndpoint && dominantCharacter) {
      const characterEndpointMapping: Record<Character, EndpointOrientation> = {
        'Archaeologist': 'past',
        'Algorithm': 'present',
        'LastHuman': 'future'
      };

      if (characterEndpointMapping[dominantCharacter] === dominantEndpoint) {
        alignment += 0.5;
      }
    }

    // Check attractor-endpoint alignment
    const endpointAttractorAlignment = this.calculateEndpointAttractorAlignment(attractors, endpoints);
    alignment += endpointAttractorAlignment * 0.3;

    // Check triumvirate-attractor alignment
    const triumvirateAttractorAlignment = this.calculateTriumvirateAttractorAlignment(triumvirate, attractors);
    alignment += triumvirateAttractorAlignment * 0.2;

    return Math.min(1, alignment);
  }

  /**
   * Calculates endpoint tension
   */
  private calculateEndpointTension(endpoints: Record<string, EndpointProgression>): number {
    const progressValues = Object.values(endpoints).map(p => p.currentProgress);
    const maxProgress = Math.max(...progressValues);
    const minProgress = Math.min(...progressValues);
    
    // Tension is high when there's uncertainty (moderate progress) or competition
    const uncertaintyTension = 1 - Math.abs(maxProgress - 0.5) * 2;
    const competitionTension = maxProgress - minProgress;
    
    return (uncertaintyTension * 0.6) + (competitionTension * 0.4);
  }

  /**
   * Calculates endpoint-attractor alignment
   */
  private calculateEndpointAttractorAlignment(
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): number {
    // Define attractor-endpoint mappings
    const endpointAttractors: Record<EndpointOrientation, StrangeAttractor[]> = {
      past: ['memory-fragment', 'memory-artifact', 'verification-ritual'],
      present: ['process-language', 'distributed-consciousness', 'continuity-interface'],
      future: ['quantum-choice', 'quantum-transformation', 'autonomous-fragment']
    };

    let totalAlignment = 0;
    let alignmentCount = 0;

    Object.entries(endpoints).forEach(([orientation, progression]) => {
      const relevantAttractors = endpointAttractors[orientation as EndpointOrientation];
      const attractorStrength = relevantAttractors.reduce((sum, attractor) => {
        const revealableAttractor = attractors.revealableAttractors[attractor];
        return sum + (revealableAttractor ? revealableAttractor.resonanceStrength : 0);
      }, 0) / relevantAttractors.length;

      const alignment = Math.min(1, attractorStrength * progression.currentProgress);
      totalAlignment += alignment;
      alignmentCount++;
    });

    return alignmentCount > 0 ? totalAlignment / alignmentCount : 0;
  }

  /**
   * Calculates triumvirate-attractor alignment
   */
  private calculateTriumvirateAttractorAlignment(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
  ): number {
    // Check if character relationships align with attractor influences
    let alignment = 0;
    let count = 0;

    Object.values(triumvirate.relationships).forEach(characterRels => {
      Object.values(characterRels).forEach(relationship => {
        if (relationship.resonance > 0.3) {
          // Check if shared attractors are active
          const sharedAttractorStrength = relationship.sharedAttractors.reduce((sum, attractor) => {
            const revealableAttractor = attractors.revealableAttractors[attractor];
            return sum + (revealableAttractor ? revealableAttractor.resonanceStrength : 0);
          }, 0);

          if (relationship.sharedAttractors.length > 0) {
            const avgStrength = sharedAttractorStrength / relationship.sharedAttractors.length;
            alignment += Math.min(1, relationship.resonance * avgStrength);
            count++;
          }
        }
      });
    });

    return count > 0 ? alignment / count : 0;
  }

  /**
   * Detects cross-system events
   */
  private detectCrossSystemEvents(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): NarrativeEvent[] {
    const events: NarrativeEvent[] = [];

    // Detect convergence moments
    triumvirate.convergenceMoments.forEach(moment => {
      if (moment.intensity >= this.config.convergenceMomentThreshold) {
        events.push({
          id: `convergence-${moment.timestamp}`,
          type: 'convergence_moment',
          timestamp: moment.timestamp,
          source: 'triumvirate',
          data: moment,
          affectedSystems: ['triumvirate', 'attractors', 'endpoints'],
          narrativeImpact: moment.narrativeSignificance,
          description: `Character convergence: ${moment.characters.join(', ')}`
        });
      }
    });

    // Detect attractor evolution events
    Object.values(attractors.revealableAttractors).forEach(revealableAttractor => {
      if (revealableAttractor.resonanceStrength >= this.config.attractorEvolutionThreshold &&
          revealableAttractor.evolutionStage === 'dominant') {
        events.push({
          id: `attractor-${revealableAttractor.attractor}-${Date.now()}`,
          type: 'attractor_evolution',
          timestamp: Date.now(),
          source: 'attractors',
          data: revealableAttractor,
          affectedSystems: ['attractors', 'endpoints'],
          narrativeImpact: revealableAttractor.resonanceStrength,
          description: `Attractor evolution: ${revealableAttractor.attractor} reached dominant stage`
        });
      }
    });

    // Detect milestone events
    Object.values(endpoints).forEach(progression => {
      progression.milestones.forEach(milestone => {
        if (milestone.isReached && milestone.narrativeSignificance >= this.config.milestoneReachedThreshold) {
          events.push({
            id: `milestone-${milestone.id}`,
            type: 'milestone_reached',
            timestamp: milestone.reachedAt || Date.now(),
            source: 'endpoints',
            data: milestone,
            affectedSystems: ['endpoints', 'triumvirate'],
            narrativeImpact: milestone.narrativeSignificance,
            description: `Milestone reached: ${milestone.name}`
          });
        }
      });
    });

    return events;
  }

  /**
   * Generates narrative guidance for the reader
   */
  private generateNarrativeGuidance(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    _endpoints: Record<string, EndpointProgression>,
    _readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): NarrativeGuidance[] {
    const guidance: NarrativeGuidance[] = [];

    // Guidance from triumvirate system
    if (triumvirate.revelationThreshold > 0.7) {
      guidance.push({
        type: 'reflection',
        priority: 'high',
        message: 'The three perspectives are beginning to converge. Consider the connections between characters.',
        suggestedNodes: this.findConvergenceNodes(triumvirate, nodes),
        reasoning: 'High convergence threshold detected',
        source: 'triumvirate'
      });
    }

    // Guidance from attractor system
    const dominantAttractors = Object.values(attractors.revealableAttractors)
      .filter(ra => ra.evolutionStage === 'dominant')
      .slice(0, 2);

    dominantAttractors.forEach(attractor => {
      guidance.push({
        type: 'exploration',
        priority: 'medium',
        message: `The ${attractor.attractor.replace('-', ' ')} theme is strongly resonating. Explore related concepts.`,
        suggestedNodes: this.findAttractorNodes(attractor.attractor, nodes),
        reasoning: `Dominant attractor: ${attractor.attractor}`,
        source: 'attractors'
      });
    });

    // Guidance from endpoint system
    const readyEndpoint = consolidatedTriumvirateSystem.isEndpointReady(triumvirate);
    if (readyEndpoint) {
      guidance.push({
        type: 'choice',
        priority: 'critical',
        message: `The ${readyEndpoint} endpoint is ready for revelation. This represents a significant narrative choice.`,
        suggestedNodes: this.findEndpointNodes(readyEndpoint, nodes),
        reasoning: `Endpoint revelation readiness: ${readyEndpoint}`,
        source: 'endpoints'
      });
    }

    // Sort by priority and limit
    return guidance
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
      .slice(0, this.config.maxGuidanceItems);
  }

  /**
   * Calculates revelation readiness across systems
   */
  private calculateRevelationReadiness(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): Record<string, number> {
    const readiness: Record<string, number> = {};

    // Triumvirate revelations
    readiness['character-convergence'] = triumvirate.revelationThreshold;
    readiness['identity-unity'] = triumvirate.convergenceLevel;

    // Attractor revelations
    Object.entries(attractors.revealableAttractors).forEach(([attractor, revealable]) => {
      readiness[`attractor-${attractor}`] = revealable.revelationProgress;
    });

    // Endpoint revelations
    Object.entries(endpoints).forEach(([orientation, progression]) => {
      readiness[`endpoint-${orientation}`] = progression.revelationReadiness;
    });

    return readiness;
  }

  /**
   * Checks system synchronization status
   */
  private checkSystemSynchronization(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
    endpoints: Record<string, EndpointProgression>
  ): Record<string, boolean> {
    const now = Date.now();
    const syncThreshold = 5000; // 5 seconds

    return {
      triumvirate: now - triumvirate.lastUpdate < syncThreshold,
      attractors: now - attractors.lastEvolutionEvent < syncThreshold,
      endpoints: Object.values(endpoints).every(ep => now - ep.lastUpdate < syncThreshold)
    };
  }

  /**
   * Helper methods for guidance generation
   */
  private findConvergenceNodes(_triumvirate: ConsolidatedTriumvirateState, nodes: Record<string, NodeState>): string[] {
    // Find nodes that involve multiple characters or high convergence potential
    return Object.values(nodes)
      .filter(node => {
        const hasMultipleAttractors = node.strangeAttractors.length > 2;
        const isEndpoint = node.isEndpoint;
        return hasMultipleAttractors || isEndpoint;
      })
      .slice(0, 3)
      .map(node => node.id);
  }

  private findAttractorNodes(attractor: StrangeAttractor, nodes: Record<string, NodeState>): string[] {
    return Object.values(nodes)
      .filter(node => node.strangeAttractors.includes(attractor))
      .slice(0, 3)
      .map(node => node.id);
  }

  private findEndpointNodes(orientation: EndpointOrientation, nodes: Record<string, NodeState>): string[] {
    return Object.values(nodes)
      .filter(node => node.isEndpoint && node.endpointOrientation === orientation)
      .map(node => node.id);
  }

  private getPriorityValue(priority: string): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Event processing methods
   */
  private processEventQueue(): void {
    if (this.processingEvents || this.eventQueue.length === 0) return;

    this.processingEvents = true;
    
    setTimeout(() => {
      // Process queued events
      this.eventQueue.forEach(event => {
        this.processNarrativeEvent(event);
      });
      
      this.eventQueue = [];
      this.processingEvents = false;
    }, this.config.eventProcessingDelay);
  }

  private processNarrativeEvent(event: NarrativeEvent): void {
    // Process cross-system effects of the event
    console.log(`[UnifiedNarrativeSystem] Processing event: ${event.type} - ${event.description}`);
    
    // Add to event history
    if (!this.narrativeCache?.state.eventHistory) return;
    
    this.narrativeCache.state.eventHistory.push(event);
    
    // Trim history if too long
    if (this.narrativeCache.state.eventHistory.length > this.config.maxEventHistory) {
      this.narrativeCache.state.eventHistory = this.narrativeCache.state.eventHistory.slice(-this.config.maxEventHistory);
    }
  }

  private getEventHistory(): NarrativeEvent[] {
    return this.narrativeCache?.state.eventHistory || [];
  }

  /**
   * Public interface methods
   */
  
  /**
   * Gets the most important narrative guidance for the reader
   */
  getPrimaryGuidance(narrativeState: UnifiedNarrativeState): NarrativeGuidance | null {
    const criticalGuidance = narrativeState.suggestedActions.find(g => g.priority === 'critical');
    return criticalGuidance || narrativeState.suggestedActions[0] || null;
  }

  /**
   * Checks if any major revelation is ready
   */
  isRevelationReady(narrativeState: UnifiedNarrativeState): boolean {
    return Object.values(narrativeState.revelationReadiness).some(readiness => readiness >= 0.8);
  }

  /**
   * Gets the current narrative phase
   */
  getNarrativePhase(narrativeState: UnifiedNarrativeState): 'exploration' | 'convergence' | 'revelation' | 'transcendence' {
    const { overallCoherence, emergentComplexity } = narrativeState;
    
    if (overallCoherence > 0.8 && emergentComplexity > 0.7) return 'transcendence';
    if (this.isRevelationReady(narrativeState)) return 'revelation';
    if (overallCoherence > 0.5) return 'convergence';
    return 'exploration';
  }

  /**
   * Clears all caches
   */
  clearCache(): void {
    this.narrativeCache = null;
    consolidatedTriumvirateSystem.clearCache();
    enhancedStrangeAttractorSystem.clearCache();
    simplifiedUnifiedNarrativeSystem.clearCache();
  }

  /**
   * Updates system configuration
   */
  updateConfig(newConfig: Partial<UnifiedSystemConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearCache();
  }

  /**
   * Gets current configuration
   */
  getConfig(): UnifiedSystemConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const unifiedNarrativeSystem = new UnifiedNarrativeSystem();