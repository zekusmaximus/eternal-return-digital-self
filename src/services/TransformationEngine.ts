/**
 * TransformationEngine Service
 * 
 * Handles complex condition evaluation for narrative content transformations
 * in the Narramorph feature of Eternal Return of the Digital Self.
 * 
 * This service evaluates different types of conditions:
 * 1. Visit count conditions
 * 2. Visit pattern conditions (sequence of node visits)
 * 3. Previously visited node conditions
 * 4. Strange attractor engagement conditions
 * 5. Temporal position conditions
 */

import { 
  StrangeAttractor, 
  TemporalLabel, 
  NodeState, 
  TextTransformation,
  EndpointOrientation
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';

/**
 * Enhanced transformation condition interface with all supported condition types
 */
export interface TransformationCondition {
  // Basic visit count threshold
  visitCount?: number;
  
  // Sequence of nodes that must have been visited in order
  visitPattern?: string[];
  
  // Set of nodes that must have been visited (in any order)
  previouslyVisitedNodes?: string[];
  
  // Strange attractors that must be engaged
  strangeAttractorsEngaged?: StrangeAttractor[];
  
  // Temporal position requirement (past, present, future)
  temporalPosition?: TemporalLabel;
  
  // Time-based conditions
  minTimeSpentInNode?: number; // Minimum time spent in current node (ms)
  totalReadingTime?: number;   // Minimum total reading time (ms)
  
  // Endpoint progress conditions
  endpointProgress?: {
    orientation: EndpointOrientation;
    minValue: number; // Minimum progress value (0-100)
  };
  
  // Revisit pattern - e.g., must have revisited a specific node at least N times
  revisitPattern?: {
    nodeId: string;
    minVisits: number;
  }[];
  
  // Logical operators for complex conditions
  anyOf?: TransformationCondition[]; // At least one condition must be true
  allOf?: TransformationCondition[]; // All conditions must be true
  not?: TransformationCondition;     // Condition must be false
}

/**
 * Result of a transformation evaluation
 */
export interface TransformationResult {
  shouldApply: boolean;
  appliedTransformations: TextTransformation[];
}

/**
 * Service class that handles the evaluation and application of transformation conditions
 */
export class TransformationEngine {
  /**
   * Core method to evaluate if a transformation should apply based on the condition
   * and current reader and node state
   */
  evaluateCondition(
    condition: TransformationCondition, 
    readerState: ReaderState, 
    nodeState: NodeState
  ): boolean {
    // Handle logical operators first
    if (condition.allOf?.length) {
      return condition.allOf.every(subCondition => 
        this.evaluateCondition(subCondition, readerState, nodeState)
      );
    }
    
    if (condition.anyOf?.length) {
      return condition.anyOf.some(subCondition => 
        this.evaluateCondition(subCondition, readerState, nodeState)
      );
    }
    
    if (condition.not) {
      return !this.evaluateCondition(condition.not, readerState, nodeState);
    }
    
    // Handle basic conditions
    
    // 1. Visit count condition
    if (condition.visitCount !== undefined) {
      if (nodeState.visitCount < condition.visitCount) return false;
    }
    
    // 2. Previously visited nodes condition
    if (condition.previouslyVisitedNodes?.length) {
      const visitedNodes = readerState.path.sequence;
      if (!condition.previouslyVisitedNodes.every(nodeId => 
        visitedNodes.includes(nodeId))) {
        return false;
      }
    }
    
    // 3. Visit pattern condition
    if (condition.visitPattern?.length) {
      if (!this.matchesPattern(condition.visitPattern, readerState.path.sequence)) {
        return false;
      }
    }
    
    // 4. Strange attractors condition
    if (condition.strangeAttractorsEngaged?.length) {
      if (!this.checkAttractorsEngaged(
        condition.strangeAttractorsEngaged, 
        readerState
      )) {
        return false;
      }
    }
    
    // 5. Temporal position condition
    if (condition.temporalPosition) {
      const nodeTemporalPosition = this.getNodeTemporalPosition(nodeState);
      if (nodeTemporalPosition !== condition.temporalPosition) {
        return false;
      }
    }
    
    // 6. Time-based conditions
    if (condition.minTimeSpentInNode !== undefined) {
      const timeSpent = readerState.path.durations[nodeState.id] || 0;
      if (timeSpent < condition.minTimeSpentInNode) {
        return false;
      }
    }
    
    if (condition.totalReadingTime !== undefined) {
      if (readerState.totalReadingTime < condition.totalReadingTime) {
        return false;
      }
    }
    
    // 7. Endpoint progress condition
    if (condition.endpointProgress) {
      const { orientation, minValue } = condition.endpointProgress;
      if (readerState.endpointProgress[orientation] < minValue) {
        return false;
      }
    }
    
    // 8. Revisit pattern condition
    if (condition.revisitPattern?.length) {
      for (const pattern of condition.revisitPattern) {
        const visits = readerState.path.revisitPatterns[pattern.nodeId] || 0;
        if (visits < pattern.minVisits) {
          return false;
        }
      }
    }
    
    // If all conditions pass (or no conditions were specified), return true
    return true;
  }
  
  /**
   * Checks if the reader's path matches a specific visit pattern
   * The pattern must appear in the exact sequence, but doesn't need to be the most recent visits
   */
  private matchesPattern(pattern: string[], visitsSequence: string[]): boolean {
    if (pattern.length === 0) return true;
    if (visitsSequence.length === 0) return false;
    
    // Check for the pattern anywhere in the sequence
    for (let i = 0; i <= visitsSequence.length - pattern.length; i++) {
      let matches = true;
      
      for (let j = 0; j < pattern.length; j++) {
        if (visitsSequence[i + j] !== pattern[j]) {
          matches = false;
          break;
        }
      }
      
      if (matches) return true;
    }
    
    return false;
  }
  
  /**
   * Checks if all required strange attractors have been engaged by the reader
   */
  private checkAttractorsEngaged(
    attractors: StrangeAttractor[], 
    readerState: ReaderState
  ): boolean {
    return attractors.every(attractor => {
      const engagementCount = readerState.path.attractorsEngaged[attractor] || 0;
      return engagementCount > 0;
    });
  }
  
  /**
   * Determines the temporal position (past, present, future) of a node
   * based on its temporal value
   */
  private getNodeTemporalPosition(node: NodeState): TemporalLabel {
    if (node.temporalValue <= 3) return 'past';
    if (node.temporalValue <= 6) return 'present';
    return 'future';
  }
  
  /**
   * Evaluates a transformation rule against the current reader and node state
   * Returns whether the transformation should be applied and the applicable transformations
   */
  evaluateTransformation(
    rule: { condition: TransformationCondition; transformations: TextTransformation[] },
    readerState: ReaderState,
    nodeState: NodeState
  ): TransformationResult {
    const shouldApply = this.evaluateCondition(rule.condition, readerState, nodeState);
    
    return {
      shouldApply,
      appliedTransformations: shouldApply ? rule.transformations : []
    };
  }
  
  /**
   * Batch evaluates multiple transformation rules and returns all applicable transformations
   */
  evaluateAllTransformations(
    rules: Array<{ condition: TransformationCondition; transformations: TextTransformation[] }>,
    readerState: ReaderState,
    nodeState: NodeState
  ): TextTransformation[] {
    return rules
      .filter(rule => this.evaluateCondition(rule.condition, readerState, nodeState))
      .flatMap(rule => rule.transformations);
  }
  
  /**
   * Applies a text transformation to the given content
   */
  applyTextTransformation(content: string, transformation: TextTransformation): string {
    switch (transformation.type) {
      case 'replace':
        return content.replace(transformation.selector, transformation.replacement || '');
        
      case 'fragment': {
        if (!transformation.fragmentPattern) return content;
        const fragmentedText = transformation.selector.split('')
          .join(transformation.fragmentPattern);
        return content.replace(transformation.selector, fragmentedText);
      }
        
      case 'expand':
        return content.replace(
          transformation.selector, 
          `${transformation.selector}${transformation.replacement ? ` ${transformation.replacement}` : ''}`
        );
        
      case 'emphasize': {
        let emphasizedText = transformation.selector;
        
        switch (transformation.emphasis) {
          case 'italic':
            emphasizedText = `*${transformation.selector}*`;
            break;
          case 'bold':
            emphasizedText = `**${transformation.selector}**`;
            break;
          case 'color':
            emphasizedText = `<span class="emphasized-text">${transformation.selector}</span>`;
            break;
          case 'spacing':
            emphasizedText = transformation.selector.split('').join(' ');
            break;
        }
        
        return content.replace(transformation.selector, emphasizedText);
      }
        
      case 'metaComment':
        return content.replace(
          transformation.selector,
          `${transformation.selector} [${transformation.replacement || ''}]`
        );
        
      default:
        return content;
    }
  }
  
  /**
   * Applies multiple transformations to content
   */
  applyTransformations(content: string, transformations: TextTransformation[]): string {
    return transformations.reduce(
      (currentContent, transformation) => 
        this.applyTextTransformation(currentContent, transformation),
      content
    );
  }
}

// Export a singleton instance for use throughout the application
export const transformationEngine = new TransformationEngine();