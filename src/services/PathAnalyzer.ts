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
 * Represents a recursive navigation pattern detected in the reader's journey
 */
export interface RecursivePattern {
  sequence: string[]; // The repeated sequence of node IDs
  length: number; // Length of the sequence (2-4)
  occurrences: number; // How many times this sequence appears
  lastOccurrenceIndex: number; // Index of the last occurrence in the path
  strength: number; // Pattern strength (0-1)
  temporalSpread: number; // How spread out temporally the occurrences are (0-1)
}

/**
 * Represents character focus intensity metrics
 */
export interface CharacterFocusIntensity {
  character: Character;
  visitRatio: number; // Percentage of total visits to this character's nodes
  intensity: number; // Focus intensity score (0-1)
  consecutiveVisits: number; // Longest streak of consecutive visits
  avgTimeBetweenVisits: number; // Average gap between visits to this character
  temporalSpread: TemporalLabel[]; // Which temporal layers this character's visits span
}

/**
 * Represents a strange attractor that frequently draws the reader back
 */
export interface StrangeAttractorNode {
  nodeId: string;
  returnFrequency: number; // How often the reader returns (0-1)
  totalReturns: number; // Number of times returned to
  averageGapBetweenReturns: number; // Average nodes visited between returns
  magneticStrength: number; // Overall attractiveness metric (0-1)
  attractorThemes: StrangeAttractor[]; // Which thematic attractors this node contains
  lastReturnIndex: number; // Index of most recent return
}

/**
 * Represents temporal jumping behavior patterns
 */
export interface TemporalJumpingPattern {
  totalJumps: number; // Total number of temporal layer transitions
  jumpFrequency: number; // Jumps per visit ratio
  preferredJumpDirection: 'forward' | 'backward' | 'mixed'; // Temporal preference
  jumpDistances: number[]; // Distribution of temporal distances (1-8)
  averageJumpDistance: number; // Average distance of temporal jumps
  maxJumpDistance: number; // Largest temporal jump made
  temporalAnchoring: Record<TemporalLabel, number>; // Time spent in each layer
  volatility: number; // How erratic the temporal movement is (0-1)
}

/**
 * Represents a unique fingerprint of the reader's navigation style
 */
export interface JourneyFingerprint {
  id: string; // Unique identifier for this fingerprint
  explorationStyle: 'linear' | 'recursive' | 'wandering' | 'focused' | 'chaotic';
  characterAffinity: Character[]; // Ranked list of character preferences
  temporalPreference: 'past-oriented' | 'present-focused' | 'future-seeking' | 'time-fluid';
  narrativeApproach: 'systematic' | 'intuitive' | 'thematic' | 'experimental';
  
  // Quantitative metrics
  recursiveIndex: number; // How recursive the navigation is (0-1)
  focusIndex: number; // How focused vs scattered (0-1)
  velocityIndex: number; // How quickly they move through content (0-1)
  complexityIndex: number; // How complex their path patterns are (0-1)
  
  // Pattern signatures
  dominantPatternLengths: number[]; // Most common sequence lengths
  characterTransitionMatrix: Record<Character, Record<Character, number>>; // Character switching patterns
  temporalJumpSignature: Record<string, number>; // Characteristic temporal movement pattern
  attractorEngagementProfile: Record<string, number>; // Thematic engagement fingerprint
  
  // Metadata
  pathLength: number; // Total nodes visited
  uniqueNodesVisited: number; // Number of distinct nodes
  generatedAt: number; // Index in path when fingerprint was generated
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
        const strength = this.calculateSequencePatternStrength(
          sequenceLength,
          this.countSequenceOccurrences(sequence, path.sequence),
          path.sequence.length
        );
        
