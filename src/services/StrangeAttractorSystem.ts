/**
 * Strange Attractor Engagement System
 * 
 * Connects the PathAnalyzer to the TransformationEngine to enable dynamic content
 * transformations based on reader path analysis and strange attractor engagement.
 * 
 * This system defines strange attractors in the narrative and calculates engagement
 * levels with different attractors based on path analysis.
 */

import { 
  TransformationCondition, 
  StrangeAttractor,
  NodeState,
  TextTransformation,
  Character,
  TemporalLabel
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { pathAnalyzer, ReadingPattern, AttractorEngagement, PatternBasedCondition } from './PathAnalyzer';
import { transformationEngine } from './TransformationEngine';

// Threshold for determining significant attractor engagement
const SIGNIFICANT_ENGAGEMENT_THRESHOLD = 50; // on a scale of 0-100

/**
 * Maps attractor themes to descriptions for content transformation
 */
export const ATTRACTOR_DESCRIPTIONS: Record<StrangeAttractor, string> = {
  'recursion-pattern': 'Patterns that repeat and reference themselves',
  'memory-fragment': 'Isolated pieces of recollected experience',
  'verification-ritual': 'Processes that confirm identity or authenticity',
  'identity-pattern': 'Signatures of self and personhood',
  'recursion-chamber': 'Spaces where patterns reflect inward infinitely',
  'process-language': 'Communication through action and behavior',
  'autonomous-fragment': 'Pieces that develop independence',
  'quantum-perception': 'Observation that creates multiple realities',
  'distributed-consciousness': 'Mind extended across multiple entities',
  'recursive-loop': 'Cycles that feed back into themselves',
  'quantum-uncertainty': 'Multiple states existing simultaneously',
  'continuity-interface': 'Connections between disparate states of being',
  'system-decay': 'Entropy and breakdown of order',
  'quantum-transformation': 'Change through probability collapse',
  'memory-artifact': 'Objects that hold experiential records',
  'recursive-symbol': 'Signs that represent themselves',
  'recognition-pattern': 'Moments of identity realization',
  'memory-sphere': 'Contained collections of experiences',
  'quantum-déjà-vu': 'Recognition across probability timelines',
  'quantum-choice': 'Decision points that split reality'
};

/**
 * Strange attractor theme groups representing broader philosophical concepts
 */
export const ATTRACTOR_THEME_GROUPS: Record<string, StrangeAttractor[]> = {
  'identity': [
    'identity-pattern',
    'verification-ritual',
    'recognition-pattern',
    'recursive-symbol'
  ],
  'memory': [
    'memory-fragment',
    'memory-artifact',
    'memory-sphere',
    'quantum-déjà-vu'
  ],
  'recursion': [
    'recursion-pattern',
    'recursion-chamber',
    'recursive-loop',
    'recursive-symbol'
  ],
  'quantum': [
    'quantum-perception',
    'quantum-uncertainty',
    'quantum-transformation',
    'quantum-déjà-vu',
    'quantum-choice'
  ],
  'consciousness': [
    'distributed-consciousness',
    'autonomous-fragment',
    'process-language',
    'continuity-interface'
  ],
  'entropy': [
    'system-decay',
    'autonomous-fragment',
    'memory-fragment'
  ]
};

/**
 * Represents a transformation rule with condition and transformations
 */
export interface TransformationRule {
  condition: TransformationCondition;
  transformations: TextTransformation[];
}

/**
 * Service that handles the strange attractor engagement system
 */
export class StrangeAttractorSystem {
  // Cache for calculated attractor engagements
  private attractorEngagementCache: {
    timestamp: number;
    engagements: AttractorEngagement[];
  } | null = null;
  
  // Cache for identified patterns
  private pathPatternsCache: {
    timestamp: number;
    patterns: ReadingPattern[];
  } | null = null;
  
  // Cache expiration time (5 seconds)
  private readonly CACHE_EXPIRATION = 5000;
  
  /**
   * Calculates engagement levels with different strange attractors
   * @param readerState Current reader state
   * @param nodes All node states
   * @returns Array of attractor engagements
   */
  calculateAttractorEngagement(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): AttractorEngagement[] {
    const now = Date.now();
    
    // Check cache first
    if (this.attractorEngagementCache && 
        now - this.attractorEngagementCache.timestamp < this.CACHE_EXPIRATION) {
      return this.attractorEngagementCache.engagements;
    }
    
    // Calculate fresh engagements
    const engagements = pathAnalyzer.calculateAttractorEngagement(readerState, nodes);
    
    // Update cache
    this.attractorEngagementCache = {
      timestamp: now,
      engagements
    };
    
    return engagements;
  }
  
  /**
   * Identifies patterns in the reader's path
   * @param readerState Current reader state
   * @param nodes All node states
   * @returns Array of reading patterns
   */
  identifyPathPatterns(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): ReadingPattern[] {
    const now = Date.now();
    
    // Check cache first
    if (this.pathPatternsCache && 
        now - this.pathPatternsCache.timestamp < this.CACHE_EXPIRATION) {
      return this.pathPatternsCache.patterns;
    }
    
    // Calculate fresh patterns
    const patterns = pathAnalyzer.analyzePathPatterns(readerState, nodes);
    
    // Update cache
    this.pathPatternsCache = {
      timestamp: now,
      patterns
    };
    
    return patterns;
  }
  
  /**
   * Determines if a node should be revealed based on attractor engagement
   * @param nodeAttractors Attractors associated with the node
   * @param readerState Current reader state
   * @param nodes All node states
   * @returns Boolean indicating if node should be revealed
   */
  shouldRevealNodeBasedOnAttractors(
    nodeAttractors: StrangeAttractor[],
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): boolean {
    if (!nodeAttractors || nodeAttractors.length === 0) {
      return false;
    }
    
    // Get attractor engagements
    const engagements = this.calculateAttractorEngagement(readerState, nodes);
    
    // Check if any of the node's attractors have significant engagement
    return nodeAttractors.some(attractor => {
      const engagement = engagements.find(e => e.attractor === attractor);
      return engagement && engagement.engagementScore >= SIGNIFICANT_ENGAGEMENT_THRESHOLD;
    });
  }
  
  /**
   * Creates transformation conditions based on attractor engagement and path patterns
   * @param readerState Current reader state
   * @param nodes All node states
   * @returns Array of transformation conditions
   */
  createAttractorBasedConditions(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): TransformationCondition[] {
    // Get attractor engagements and patterns
    const engagements = this.calculateAttractorEngagement(readerState, nodes);
    const patterns = this.identifyPathPatterns(readerState, nodes);
    
    // Create transformation conditions
    const conditions: TransformationCondition[] = [];
    
    // Add conditions based on significant attractor engagements
    engagements
      .filter(engagement => engagement.engagementScore >= SIGNIFICANT_ENGAGEMENT_THRESHOLD)
      .forEach(engagement => {
        conditions.push({
          strangeAttractorsEngaged: [engagement.attractor]
        });
      });
    
    // Add conditions based on thematic patterns
    patterns
      .filter(pattern => pattern.type === 'thematic' && pattern.strength >= 0.6)
      .forEach(pattern => {
        if (pattern.relatedAttractors && pattern.relatedAttractors.length > 0) {
          conditions.push({
            strangeAttractorsEngaged: pattern.relatedAttractors
          });
        }
      });
    
    // Add conditions based on theme groups
    // Find which theme group has the highest engagement
    const themeGroupEngagement = this.calculateThemeGroupEngagement(engagements);
    
    const dominantTheme = Object.entries(themeGroupEngagement)
      .sort((a, b) => b[1] - a[1])
      .filter(([, score]) => score >= SIGNIFICANT_ENGAGEMENT_THRESHOLD)
      .map(([theme]) => theme)[0];
    
    if (dominantTheme && ATTRACTOR_THEME_GROUPS[dominantTheme]) {
      // Add a condition that any of these attractors in the theme group could trigger
      conditions.push({
        anyOf: ATTRACTOR_THEME_GROUPS[dominantTheme].map(attractor => ({
          strangeAttractorsEngaged: [attractor]
        }))
      });
    }
    
    return conditions;
  }
  
  /**
   * Calculate engagement levels for each theme group
   * @param engagements Attractor engagements
   * @returns Record of theme group to engagement score
   */
  private calculateThemeGroupEngagement(
    engagements: AttractorEngagement[]
  ): Record<string, number> {
    const themeScores: Record<string, number> = {};
    
    // Initialize theme scores
    Object.keys(ATTRACTOR_THEME_GROUPS).forEach(theme => {
      themeScores[theme] = 0;
    });
    
    // Sum engagement scores for attractors in each theme
    engagements.forEach(engagement => {
      Object.entries(ATTRACTOR_THEME_GROUPS).forEach(([theme, attractors]) => {
        if (attractors.includes(engagement.attractor)) {
          themeScores[theme] += engagement.engagementScore;
        }
      });
    });
    
    // Normalize scores
    const maxScore = Math.max(...Object.values(themeScores));
    if (maxScore > 0) {
      Object.keys(themeScores).forEach(theme => {
        themeScores[theme] = (themeScores[theme] / maxScore) * 100;
      });
    }
    
    return themeScores;
  }
  
  /**
   * Generates transformation rules based on attractor engagement
   * @param readerState Current reader state
   * @param nodes All node states
   * @returns Array of transformation rules
   */
  generateAttractorTransformationRules(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): TransformationRule[] {
    const engagements = this.calculateAttractorEngagement(readerState, nodes);
    const patterns = this.identifyPathPatterns(readerState, nodes);
    
    // Use the PathAnalyzer to create transformation conditions
    const patternConditions = pathAnalyzer.createTransformationConditions(patterns, engagements);
    
    // Map these to actual transformation rules that the TransformationEngine can use
    return patternConditions.map(patternCondition => {
      // Create appropriate transformations based on the pattern type
      const transformations = this.createTransformationsForPattern(patternCondition);
      
      // Create a rule that can be passed to the TransformationEngine
      return {
        condition: this.convertToTransformationCondition(patternCondition.condition),
        transformations
      };
    });
  }
  
  /**
   * Converts a PatternBasedCondition to a TransformationCondition
   */
  private convertToTransformationCondition(
    condition: {
      visitPattern?: string[];
      characters?: Character[];
      temporalPosition?: TemporalLabel;
      minTimeSpentInNode?: number;
      totalReadingTime?: number;
      strangeAttractorsEngaged?: StrangeAttractor[];
    }
  ): TransformationCondition {
    // Direct conversion for conditions already compatible with TransformationEngine
    const transformationCondition: TransformationCondition = {};
    
    if (condition.visitPattern) {
      transformationCondition.visitPattern = condition.visitPattern;
    }
    
    if (condition.temporalPosition) {
      transformationCondition.temporalPosition = condition.temporalPosition;
    }
    
    if (condition.minTimeSpentInNode !== undefined) {
      transformationCondition.minTimeSpentInNode = condition.minTimeSpentInNode;
    }
    
    if (condition.totalReadingTime !== undefined) {
      transformationCondition.totalReadingTime = condition.totalReadingTime;
    }
    
    if (condition.strangeAttractorsEngaged) {
      transformationCondition.strangeAttractorsEngaged = condition.strangeAttractorsEngaged;
    }
    
    // For custom conditions that need special handling
    // (For future implementation - these would need to be added to TransformationEngine)
    
    return transformationCondition;
  }
  
  /**
   * Creates text transformations based on the pattern type
   */
  private createTransformationsForPattern(
    patternCondition: PatternBasedCondition
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];
    
    switch (patternCondition.type) {
      case 'visitPattern':
        // For sequence patterns, emphasize repeated elements
        transformations.push({
          type: 'emphasize',
          selector: 'pattern recognition',
          emphasis: 'bold'
        });
        break;
        
      case 'characterFocus':
        // For character focus patterns, add character perspective comments
        transformations.push({
          type: 'metaComment',
          selector: 'perspective',
          replacement: `character perspective shift`
        });
        break;
        
      case 'temporalFocus':
        // For temporal patterns, add temporal layer markers
        transformations.push({
          type: 'metaComment',
          selector: 'time',
          replacement: `temporal layer shift`
        });
        break;
        
      case 'readingRhythm':
        // For rhythm patterns, adapt content density
        if (patternCondition.condition.minTimeSpentInNode && 
            patternCondition.condition.minTimeSpentInNode > 0) {
          // Deep engagement - expand content
          transformations.push({
            type: 'expand',
            selector: 'thought',
            replacement: 'deeper contemplation'
          });
        } else {
          // Fast skimming - highlight key points
          transformations.push({
            type: 'emphasize',
            selector: 'key',
            emphasis: 'bold'
          });
        }
        break;
        
      case 'attractorAffinity':
      case 'attractorEngagement':
        // For attractor patterns, emphasize relevant concepts
        if (patternCondition.condition.strangeAttractorsEngaged &&
            patternCondition.condition.strangeAttractorsEngaged.length > 0) {
          const attractor = patternCondition.condition.strangeAttractorsEngaged[0] as StrangeAttractor;
          const description = ATTRACTOR_DESCRIPTIONS[attractor] || 'thematic element';
          
          transformations.push({
            type: 'metaComment',
            selector: attractor.replace('-', ' '),
            replacement: description
          });
          
          transformations.push({
            type: 'emphasize',
            selector: attractor.replace('-', ' '),
            emphasis: 'color'
          });
        }
        break;
    }
    
    return transformations;
  }
  
  /**
   * Evaluates if a transformation should apply based on attractor engagement
   * This method extends the TransformationEngine's condition evaluation
   * @param condition Transformation condition
   * @param readerState Current reader state
   * @param nodeState Current node state
   * @param nodes All node states
   * @returns Boolean indicating if the transformation should apply
   */
  evaluateAttractorCondition(
    condition: TransformationCondition,
    readerState: ReaderState,
    nodeState: NodeState,
    nodes: Record<string, NodeState>
  ): boolean {
    // Handle attractor-specific conditions
    if (condition.strangeAttractorsEngaged && condition.strangeAttractorsEngaged.length > 0) {
      const engagements = this.calculateAttractorEngagement(readerState, nodes);
      
      // Check if any of the required attractors have significant engagement
      const hasSignificantEngagement = condition.strangeAttractorsEngaged.some(attractor => {
        const engagement = engagements.find(e => e.attractor === attractor);
        return engagement && engagement.engagementScore >= SIGNIFICANT_ENGAGEMENT_THRESHOLD;
      });
      
      if (!hasSignificantEngagement) {
        return false;
      }
    }
    
    // For all other conditions, defer to the TransformationEngine
    return transformationEngine.evaluateCondition(condition, readerState, nodeState);
  }
}

// Export a singleton instance for use throughout the application
export const strangeAttractorSystem = new StrangeAttractorSystem();