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
  firstEngagement: number; // timestamp
  lastEngagement: number; // timestamp
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
    minTimeSpentInNode?: number;
    totalReadingTime?: number;
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
    
    // 4. Analyze reading rhythm patterns
    patterns.push(...this.identifyReadingRhythmPatterns(readerState.path));
    
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
   * Identifies reading rhythm patterns in the reader's path
   */
  identifyReadingRhythmPatterns(path: ReadingPath): ReadingPattern[] {
    const patterns: ReadingPattern[] = [];
    const readingRhythm = path.readingRhythm;
    const detailedVisits = path.detailedVisits || [];
    
    if (!readingRhythm || detailedVisits.length < 3) {
      return patterns;
    }
    
    const transitions = path.transitions || [];
    const totalTransitions = transitions.length;
    if (totalTransitions === 0) {
      return patterns;
    }
    
    // Calculate fast transitions ratio using imported constant
    const fastTransitionsRatio = readingRhythm.fastTransitions / totalTransitions;
    // This uses transitions under FAST_TRANSITION_THRESHOLD (30000ms)
    
    // Calculate deep engagements ratio using imported constant
    const deepEngagementsRatio = readingRhythm.deepEngagements / detailedVisits.length;
    // This uses visits over DEEP_ENGAGEMENT_THRESHOLD (120000ms)
    
    // Check for skimming pattern (many fast transitions)
    if (fastTransitionsRatio >= 0.7) {
      patterns.push({
        type: 'rhythm',
        strength: fastTransitionsRatio,
        description: 'Fast skimming pattern with quick transitions between nodes'
      });
    }
    
    // Check for deep reading pattern (many long engagements)
    if (deepEngagementsRatio >= 0.3) {
      patterns.push({
        type: 'rhythm',
        strength: deepEngagementsRatio,
        description: 'Deep engagement pattern with extended time spent on nodes'
      });
    }
    
    // Check for inconsistent rhythm (mix of very fast and very slow)
    if (fastTransitionsRatio >= 0.4 && deepEngagementsRatio >= 0.2) {
      const inconsistencyStrength = Math.min(fastTransitionsRatio, deepEngagementsRatio) * 2;
      
      patterns.push({
        type: 'rhythm',
        strength: inconsistencyStrength,
        description: 'Inconsistent rhythm alternating between fast skimming and deep engagement'
      });
    }
    
    // Check for acceleration/deceleration patterns
    if (detailedVisits.length >= 5) {
      const durations = detailedVisits
        .filter(visit => visit.duration > 0)
        .map(visit => visit.duration);
      
      if (durations.length >= 5) {
        let accelerating = true;
        let decelerating = true;
        
        for (let i = 1; i < durations.length; i++) {
          if (durations[i] >= durations[i-1]) {
            accelerating = false;
          }
          if (durations[i] <= durations[i-1]) {
            decelerating = false;
          }
        }
        
        if (accelerating) {
          patterns.push({
            type: 'rhythm',
            strength: 0.8,
            description: 'Accelerating pattern with progressively shorter node visits'
          });
        } else if (decelerating) {
          patterns.push({
            type: 'rhythm',
            strength: 0.8,
            description: 'Decelerating pattern with progressively longer node visits'
          });
        }
      }
    }
    
    return patterns;
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
      
      // Get first and last engagement timestamps
      const firstEngagement = Math.min(...engagementVisits.map(v => v.timestamp));
      const lastEngagement = Math.max(...engagementVisits.map(v => v.timestamp));
      
      // Calculate engagement trend
      let trend: 'rising' | 'falling' | 'stable' = 'stable';
      
      if (engagementVisits.length >= 3) {
        // Divide visits into first half and second half
        const midpoint = Math.floor(engagementVisits.length / 2);
        const firstHalf = engagementVisits.slice(0, midpoint);
        const secondHalf = engagementVisits.slice(midpoint);
        
        // Calculate engagement density in each half
        const totalTimespan = lastEngagement - firstEngagement;
        if (totalTimespan > 0) {
          const firstHalfDensity = firstHalf.length /
            ((firstHalf[firstHalf.length-1].timestamp - firstHalf[0].timestamp) / totalTimespan);
          
          const secondHalfDensity = secondHalf.length /
            ((secondHalf[secondHalf.length-1].timestamp - secondHalf[0].timestamp) / totalTimespan);
          
          if (secondHalfDensity > firstHalfDensity * 1.2) {
            trend = 'rising';
          } else if (secondHalfDensity < firstHalfDensity * 0.8) {
            trend = 'falling';
          }
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
      
      // 2. Calculate recency factor
      const mostRecentTimestamp = Math.max(...detailedVisits.map(v => v.timestamp));
      const timeSinceLastEngagement = mostRecentTimestamp - lastEngagement;
      const recencyFactor = Math.max(0, 1 - (timeSinceLastEngagement /
        (mostRecentTimestamp - firstEngagement)));
      
      // 3. Calculate consistency
      // (Average time between engagements is not used but kept as a comment for future implementation)
      // const averageTimeBetweenEngagements = engagementVisits.length > 1 ?
      //   (lastEngagement - firstEngagement) / (engagementVisits.length - 1) : 0;
      
      const timeDiffs = [];
      for (let i = 1; i < engagementVisits.length; i++) {
        timeDiffs.push(engagementVisits[i].timestamp - engagementVisits[i-1].timestamp);
      }
      
      const consistencyFactor = timeDiffs.length > 0 ?
        1 - (Math.max(...timeDiffs) - Math.min(...timeDiffs)) /
          (mostRecentTimestamp - firstEngagement) : 0.5;
      
      // Calculate final score
      const engagementScore = Math.min(100,
        (relativeEngagement * 0.5) +
        (recencyFactor * 30) +
        (consistencyFactor * 20));
      
      // Add to results
      attractorEngagements.push({
        attractor,
        engagementScore,
        firstEngagement,
        lastEngagement,
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
          // Create conditions based on reading rhythm
          if (pattern.description.includes('fast')) {
            conditions.push({
              type: 'readingRhythm',
              condition: {
                minTimeSpentInNode: 0,  // No minimum
                totalReadingTime: 300000  // At least 5 minutes of reading
              },
              strength: pattern.strength
            });
          } else if (pattern.description.includes('deep')) {
            conditions.push({
              type: 'readingRhythm',
              condition: {
                minTimeSpentInNode: 60000  // At least 1 minute on current node
              },
              strength: pattern.strength
            });
          }
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