        // Only add significant patterns
        if (this.countSequenceOccurrences(sequence, path.sequence) >= this.SEQUENCE_REPETITION_THRESHOLD) {
          patterns.push({
            type: 'sequence',
            strength,
            description: `Repeated sequence of ${sequenceLength} nodes visited ${this.countSequenceOccurrences(sequence, path.sequence)} times`,
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
        const strength = this.calculateCharacterFocusStrength(ratio);
        
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
      const oscillationPattern = this.detectCharacterOscillation(characterSequence);
      if (oscillationPattern) {
        patterns.push(oscillationPattern);
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
      
      // Check for chronological progression (past -> present -> future)
      const chronologicalPattern = this.detectChronologicalProgression(temporalSequence);
      if (chronologicalPattern) {
        patterns.push(chronologicalPattern);
      }
      
      // Check for reverse chronological progression (future -> present -> past)
      const reverseChronologicalPattern = this.detectReverseChronologicalProgression(temporalSequence);
      if (reverseChronologicalPattern) {
        patterns.push(reverseChronologicalPattern);
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
      const thematicContinuity = this.calculateThematicContinuity(detailedVisits, nodeAttractors);
      
      if (thematicContinuity >= 0.5) {
        patterns.push({
          type: 'thematic',
          strength: thematicContinuity,
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
      trend = this.determineEngagementTrend(engagementVisits);
      
      // Calculate engagement score (0-100)
      // Base on multiple factors:
      // 1. Total engagements relative to other attractors
      // 2. Recency of engagements
      // 3. Consistency of engagement over time
      
      // 1. Calculate relative engagement
      const totalAllAttractors = Object.values(attractorsEngaged)
        .reduce((sum, count) => sum + count, 0);
      
      // 2. Recency factor - using indices instead of timestamps
      // Check if the engagement appears in recent visits
      const engagementScore = this.calculateEngagementScore(
        totalEngagements,
        totalAllAttractors,
        engagementVisits,
        detailedVisits
      );
      
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
  }  /**
   * Detects repeated navigation sequences of length 2-4
   * @param readerState Current reader state with path information
   * @param nodes Map of node IDs to node states (for future extensibility)
   * @returns Array of detected recursive patterns
   */  
  analyzeRecursivePatterns(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): RecursivePattern[] {
    const { sequence } = readerState.path;
    const patterns: RecursivePattern[] = [];
    
    if (sequence.length < 4) {
      return patterns; // Need at least 4 nodes to detect patterns of length 2
    }
    
    // Check for patterns of length 2-4
    for (let patternLength = 2; patternLength <= 4; patternLength++) {
      const lengthPatterns = this.processRecursivePatternsForLength(sequence, patternLength, nodes);
      patterns.push(...lengthPatterns);
    }
    
    // Sort by strength (strongest patterns first)
    return patterns.sort((a, b) => b.strength - a.strength);
  }
  /**
   * Measures how concentrated visits are on specific characters
   * @param readerState Current reader state with path information
   * @param nodes Map of node IDs to node states
   * @returns Array of character focus intensity metrics
   */
  calculateCharacterFocusIntensity(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): CharacterFocusIntensity[] {
    const { sequence, characterFocus = {} } = readerState.path;
    const intensities: CharacterFocusIntensity[] = [];
    
    if (sequence.length === 0) {
      return intensities;
    }
    
    // Calculate character visit patterns
    const characterSequence: Character[] = sequence.map(nodeId => nodes[nodeId]?.character).filter((char): char is Character => Boolean(char));
    const totalVisits = characterSequence.length;
    
    Object.keys(characterFocus).forEach(char => {
      const character = char as Character;
      const visitCount = (characterFocus as Record<Character, number>)[character];
      
      if (visitCount > 0) {
        // Calculate visit ratio
        const visitRatio = visitCount / totalVisits;
        
        // Find longest consecutive streak
        const longestStreak = this.calculateCharacterStreak(characterSequence, character);
        
        // Calculate average time between visits
        const avgTimeBetweenVisits = this.calculateAvgTimeBetweenVisits(characterSequence, character);
        
        // Determine temporal spread
        const temporalSpread = this.determineCharacterTemporalSpread(character, sequence, nodes);
        
        // Calculate intensity (combination of visit ratio, streak length, and temporal spread)
        const intensity = this.calculateCharacterIntensityScore(visitRatio, longestStreak, temporalSpread.length);
        
        intensities.push({
          character,
          visitRatio,
          intensity,
          consecutiveVisits: longestStreak,
          avgTimeBetweenVisits,
          temporalSpread: temporalSpread as TemporalLabel[]
        });
      }
    });
    
    // Sort by intensity (highest first)
    return intensities.sort((a, b) => b.intensity - a.intensity);
  }
  /**
   * Identifies nodes the reader returns to frequently
   * @param readerState Current reader state with path information
   * @param nodes Map of node IDs to node states
   * @returns Array of strange attractor nodes
   */
  detectStrangeAttractors(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): StrangeAttractorNode[] {
    const { sequence, revisitPatterns } = readerState.path;
    const attractors: StrangeAttractorNode[] = [];
    
    if (sequence.length < 3) {
      return attractors; // Need enough visits to detect return patterns
    }
    
    // Analyze each node that has been revisited
    Object.entries(revisitPatterns).forEach(([nodeId, totalVisits]) => {
      const attractor = this.processStrangeAttractorNode(nodeId, totalVisits, sequence, nodes);
      if (attractor) {
        attractors.push(attractor);
      }
    });
    
    // Sort by magnetic strength (strongest attractors first)
    return attractors.sort((a, b) => b.magneticStrength - a.magneticStrength);
  }

  /**
   * Tracks movement between temporal layers
   * @param readerState Current reader state with path information
   * @param nodes Map of node IDs to node states
   * @returns Temporal jumping pattern analysis
   */
  analyzeTemporalJumping(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): TemporalJumpingPattern {
    const { sequence, temporalLayerFocus = {} } = readerState.path;
    
    if (sequence.length < 2) {
      return {
        totalJumps: 0,
        jumpFrequency: 0,
        preferredJumpDirection: 'mixed',
        jumpDistances: [],
        averageJumpDistance: 0,
        maxJumpDistance: 0,
        temporalAnchoring: { past: 0, present: 0, future: 0 },
        volatility: 0
      };
    }
    
    // Build temporal sequence
    const temporalSequence = sequence.map(nodeId => {
      const node = nodes[nodeId];
      return node ? node.temporalValue : 0;
    }).filter(val => val > 0);
    
    // Calculate jumps
    const jumps: number[] = [];
    const jumpDirections: ('forward' | 'backward')[] = [];
    
    for (let i = 1; i < temporalSequence.length; i++) {
      const prevTemporal = temporalSequence[i - 1];
      const currTemporal = temporalSequence[i];
      const jumpDistance = Math.abs(currTemporal - prevTemporal);
      
      if (jumpDistance > 0) {
        jumps.push(jumpDistance);
        jumpDirections.push(currTemporal > prevTemporal ? 'forward' : 'backward');
      }
    }
    
    // Calculate metrics
    const totalJumps = jumps.length;
    const jumpFrequency = totalJumps / sequence.length;
    const averageJumpDistance = jumps.length > 0 ? jumps.reduce((sum, dist) => sum + dist, 0) / jumps.length : 0;
    const maxJumpDistance = jumps.length > 0 ? Math.max(...jumps) : 0;
    
    // Determine preferred direction
    const forwardJumps = jumpDirections.filter(dir => dir === 'forward').length;
    const backwardJumps = jumpDirections.filter(dir => dir === 'backward').length;
    let preferredJumpDirection: 'forward' | 'backward' | 'mixed' = 'mixed';
    
    if (forwardJumps > backwardJumps * 1.5) {
      preferredJumpDirection = 'forward';
    } else if (backwardJumps > forwardJumps * 1.5) {
      preferredJumpDirection = 'backward';
    }
      // Calculate temporal anchoring (normalize focus values)
    const temporalLayerFocusTyped = temporalLayerFocus as Record<TemporalLabel, number>;
    const totalTemporalVisits = Object.values(temporalLayerFocusTyped).reduce((sum: number, count: number) => sum + count, 0);
    const temporalAnchoring = {
      past: totalTemporalVisits > 0 ? (temporalLayerFocusTyped.past || 0) / totalTemporalVisits : 0,
      present: totalTemporalVisits > 0 ? (temporalLayerFocusTyped.present || 0) / totalTemporalVisits : 0,
      future: totalTemporalVisits > 0 ? (temporalLayerFocusTyped.future || 0) / totalTemporalVisits : 0
    };
    
    // Calculate volatility (how erratic the temporal movement is)
    let volatility = 0;
    if (jumps.length > 1) {
      const jumpVariance = jumps.reduce((sum, jump) => {
        const deviation = jump - averageJumpDistance;
        return sum + (deviation * deviation);
      }, 0) / jumps.length;
      volatility = Math.min(1, Math.sqrt(jumpVariance) / 4); // Normalize to 0-1 scale
    }
    
    return {
      totalJumps,
      jumpFrequency,
      preferredJumpDirection,
      jumpDistances: jumps,
      averageJumpDistance,
      maxJumpDistance,
      temporalAnchoring,
      volatility
    };
  }
  /**
   * Creates a unique signature for the reader's navigation style
   * @param readerState Current reader state with path information
   * @param nodes Map of node IDs to node states
   * @returns Journey fingerprint with comprehensive navigation metrics
   */
  generateJourneyFingerprint(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): JourneyFingerprint {
    const { sequence, attractorsEngaged = {} } = readerState.path;
    
    // Get all analysis results
    const recursivePatterns = this.analyzeRecursivePatterns(readerState, nodes);
    const characterIntensities = this.calculateCharacterFocusIntensity(readerState, nodes);
    const strangeAttractors = this.detectStrangeAttractors(readerState, nodes);
    const temporalJumping = this.analyzeTemporalJumping(readerState, nodes);
    
    // Calculate core indices
    const { recursiveIndex, focusIndex, velocityIndex, complexityIndex } = this.calculateJourneyIndices(
      recursivePatterns,
      characterIntensities,
      temporalJumping,
      strangeAttractors
    );
    
    // Determine exploration style
    let explorationStyle: 'linear' | 'recursive' | 'wandering' | 'focused' | 'chaotic' = 'linear';
    explorationStyle = this.determineExplorationStyle(complexityIndex, recursiveIndex, focusIndex, temporalJumping.volatility);
    
    // Determine character affinity (ranked)
    const characterAffinity = characterIntensities
      .sort((a, b) => b.intensity - a.intensity)
      .map(ci => ci.character);
    
    // Determine temporal preference
    const { temporalAnchoring } = temporalJumping;
    let temporalPreference: 'past-oriented' | 'present-focused' | 'future-seeking' | 'time-fluid' = 'time-fluid';
    temporalPreference = this.determineTemporalPreference(temporalAnchoring);
    
    // Determine narrative approach
    let narrativeApproach: 'systematic' | 'intuitive' | 'thematic' | 'experimental' = 'intuitive';
    narrativeApproach = this.determineNarrativeApproach(
      explorationStyle,
      temporalJumping.volatility,
      Object.keys(attractorsEngaged).length,
      (Object.values(attractorsEngaged) as number[]).reduce((sum, count) => sum + count, 0),
      sequence.length
    );
    
    // Extract dominant pattern lengths
    const dominantPatternLengths = recursivePatterns
      .slice(0, 3) // Top 3 patterns
      .map(pattern => pattern.length);
    
    // Build character transition matrix
    const characterTransitionMatrix: Record<Character, Record<Character, number>> = this.buildCharacterTransitionMatrix(sequence, nodes);
    
    // Create temporal jump signature (distribution of jump distances)
    const temporalJumpSignature = this.createTemporalJumpSignature(temporalJumping.jumpDistances);
    
    // Normalize attractor engagement profile
    const attractorEngagementProfile = this.createAttractorEngagementProfile(attractorsEngaged);
    
    // Generate unique ID based on path characteristics
    const id = this.generateFingerprintId(
      sequence,
      explorationStyle,
      temporalPreference,
      narrativeApproach,
      recursiveIndex,
      focusIndex,
      velocityIndex,
      complexityIndex
    );
    
    return {
      id,
      explorationStyle,
      characterAffinity,
      temporalPreference,
      narrativeApproach,
      recursiveIndex,
      focusIndex,
      velocityIndex,
      complexityIndex,
      dominantPatternLengths,
      characterTransitionMatrix,
      temporalJumpSignature,
      attractorEngagementProfile,
      pathLength: sequence.length,
      uniqueNodesVisited: new Set(sequence).size,
      generatedAt: sequence.length
    };
  }

  // Helper functions to reduce cognitive complexity

  /**
   * Calculates pattern strength based on sequence length and occurrences
   */
  private calculateSequencePatternStrength(
    sequenceLength: number,
    occurrences: number,
    totalPathLength: number
  ): number {
    const maxPossibleLength = Math.floor(totalPathLength / 2);
    const lengthFactor = sequenceLength / maxPossibleLength;
    
    const maxPossibleOccurrences = Math.floor(totalPathLength / sequenceLength);
    const repetitionFactor = Math.min(1, occurrences / maxPossibleOccurrences);
    
    return (lengthFactor * 0.4) + (repetitionFactor * 0.6);
  }

  /**
   * Counts occurrences of a sequence in a path
   */
  private countSequenceOccurrences(sequence: string[], path: string[]): number {
    let occurrences = 0;
    const sequenceLength = sequence.length;
    
    for (let i = 0; i <= path.length - sequenceLength; i++) {
      const potentialMatch = path.slice(i, i + sequenceLength);
      if (potentialMatch.every((id, idx) => id === sequence[idx])) {
        occurrences++;
      }
    }
    
    return occurrences;
  }

  /**
   * Calculates character focus strength above threshold
   */
  private calculateCharacterFocusStrength(ratio: number): number {
    const strengthAboveThreshold = (ratio - this.CHARACTER_FOCUS_THRESHOLD) /
      (1 - this.CHARACTER_FOCUS_THRESHOLD);
    return 0.5 + (0.5 * strengthAboveThreshold);
  }

  /**
   * Detects character oscillation patterns
   */
  private detectCharacterOscillation(characterSequence: Character[]): ReadingPattern | null {
    if (characterSequence.length < 4) return null;
    
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
      return {
        type: 'character',
        strength: oscillationRatio,
        description: 'Pattern of alternating between character perspectives',
        relatedCharacters: Array.from(new Set(characterSequence))
      };
    }
    
    return null;
  }

  /**
   * Detects chronological progression patterns in temporal sequences
   */
  private detectChronologicalProgression(temporalSequence: TemporalLabel[]): ReadingPattern | null {
    if (temporalSequence.length < 5) return null;
    
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
      return {
        type: 'temporal',
        strength: progressionRatio,
        description: 'Pattern of chronological progression through time',
        relatedTemporalLayers: ['past', 'present', 'future']
      };
    }
    
    return null;
  }

  /**
   * Detects reverse chronological progression patterns
   */
  private detectReverseChronologicalProgression(temporalSequence: TemporalLabel[]): ReadingPattern | null {
    if (temporalSequence.length < 5) return null;
    
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
    
    const maxPossibleProgressions = temporalSequence.length - 2;
    const reverseProgressionRatio = reverseChronologicalCount / maxPossibleProgressions;
    
    if (reverseProgressionRatio >= 0.3) {
      return {
        type: 'temporal',
        strength: reverseProgressionRatio,
        description: 'Pattern of reverse chronological movement through time',
        relatedTemporalLayers: ['future', 'present', 'past']
      };
    }
    
    return null;
  }
  /**
   * Calculates thematic continuity between consecutive visits
   */
  private calculateThematicContinuity(
    detailedVisits: Array<{ nodeId: string; engagedAttractors: StrangeAttractor[] }>,
    nodeAttractors: Record<string, StrangeAttractor[]>
  ): number {
    if (detailedVisits.length < 3) return 0;
    
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
    
    return sharedAttractorTransitions / (recentVisits.length - 1);
  }
  /**
   * Calculates engagement score for an attractor
   */
  private calculateEngagementScore(
    totalEngagements: number,
    totalAllAttractors: number,
    engagementVisits: Array<{ nodeId: string; engagedAttractors: StrangeAttractor[] }>,
    detailedVisits: Array<{ nodeId: string; engagedAttractors: StrangeAttractor[] }>
  ): number {
    // Base on multiple factors:
    // 1. Total engagements relative to other attractors
    const relativeEngagement = (totalEngagements / totalAllAttractors) * 100;
    
    // 2. Recency factor - using indices instead of timestamps
    const recencyFactor = detailedVisits.indexOf(engagementVisits[engagementVisits.length - 1]) >
      detailedVisits.length * 0.7 ? 0.8 : 0.4;
    
    // 3. Consistency factor - simplified version
    const consistencyFactor = engagementVisits.length > totalEngagements * 0.5 ? 0.7 : 0.3;
    
    // Calculate final score
    return Math.min(100,
      (relativeEngagement * 0.6) +
      (recencyFactor * 20) +
      (consistencyFactor * 20));
  }
  /**
   * Determines engagement trend based on visit distribution
   */
  private determineEngagementTrend(engagementVisits: Array<{ nodeId: string; engagedAttractors: StrangeAttractor[] }>): 'rising' | 'falling' | 'stable' {
    if (engagementVisits.length < 3) return 'stable';
    
    const midpoint = Math.floor(engagementVisits.length / 2);
    const firstHalf = engagementVisits.slice(0, midpoint);
    const secondHalf = engagementVisits.slice(midpoint);
    
    if (secondHalf.length > firstHalf.length * 1.2) {
      return 'rising';
    } else if (secondHalf.length < firstHalf.length * 0.8) {
      return 'falling';
    }
    
    return 'stable';
  }

  /**
   * Helper function to calculate pattern metrics for recursive patterns
   */
  private calculateRecursivePatternMetrics(
    pattern: RecursivePattern,
    sequence: string[],
    patternLength: number
  ): void {
    // Calculate pattern strength based on frequency and recency
    const frequencyFactor = Math.min(1, pattern.occurrences / (sequence.length / patternLength));
    const recencyFactor = 1 - ((sequence.length - pattern.lastOccurrenceIndex) / sequence.length);
    pattern.strength = (frequencyFactor * 0.7) + (recencyFactor * 0.3);
    
    // Calculate temporal spread
    pattern.temporalSpread = this.calculateTemporalSpread(pattern, sequence, patternLength);
  }

  /**
   * Helper function to calculate temporal spread for a recursive pattern
   */
  private calculateTemporalSpread(
    pattern: RecursivePattern,
    sequence: string[],
    patternLength: number
  ): number {
    const occurrenceIndices: number[] = [];
    
    for (let i = 0; i <= sequence.length - patternLength; i++) {
      const subSeq = sequence.slice(i, i + patternLength);
      if (subSeq.every((nodeId, idx) => nodeId === pattern.sequence[idx])) {
        occurrenceIndices.push(i);
      }
    }
    
    if (occurrenceIndices.length <= 1) {
      return 0;
    }
    
    const gaps = occurrenceIndices.slice(1).map((idx, i) => idx - occurrenceIndices[i]);
    const avgGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const maxPossibleGap = sequence.length / occurrenceIndices.length;
    
    return Math.min(1, avgGap / maxPossibleGap);
  }

  /**
   * Helper function to process recursive patterns for a specific length
   */
  private processRecursivePatternsForLength(
    sequence: string[],
    patternLength: number,
    nodes: Record<string, NodeState>
  ): RecursivePattern[] {
    const foundPatterns = new Map<string, RecursivePattern>();
    const patterns: RecursivePattern[] = [];
    
    // Extract all possible sequences of this length
    for (let i = 0; i <= sequence.length - patternLength; i++) {
      const subSequence = sequence.slice(i, i + patternLength);
      const patternKey = subSequence.join('->');
      
      if (!foundPatterns.has(patternKey)) {
        foundPatterns.set(patternKey, {
          sequence: subSequence,
          length: patternLength,
          occurrences: 0,
          lastOccurrenceIndex: i,
          strength: 0,
          temporalSpread: 0
        });
      }
      
      const pattern = foundPatterns.get(patternKey)!;
      pattern.occurrences++;
      pattern.lastOccurrenceIndex = Math.max(pattern.lastOccurrenceIndex, i);
    }
    
    // Filter patterns that occur at least twice and calculate metrics
    foundPatterns.forEach(pattern => {
      if (pattern.occurrences >= 2) {
        this.calculateRecursivePatternMetrics(pattern, sequence, patternLength);
        
        // Enhance pattern with node metadata for richer analysis
        this.validatePatternNodes(pattern, nodes);
        
        patterns.push(pattern);
      }
    });
    
    return patterns;
  }

  /**
   * Helper function to validate pattern nodes
   */
  private validatePatternNodes(pattern: RecursivePattern, nodes: Record<string, NodeState>): void {
    const patternNodes = pattern.sequence.map(nodeId => nodes[nodeId]).filter(Boolean);
    if (patternNodes.length > 0) {
      // Future enhancement: Could analyze character transitions, temporal jumps, attractor themes within pattern
      // For now, ensure nodes parameter is used to avoid warnings
      const hasValidNodes = patternNodes.length === pattern.sequence.length;
      if (!hasValidNodes) {
        console.warn(`Pattern contains invalid node references: ${pattern.sequence}`);
      }
    }
  }

  /**
   * Helper function to calculate character visit streak
   */
  private calculateCharacterStreak(characterSequence: Character[], character: Character): number {
    let longestStreak = 0;
    let currentStreak = 0;
    
    characterSequence.forEach(visitedChar => {
      if (visitedChar === character) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    });
    
    return longestStreak;
  }

  /**
   * Helper function to calculate average time between character visits
   */
  private calculateAvgTimeBetweenVisits(characterSequence: Character[], character: Character): number {
    const characterVisitIndices = characterSequence
      .map((char, idx) => char === character ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (characterVisitIndices.length <= 1) {
      return 0;
    }
    
    const gaps = characterVisitIndices.slice(1).map((idx, i) => idx - characterVisitIndices[i]);
    return gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  }

  /**
   * Helper function to determine temporal spread for a character
   */
  private determineCharacterTemporalSpread(
    character: Character,
    sequence: string[],
    nodes: Record<string, NodeState>
  ): TemporalLabel[] {
    const characterNodeIds = Object.keys(nodes).filter(nodeId => nodes[nodeId].character === character);
    const visitedCharacterNodes = sequence.filter(nodeId => characterNodeIds.includes(nodeId));
    
    return [...new Set(visitedCharacterNodes.map(nodeId => {
      const temporalValue = nodes[nodeId].temporalValue;
      if (temporalValue <= 3) return 'past';
      if (temporalValue <= 6) return 'present';
      return 'future';
    }))];
  }

  /**
   * Helper function to calculate character focus intensity score
   */
  private calculateCharacterIntensityScore(
    visitRatio: number,
    longestStreak: number,
    temporalSpreadLength: number
  ): number {
    const visitRatioFactor = Math.min(1, visitRatio * 2); // Cap at 1, but weight heavily
    const streakFactor = Math.min(1, longestStreak / 5); // Normalize streak to 5 visits
    const spreadFactor = temporalSpreadLength / 3; // 0-1 based on temporal coverage
    
    return (visitRatioFactor * 0.5) + (streakFactor * 0.3) + (spreadFactor * 0.2);
  }

  /**
   * Helper function to calculate magnetic strength for strange attractors
   */
  private calculateMagneticStrength(
    returnFrequency: number,
    gaps: number[],
    sequence: string[],
    visitIndices: number[]
  ): number {
    const frequencyFactor = Math.min(1, returnFrequency * 10); // Weight frequency highly
    const consistencyFactor = gaps.length > 0 ? 
      1 - (Math.max(...gaps) - Math.min(...gaps)) / Math.max(...gaps) : 0; // How consistent are the gaps
    const recencyFactor = 1 - ((sequence.length - Math.max(...visitIndices)) / sequence.length); // How recent was the last return
    
    return (frequencyFactor * 0.5) + (consistencyFactor * 0.3) + (recencyFactor * 0.2);
  }

  /**
   * Helper function to calculate visit gaps for a node
   */
  private calculateVisitGaps(visitIndices: number[]): number[] {
    return visitIndices.slice(1).map((idx, i) => idx - visitIndices[i]);
  }

  /**
   * Helper function to process a single strange attractor node
   */
  private processStrangeAttractorNode(
    nodeId: string,
    totalVisits: number,
    sequence: string[],
    nodes: Record<string, NodeState>
  ): StrangeAttractorNode | null {
    if (totalVisits <= 1) return null;
    
    const returnCount = totalVisits - 1;
    
    // Find all visit indices for this node
    const visitIndices = sequence
      .map((id, idx) => id === nodeId ? idx : -1)
      .filter(idx => idx !== -1);
    
    if (visitIndices.length <= 1) return null;
    
    // Calculate metrics
    const returnFrequency = returnCount / sequence.length;
    const gaps = this.calculateVisitGaps(visitIndices);
    const averageGap = gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
    const magneticStrength = this.calculateMagneticStrength(returnFrequency, gaps, sequence, visitIndices);
    
    // Get node's strange attractors
    const nodeData = nodes[nodeId];
    const attractorThemes = nodeData ? nodeData.strangeAttractors : [];
    
    return {
      nodeId,
      returnFrequency,
      totalReturns: returnCount,
      averageGapBetweenReturns: averageGap,
      magneticStrength,
      attractorThemes,
      lastReturnIndex: Math.max(...visitIndices)
    };
  }

  /**
   * Calculates core journey indices
   */  private calculateJourneyIndices(
    recursivePatterns: RecursivePattern[],
    characterIntensities: CharacterFocusIntensity[],
    temporalJumping: TemporalJumpingPattern,
    strangeAttractors: StrangeAttractorNode[]
  ): { recursiveIndex: number; focusIndex: number; velocityIndex: number; complexityIndex: number } {
    // Recursive index: How much the reader repeats patterns
    const recursiveIndex = recursivePatterns.length > 0 ?
      recursivePatterns.reduce((sum, pattern) => sum + pattern.strength, 0) / recursivePatterns.length : 0;
    
    // Focus index: How concentrated character focus is
    const focusIndex = characterIntensities.length > 0 ?
      characterIntensities[0]?.intensity || 0 : 0;
    
    // Velocity index: How fast temporal movement is
    const velocityIndex = Math.min(1, temporalJumping.averageJumpDistance / 5);
    
    // Complexity index: Overall navigation complexity
    const complexityIndex = (recursiveIndex * 0.3) + (focusIndex * 0.3) + 
      (temporalJumping.volatility * 0.2) + (Math.min(1, strangeAttractors.length / 5) * 0.2);
    
    return { recursiveIndex, focusIndex, velocityIndex, complexityIndex };
  }

  /**
   * Determines exploration style based on indices
   */
  private determineExplorationStyle(
    complexityIndex: number,
    recursiveIndex: number,
    focusIndex: number,
    volatility: number
  ): 'linear' | 'recursive' | 'wandering' | 'focused' | 'chaotic' {
    if (volatility > 0.7) return 'chaotic';
    if (recursiveIndex > 0.6) return 'recursive';
    if (focusIndex > 0.7) return 'focused';
    if (complexityIndex < 0.3) return 'linear';
    return 'wandering';
  }

  /**
   * Determines temporal preference based on anchoring
   */
  private determineTemporalPreference(
    temporalAnchoring: { past: number; present: number; future: number }
  ): 'past-oriented' | 'present-focused' | 'future-seeking' | 'time-fluid' {
    const max = Math.max(temporalAnchoring.past, temporalAnchoring.present, temporalAnchoring.future);
    
    if (max < 0.4) return 'time-fluid';
    
    if (temporalAnchoring.past === max) return 'past-oriented';
    if (temporalAnchoring.present === max) return 'present-focused';
    return 'future-seeking';
  }

  /**
   * Determines narrative approach based on exploration patterns
   */
  private determineNarrativeApproach(
    explorationStyle: string,
    volatility: number,
    attractorCount: number,
    totalAttractorEngagement: number,
    pathLength: number
  ): 'systematic' | 'intuitive' | 'thematic' | 'experimental' {
    if (explorationStyle === 'linear' && volatility < 0.3) return 'systematic';
    if (attractorCount > 3 && totalAttractorEngagement / pathLength > 0.3) return 'thematic';
    if (volatility > 0.6 || explorationStyle === 'chaotic') return 'experimental';
    return 'intuitive';
  }

  /**
   * Builds character transition matrix
   */
  private buildCharacterTransitionMatrix(
    sequence: string[],
    nodes: Record<string, NodeState>
  ): Record<Character, Record<Character, number>> {
    const matrix: Record<Character, Record<Character, number>> = {} as Record<Character, Record<Character, number>>;
    const characters = ['human', 'algo', 'arch'] as const;
    
    // Initialize matrix
    characters.forEach(from => {
      matrix[from as Character] = {} as Record<Character, number>;
      characters.forEach(to => {
        matrix[from as Character][to as Character] = 0;
      });
    });
    
    // Build transitions
    for (let i = 1; i < sequence.length; i++) {
      const prevNode = nodes[sequence[i - 1]];
      const currNode = nodes[sequence[i]];
      
      if (prevNode && currNode) {
        const prevChar = prevNode.character;
        const currChar = currNode.character;
        if (prevChar && currChar) {
          matrix[prevChar][currChar]++;
        }
      }
    }
    
    return matrix;
  }

  /**
   * Creates temporal jump signature
   */
  private createTemporalJumpSignature(jumpDistances: number[]): Record<string, number> {
    const signature: Record<string, number> = {
      small: 0, // 0-1
      medium: 0, // 2-3
      large: 0, // 4-5
      extreme: 0 // 6+
    };
    
    jumpDistances.forEach(distance => {
      if (distance <= 1) signature.small++;
      else if (distance <= 3) signature.medium++;
      else if (distance <= 5) signature.large++;
      else signature.extreme++;
    });
    
    // Normalize
    const total = jumpDistances.length;
    if (total > 0) {
      Object.keys(signature).forEach(key => {
        signature[key] = signature[key] / total;
      });
    }
    
    return signature;
  }

  /**
   * Creates attractor engagement profile
   */
  private createAttractorEngagementProfile(
    attractorsEngaged: Record<string, number>
  ): Record<string, number> {
    const total = Object.values(attractorsEngaged).reduce((sum, count) => sum + count, 0);
    const profile: Record<string, number> = {};
    
    if (total > 0) {
      Object.entries(attractorsEngaged).forEach(([attractor, count]) => {
        profile[attractor] = count / total;
      });
    }
    
    return profile;
  }

  /**
   * Generates unique fingerprint ID
   */
  private generateFingerprintId(
    sequence: string[],
    explorationStyle: string,
    temporalPreference: string,
    narrativeApproach: string,
    recursiveIndex: number,
    focusIndex: number,
    velocityIndex: number,
    complexityIndex: number
  ): string {
    const pathHash = sequence.slice(0, 10).join('').slice(0, 8);
    const styleCode = explorationStyle.slice(0, 2);
    const temporalCode = temporalPreference.slice(0, 2);
    const narrativeCode = narrativeApproach.slice(0, 2);
    const indexCode = Math.floor(recursiveIndex * 10).toString() +
      Math.floor(focusIndex * 10).toString() +
      Math.floor(velocityIndex * 10).toString() +
      Math.floor(complexityIndex * 10).toString();
    
    return `${pathHash}-${styleCode}${temporalCode}${narrativeCode}-${indexCode}`;
  }
}

// Export a singleton instance for use throughout the application
export const pathAnalyzer = new PathAnalyzer();