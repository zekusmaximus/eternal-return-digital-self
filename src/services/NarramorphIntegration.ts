/**
 * NarramorphIntegration Service
 * 
 * Connects the PathAnalyzer and StrangeAttractorSystem to the TransformationEngine
 * to create a complete content transformation pipeline based on reader path analysis.
 * 
 * This service serves as the integration point between the Reader Path and the
 * TransformationEngine, ensuring that content transformations are influenced by
 * the reader's unique journey through the narrative.
 */

import {
  TransformationCondition,
  NodeState,
  TextTransformation
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { pathAnalyzer, ReadingPattern } from './PathAnalyzer';
import { strangeAttractorSystem, ATTRACTOR_DESCRIPTIONS } from './StrangeAttractorSystem';
import { transformationEngine } from './TransformationEngine';

/**
 * Options for controlling the content transformation process
 */
export interface TransformationOptions {
  includePatternBasedTransformations?: boolean;
  includeAttractorBasedTransformations?: boolean;
  includeNodeSpecificTransformations?: boolean;
  minimumPatternStrength?: number; // 0-1 threshold for pattern detection
  minimumAttractorEngagement?: number; // 0-100 threshold for attractor engagement
}

/**
 * Default transformation options
 */
const DEFAULT_TRANSFORMATION_OPTIONS: TransformationOptions = {
  includePatternBasedTransformations: true,
  includeAttractorBasedTransformations: true,
  includeNodeSpecificTransformations: true,
  minimumPatternStrength: 0.6,
  minimumAttractorEngagement: 50
};

/**
 * Integrates the PathAnalyzer, StrangeAttractorSystem, and TransformationEngine
 */
export class NarramorphIntegration {
  /**
   * Transform content based on reader path patterns and attractor engagement
   * @param content Original content to transform
   * @param readerState Current reader state
   * @param nodeState Current node state
   * @param allNodes All node states
   * @param options Transformation options
   * @returns Transformed content
   */
  transformContent(
    content: string,
    readerState: ReaderState,
    nodeState: NodeState,
    allNodes: Record<string, NodeState>,
    options: TransformationOptions = DEFAULT_TRANSFORMATION_OPTIONS
  ): string {
    // 1. Get significant reader path patterns
    const patterns = options.includePatternBasedTransformations 
      ? this.getSignificantPatterns(readerState, allNodes, options)
      : [];
    
    // 2. Get attractor engagement and related transformations
    const attractorConditions = options.includeAttractorBasedTransformations
      ? strangeAttractorSystem.createAttractorBasedConditions(readerState, allNodes)
      : [];
    
    // 3. Get node-specific transformations
    const nodeSpecificTransformations = options.includeNodeSpecificTransformations
      ? this.getNodeSpecificTransformations(nodeState, readerState, allNodes)
      : [];
    
    // 4. Create combined transformation rules
    const transformationRules = [
      // Pattern-based rules
      ...this.createPatternTransformationRules(patterns, readerState, nodeState),
      
      // Attractor-based rules
      ...this.createAttractorTransformationRules(attractorConditions, readerState, nodeState),
      
      // Node-specific rules
      ...nodeSpecificTransformations
    ];
    
    // 5. Apply the transformation rules to the content
    return this.applyTransformations(content, transformationRules, readerState, nodeState);
  }

  /**
   * Get significant patterns from the reader's path
   */
  private getSignificantPatterns(
    readerState: ReaderState,
    nodes: Record<string, NodeState>,
    options: TransformationOptions
  ): ReadingPattern[] {
    const allPatterns = pathAnalyzer.analyzePathPatterns(readerState, nodes);
    const minStrength = options.minimumPatternStrength || 0.6;
    
    return allPatterns
      .filter(pattern => pattern.strength >= minStrength)
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 5); // Limit to top 5 patterns for performance
  }

  /**
   * Create transformation rules based on reader path patterns
   */
  /**
   * Create transformation rules based on reader path patterns
   * @param patterns Detected reading patterns
   * @param readerState Current reader state (preserved for potential future usage)
   * @param nodeState Current node state
   */
  private createPatternTransformationRules(
    patterns: ReadingPattern[],
    _readerState: ReaderState, // Kept for API consistency though not directly used
    nodeState: NodeState
  ): { condition: TransformationCondition; transformations: TextTransformation[] }[] {
    return patterns.map(pattern => {
      // Create condition based on pattern type
      const condition: TransformationCondition = this.createConditionFromPattern(pattern);
      
      // Create transformations based on pattern type
      const transformations: TextTransformation[] = this.createTransformationsFromPattern(pattern, nodeState);
      
      return { condition, transformations };
    });
  }

  /**
   * Create transformation condition from a detected pattern
   */
  private createConditionFromPattern(pattern: ReadingPattern): TransformationCondition {
    switch (pattern.type) {
      case 'sequence':
        return {
          visitPattern: pattern.relatedNodes || []
        };
        
      case 'character':
        // This would need to be extended in TransformationEngine
        return {
          // For now, use visit count as a fallback
          visitCount: 3
        };
        
      case 'temporal':
        return {
          temporalPosition: pattern.relatedTemporalLayers?.[0]
        };
        
      case 'rhythm':
        // Time-based conditions removed
        return {};
        
      case 'thematic':
        return {
          strangeAttractorsEngaged: pattern.relatedAttractors || []
        };
        
      default:
        return {};
    }
  }

  /**
   * Create text transformations based on a detected pattern
   */
  private createTransformationsFromPattern(
    pattern: ReadingPattern,
    nodeState: NodeState
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];
    
    // Base transformation on pattern type
    switch (pattern.type) {
      case 'sequence':
        // For sequence patterns, emphasize connections
        transformations.push({
          type: 'metaComment',
          selector: 'connection',
          replacement: 'repeated sequence'
        });
        break;
        
      case 'character':
        // For character focus, adapt perspective
        if (pattern.relatedCharacters?.[0] === nodeState.character) {
          // This is the focused character
          transformations.push({
            type: 'emphasize',
            selector: 'I',
            emphasis: 'bold'
          });
        } else {
          // This is not the focused character
          transformations.push({
            type: 'metaComment',
            selector: nodeState.character,
            replacement: `perspective shift from ${pattern.relatedCharacters?.[0] || 'other character'}`
          });
        }
        break;
        
      case 'temporal':
        // For temporal patterns, emphasize time indicators
        transformations.push({
          type: 'emphasize',
          selector: pattern.relatedTemporalLayers?.[0] || 'time',
          emphasis: 'color'
        });
        break;
        
      case 'rhythm':
        // Rhythm-based transformations removed (previously time-based)
        break;
        
      case 'thematic':
        // For thematic patterns, emphasize relevant concepts
        if (pattern.relatedAttractors) {
          pattern.relatedAttractors.forEach(attractor => {
            transformations.push({
              type: 'emphasize',
              selector: attractor.replace('-', ' '),
              emphasis: 'color'
            });
          });
        }
        break;
    }
    
    return transformations;
  }

  /**
   * Create transformation rules based on attractor engagement
   */
  private createAttractorTransformationRules(
    conditions: TransformationCondition[],
    _readerState: ReaderState, // Kept for API consistency
    nodeState: NodeState
  ): { condition: TransformationCondition; transformations: TextTransformation[] }[] {
    return conditions.map(condition => {
      const transformations: TextTransformation[] = [];
      
      // Handle strange attractor conditions
      if (condition.strangeAttractorsEngaged?.length) {
        condition.strangeAttractorsEngaged.forEach(attractor => {
          // Check if this node has this attractor
          if (nodeState.strangeAttractors.includes(attractor)) {
            // Emphasize this attractor's concepts in the text
            transformations.push({
              type: 'emphasize',
              selector: attractor.replace('-', ' '),
              emphasis: 'color'
            });
            
            // Add meta-commentary
            transformations.push({
              type: 'metaComment',
              selector: attractor.replace('-', ' '),
              replacement: ATTRACTOR_DESCRIPTIONS[attractor]
            });
          }
        });
      }
      
      return { condition, transformations };
    });
  }

  /**
   * Get node-specific transformations based on the node's attractors
   */
  private getNodeSpecificTransformations(
    nodeState: NodeState,
    readerState: ReaderState,
    allNodes: Record<string, NodeState>
  ): { condition: TransformationCondition; transformations: TextTransformation[] }[] {
    const rules: { condition: TransformationCondition; transformations: TextTransformation[] }[] = [];
    
    // Create transformations based on the node's strange attractors
    nodeState.strangeAttractors.forEach(attractor => {
      // Check if the reader has significant engagement with this attractor
      const isSignificantlyEngaged = strangeAttractorSystem
        .shouldRevealNodeBasedOnAttractors([attractor], readerState, allNodes);
      
      if (isSignificantlyEngaged) {
        // Create a rule that only applies when visiting this specific node
        rules.push({
          condition: {
            visitCount: 1, // Only need to visit once
            previouslyVisitedNodes: [nodeState.id] // Must be this node
          },
          transformations: [
            {
              type: 'emphasize',
              selector: attractor.replace('-', ' '),
              emphasis: 'color'
            },
            {
              type: 'expand',
              selector: attractor.replace('-', ' '),
              replacement: ATTRACTOR_DESCRIPTIONS[attractor]
            }
          ]
        });
      }
    });
    
    return rules;
  }

  /**
   * Apply transformation rules to content
   */
  private applyTransformations(
    content: string,
    rules: { condition: TransformationCondition; transformations: TextTransformation[] }[],
    readerState: ReaderState, // Used in evaluateCondition
    nodeState: NodeState
  ): string {
    // Filter rules that should apply based on conditions
    const applicableTransformations = rules
      .filter(rule => transformationEngine.evaluateCondition(rule.condition, readerState, nodeState))
      .flatMap(rule => rule.transformations);
    
    // Apply transformations to content
    return transformationEngine.applyTransformations(content, applicableTransformations);
  }
}

// Export a singleton instance for use throughout the application
export const narramorphIntegration = new NarramorphIntegration();