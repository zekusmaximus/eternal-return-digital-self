/**
 * TransformationService
 * 
 * Core service that handles the application of Narramorph content transformations
 * based on reader patterns and conditions.
 * 
 * This service connects the condition detection system (TransformationEngine) and
 * the pattern analysis system (PathAnalyzer) to actual content changes.
 */

import {
  TextTransformation,
  NodeState,
  TemporalLabel
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { transformationEngine } from './TransformationEngine';
import { pathAnalyzer } from './PathAnalyzer';

// Cache for storing previously evaluated and applied transformations
interface TransformationCache {
  // Key format: nodeId-visitCount-patternHash
  [key: string]: {
    transformations: TextTransformation[];
    timestamp: number;
    content: string;
  }
}

/**
 * Represents a transformation with its priority and metadata
 */
interface PrioritizedTransformation {
  transformation: TextTransformation;
  priority: number;
  sourceType: 'pattern' | 'condition' | 'attractor' | 'temporal' | 'rhythm';
  conflictGroup?: string; // Identifier for potentially conflicting transformations
}

/**
 * Service class for managing the application of content transformations
 */
export class TransformationService {
  private cache: TransformationCache = {};
  private readonly CACHE_EXPIRY_TIME = 5 * 60 * 1000; // 5 minutes
  
  /**
   * Calculates a unique hash for the reader's current pattern state
   * Used for caching transformation results
   */
  private calculatePatternHash(readerState: ReaderState): string {
    // Create a simple hash based on key reader state components
    const { 
      path: { sequence, attractorsEngaged }, 
      endpointProgress 
    } = readerState;
    
    // Use the last 5 nodes in the sequence, or all if less than 5
    const recentPath = sequence.slice(-5).join('-');
    
    // Use top 3 engaged attractors
    const topAttractors = Object.entries(attractorsEngaged)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([attractor]) => attractor)
      .join('-');
    
    // Use endpoint progress values
    const progressValues = Object.values(endpointProgress).join('-');
    
    return `${recentPath}|${topAttractors}|${progressValues}`;
  }
  
  /**
   * Get a unique cache key for a node transformation
   */
  private getCacheKey(nodeId: string, visitCount: number, patternHash: string): string {
    return `${nodeId}-${visitCount}-${patternHash}`;
  }
  
  /**
   * Clear expired items from the cache
   */
  private cleanCache(): void {
    const now = Date.now();
    for (const key in this.cache) {
      if (now - this.cache[key].timestamp > this.CACHE_EXPIRY_TIME) {
        delete this.cache[key];
      }
    }
  }
  
  /**
   * Assign priorities to transformations based on their type and strength
   */
  private prioritizeTransformations(
    transformations: TextTransformation[],
    readerState: ReaderState,
    nodeState: NodeState
  ): PrioritizedTransformation[] {
    // Start with default priorities
    const prioritized: PrioritizedTransformation[] = transformations.map(transformation => {
      // Base priority assignment
      let priority = 50; // Default mid-level priority
      let sourceType: PrioritizedTransformation['sourceType'] = 'condition';
      const conflictGroup: string | undefined = `selector-${transformation.selector}`;
      
      // Conflict group is based on selector
      // Transformations with same selector might conflict
      
      // Modify priority and source type based on transformation type
      switch (transformation.type) {
        case 'replace':
          priority = 80; // Highest priority since it completely changes content
          sourceType = 'pattern';
          break;
          
        case 'fragment':
          priority = 75;
          sourceType = 'rhythm';
          break;
          
        case 'expand':
          priority = 60;
          sourceType = 'attractor';
          break;
          
        case 'emphasize':
          priority = 50;
          sourceType = 'temporal';
          break;
          
        case 'metaComment':
          priority = 40; // Lowest priority since it just adds comments
          sourceType = 'attractor';
          break;
      }
      
      return {
        transformation,
        priority,
        sourceType,
        conflictGroup
      };
    });
    
    // Further adjust priorities based on reader state and patterns
    // Get significant patterns for this reader
    const patterns = pathAnalyzer.identifySignificantPatterns(readerState, {
      [nodeState.id]: nodeState
    });
    
    // Get attractor engagements
    const attractorEngagements = pathAnalyzer.calculateAttractorEngagement(readerState, {
      [nodeState.id]: nodeState
    });
    
    // Adjust priority based on pattern strength and attractor engagement
    prioritized.forEach(item => {
      // If transformation matches a strong pattern, increase priority
      if (item.sourceType === 'pattern') {
        const matchingPattern = patterns.find(p => 
          p.type === 'sequence' && p.strength > 0.7);
        if (matchingPattern) {
          item.priority += Math.round(matchingPattern.strength * 15);
        }
      }
      
      // If transformation is related to an engaged attractor, adjust priority
      if (item.sourceType === 'attractor' && item.transformation.selector) {
        const relatedAttractor = attractorEngagements.find(engagement => 
          nodeState.currentContent?.includes(item.transformation.selector) && 
          nodeState.strangeAttractors.includes(engagement.attractor)
        );
        
        if (relatedAttractor && relatedAttractor.engagementScore > 50) {
          item.priority += Math.round((relatedAttractor.engagementScore - 50) / 5);
        }
      }
      
      // Adjust based on temporal focus
      if (item.sourceType === 'temporal') {
        const temporalLayer = nodeState.temporalValue <= 3 ? 'past' : 
                             nodeState.temporalValue <= 6 ? 'present' : 'future';
                             
        const temporalFocus = readerState.path.temporalLayerFocus || {} as Record<TemporalLabel, number>;
        const focusOnThisLayer = temporalFocus[temporalLayer as TemporalLabel] || 0;
        const totalVisits = Object.values(temporalFocus).reduce((sum: number, val: number) => sum + val, 0);
        
        if (totalVisits > 0) {
          const focusRatio = focusOnThisLayer / totalVisits;
          if (focusRatio > 0.4) {
            item.priority += Math.round((focusRatio - 0.4) * 20);
          }
        }
      }
      
      // Adjust based on reading rhythm
      if (item.sourceType === 'rhythm') {
        const rhythm = readerState.path.readingRhythm;
        if (rhythm) {
          const { fastTransitions, deepEngagements } = rhythm;
          const totalTransitions = readerState.path.transitions?.length || 0;
          
          if (totalTransitions > 0) {
            // For fragmenting, increase priority if reader has many fast transitions
            if (item.transformation.type === 'fragment' && fastTransitions / totalTransitions > 0.6) {
              item.priority += 10;
            }
            
            // For expanding, increase priority if reader has deep engagements
            if (item.transformation.type === 'expand' && deepEngagements > 2) {
              item.priority += 5;
            }
          }
        }
      }
    });
    
    return prioritized;
  }
  
  /**
   * Resolve conflicts between transformations
   * Returns a filtered list with conflicts resolved
   */
  private resolveConflicts(transformations: PrioritizedTransformation[]): PrioritizedTransformation[] {
    // Group transformations by conflict group
    const groupedByConflict: Record<string, PrioritizedTransformation[]> = {};
    
    transformations.forEach(item => {
      if (item.conflictGroup) {
        if (!groupedByConflict[item.conflictGroup]) {
          groupedByConflict[item.conflictGroup] = [];
        }
        groupedByConflict[item.conflictGroup].push(item);
      }
    });
    
    // For each conflict group, keep only the highest priority transformation
    const resolved: PrioritizedTransformation[] = [];
    
    // Add transformations without conflict groups
    transformations
      .filter(item => !item.conflictGroup)
      .forEach(item => resolved.push(item));
    
    // Add highest priority transformation from each conflict group
    Object.values(groupedByConflict).forEach(group => {
      if (group.length > 0) {
        // Sort by priority (highest first)
        group.sort((a, b) => b.priority - a.priority);
        resolved.push(group[0]);
      }
    });
    
    return resolved;
  }
  
  /**
   * Apply transformations to content with priority handling and conflict resolution
   */
  applyTransformationsWithPriority(
    content: string, 
    transformations: TextTransformation[], 
    readerState: ReaderState,
    nodeState: NodeState
  ): string {
    if (transformations.length === 0) {
      return content;
    }
    
    // Prioritize transformations
    let prioritized = this.prioritizeTransformations(transformations, readerState, nodeState);
    
    // Resolve conflicts
    prioritized = this.resolveConflicts(prioritized);
    
    // Sort by priority (highest first)
    prioritized.sort((a, b) => b.priority - a.priority);
    
    // Apply transformations in priority order
    let transformedContent = content;
    
    prioritized.forEach(({ transformation }) => {
      transformedContent = transformationEngine.applyTextTransformation(
        transformedContent, 
        transformation
      );
    });
    
    return transformedContent;
  }
  
  /**
   * Apply transformations with caching for performance
   */
  getCachedTransformedContent(
    nodeId: string,
    content: string,
    transformations: TextTransformation[],
    readerState: ReaderState,
    nodeState: NodeState
  ): string {
    // Calculate cache key components
    const patternHash = this.calculatePatternHash(readerState);
    const cacheKey = this.getCacheKey(nodeId, nodeState.visitCount, patternHash);
    
    // Clean expired cache entries
    this.cleanCache();
    
    // Check if we have a cached version
    if (this.cache[cacheKey] && this.cache[cacheKey].content) {
      return this.cache[cacheKey].content;
    }
    
    // Apply transformations
    const transformedContent = this.applyTransformationsWithPriority(
      content,
      transformations,
      readerState,
      nodeState
    );
    
    // Cache the result
    this.cache[cacheKey] = {
      transformations,
      timestamp: Date.now(),
      content: transformedContent
    };
    
    return transformedContent;
  }
  
  /**
   * Generate a hash for a set of transformations to use in CSS transitions
   */
  getTransformationHash(transformations: TextTransformation[]): string {
    return transformations
      .map(t => `${t.type}-${t.selector?.substring(0, 10)}`)
      .join('|');
  }
  
  /**
   * Generate CSS classes for transitions based on transformation types
   */
  generateTransitionClasses(transformations: TextTransformation[]): Record<string, string> {
    const classMap: Record<string, string> = {};
    
    transformations.forEach(transformation => {
      if (!transformation.selector) return;
      
      const sanitizedSelector = transformation.selector.replace(/[^a-zA-Z0-9]/g, '_');
      const baseClass = `narramorph-transform-${transformation.type}`;
      let classList = baseClass;
      
      // Get intensity for emphasis styles
      const intensity = transformation.intensity || 1;
      
      switch (transformation.type) {
        case 'replace':
          classList += ' narramorph-replaced';
          if (transformation.preserveFormatting) {
            classList += ' preserve-formatting';
          }
          break;
          
        case 'fragment':
          classList += ' narramorph-fragmented';
          if (transformation.fragmentStyle) {
            classList += ` narramorph-fragment-${transformation.fragmentStyle}`;
          }
          break;
          
        case 'expand':
          classList += ' narramorph-expanded';
          if (transformation.expandStyle) {
            // Additional classes for different expansion styles will be handled
            // in the wrapping logic
          }
          break;
          
        case 'emphasize':
          classList += ' narramorph-emphasized';
          if (transformation.emphasis) {
            classList += ` narramorph-emphasis-${transformation.emphasis}`;
          }
          // Add intensity class
          classList += ` intensity-${intensity}`;
          break;
          
        case 'metaComment':
          classList += ' narramorph-commented';
          // Different comment styles will be handled in the wrapping logic
          break;
      }
      
      // Add unique identifier class
      classList += ` narramorph-element-${sanitizedSelector.substring(0, 20)}`;
      
      classMap[transformation.selector] = classList;
    });
    
    return classMap;
  }
  
  /**
   * Create wrapper elements with CSS classes for transitions
   */
  wrapTransformedContent(
    content: string, 
    transformations: TextTransformation[]
  ): string {
    if (transformations.length === 0) return content;
    
    const classMap = this.generateTransitionClasses(transformations);
    let wrappedContent = content;
    
    // Apply wrapping to each transformed element
    // We need to be careful with the order here to avoid nested replacements
    Object.entries(classMap).forEach(([selector, className]) => {
      // Find the transformation for this selector
      const transformation = transformations.find(t => t.selector === selector);
      if (!transformation) return;
      
      // Different wrapping strategies based on transformation type
      // Prepare replacement text outside of the switch to avoid lexical declaration in case block
      let replacement: string;
      
      switch (transformation.type) {
        case 'replace':
        case 'fragment':
        case 'emphasize':
          // These transformations modify the original content, so wrap the result
          replacement = transformation.type === 'replace' ?
            transformation.replacement || '' :
            selector;
          
          wrappedContent = wrappedContent.replace(
            new RegExp(escapeRegExp(replacement), 'g'),
            `<span class="${className}" data-transform-type="${transformation.type}">${replacement}</span>`
          );
          break;
          
        case 'expand':
          // For expansions, we need to wrap both the original and expanded content
          if (transformation.replacement) {
            const expandedText = `${selector} ${transformation.replacement}`;
            wrappedContent = wrappedContent.replace(
              new RegExp(escapeRegExp(expandedText), 'g'),
              `<span class="${className}" data-transform-type="${transformation.type}">${selector}<span class="narramorph-expansion">${transformation.replacement}</span></span>`
            );
          }
          break;
          
        case 'metaComment':
          // For meta comments, wrap the comment part
          if (transformation.replacement) {
            const commentedText = `${selector} [${transformation.replacement}]`;
            wrappedContent = wrappedContent.replace(
              new RegExp(escapeRegExp(commentedText), 'g'),
              `<span class="${className}" data-transform-type="${transformation.type}">${selector}<span class="narramorph-comment">[${transformation.replacement}]</span></span>`
            );
          }
          break;
      }
    });
    
    return wrappedContent;
  }
  
  /**
   * Create a set of transformations based on reader patterns
   */
  createTransformationsFromPatterns(
    readerState: ReaderState,
    nodeState: NodeState
  ): TextTransformation[] {
    // Get patterns from the path analyzer
    const patterns = pathAnalyzer.identifySignificantPatterns(readerState, {
      [nodeState.id]: nodeState
    });
    
    // Get attractor engagements
    const attractorEngagements = pathAnalyzer.calculateAttractorEngagement(readerState, {
      [nodeState.id]: nodeState
    });
    
    // Create transformation conditions from patterns
    const patternConditions = pathAnalyzer.createTransformationConditions(
      patterns,
      attractorEngagements
    );
    
    // Convert pattern conditions to text transformations
    const transformations: TextTransformation[] = [];
    
    patternConditions.forEach(condition => {
      // We'll create different transformation types based on the pattern type
      switch (condition.type) {
        case 'visitPattern':
          // Repeated sequence patterns could trigger text replacements
          if (condition.strength > 0.8 && nodeState.currentContent) {
            // Extract a significant paragraph to transform
            const paragraphs = nodeState.currentContent.split('\n\n');
            if (paragraphs.length > 1) {
              transformations.push({
                type: 'replace',
                selector: paragraphs[1],
                replacement: `${paragraphs[1]} [A recurring pattern emerges in your exploration]`
              });
            }
          }
          break;
          
        case 'characterFocus':
          // Character focus could trigger emphasis of character-specific content
          if (condition.strength > 0.7 && 
              condition.condition.characters?.[0] === nodeState.character &&
              nodeState.currentContent) {
            // Find character-specific content to emphasize
            const paragraphs = nodeState.currentContent.split('\n\n');
            if (paragraphs.length > 0) {
              transformations.push({
                type: 'emphasize',
                selector: paragraphs[0],
                emphasis: 'color'
              });
            }
          }
          break;
          
        case 'temporalFocus':
          // Temporal focus could trigger meta-commentary
          if (condition.strength > 0.7 && 
              condition.condition.temporalPosition && 
              nodeState.currentContent) {
            const temporalLayer = nodeState.temporalValue <= 3 ? 'past' : 
                                 nodeState.temporalValue <= 6 ? 'present' : 'future';
                                 
            if (temporalLayer === condition.condition.temporalPosition) {
              // Find temporal-related content
              const paragraphs = nodeState.currentContent.split('\n\n');
              if (paragraphs.length > 2) {
                transformations.push({
                  type: 'metaComment',
                  selector: paragraphs[2],
                  replacement: `You seem drawn to ${condition.condition.temporalPosition} narratives`
                });
              }
            }
          }
          break;
          
        case 'readingRhythm':
          // Reading rhythm affects fragmentation
          if (condition.strength > 0.6 && nodeState.currentContent) {
            if (condition.condition.minTimeSpentInNode === 0) {
              // Fast reading creates fragmentation
              const paragraphs = nodeState.currentContent.split('\n\n');
              if (paragraphs.length > 1) {
                transformations.push({
                  type: 'fragment',
                  selector: paragraphs[1],
                  fragmentPattern: '...'
                });
              }
            } else if (condition.condition.minTimeSpentInNode === 60000) {
              // Deep reading creates expansion
              const paragraphs = nodeState.currentContent.split('\n\n');
              if (paragraphs.length > 0) {
                transformations.push({
                  type: 'expand',
                  selector: paragraphs[0],
                  replacement: 'Your careful reading reveals deeper layers of meaning.'
                });
              }
            }
          }
          break;
          
        case 'attractorAffinity':
        case 'attractorEngagement':
          // Attractor engagement affects content expansion
          if (condition.strength > 0.7 && 
              condition.condition.strangeAttractorsEngaged?.[0] &&
              nodeState.currentContent) {
            // Find attractor-related content
            const attractor = condition.condition.strangeAttractorsEngaged[0];
            const paragraphs = nodeState.currentContent.split('\n\n');
            
            if (paragraphs.length > 0 && 
                nodeState.strangeAttractors.includes(attractor)) {
              transformations.push({
                type: 'expand',
                selector: paragraphs[0],
                replacement: `The concept of ${attractor.replace('-', ' ')} resonates with you.`
              });
            }
          }
          break;
      }
    });
    
    return transformations;
  }
}

/**
 * Helper function to escape special regex characters in a string
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Export a singleton instance for use throughout the application
export const transformationService = new TransformationService();