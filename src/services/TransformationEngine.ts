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
    console.log('Evaluating condition:', JSON.stringify(condition));
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
      const visitedNodes = readerState.path.sequence || [];
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
      if (!readerState.endpointProgress || readerState.endpointProgress[orientation] < minValue) {
        return false;
      }
    }
    
    // 8. Revisit pattern condition
    if (condition.revisitPattern?.length) {
      for (const pattern of condition.revisitPattern) {
        const revisitPatterns = readerState.path.revisitPatterns || {};
        const visits = revisitPatterns[pattern.nodeId] || 0;
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
    if (!attractors || !readerState.path) {
      return false;
    }
    
    const attractorsEngaged = readerState.path.attractorsEngaged || {};
    
    return attractors.every(attractor => {
      const engagementCount = attractorsEngaged[attractor] || 0;
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
    if (!transformation.selector) return content;
    
    const escapedSelector = this.escapeRegExp(transformation.selector);
    const selectorRegex = new RegExp(escapedSelector, 'g');
    
    switch (transformation.type) {
      case 'replace': {
        const replacement = transformation.replacement || '';
        
        // Check if we need to preserve markdown formatting
        if (transformation.preserveFormatting &&
            (transformation.selector.includes('*') ||
             transformation.selector.includes('_') ||
             transformation.selector.includes('`'))) {
          // Preserve formatting markers when replacing
          const markdownRegex = /(\*\*|\*|__|_|`{3}|`)/g;
          const formatMarkers = transformation.selector.match(markdownRegex) || [];
          let replacementWithFormat = replacement;
          
          formatMarkers.forEach(marker => {
            if (!replacementWithFormat.includes(marker)) {
              replacementWithFormat = `${marker}${replacementWithFormat}${marker}`;
            }
          });
          
          return content.replace(selectorRegex, replacementWithFormat);
        }
        
        return content.replace(selectorRegex, replacement);
      }
      
      case 'fragment': {
        if (!transformation.fragmentPattern) return content;
        
        // Store pattern in a local variable to prevent TypeScript undefined errors
        const fragmentPattern = transformation.fragmentPattern;
        console.log('Fragment pattern:', fragmentPattern);
        
        // Handle different fragmentation patterns
        const fragmentStyle = transformation.fragmentStyle || 'character';
        let fragmentedText = '';
        
        switch (fragmentStyle) {
          case 'character': {
            // Fragment between each character
            fragmentedText = transformation.selector.split('')
              .join(fragmentPattern);
            break;
          }
            
          case 'word': {
            // Fragment between words
            fragmentedText = transformation.selector.split(' ')
              .join(` ${fragmentPattern} `);
            break;
          }
            
          case 'progressive': {
            // Increasingly fragmented text
            const chars = transformation.selector.split('');
            fragmentedText = chars.map((char, index) => {
              const fragmentCount = Math.floor(index / (chars.length / 5)) + 1;
              return char + fragmentPattern.repeat(fragmentCount);
            }).join('');
            break;
          }
            
          case 'random': {
            // Randomly insert fragments
            const words = transformation.selector.split(' ');
            fragmentedText = words.map(word => {
              return Math.random() > 0.5 ?
                `${word} ${fragmentPattern}` :
                word;
            }).join(' ');
            break;
          }
            
          default: {
            fragmentedText = transformation.selector.split('')
              .join(fragmentPattern);
          }
        }
        
        return content.replace(selectorRegex, fragmentedText);
      }
      
      case 'expand': {
        const replacement = transformation.replacement || '';
        const expandStyle = transformation.expandStyle || 'append';
        
        switch (expandStyle) {
          case 'append':
            // Simply append content (default behavior)
            return content.replace(
              selectorRegex,
              `${transformation.selector} ${replacement}`
            );
            
          case 'inline':
            // Insert expansion inline with brackets
            return content.replace(
              selectorRegex,
              `${transformation.selector} <span class="narramorph-inline-expansion">[${replacement}]</span>`
            );
            
          case 'paragraph':
            // Add expansion as a new paragraph
            return content.replace(
              selectorRegex,
              `${transformation.selector}\n\n<div class="narramorph-paragraph-expansion">${replacement}</div>`
            );
            
          case 'reveal':
            // Reveal hidden content
            return content.replace(
              selectorRegex,
              `${transformation.selector} <span class="narramorph-reveal-expansion">${replacement}</span>`
            );
            
          default:
            return content.replace(
              selectorRegex,
              `${transformation.selector} ${replacement}`
            );
        }
      }
      
      case 'emphasize': {
        let emphasizedText = transformation.selector;
        const intensity = transformation.intensity || 1; // Default intensity
        
        switch (transformation.emphasis) {
          case 'italic':
            emphasizedText = `*${transformation.selector}*`;
            if (intensity > 1) {
              emphasizedText = `<em class="intensity-${intensity}">${transformation.selector}</em>`;
            }
            break;
            
          case 'bold':
            emphasizedText = `**${transformation.selector}**`;
            if (intensity > 1) {
              emphasizedText = `<strong class="intensity-${intensity}">${transformation.selector}</strong>`;
            }
            break;
            
          case 'color':
            emphasizedText = `<span class="emphasized-text intensity-${intensity}">${transformation.selector}</span>`;
            break;
            
          case 'spacing': {
            const spacer = ' '.repeat(intensity);
            emphasizedText = transformation.selector.split('').join(spacer);
            break;
          }
            
          case 'highlight':
            emphasizedText = `<mark class="intensity-${intensity}">${transformation.selector}</mark>`;
            break;
            
          case 'glitch':
            emphasizedText = `<span class="glitch-text intensity-${intensity}" data-text="${transformation.selector}">${transformation.selector}</span>`;
            break;
            
          case 'fade':
            emphasizedText = `<span class="fade-text intensity-${intensity}">${transformation.selector}</span>`;
            break;
        }
        
        return content.replace(selectorRegex, emphasizedText);
      }
      
      case 'metaComment': {
        const commentStyle = transformation.commentStyle || 'inline';
        const commentText = transformation.replacement || '';
        
        switch (commentStyle) {
          case 'inline':
            // Default inline comment in brackets
            return content.replace(
              selectorRegex,
              `${transformation.selector} <span class="narramorph-comment">[${commentText}]</span>`
            );
            
          case 'footnote': {
            // Add a footnote marker and text at the bottom
            const footnoteId = `footnote-${this.generateShortHash(transformation.selector)}`;
            
            // Check if content already has a footnotes section
            const hasFootnotes = content.includes('<div class="narramorph-footnotes">');
            let contentWithFootnote = content.replace(
              selectorRegex,
              `${transformation.selector}<sup class="narramorph-footnote-marker" id="${footnoteId}-ref">[†]</sup>`
            );
            
            // Add footnote text at the bottom
            if (hasFootnotes) {
              // Add to existing footnotes section - fix the regex pattern to be more specific
              const footnoteInsertRegex = /<\/div>\s*<div class="narramorph-footnotes">/;
              if (footnoteInsertRegex.test(contentWithFootnote)) {
                contentWithFootnote = contentWithFootnote.replace(
                  footnoteInsertRegex,
                  `</div>\n\n<div class="narramorph-footnotes">\n<p id="${footnoteId}" class="narramorph-footnote">† <a href="#${footnoteId}-ref">↩</a> ${commentText}</p>`
                );
              } else {
                // If pattern not found, just append to the end
                contentWithFootnote += `\n\n<p id="${footnoteId}" class="narramorph-footnote">† <a href="#${footnoteId}-ref">↩</a> ${commentText}</p>`;
              }
            } else {
              // Create new footnotes section
              contentWithFootnote += `\n\n<div class="narramorph-footnotes">\n<p id="${footnoteId}" class="narramorph-footnote">† <a href="#${footnoteId}-ref">↩</a> ${commentText}</p>\n</div>`;
            }
            
            return contentWithFootnote;
          }
            
          case 'marginalia':
            // Add comment as marginalia
            return content.replace(
              selectorRegex,
              `<span class="narramorph-marginalia-container">${transformation.selector}<span class="narramorph-marginalia">${commentText}</span></span>`
            );
            
          case 'interlinear':
            // Add comment between lines of text
            return content.replace(
              selectorRegex,
              `<div class="narramorph-interlinear-container">${transformation.selector}<div class="narramorph-interlinear">${commentText}</div></div>`
            );
            
          default:
            return content.replace(
              selectorRegex,
              `${transformation.selector} [${commentText}]`
            );
        }
      }
      
      default:
        return content;
    }
  }
  
  /**
   * Helper function to escape special regex characters in a string
   */
  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  
  /**
   * Generate a short hash for a string, useful for creating unique IDs
   */
  private generateShortHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
  
  /**
   * Applies multiple transformations to content
   */
  applyTransformations(content: string, transformations: TextTransformation[]): string {
    console.log('Applying transformations:', transformations.length);
    
    if (!content) {
      console.warn('Content is empty or undefined');
      return '';
    }
    
    if (!Array.isArray(transformations) || transformations.length === 0) {
      return content;
    }
    
    try {
      return transformations.reduce(
        (currentContent, transformation) =>
          this.applyTextTransformation(currentContent, transformation),
        content
      );
    } catch (error) {
      console.error('Error applying transformations:', error);
      return content; // Return original content on error
    }
  }
}

// Export a singleton instance for use throughout the application
export const transformationEngine = new TransformationEngine();