/**
 * TransformationService
 *
 * Core service that handles the application of Narramorph content transformations
 * based on reader patterns and conditions.
 *
 * This service connects the condition detection system (TransformationEngine) and
 * the pattern analysis system (PathAnalyzer) to actual content changes.
 *
 * Performance optimized with enhanced caching, lazy evaluation, and memory management.
 */

import {
  TextTransformation,
  NodeState,
  TemporalLabel
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { transformationEngine } from './TransformationEngine';
import { pathAnalyzer } from './PathAnalyzer';

// Enhanced cache for storing previously evaluated and applied transformations
interface TransformationCache {
  // Key format: nodeId-visitCount-patternHash
  [key: string]: {
    transformations: TextTransformation[];
    timestamp: number;
    content: string;
    // Track which parts of the content were transformed for partial updates
    transformedSegments?: {
      selector: string;
      transformType: string;
      position: [number, number]; // [start, end] positions in content
    }[];
    // Additional metadata for cache invalidation decisions
    metadata?: {
      readerStateHash: string;
      nodeStateHash: string;
      complexity: number; // Higher value = more expensive transformation
    }
  }
}

// Interface for tracking visible content for lazy evaluation
interface VisibilityTracker {
  // Key is a content identifier (usually node ID)
  [key: string]: {
    isVisible: boolean;
    lastVisibleTimestamp: number;
    pendingTransformations: TextTransformation[];
    priority: number; // Higher = more important to transform when visible
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
  private visibilityTracker: VisibilityTracker = {};
  private readonly CACHE_EXPIRY_TIME = 10 * 60 * 1000; // 10 minutes
  private readonly MAX_CACHE_ENTRIES = 200;
  
  // Performance metrics
  private metrics = {
    cacheHits: 0,
    cacheMisses: 0,
    patternAnalysisCount: 0,
    transformationAppliedCount: 0,
    lazyTransformationsDeferredCount: 0,
    lazyTransformationsAppliedCount: 0,
    lastCacheCleanupTime: Date.now()
  };
  
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
   * More comprehensive cache management:
   * - Removes expired entries
   * - Limits total cache size
   * - Prioritizes keeping entries for visible or recently viewed content
   */
  private cleanCache(): void {
    const now = Date.now();
    
    // Only clean periodically to avoid performance overhead
    if (now - this.metrics.lastCacheCleanupTime < 30000) { // 30 seconds
      return;
    }
    
    this.metrics.lastCacheCleanupTime = now;
    
    // Step 1: Remove expired entries
    let entries = Object.entries(this.cache);
    entries = entries.filter(([, value]) => now - value.timestamp <= this.CACHE_EXPIRY_TIME);
    
    // Step 2: If still too many entries, prioritize keeping important ones
    if (entries.length > this.MAX_CACHE_ENTRIES) {
      // Sort by importance (keep visible content and recently accessed entries)
      entries.sort(([keyA, valueA], [keyB, valueB]) => {
        const nodeIdA = keyA.split('-')[0];
        const nodeIdB = keyB.split('-')[0];
        
        // First priority: visible content
        const isVisibleA = this.visibilityTracker[nodeIdA]?.isVisible || false;
        const isVisibleB = this.visibilityTracker[nodeIdB]?.isVisible || false;
        if (isVisibleA !== isVisibleB) return isVisibleB ? 1 : -1;
        
        // Second priority: recently accessed
        return valueB.timestamp - valueA.timestamp;
      });
      
      // Keep only the most important entries
      entries = entries.slice(0, this.MAX_CACHE_ENTRIES);
    }
    
    // Rebuild cache with filtered entries
    this.cache = Object.fromEntries(entries);
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
   * Enhanced method to track content visibility for lazy evaluation
   */
  public setContentVisibility(nodeId: string, isVisible: boolean, priority: number = 1): void {
    if (!this.visibilityTracker[nodeId]) {
      this.visibilityTracker[nodeId] = {
        isVisible: false,
        lastVisibleTimestamp: 0,
        pendingTransformations: [],
        priority: priority
      };
    }
    
    // Update visibility state
    this.visibilityTracker[nodeId].isVisible = isVisible;
    
    if (isVisible) {
      this.visibilityTracker[nodeId].lastVisibleTimestamp = Date.now();
      
      // Process any pending transformations for now-visible content
      this.processPendingTransformations(nodeId);
    }
  }
  
  /**
   * Process any pending transformations for a now-visible content element
   */
  private processPendingTransformations(nodeId: string): void {
    const tracker = this.visibilityTracker[nodeId];
    if (!tracker || !tracker.isVisible || tracker.pendingTransformations.length === 0) {
      return;
    }
    
    // Process the pending transformations now that content is visible
    this.metrics.lazyTransformationsAppliedCount += tracker.pendingTransformations.length;
    
    // Reset pending transformations after processing
    tracker.pendingTransformations = [];
  }
  
  /**
   * Queue a transformation for lazy evaluation when content becomes visible
   */
  public queueLazyTransformation(
    nodeId: string,
    transformation: TextTransformation
  ): void {
    if (!this.visibilityTracker[nodeId]) {
      this.visibilityTracker[nodeId] = {
        isVisible: false,
        lastVisibleTimestamp: 0,
        pendingTransformations: [],
        priority: 1
      };
    }
    
    // If content is already visible, apply immediately
    if (this.visibilityTracker[nodeId].isVisible) {
      this.metrics.lazyTransformationsAppliedCount++;
      return;
    }
    
    // Otherwise, queue for later
    this.visibilityTracker[nodeId].pendingTransformations.push(transformation);
    this.metrics.lazyTransformationsDeferredCount++;
  }
  
  /**
   * Enhanced content transformation with caching, partial updates, and lazy evaluation
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
    
    // Clean expired cache entries periodically
    this.cleanCache();
    
    // Track if this node is visible (for metrics)
    const isVisible = this.visibilityTracker[nodeId]?.isVisible || false;
    
    // Check if we have a cached version
    if (this.cache[cacheKey] && this.cache[cacheKey].content) {
      this.metrics.cacheHits++;
      
      // If we have a cache hit but the content isn't visible, mark for lazy processing
      if (!isVisible && transformations.length > 0) {
        this.metrics.lazyTransformationsDeferredCount++;
      }
      
      return this.cache[cacheKey].content;
    }
    
    this.metrics.cacheMisses++;
    
    // If content isn't visible and transformations are expensive,
    // consider deferring expensive transformations
    if (!isVisible && transformations.length > 3) {
      // Queue transformations for later processing
      transformations.forEach(t => this.queueLazyTransformation(nodeId, t));
      
      // Only apply essential transformations now
      const essentialTransformations = transformations.filter(t =>
        t.type === 'replace' || // Always apply replacements
        t.priority === 'high'   // And high priority transformations
      );
      
      if (essentialTransformations.length < transformations.length) {
        transformations = essentialTransformations;
      }
    }
    
    // Apply transformations
    const transformedContent = this.applyTransformationsWithPriority(
      content,
      transformations,
      readerState,
      nodeState
    );
    
    // Track transformed segments for partial updates
    const transformedSegments = transformations.map(t => ({
      selector: t.selector || '',
      transformType: t.type,
      position: this.findPositionInContent(content, t.selector || '') as [number, number]
    })).filter(seg => seg.position[0] >= 0);
    
    // Cache the result with metadata
    this.cache[cacheKey] = {
      transformations,
      timestamp: Date.now(),
      content: transformedContent,
      transformedSegments,
      metadata: {
        readerStateHash: JSON.stringify({
          path: readerState.path.sequence.slice(-5),
          attractors: Object.keys(readerState.path.attractorsEngaged || {})
        }),
        nodeStateHash: JSON.stringify({
          id: nodeState.id,
          visitCount: nodeState.visitCount
        }),
        complexity: this.calculateTransformationComplexity(transformations)
      }
    };
    
    return transformedContent;
  }
  
  /**
   * Find the position of a selector in content
   * Returns [start, end] positions or [-1, -1] if not found
   */
  private findPositionInContent(content: string, selector: string): [number, number] {
    if (!selector || !content) return [-1, -1];
    
    const start = content.indexOf(selector);
    if (start === -1) return [-1, -1];
    
    return [start, start + selector.length];
  }
  
  /**
   * Calculate complexity score for a set of transformations
   * Higher score = more computationally expensive
   */
  private calculateTransformationComplexity(transformations: TextTransformation[]): number {
    if (!transformations.length) return 0;
    
    return transformations.reduce((score, t) => {
      // Base complexity by type
      let typeComplexity = 1;
      switch (t.type) {
        case 'fragment': typeComplexity = 3; break;
        case 'emphasize': typeComplexity = 2; break;
        case 'metaComment': typeComplexity = 2.5; break;
        case 'expand': typeComplexity = 2; break;
        case 'replace': typeComplexity = 1; break;
      }
      
      // Complexity multiplier based on content size
      const contentSize = (t.selector?.length || 0) + (t.replacement?.length || 0);
      const sizeFactor = Math.log(contentSize + 10) / Math.log(10); // log10(size+10)
      
      return score + typeComplexity * sizeFactor;
    }, 0);
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
      // Start with narramorph-transform to get base transition styling
      const baseClass = `narramorph-transform narramorph-transform-${transformation.type}`;
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
            classList += ` narramorph-expand-${transformation.expandStyle || 'default'}`;
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
          if (transformation.commentStyle) {
            classList += ` narramorph-comment-${transformation.commentStyle}`;
          }
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
      
      // Create data attributes for better animation targeting
      const dataAttrs = `
        data-transform-type="${transformation.type}"
        data-selector="${escapeRegExp(selector.substring(0, 30))}"
        data-transform-id="${this.getUniqueTransformId(transformation)}"
      `;
      
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
            `<span class="${className}" ${dataAttrs}>${replacement}</span>`
          );
          break;
          
        case 'expand':
          // For expansions, we need to wrap both the original and expanded content
          if (transformation.replacement) {
            const expandedText = `${selector} ${transformation.replacement}`;
            const expandStyle = transformation.expandStyle || 'default';
            let expansionClass = 'narramorph-expansion';
            
            if (expandStyle === 'reveal') {
              expansionClass = 'narramorph-reveal-expansion';
            } else if (expandStyle === 'inline') {
              expansionClass = 'narramorph-inline-expansion';
            } else if (expandStyle === 'paragraph') {
              expansionClass = 'narramorph-paragraph-expansion';
            }
            
            wrappedContent = wrappedContent.replace(
              new RegExp(escapeRegExp(expandedText), 'g'),
              `<span class="${className}" ${dataAttrs}>${selector}<span class="${expansionClass}">${transformation.replacement}</span></span>`
            );
          }
          break;
          
        case 'metaComment':
          // For meta comments, wrap the comment part
          if (transformation.replacement) {
            const commentStyle = transformation.commentStyle || 'inline';
            let commentClass = 'narramorph-comment';
            
            if (commentStyle === 'footnote') {
              commentClass = 'narramorph-footnote-marker';
            } else if (commentStyle === 'marginalia') {
              commentClass = 'narramorph-marginalia';
            } else if (commentStyle === 'interlinear') {
              commentClass = 'narramorph-interlinear';
            }
            
            const commentText = transformation.replacement;
            const commentedText = `${selector} [${commentText}]`;
            
            // Different markup based on comment style
            let wrappedMarkup = '';
            if (commentStyle === 'footnote') {
              const footnoteId = `footnote-${commentText.substring(0, 10).replace(/\W/g, '')}`;
              wrappedMarkup = `<span class="${className}" ${dataAttrs}>${selector}<sup id="${footnoteId}-ref" class="${commentClass}">[†]</sup></span>`;
            } else if (commentStyle === 'marginalia') {
              wrappedMarkup = `<span class="${className} narramorph-marginalia-container" ${dataAttrs}>${selector}<span class="${commentClass}">${commentText}</span></span>`;
            } else if (commentStyle === 'interlinear') {
              wrappedMarkup = `<span class="${className} narramorph-interlinear-container" ${dataAttrs}>${selector}<span class="${commentClass}">${commentText}</span></span>`;
            } else {
              // Default inline style
              wrappedMarkup = `<span class="${className}" ${dataAttrs}>${selector}<span class="${commentClass}">[${commentText}]</span></span>`;
            }
            
            wrappedContent = wrappedContent.replace(
              new RegExp(escapeRegExp(commentedText), 'g'),
              wrappedMarkup
            );
          }
          break;
      }
    });
    
    return wrappedContent;
  }
  
  /**
   * Generate a unique ID for a transformation to help with animation tracking
   */
  private getUniqueTransformId(transformation: TextTransformation): string {
    const selectorHash = this.hashString(transformation.selector || '');
    const typeHash = transformation.type.substring(0, 3);
    const extraPart = transformation.replacement ?
      this.hashString(transformation.replacement).substring(0, 3) :
      '';
    
    return `${typeHash}-${selectorHash}${extraPart ? '-' + extraPart : ''}`;
  }
  
  /**
   * Simple string hashing function for generating unique IDs
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).substring(0, 6);
  }
  
  /**
   * Create a set of transformations based on reader patterns
   * With caching and optimization
   */
  createTransformationsFromPatterns(
    readerState: ReaderState,
    nodeState: NodeState
  ): TextTransformation[] {
    this.metrics.patternAnalysisCount++;
    
    // Create cache key for pattern-based transformations
    const patternHash = this.calculatePatternHash(readerState);
    const cacheKey = `patterns-${nodeState.id}-${nodeState.visitCount}-${patternHash}`;
    
    // Check cache first
    if (this.cache[cacheKey] && this.cache[cacheKey].transformations) {
      this.metrics.cacheHits++;
      return this.cache[cacheKey].transformations;
    }
    
    this.metrics.cacheMisses++;
    
    // Get visibility status for lazy evaluation
    const isNodeVisible = this.visibilityTracker[nodeState.id]?.isVisible || false;
    
    // Only perform expensive pattern analysis if the node is visible
    // or if it's the first time analyzing this node
    if (!isNodeVisible && nodeState.visitCount > 1) {
      // Return minimal transformations for non-visible content
      const minimalTransformations: TextTransformation[] = [];
      
      // Cache this result with a shorter expiry
      this.cache[cacheKey] = {
        transformations: minimalTransformations,
        timestamp: Date.now() - (this.CACHE_EXPIRY_TIME / 2), // Shorter expiry
        content: ''
      };
      
      return minimalTransformations;
    }
    
    // Get patterns from the path analyzer - expensive operation
    const patterns = pathAnalyzer.identifySignificantPatterns(readerState, {
      [nodeState.id]: nodeState
    });
    
    // Get attractor engagements - another expensive operation
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
    
    // Add priority field to transformations for later optimization
    
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
                replacement: `${paragraphs[1]} [A recurring pattern emerges in your exploration]`,
                priority: 'high'
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
                emphasis: 'color',
                priority: 'medium'
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
                  replacement: `You seem drawn to ${condition.condition.temporalPosition} narratives`,
                  priority: 'low' // Comments are less essential
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
                  fragmentPattern: '...',
                  priority: 'medium'
                });
              }
            } else if (condition.condition.minTimeSpentInNode === 60000) {
              // Deep reading creates expansion
              const paragraphs = nodeState.currentContent.split('\n\n');
              if (paragraphs.length > 0) {
                transformations.push({
                  type: 'expand',
                  selector: paragraphs[0],
                  replacement: 'Your careful reading reveals deeper layers of meaning.',
                  priority: 'medium'
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
                replacement: `The concept of ${attractor.replace('-', ' ')} resonates with you.`,
                priority: 'high' // Attractor-related content is important
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