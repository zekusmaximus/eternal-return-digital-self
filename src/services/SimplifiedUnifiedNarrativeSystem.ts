/**
 * Simplified Unified Narrative System
 * 
 * Coordinates the consolidated 2-system architecture:
 * - ConsolidatedTriumvirateSystem (character convergence + endpoint progression)
 * - EnhancedStrangeAttractorSystem (thematic element evolution)
 * 
 * This replaces the complex 4-system UnifiedNarrativeSystem with a cleaner,
 * more maintainable approach while preserving all essential functionality.
 */

import {
  NodeState,
  StrangeAttractor,
  Character,
  EndpointOrientation
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { 
  consolidatedTriumvirateSystem, 
  ConsolidatedTriumvirateState 
} from './ConsolidatedTriumvirateSystem';
import { 
  enhancedStrangeAttractorSystem, 
  EnhancedAttractorState 
} from './EnhancedStrangeAttractorSystem';
import { systemCaches, createCacheKey } from '../utils/SimpleCache';

/**
 * Represents a cross-system event that affects multiple narrative systems
 */
export interface SimplifiedNarrativeEvent {
  id: string;
  type: 'convergence_moment' | 'attractor_evolution' | 'milestone_reached' | 'endpoint_revelation';
  timestamp: number;
  source: 'triumvirate' | 'attractors' | 'unified';
  data: unknown;
  affectedSystems: ('triumvirate' | 'attractors')[];
  narrativeImpact: number; // 0-1
  description: string;
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
  source: 'triumvirate' | 'attractors' | 'unified';
}

/**
 * Simplified unified narrative state
 */
export interface SimplifiedUnifiedNarrativeState {
  // Individual system states
  triumvirate: ConsolidatedTriumvirateState;
  attractors: EnhancedAttractorState;
  
  // Cross-system metrics
  overallCoherence: number; // 0-1: How well systems work together
  narrativeTension: number; // 0-1: Overall dramatic tension
  emergentComplexity: number; // 0-1: Complexity arising from system interactions
  
  // Event tracking
  recentEvents: SimplifiedNarrativeEvent[];
  
  // Reader guidance
  suggestedActions: NarrativeGuidance[];
  revelationReadiness: Record<string, number>; // What's ready to be revealed
  
  // System synchronization
  lastUpdate: number;
  systemSyncStatus: Record<string, boolean>;
}

/**
 * Configuration for the simplified unified system
 */
export interface SimplifiedUnifiedConfig {
  // Event thresholds
  convergenceMomentThreshold: number;
  attractorEvolutionThreshold: number;
  milestoneReachedThreshold: number;
  
  // Guidance settings
  maxGuidanceItems: number;
  guidancePriorityThreshold: number;
  
  // Cache settings
  cacheExpiration: number;
}

/**
 * Simplified Unified Narrative System
 */
export class SimplifiedUnifiedNarrativeSystem {
  private config: SimplifiedUnifiedConfig = {
    convergenceMomentThreshold: 0.7,
    attractorEvolutionThreshold: 0.6,
    milestoneReachedThreshold: 0.8,
    maxGuidanceItems: 5,
    guidancePriorityThreshold: 0.5,
    cacheExpiration: 2000 // 2 seconds
  };

  /**
   * Calculates the simplified unified narrative state
   */
  calculateSimplifiedUnifiedNarrativeState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): SimplifiedUnifiedNarrativeState {
    // Check cache first
    const cacheKey = createCacheKey('simplified-unified', 
      readerState.path.sequence.join(','),
      Object.keys(readerState.path.characterFocus || {}).join(',')
    );
    
    const cached = systemCaches.unified.get(cacheKey);
    if (cached) {
      return cached as SimplifiedUnifiedNarrativeState;
    }

    // Calculate fresh state
    const state = this.calculateStateInternal(readerState, nodes);
    
    // Cache the result
    systemCaches.unified.set(cacheKey, state);

    return state;
  }

  /**
   * Internal calculation for unified narrative state
   */
  private calculateStateInternal(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): SimplifiedUnifiedNarrativeState {
    // Calculate individual system states
    const triumvirate = consolidatedTriumvirateSystem.calculateConsolidatedState(readerState, nodes);
    const attractors = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
      readerState,
      nodes,
      triumvirate
    );

    // Calculate cross-system metrics
    const overallCoherence = this.calculateOverallCoherence(triumvirate, attractors);
    const narrativeTension = this.calculateNarrativeTension(triumvirate, attractors);
    const emergentComplexity = this.calculateEmergentComplexity(triumvirate, attractors);

    // Detect and process cross-system events
    const recentEvents = this.detectCrossSystemEvents(triumvirate, attractors);
    
    // Generate narrative guidance
    const suggestedActions = this.generateNarrativeGuidance(
      triumvirate,
      attractors,
      readerState,
      nodes
    );

    // Calculate revelation readiness
    const revelationReadiness = this.calculateRevelationReadiness(triumvirate, attractors);

    // Check system synchronization
    const systemSyncStatus = this.checkSystemSynchronization(triumvirate, attractors);

    return {
      triumvirate,
      attractors,
      overallCoherence,
      narrativeTension,
      emergentComplexity,
      recentEvents,
      suggestedActions,
      revelationReadiness,
      lastUpdate: Date.now(),
      systemSyncStatus
    };
  }


  /**
   * Calculate overall coherence across both systems
   */
  private calculateOverallCoherence(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
  ): number {
    // Base coherence from individual systems
    const triumvirateCoherence = (triumvirate.convergenceLevel + triumvirate.narrativeCoherence) / 2;
    const attractorCoherence = attractors.globalResonance;

    // Weight the coherence values
    const weightedCoherence = (triumvirateCoherence * 0.6) + (attractorCoherence * 0.4);

    // Boost for system alignment
    const alignmentBonus = this.calculateSystemAlignment(triumvirate, attractors);
    
    return Math.min(1, weightedCoherence + (alignmentBonus * 0.2));
  }

  /**
   * Calculate narrative tension across both systems
   */
  private calculateNarrativeTension(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
  ): number {
    // Tension from individual systems
    const triumvirateTension = triumvirate.narrativeTension;
    const attractorTension = 1 - attractors.globalResonance; // Inverse of resonance

    // Combine tensions with weights
    return (triumvirateTension * 0.6) + (attractorTension * 0.4);
  }

  /**
   * Calculate emergent complexity from system interactions
   */
  private calculateEmergentComplexity(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
  ): number {
    // Count active elements across systems
    const activeRelationships = Object.values(triumvirate.relationships)
      .flatMap(rels => Object.values(rels))
      .filter(rel => rel.resonance > 0.3).length;

    const activeAttractors = Object.values(attractors.revealableAttractors)
      .filter(ra => ra.evolutionStage !== 'dormant').length;

    const activeEndpoints = Object.values(triumvirate.endpointProgressions)
      .filter(prog => prog.currentProgress > 0.2).length;

    // Cross-system interactions
    const crossSystemInteractions = 
      attractors.activeInfluences.length +
      triumvirate.convergenceMoments.length;

    // Normalize to 0-1 scale
    const totalElements = activeRelationships + activeAttractors + activeEndpoints;
    const baseComplexity = Math.min(1, totalElements / 15); // Adjusted for 2 systems
    const interactionComplexity = Math.min(1, crossSystemInteractions / 8);

    return (baseComplexity * 0.6) + (interactionComplexity * 0.4);
  }

  /**
   * Calculate system alignment bonus
   */
  private calculateSystemAlignment(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
  ): number {
    let alignment = 0;

    // Check if dominant endpoint aligns with dominant character
    const dominantEndpoint = triumvirate.dominantEndpoint;
    const dominantCharacter = triumvirate.dominantPerspective;

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
    const endpointAttractorAlignment = this.calculateEndpointAttractorAlignment(attractors, triumvirate);
    alignment += endpointAttractorAlignment * 0.3;

    // Check triumvirate-attractor alignment
    const triumvirateAttractorAlignment = this.calculateTriumvirateAttractorAlignment(triumvirate, attractors);
    alignment += triumvirateAttractorAlignment * 0.2;

    return Math.min(1, alignment);
  }

  /**
   * Calculate endpoint-attractor alignment
   */
  private calculateEndpointAttractorAlignment(
    attractors: EnhancedAttractorState,
    triumvirate: ConsolidatedTriumvirateState
  ): number {
    // Define attractor-endpoint mappings
    const endpointAttractors: Record<EndpointOrientation, StrangeAttractor[]> = {
      past: ['memory-fragment', 'memory-artifact', 'verification-ritual'],
      present: ['process-language', 'distributed-consciousness', 'continuity-interface'],
      future: ['quantum-choice', 'quantum-transformation', 'autonomous-fragment']
    };

    let totalAlignment = 0;
    let alignmentCount = 0;

    Object.entries(triumvirate.endpointProgressions).forEach(([orientation, progression]) => {
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
   * Calculate triumvirate-attractor alignment
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
   * Detect cross-system events
   */
  private detectCrossSystemEvents(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
  ): SimplifiedNarrativeEvent[] {
    const events: SimplifiedNarrativeEvent[] = [];

    // Detect convergence moments
    triumvirate.convergenceMoments.forEach(moment => {
      if (moment.intensity >= this.config.convergenceMomentThreshold) {
        events.push({
          id: `convergence-${moment.timestamp}`,
          type: 'convergence_moment',
          timestamp: moment.timestamp,
          source: 'triumvirate',
          data: moment,
          affectedSystems: ['triumvirate', 'attractors'],
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
          affectedSystems: ['attractors', 'triumvirate'],
          narrativeImpact: revealableAttractor.resonanceStrength,
          description: `Attractor evolution: ${revealableAttractor.attractor} reached dominant stage`
        });
      }
    });

    // Detect milestone events
    Object.values(triumvirate.endpointProgressions).forEach(progression => {
      progression.milestones.forEach(milestone => {
        if (milestone.isReached && milestone.narrativeSignificance >= this.config.milestoneReachedThreshold) {
          events.push({
            id: `milestone-${milestone.id}`,
            type: 'milestone_reached',
            timestamp: milestone.reachedAt || Date.now(),
            source: 'triumvirate',
            data: milestone,
            affectedSystems: ['triumvirate'],
            narrativeImpact: milestone.narrativeSignificance,
            description: `Milestone reached: ${milestone.name}`
          });
        }
      });
    });

    // Detect endpoint revelation events
    const readyEndpoint = consolidatedTriumvirateSystem.isEndpointReady(triumvirate);
    if (readyEndpoint) {
      events.push({
        id: `endpoint-revelation-${readyEndpoint}`,
        type: 'endpoint_revelation',
        timestamp: Date.now(),
        source: 'triumvirate',
        data: { endpoint: readyEndpoint },
        affectedSystems: ['triumvirate', 'attractors'],
        narrativeImpact: 0.9,
        description: `Endpoint revelation ready: ${readyEndpoint}`
      });
    }

    return events;
  }

  /**
   * Generate narrative guidance for the reader
   */
  private generateNarrativeGuidance(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState,
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
        source: 'triumvirate'
      });
    }

    // Sort by priority and limit
    return guidance
      .sort((a, b) => this.getPriorityValue(b.priority) - this.getPriorityValue(a.priority))
      .slice(0, this.config.maxGuidanceItems);
  }

  /**
   * Calculate revelation readiness across systems
   */
  private calculateRevelationReadiness(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
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
    Object.entries(triumvirate.endpointProgressions).forEach(([orientation, progression]) => {
      readiness[`endpoint-${orientation}`] = progression.revelationReadiness;
    });

    return readiness;
  }

  /**
   * Check system synchronization status
   */
  private checkSystemSynchronization(
    triumvirate: ConsolidatedTriumvirateState,
    attractors: EnhancedAttractorState
  ): Record<string, boolean> {
    const now = Date.now();
    const syncThreshold = 5000; // 5 seconds

    return {
      triumvirate: now - triumvirate.lastUpdate < syncThreshold,
      attractors: now - attractors.lastEvolutionEvent < syncThreshold
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
   * Public interface methods
   */
  
  /**
   * Get the most important narrative guidance for the reader
   */
  getPrimaryGuidance(narrativeState: SimplifiedUnifiedNarrativeState): NarrativeGuidance | null {
    const criticalGuidance = narrativeState.suggestedActions.find(g => g.priority === 'critical');
    return criticalGuidance || narrativeState.suggestedActions[0] || null;
  }

  /**
   * Check if any major revelation is ready
   */
  isRevelationReady(narrativeState: SimplifiedUnifiedNarrativeState): boolean {
    return Object.values(narrativeState.revelationReadiness).some(readiness => readiness >= 0.8);
  }

  /**
   * Get the current narrative phase
   */
  getNarrativePhase(narrativeState: SimplifiedUnifiedNarrativeState): 'exploration' | 'convergence' | 'revelation' | 'transcendence' {
    const { overallCoherence, emergentComplexity } = narrativeState;
    
    if (overallCoherence > 0.8 && emergentComplexity > 0.7) return 'transcendence';
    if (this.isRevelationReady(narrativeState)) return 'revelation';
    if (overallCoherence > 0.5) return 'convergence';
    return 'exploration';
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    systemCaches.unified.clear();
    consolidatedTriumvirateSystem.clearCache();
    enhancedStrangeAttractorSystem.clearCache();
  }

  /**
   * Update system configuration
   */
  updateConfig(newConfig: Partial<SimplifiedUnifiedConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.clearCache();
  }

  /**
   * Get current configuration
   */
  getConfig(): SimplifiedUnifiedConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const simplifiedUnifiedNarrativeSystem = new SimplifiedUnifiedNarrativeSystem();