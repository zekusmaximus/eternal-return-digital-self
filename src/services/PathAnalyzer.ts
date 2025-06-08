/**
 * PathAnalyzer Service
 * 
 * Analyzes reader path data to identify meaningful patterns in how readers navigate
 * through the Narramorph narrative system. This service connects reader behavior
 * to the TransformationEngine to enable dynamic content adaptation.
 */

import {
  ReadingPath,
  StrangeAttractor,
  Character,
  TemporalLabel,
  NodeState
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';

/**
 * Represents a detected pattern in the reader's path
 */
export interface ReadingPattern {
  type: 'sequence' | 'character' | 'temporal' | 'thematic' | 'rhythm';
  strength: number; // 0-1 indicating pattern strength/confidence
  description: string;
  relatedNodes?: string[];
  relatedCharacters?: Character[];
  relatedTemporalLayers?: TemporalLabel[];
  relatedAttractors?: StrangeAttractor[];
}

/**
 * Represents the reader's engagement with strange attractors
 */
export interface AttractorEngagement {
  attractor: StrangeAttractor;
  engagementScore: number; // 0-100
  totalEngagements: number;
  relatedNodes: string[];
  trend: 'rising' | 'falling' | 'stable';
}

/**
 * Represents a transformation condition with metadata about its source
 */
export interface PatternBasedCondition {
  type: 'visitPattern' | 'characterFocus' | 'temporalFocus' | 'readingRhythm' | 'attractorAffinity' | 'attractorEngagement';
  condition: {
    visitPattern?: string[];
    characters?: Character[];
    temporalPosition?: TemporalLabel;
    // Time-based properties removed (2025-06-08)
    strangeAttractorsEngaged?: StrangeAttractor[];
  };
  strength: number;
}

/**
 * Service class for analyzing reader path patterns
 */
export class PathAnalyzer {
  // Minimum sequence length to consider for pattern analysis
  private readonly MIN_SEQUENCE_LENGTH = 2;
  
  // Threshold for considering a sequence repeated (how many times it must occur)
  private readonly SEQUENCE_REPETITION_THRESHOLD = 2;
  
  // Threshold for detecting character focus (what percentage of visits)
  private readonly CHARACTER_FOCUS_THRESHOLD = 0.4; // 40%
  
  // Threshold for detecting temporal layer focus
  private readonly TEMPORAL_FOCUS_THRESHOLD = 0.4; // 40%
  
  // Using imported constants for transitions and engagements from readerSlice.ts
  // These thresholds define fast transitions and deep engagements

  /**
   * Analyzes the reader's path to identify patterns
   * @param readerState Current reader state
   * @param nodes Map of node IDs to node states
   * @returns Array of detected patterns
   */
  analyzePathPatterns(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): ReadingPattern[] {
    const patterns: ReadingPattern[] = [];
    
    // Only analyze if we have enough data
    if (readerState.path.sequence.length < this.MIN_SEQUENCE_LENGTH) {
      return patterns;
    }
    
    // 1. Analyze sequence patterns
    patterns.push(...this.identifyRepeatedSequences(readerState.path));
    
    // 2. Analyze character focus patterns
    patterns.push(...this.identifyCharacterFocusPatterns(readerState.path));
    
    // 3. Analyze temporal layer patterns
    patterns.push(...this.identifyTemporalLayerPatterns(readerState.path));
    
    // 4. Reading rhythm patterns (time-based factors removed)
    patterns.push(...this.identifyReadingRhythmPatterns());
    
    // 5. Analyze theme/attractor affinity patterns
    patterns.push(...this.identifyAttractorAffinityPatterns(readerState.path, nodes));
    
    return patterns;
  }

  /**
   * Identifies repeated sequences in the reader's path
   */
  identifyRepeatedSequences(path: ReadingPath): ReadingPattern[] {
    const patterns: ReadingPattern[] = [];
    const repeatedSequences = path.patternSequences?.repeatedSequences;
    
    if (!repeatedSequences || repeatedSequences.length === 0) {
      return patterns;
    }
    
    // Convert repeated sequences to patterns
    repeatedSequences.forEach((sequence: string[]) => {
      if (sequence.length >= this.MIN_SEQUENCE_LENGTH) {
        // Calculate pattern strength based on sequence length and repetition
        const sequenceLength = sequence.length;
        const maxPossibleLength = Math.floor(path.sequence.length / 2);
        const lengthFactor = sequenceLength / maxPossibleLength;
        
        // Count occurrences of this sequence
        let occurrences = 0;
        for (let i = 0; i <= path.sequence.length - sequenceLength; i++) {
          const potentialMatch = path.sequence.slice(i, i + sequenceLength);
          if (potentialMatch.every((id, idx) => id === sequence[idx])) {
            occurrences++;
          }
        }
        
        // Calculate repetition factor
        const maxPossibleOccurrences = Math.floor(path.sequence.length / sequenceLength);
        const repetitionFactor = Math.min(1, occurrences / maxPossibleOccurrences);
        
        // Calculate overall strength
        const strength = (lengthFactor * 0.4) + (repetitionFactor * 0.6);
        
        // Only add significant patterns
        if (occurrences >= this.SEQUENCE_REPETITION_THRESHOLD) {
          patterns.push({
            type: 'sequence',
            strength,
            description: `Repeated sequence of ${sequenceLength} nodes visited ${occurrences} times`,
            relatedNodes: sequence
          });
        }
      }
    });
    
    return patterns;
  }

  /**
   * Identifies character focus patterns in the reader's path
   */
  identifyCharacterFocusPatterns(path: ReadingPath): ReadingPattern[] {
    const patterns: ReadingPattern[] = [];
    const characterFocus = path.characterFocus;
    
    if (!characterFocus) {
      return patterns;
    }
    
    const detailedVisits = path.detailedVisits || [];
    const totalVisits = detailedVisits.length;
    if (totalVisits === 0) {
      return patterns;
    }
    
    // Check for character focus
    Object.entries(characterFocus).forEach(([character, count]) => {
      const ratio = count / totalVisits;
      
      if (ratio >= this.CHARACTER_FOCUS_THRESHOLD) {
        // Calculate how much above threshold
        const strengthAboveThreshold = (ratio - this.CHARACTER_FOCUS_THRESHOLD) /
          (1 - this.CHARACTER_FOCUS_THRESHOLD);
        
        // Calculate pattern strength (0.5-1.0 range)
        const strength = 0.5 + (0.5 * strengthAboveThreshold);
        
        patterns.push({
          type: 'character',
          strength,
          description: `Strong focus on ${character} perspective (${Math.round(ratio * 100)}% of visits)`,
          relatedCharacters: [character as Character]
        });
      }
    });
    
    // Analyze character sequences
    const characterSequences = path.patternSequences?.characterSequences;
    if (characterSequences && characterSequences.length > 0) {
      
      const characterSequence = characterSequences[0];
      
      // Look for oscillation patterns (alternating between two characters)
      if (characterSequence.length >= 4) {
        let oscillationCount = 0;
        
        for (let i = 0; i < characterSequence.length - 3; i++) {
          const c1 = characterSequence[i];
          const c2 = characterSequence[i + 1];
          
          if (c1 !== c2 && 
              characterSequence[i + 2] === c1 && 
              characterSequence[i + 3] === c2) {
            oscillationCount++;
          }
        }
        
        const maxPossibleOscillations = Math.floor((characterSequence.length - 3) / 2);
        const oscillationRatio = oscillationCount / maxPossibleOscillations;
        
        if (oscillationRatio >= 0.3) {
          patterns.push({
            type: 'character',
            strength: oscillationRatio,
            description: 'Pattern of alternating between character perspectives',
            relatedCharacters: Array.from(new Set(characterSequence))
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Identifies temporal layer patterns in the reader's path
   */
  identifyTemporalLayerPatterns(path: ReadingPath): ReadingPattern[] {
    const patterns: ReadingPattern[] = [];
    const temporalLayerFocus = path.temporalLayerFocus;
    
    if (!temporalLayerFocus) {
      return patterns;
    }
    
    const detailedVisits = path.detailedVisits || [];
    const totalVisits = detailedVisits.length;
    if (totalVisits === 0) {
      return patterns;
    }
    
    // Check for temporal layer focus
    Object.entries(temporalLayerFocus).forEach(([layer, count]) => {
      const ratio = count / totalVisits;
      
      if (ratio >= this.TEMPORAL_FOCUS_THRESHOLD) {
        // Calculate how much above threshold
        const strengthAboveThreshold = (ratio - this.TEMPORAL_FOCUS_THRESHOLD) /
          (1 - this.TEMPORAL_FOCUS_THRESHOLD);
        
        // Calculate pattern strength (0.5-1.0 range)
        const strength = 0.5 + (0.5 * strengthAboveThreshold);
        
        patterns.push({
          type: 'temporal',
          strength,
          description: `Strong focus on ${layer} temporal layer (${Math.round(ratio * 100)}% of visits)`,
          relatedTemporalLayers: [layer as TemporalLabel]
        });
      }
    });
    
    // Analyze temporal progression patterns
    const temporalSequences = path.patternSequences?.temporalSequences;
    if (temporalSequences && temporalSequences.length > 0) {
      
      const temporalSequence = temporalSequences[0];
      
      if (temporalSequence.length >= 5) {
        // Check for chronological progression (past -> present -> future)
        let chronologicalCount = 0;
        
        for (let i = 0; i < temporalSequence.length - 2; i++) {
          const t1 = temporalSequence[i];
          const t2 = temporalSequence[i + 1];
          const t3 = temporalSequence[i + 2];
          
          if ((t1 === 'past' && t2 === 'present' && t3 === 'future') ||
              (t1 === 'past' && t2 === 'present') ||
              (t2 === 'present' && t3 === 'future')) {
            chronologicalCount++;
          }
        }
        
        const maxPossibleProgressions = temporalSequence.length - 2;
        const progressionRatio = chronologicalCount / maxPossibleProgressions;
        
        if (progressionRatio >= 0.3) {
          patterns.push({
            type: 'temporal',
            strength: progressionRatio,
            description: 'Pattern of chronological progression through time',
            relatedTemporalLayers: ['past', 'present', 'future']
          });
        }
        
        // Check for reverse chronological progression (future -> present -> past)
        let reverseChronologicalCount = 0;
        
        for (let i = 0; i < temporalSequence.length - 2; i++) {
          const t1 = temporalSequence[i];
          const t2 = temporalSequence[i + 1];
          const t3 = temporalSequence[i + 2];
          
          if ((t1 === 'future' && t2 === 'present' && t3 === 'past') ||
              (t1 === 'future' && t2 === 'present') ||
              (t2 === 'present' && t3 === 'past')) {
            reverseChronologicalCount++;
          }
        }
        
        const reverseProgressionRatio = reverseChronologicalCount / maxPossibleProgressions;
        
        if (reverseProgressionRatio >= 0.3) {
          patterns.push({
            type: 'temporal',
            strength: reverseProgressionRatio,
            description: 'Pattern of reverse chronological movement through time',
            relatedTemporalLayers: ['future', 'present', 'past']
          });
        }
      }
    }
    
    return patterns;
  }

  /**
   * Previously contained reading rhythm patterns based on time
   * Removed as part of refactoring to eliminate time-based factors
   */
  identifyReadingRhythmPatterns(): ReadingPattern[] {
    // Return empty patterns as time-based rhythm detection has been removed
    return [];
  }

  /**
   * Identifies attractor affinity patterns in the reader's path
   */
  identifyAttractorAffinityPatterns(
    path: ReadingPath,
    nodes: Record<string, NodeState>
  ): ReadingPattern[] {
    const patterns: ReadingPattern[] = [];
    const attractorsEngaged = path.attractorsEngaged;
    const detailedVisits = path.detailedVisits || [];
    
    if (!attractorsEngaged || Object.keys(attractorsEngaged).length === 0) {
      return patterns;
    }
    
    // Count total attractor engagements
    const totalEngagements = Object.values(attractorsEngaged).reduce((sum, count) => sum + count, 0);
    if (totalEngagements === 0) {
      return patterns;
    }
    
    // Find attractors with significant engagement
    Object.entries(attractorsEngaged).forEach(([attractor, count]) => {
      const engagementRatio = count / totalEngagements;
      
      if (engagementRatio >= 0.25) { // 25% or more of all engagements
        // Calculate nodes that have this attractor
        const relatedNodes = Object.values(nodes)
          .filter(node => node.strangeAttractors.includes(attractor as StrangeAttractor))
          .map(node => node.id);
        
        // Calculate pattern strength based on engagement ratio and visit ratio
        let visitRatio = 0;
        if (relatedNodes.length > 0) {
          const attractorVisits = detailedVisits.filter(visit =>
            relatedNodes.includes(visit.nodeId)).length;
          visitRatio = attractorVisits / detailedVisits.length;
        }
        
        const strength = (engagementRatio * 0.7) + (visitRatio * 0.3);
        
        patterns.push({
          type: 'thematic',
          strength,
          description: `Strong affinity for "${attractor}" concept/theme`,
          relatedAttractors: [attractor as StrangeAttractor],
          relatedNodes
        });
      }
    });
    
    // Check for thematic connections between visited nodes
    if (detailedVisits.length >= 3) {
      // Create a map of node IDs to their attractors
      const nodeAttractors: Record<string, StrangeAttractor[]> = {};
      
      Object.values(nodes).forEach(node => {
        nodeAttractors[node.id] = node.strangeAttractors;
      });
      
      // Count shared attractors between consecutive visits
      const recentVisits = detailedVisits.slice(-Math.min(10, detailedVisits.length));
      let sharedAttractorTransitions = 0;
      
      for (let i = 1; i < recentVisits.length; i++) {
        const prevNode = recentVisits[i-1].nodeId;
        const currNode = recentVisits[i].nodeId;
        
        const prevAttractors = nodeAttractors[prevNode] || [];
        const currAttractors = nodeAttractors[currNode] || [];
        
        const sharedAttractors = prevAttractors.filter(
          attractor => currAttractors.includes(attractor)
        );
        
        if (sharedAttractors.length > 0) {
          sharedAttractorTransitions++;
        }
      }
      
      const thematicContinuityRatio = sharedAttractorTransitions / (recentVisits.length - 1);
      
      if (thematicContinuityRatio >= 0.5) {
        patterns.push({
          type: 'thematic',
          strength: thematicContinuityRatio,
          description: 'Pattern of following thematic connections between nodes'
        });
      }
    }
    
    return patterns;
  }

  /**
   * Calculates the reader's engagement levels with different strange attractors
   */
  calculateAttractorEngagement(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): AttractorEngagement[] {
    const { path } = readerState;
    const attractorsEngaged = path.attractorsEngaged;
    const detailedVisits = path.detailedVisits || [];
    
    if (!attractorsEngaged || Object.keys(attractorsEngaged).length === 0) {
      return [];
    }
    
    // Create a map of strange attractors to their engagement metrics
    const attractorEngagements: AttractorEngagement[] = [];
    
    // Process each attractor that has been engaged
    Object.entries(attractorsEngaged).forEach(([attractorStr, totalEngagements]) => {
      const attractor = attractorStr as StrangeAttractor;
      
      if (totalEngagements === 0) {
        return;
      }
      
      // Find nodes related to this attractor
      const relatedNodes = Object.values(nodes)
        .filter(node => node.strangeAttractors.includes(attractor))
        .map(node => node.id);
      
      // Find visits where this attractor was engaged
      const engagementVisits = detailedVisits.filter(visit =>
        visit.engagedAttractors.includes(attractor));
      
      if (engagementVisits.length === 0) {
        return;
      }
      
      // Set default trend
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      
      // Simple trend calculation based on visit index rather than timestamp
      if (engagementVisits.length >= 3) {
        // Divide visits into first half and second half by visit index
        const midpoint = Math.floor(engagementVisits.length / 2);
        const firstHalf = engagementVisits.slice(0, midpoint);
        const secondHalf = engagementVisits.slice(midpoint);
        
        // Compare counts in first and second half to determine trend
        if (secondHalf.length > firstHalf.length * 1.2) {
          trend = 'rising';
        } else if (secondHalf.length < firstHalf.length * 0.8) {
          trend = 'falling';
        }
      }
      
      // Calculate engagement score (0-100)
      // Base on multiple factors:
      // 1. Total engagements relative to other attractors
      // 2. Recency of engagements
      // 3. Consistency of engagement over time
      
      // 1. Calculate relative engagement
      const totalAllAttractors = Object.values(attractorsEngaged)
        .reduce((sum, count) => sum + count, 0);
      
      const relativeEngagement = (totalEngagements / totalAllAttractors) * 100;
      
      // 2. Recency factor - using indices instead of timestamps
      // Check if the engagement appears in recent visits
      const recencyFactor = detailedVisits.indexOf(engagementVisits[engagementVisits.length - 1]) >
        detailedVisits.length * 0.7 ? 0.8 : 0.4;
      
      // 3. Consistency factor - simplified version
      const consistencyFactor = engagementVisits.length > totalEngagements * 0.5 ? 0.7 : 0.3;
      
      // Calculate final score
      const engagementScore = Math.min(100,
        (relativeEngagement * 0.6) +
        (recencyFactor * 20) +
        (consistencyFactor * 20));
      
      // Add to results
      attractorEngagements.push({
        attractor,
        engagementScore,
        totalEngagements,
        relatedNodes,
        trend
      });
    });
    
    // Sort by engagement score (descending)
    return attractorEngagements.sort((a, b) => b.engagementScore - a.engagementScore);
  }

  /**
   * Identifies the most significant patterns in the reader's journey
   */
  identifySignificantPatterns(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): ReadingPattern[] {
    // Get all patterns
    const allPatterns = this.analyzePathPatterns(readerState, nodes);
    
    // Sort by strength
    const sortedPatterns = allPatterns.sort((a, b) => b.strength - a.strength);
    
    // Return top patterns (max 5, with strength at least 0.6)
    return sortedPatterns
      .filter(pattern => pattern.strength >= 0.6)
      .slice(0, 5);
  }

  /**
   * Creates transformation conditions based on reader path patterns
   * to link with the TransformationEngine
   */
  createTransformationConditions(
    patterns: ReadingPattern[],
    attractorEngagements: AttractorEngagement[]
  ): PatternBasedCondition[] {
    const conditions: PatternBasedCondition[] = [];
    
    // Create conditions based on patterns
    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'sequence':
          if (pattern.relatedNodes && pattern.relatedNodes.length >= 2) {
            conditions.push({
              type: 'visitPattern',
              condition: {
                visitPattern: pattern.relatedNodes
              },
              strength: pattern.strength
            });
          }
          break;
          
        case 'character':
          if (pattern.relatedCharacters && pattern.relatedCharacters.length > 0) {
            // This would require adding character-based conditions to the TransformationEngine
            conditions.push({
              type: 'characterFocus',
              condition: {
                // Custom condition that would need to be implemented in TransformationEngine
                characters: pattern.relatedCharacters
              },
              strength: pattern.strength
            });
          }
          break;
          
        case 'temporal':
          if (pattern.relatedTemporalLayers && pattern.relatedTemporalLayers.length > 0) {
            conditions.push({
              type: 'temporalFocus',
              condition: {
                temporalPosition: pattern.relatedTemporalLayers[0]
              },
              strength: pattern.strength
            });
          }
          break;
          
        case 'rhythm':
          // Rhythm-based conditions removed (previously time-based)
          break;
          
        case 'thematic':
          if (pattern.relatedAttractors && pattern.relatedAttractors.length > 0) {
            conditions.push({
              type: 'attractorAffinity',
              condition: {
                strangeAttractorsEngaged: pattern.relatedAttractors
              },
              strength: pattern.strength
            });
          }
          break;
      }
    });
    
    // Create conditions based on attractor engagements
    attractorEngagements
      .filter(engagement => engagement.engagementScore >= 50)
      .forEach(engagement => {
        conditions.push({
          type: 'attractorEngagement',
          condition: {
            strangeAttractorsEngaged: [engagement.attractor]
          },
          strength: engagement.engagementScore / 100
        });
      });
    
    return conditions;
  }
}

// Export a singleton instance for use throughout the application
export const pathAnalyzer = new PathAnalyzer();