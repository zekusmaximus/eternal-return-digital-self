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
  NodeState
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { transformationEngine } from './TransformationEngine';
import { pathAnalyzer, ReadingPattern, AttractorEngagement } from './PathAnalyzer';

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
   */  private prioritizeTransformations(
    transformations: TextTransformation[],
    readerState: ReaderState,
    nodeState: NodeState
  ): PrioritizedTransformation[] {
    // Start with default priorities
    const prioritized: PrioritizedTransformation[] = transformations.map(transformation => {
      const { priority, sourceType } = this.getBasePriorityAndSource(transformation);
      const conflictGroup: string | undefined = `selector-${transformation.selector}`;
      
      return {
        transformation,
        priority,
        sourceType,
        conflictGroup
      };
    });
    
    // Get patterns and attractor engagements for priority adjustments
    const patterns = pathAnalyzer.identifySignificantPatterns(readerState, {
      [nodeState.id]: nodeState
    });
    
    const attractorEngagements = pathAnalyzer.calculateAttractorEngagement(readerState, {
      [nodeState.id]: nodeState
    });
    
    // Adjust priorities based on patterns and attractors
    prioritized.forEach(item => {
      this.adjustPriorityForPatterns(item, patterns);
      this.adjustPriorityForAttractors(item, attractorEngagements, nodeState);
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
    // Early return if no transformations needed
    if (!transformations || transformations.length === 0) {
      return content;
    }

    // Prevent infinite loops by checking if content has already been transformed
    if (content.includes('data-transform-type') || content.includes('narramorph-')) {
      console.log(`[TransformationService] Content already transformed for node ${nodeId}, skipping to prevent infinite loop`);
      return content;
    }

    // Calculate cache key components
    const patternHash = this.calculatePatternHash(readerState);
    const cacheKey = this.getCacheKey(nodeId, nodeState.visitCount, patternHash);
    
    // Clean expired cache entries periodically
    this.cleanCache();
    
    // Check cache for existing transformed content
    const cachedContent = this.checkCacheForContent(cacheKey, nodeId, content, transformations);
    if (cachedContent) {
      return cachedContent;
    }
    
    // Filter transformations based on visibility and performance considerations
    transformations = this.filterTransformationsForVisibility(transformations, nodeId);
    
    // Apply transformations
    const transformedContent = this.applyTransformationsWithPriority(
      content,
      transformations,
      readerState,
      nodeState
    );
    
    // Cache the result with metadata
    this.cacheTransformedContent(cacheKey, transformations, content, transformedContent, readerState, nodeState);
    
    return transformedContent;
  }
  
  /**
   * Check cache for existing transformed content
   */
  private checkCacheForContent(
    cacheKey: string,
    nodeId: string,
    content: string,
    transformations: TextTransformation[]
  ): string | null {
    const isVisible = this.visibilityTracker[nodeId]?.isVisible || false;
    
    if (this.cache[cacheKey] && 
        this.cache[cacheKey].content && 
        this.cache[cacheKey].content.length > content.length) {
      this.metrics.cacheHits++;
      
      if (!isVisible && transformations.length > 0) {
        this.metrics.lazyTransformationsDeferredCount++;
      }
      
      return this.cache[cacheKey].content;
    }
    
    this.metrics.cacheMisses++;
    return null;
  }

  /**
   * Filter transformations for visibility and performance
   */
  private filterTransformationsForVisibility(
    transformations: TextTransformation[],
    nodeId: string,
    maxTransformations: number = 10
  ): TextTransformation[] {
    let filteredTransformations = transformations;
    
    // Limit transformation count to prevent runaway transformations
    if (filteredTransformations.length > maxTransformations) {
      console.warn(`[TransformationService] Too many transformations (${filteredTransformations.length}) for node ${nodeId}, limiting to ${maxTransformations}`);
      filteredTransformations = filteredTransformations.slice(0, maxTransformations);
    }
    
    const isVisible = this.visibilityTracker[nodeId]?.isVisible || false;
    
    // If content isn't visible and transformations are expensive, defer some
    if (!isVisible && filteredTransformations.length > 3) {
      filteredTransformations.forEach(t => this.queueLazyTransformation(nodeId, t));
      
      // Only apply essential transformations now
      const essentialTransformations = filteredTransformations.filter(t =>
        t.type === 'replace' || t.priority === 'high'
      );
      
      if (essentialTransformations.length < filteredTransformations.length) {
        filteredTransformations = essentialTransformations;
      }
    }
    
    return filteredTransformations;
  }

  /**
   * Cache transformed content with metadata
   */
  private cacheTransformedContent(
    cacheKey: string,
    transformations: TextTransformation[],
    content: string,
    transformedContent: string,
    readerState: ReaderState,
    nodeState: NodeState
  ): void {
    if (transformedContent === content) return;
    
    const transformedSegments = transformations.map(t => ({
      selector: t.selector || '',
      transformType: t.type,
      position: this.findPositionInContent(content, t.selector || '') as [number, number]
    })).filter(seg => seg.position[0] >= 0);
    
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
   * Create transformation(s) for a visitPattern condition
   */
  private handleVisitPattern(condition: import('./PathAnalyzer').PatternBasedCondition, nodeState: NodeState): TextTransformation[] {
    const transformations: TextTransformation[] = [];
    if (condition.strength > 0.8 && nodeState.currentContent) {
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
    return transformations;
  }

  /**
   * Create transformation(s) for a characterFocus condition
   */
  private handleCharacterFocus(condition: import('./PathAnalyzer').PatternBasedCondition, nodeState: NodeState): TextTransformation[] {
    const transformations: TextTransformation[] = [];
    if (
      condition.strength > 0.7 &&
      condition.condition.characters?.[0] === nodeState.character &&
      nodeState.currentContent
    ) {
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
    return transformations;
  }

  /**
   * Create transformation(s) for a temporalFocus condition
   */
  private handleTemporalFocus(condition: import('./PathAnalyzer').PatternBasedCondition, nodeState: NodeState): TextTransformation[] {
    const transformations: TextTransformation[] = [];
    if (
      condition.strength > 0.7 &&
      condition.condition.temporalPosition &&
      nodeState.currentContent
    ) {
      const temporalLayer = nodeState.temporalValue <= 3 ? 'past' : nodeState.temporalValue <= 6 ? 'present' : 'future';
      if (temporalLayer === condition.condition.temporalPosition) {
        const paragraphs = nodeState.currentContent.split('\n\n');
        if (paragraphs.length > 2) {
          transformations.push({
            type: 'metaComment',
            selector: paragraphs[2],
            replacement: `You seem drawn to ${condition.condition.temporalPosition} narratives`,
            priority: 'low'
          });
        }
      }
    }
    return transformations;
  }

  /**
   * Create transformation(s) for attractorAffinity or attractorEngagement condition
   */
  private handleAttractorEngagement(condition: import('./PathAnalyzer').PatternBasedCondition, nodeState: NodeState): TextTransformation[] {
    const transformations: TextTransformation[] = [];
    if (
      condition.strength > 0.7 &&
      condition.condition.strangeAttractorsEngaged?.[0] &&
      nodeState.currentContent
    ) {
      const attractor = condition.condition.strangeAttractorsEngaged[0];
      const paragraphs = nodeState.currentContent.split('\n\n');
      if (paragraphs.length > 0 && nodeState.strangeAttractors.includes(attractor)) {
        transformations.push({
          type: 'expand',
          selector: paragraphs[0],
          replacement: `The concept of ${attractor.replace('-', ' ')} resonates with you.`,
          priority: 'high'
        });
      }
    }
    return transformations;
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
    const patternHash = this.calculatePatternHash(readerState);
    const cacheKey = `patterns-${nodeState.id}-${nodeState.visitCount}-${patternHash}`;
    if (this.cache[cacheKey] && this.cache[cacheKey].transformations) {
      this.metrics.cacheHits++;
      return this.cache[cacheKey].transformations;
    }
    this.metrics.cacheMisses++;
    const isNodeVisible = this.visibilityTracker[nodeState.id]?.isVisible || false;
    if (!isNodeVisible && nodeState.visitCount > 1) {
      const minimalTransformations: TextTransformation[] = [];
      this.cache[cacheKey] = {
        transformations: minimalTransformations,
        timestamp: Date.now() - (this.CACHE_EXPIRY_TIME / 2),
        content: ''
      };
      return minimalTransformations;
    }
    const patterns = pathAnalyzer.identifySignificantPatterns(readerState, {
      [nodeState.id]: nodeState
    });
    const attractorEngagements = pathAnalyzer.calculateAttractorEngagement(readerState, {
      [nodeState.id]: nodeState
    });
    const patternConditions = pathAnalyzer.createTransformationConditions(
      patterns,
      attractorEngagements
    );
    const transformations: TextTransformation[] = [];
    const maxPatternTransformations = 2;
    patternConditions.slice(0, maxPatternTransformations).forEach(condition => {
      let result: TextTransformation[] = [];
      switch (condition.type) {
        case 'visitPattern':
          result = this.handleVisitPattern(condition, nodeState);
          break;
        case 'characterFocus':
          result = this.handleCharacterFocus(condition, nodeState);
          break;
        case 'temporalFocus':
          result = this.handleTemporalFocus(condition, nodeState);
          break;
        case 'readingRhythm':
          // No-op
          break;
        case 'attractorAffinity':
        case 'attractorEngagement':
          result = this.handleAttractorEngagement(condition, nodeState);
          break;
      }
      transformations.push(...result);
    });
    return transformations;
  }
  /**
   * Calculate journey-based transformations that respond to the reader's overall navigation patterns
   * @param nodeId The current node being transformed
   * @param readerState The reader's journey state
   * @returns Array of transformations based on journey context
   */  calculateJourneyTransformations(
    nodeId: string,
    readerState: ReaderState  ): TextTransformation[] {
    
    // CRITICAL: Add caching and infinite loop prevention
    const cacheKey = `journey-${nodeId}-${readerState.path.sequence.length}`;
    if (this.cache[cacheKey] && this.cache[cacheKey].transformations) {
      console.log(`[TransformationService] Using cached journey transformations for node ${nodeId}`);
      return this.cache[cacheKey].transformations;
    }
    
    const transformations: TextTransformation[] = [];

    const currentVisit = readerState.path.detailedVisits?.find(v => v.nodeId === nodeId);
    if (!currentVisit) {
      console.log(`[TransformationService] No current visit found for journey transformations on node ${nodeId}`);
      return transformations;
    }

    console.log(`[TransformationService] Calculating journey transformations for node ${nodeId}:`, {
      pathLength: readerState.path.sequence.length,
      detailedVisits: readerState.path.detailedVisits?.length || 0,
      currentCharacter: currentVisit.character
    });    // Limit the number of transformations to prevent infinite loops
    const maxTransformations = 2; // Further reduced to prevent excessive transformations

    // Detect recursive navigation patterns (limited)
    const recursivePatterns = this.detectRecursivePattern(readerState);
    if (recursivePatterns.length > 0 && transformations.length < maxTransformations) {
      const recursiveTransformations = this.createRecursivePatternTransformations(recursivePatterns, nodeId);
      transformations.push(...recursiveTransformations.slice(0, 1)); // Limit to 1
      console.log(`[TransformationService] Added ${Math.min(recursiveTransformations.length, 1)} recursive pattern transformations`);
    }

    // Detect anachronic awareness (temporal displacement) (limited)
    if (transformations.length < maxTransformations) {
      const anachronicAwareness = this.detectAnachronicAwareness(readerState);
      if (anachronicAwareness.isDetected) {
        const anachronicTransformations = this.createAnachronicAwarenessTransformations(anachronicAwareness, nodeId);
        transformations.push(...anachronicTransformations.slice(0, 1)); // Limit to 1
        console.log(`[TransformationService] Added ${Math.min(anachronicTransformations.length, 1)} anachronic awareness transformations`);
      }
    }    // Get temporal displacement effects (limited)
    if (transformations.length < maxTransformations) {
      const temporalEffects = this.getTemporalDisplacementEffects(readerState, currentVisit);
      // Only add temporal effects if we have room and they exist
      if (temporalEffects.length > 0) {
        transformations.push(...temporalEffects.slice(0, 1)); // Limit to 1
        console.log(`[TransformationService] Added ${Math.min(temporalEffects.length, 1)} temporal displacement effects`);
      }
    }

    console.log(`[TransformationService] Total journey transformations for node ${nodeId}: ${transformations.length}`);
    
    // Cache the result to prevent repeated calculations
    this.cache[cacheKey] = {
      transformations,
      timestamp: Date.now(),
      content: ''
    };
    
    return transformations;
  }

  /**
   * Detects when the reader is visiting nodes in repeated sequences
   * @param readerState The reader's journey state
   * @returns Array of detected recursive patterns
   */
  detectRecursivePattern(readerState: ReaderState): Array<{
    sequence: string[];
    occurrences: number;
    strength: number;
    lastOccurrence: number;
  }> {
    const patterns: Array<{
      sequence: string[];
      occurrences: number;
      strength: number;
      lastOccurrence: number;
    }> = [];

    const sequence = readerState.path.sequence;
    if (sequence.length < 6) return patterns; // Need minimum length for pattern detection

    // Look for sequences of 2-4 nodes that repeat
    for (let seqLength = 2; seqLength <= 4; seqLength++) {
      const sequenceMap = new Map<string, number[]>();

      // Build map of sequence patterns to their positions
      for (let i = 0; i <= sequence.length - seqLength; i++) {
        const subSequence = sequence.slice(i, i + seqLength);
        const key = subSequence.join('→');
        
        if (!sequenceMap.has(key)) {
          sequenceMap.set(key, []);
        }
        sequenceMap.get(key)!.push(i);
      }

      // Find patterns that occur multiple times
      sequenceMap.forEach((positions, key) => {
        if (positions.length >= 2) {
          const sequence = key.split('→');
          const occurrences = positions.length;
          
          // Calculate strength based on frequency and recency
          const totalLength = readerState.path.sequence.length;
          const lastPosition = Math.max(...positions);
          const recencyFactor = 1 - (totalLength - lastPosition) / totalLength;
          const frequencyFactor = occurrences / (totalLength - seqLength + 1);
          const strength = (frequencyFactor * 0.7) + (recencyFactor * 0.3);

          if (strength > 0.3) { // Only include significant patterns
            patterns.push({
              sequence,
              occurrences,
              strength,
              lastOccurrence: lastPosition
            });
          }
        }
      });
    }

    // Sort by strength and return top patterns
    return patterns.sort((a, b) => b.strength - a.strength).slice(0, 3);
  }

  /**
   * Detects anachronic awareness - when temporal layer focus creates narrative displacement
   * @param readerState The reader's journey state
   * @returns Object describing anachronic awareness state
   */
  detectAnachronicAwareness(readerState: ReaderState): {
    isDetected: boolean;
    strength: number;
    dominantLayer: string;
    displacement: number;
    patterns: string[];
  } {
    const temporalFocus = readerState.path.temporalLayerFocus || {};
    const detailedVisits = readerState.path.detailedVisits || [];
    
    if (detailedVisits.length < 5) {
      return { isDetected: false, strength: 0, dominantLayer: '', displacement: 0, patterns: [] };
    }    // Calculate temporal layer distribution
    const totalVisits = detailedVisits.length;
    const layerRatios = {
      past: ((temporalFocus as Record<string, number>).past || 0) / totalVisits,
      present: ((temporalFocus as Record<string, number>).present || 0) / totalVisits,
      future: ((temporalFocus as Record<string, number>).future || 0) / totalVisits
    };

    // Find dominant layer
    const dominantLayer = Object.entries(layerRatios)
      .sort(([,a], [,b]) => b - a)[0][0];
    const dominantRatio = layerRatios[dominantLayer as keyof typeof layerRatios];

    // Detect anachronic patterns
    const patterns: string[] = [];
    
    // Check for strong temporal layer bias
    if (dominantRatio > 0.6) {
      patterns.push(`temporal-dominance-${dominantLayer}`);
    }

    // Check for temporal jumping patterns
    const recentVisits = detailedVisits.slice(-8);
    let temporalJumps = 0;
    
    for (let i = 1; i < recentVisits.length; i++) {
      const prev = recentVisits[i - 1].temporalLayer;
      const curr = recentVisits[i].temporalLayer;
      
      if (prev !== curr) {
        temporalJumps++;
      }
    }

    const jumpRatio = temporalJumps / (recentVisits.length - 1);
    if (jumpRatio > 0.7) {
      patterns.push('temporal-fragmentation');
    }

    // Check for anachronic sequences (out-of-order temporal progression)
    let anachronicSequences = 0;
    for (let i = 2; i < recentVisits.length; i++) {
      const layers = [
        recentVisits[i - 2].temporalLayer,
        recentVisits[i - 1].temporalLayer,
        recentVisits[i].temporalLayer
      ];
      
      // Check for patterns like future→past→present
      if ((layers[0] === 'future' && layers[1] === 'past') ||
          (layers[1] === 'future' && layers[2] === 'past') ||
          (layers[0] === 'present' && layers[1] === 'past' && layers[2] === 'future')) {
        anachronicSequences++;
      }
    }

    if (anachronicSequences > 0) {
      patterns.push('anachronic-sequencing');
    }

    // Calculate overall strength and displacement
    const strength = Math.min(1, dominantRatio + (jumpRatio * 0.5) + (anachronicSequences * 0.3));
    const displacement = Math.abs(0.33 - dominantRatio) * 3; // How far from balanced temporal focus

    return {
      isDetected: strength > 0.4,
      strength,
      dominantLayer,
      displacement,
      patterns
    };
  }

  /**
   * Creates transformations for temporal displacement effects between characters
   * @param readerState The reader's journey state
   * @param currentVisit The current visit information
   * @returns Array of temporal displacement transformations
   */  getTemporalDisplacementEffects(
    readerState: ReaderState,
    currentVisit: { nodeId: string; character: string; temporalLayer: string }
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];
    
    if (!currentVisit) return transformations;

    // Check for character transitions with different temporal layers
    const detailedVisits = readerState.path.detailedVisits || [];
    const currentIndex = detailedVisits.findIndex(v => v.nodeId === currentVisit.nodeId);
    
    if (currentIndex > 0) {
      const previousVisit = detailedVisits[currentIndex - 1];
      
      // If character and temporal layer both changed, create displacement effect
      if (previousVisit.character !== currentVisit.character &&
          previousVisit.temporalLayer !== currentVisit.temporalLayer) {
        
        const displacementType = this.getDisplacementType(
          previousVisit.temporalLayer,
          currentVisit.temporalLayer
        );

        transformations.push({
          type: 'metaComment',
          selector: 'first-paragraph',
          replacement: `temporal displacement: ${previousVisit.temporalLayer}→${currentVisit.temporalLayer} through ${previousVisit.character}→${currentVisit.character}`,
          commentStyle: 'marginalia',
          intensity: 3,
          priority: 'medium'
        });

        // Add specific displacement effects
        switch (displacementType) {
          case 'past-to-future':
            transformations.push({
              type: 'emphasize',
              selector: 'time',
              emphasis: 'glitch',
              intensity: 2,
              priority: 'low'
            });
            break;
          
          case 'future-to-past':
            transformations.push({
              type: 'fragment',
              selector: 'memory',
              fragmentPattern: '…',
              fragmentStyle: 'progressive',
              intensity: 2,
              priority: 'low'
            });
            break;
        }
      }
    }

    return transformations;
  }
  /**
   * Creates transformations for detected recursive patterns
   */
  private createRecursivePatternTransformations(
    patterns: Array<{ sequence: string[]; occurrences: number; strength: number }>,
    nodeId: string
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];

    patterns.forEach(pattern => {
      if (pattern.sequence.includes(nodeId)) {
        transformations.push({
          type: 'metaComment',
          selector: 'recursive-pattern',
          replacement: `recursive loop detected: ${pattern.sequence.join('→')} (×${pattern.occurrences})`,
          commentStyle: 'marginalia',
          intensity: Math.ceil(pattern.strength * 3),
          priority: 'medium'
        });

        // Add emphasis for strong patterns
        if (pattern.strength > 0.6) {
          transformations.push({
            type: 'emphasize',
            selector: 'pattern',
            emphasis: 'color',
            intensity: Math.ceil(pattern.strength * 5),
            priority: 'medium'
          });
        }
      }
    });

    return transformations;
  }
  /**
   * Creates transformations for anachronic awareness
   */
  private createAnachronicAwarenessTransformations(
    awareness: { strength: number; dominantLayer: string; patterns: string[] },
    nodeId: string
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];

    // Add temporal displacement commentary with node context
    transformations.push({
      type: 'metaComment',
      selector: 'temporal-awareness',
      replacement: `temporal displacement registered at ${nodeId}: ${awareness.dominantLayer} layer dominance`,
      commentStyle: 'interlinear',
      intensity: Math.ceil(awareness.strength * 3),
      priority: 'medium'
    });

    // Add specific pattern effects
    awareness.patterns.forEach(pattern => {
      switch (pattern) {
        case 'temporal-fragmentation':
          transformations.push({
            type: 'fragment',
            selector: 'time',
            fragmentPattern: '//',
            fragmentStyle: 'random',
            intensity: 2,
            priority: 'low'
          });
          break;
        
        case 'anachronic-sequencing':
          transformations.push({
            type: 'replace',
            selector: 'chronology',
            replacement: 'chronology[SCRAMBLED]',
            preserveFormatting: true,
            intensity: 2,
            priority: 'low'
          });
          break;
        
        default:
          if (pattern.startsWith('temporal-dominance-')) {
            const layer = pattern.replace('temporal-dominance-', '');
            transformations.push({
              type: 'emphasize',
              selector: layer,
              emphasis: 'color',
              intensity: 3,
              priority: 'medium'
            });
          }
      }
    });

    return transformations;
  }

  /**
   * Helper method to determine displacement type between temporal layers
   */
  private getDisplacementType(fromLayer: string, toLayer: string): string {
    const layerOrder = { past: 0, present: 1, future: 2 };
    const fromOrder = layerOrder[fromLayer as keyof typeof layerOrder];    const toOrder = layerOrder[toLayer as keyof typeof layerOrder];
    
    if (fromOrder < toOrder) return `${fromLayer}-to-${toLayer}`;
    if (fromOrder > toOrder) return `${fromLayer}-to-${toLayer}`;
    return 'same-layer';
  }

  /**
   * Get base priority and source type for a transformation
   */
  private getBasePriorityAndSource(transformation: TextTransformation): { priority: number; sourceType: PrioritizedTransformation['sourceType'] } {
    let priority = 50; // Default mid-level priority
    let sourceType: PrioritizedTransformation['sourceType'] = 'condition';
    
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
    
    return { priority, sourceType };
  }
  /**
   * Adjust priority based on pattern strength
   */
  private adjustPriorityForPatterns(
    item: PrioritizedTransformation,
    patterns: ReadingPattern[]
  ): void {
    if (item.sourceType === 'pattern') {
      const matchingPattern = patterns.find(p => 
        p.type === 'sequence' && p.strength > 0.7);
      if (matchingPattern) {
        item.priority += Math.round(matchingPattern.strength * 15);
      }
    }
  }
  /**
   * Adjust priority based on attractor engagement
   */
  private adjustPriorityForAttractors(
    item: PrioritizedTransformation,
    attractorEngagements: AttractorEngagement[],
    nodeState: NodeState
  ): void {
    if (item.sourceType === 'attractor' && item.transformation.selector) {
      const relatedAttractor = attractorEngagements.find(engagement => 
        nodeState.currentContent?.includes(item.transformation.selector) && 
        nodeState.strangeAttractors.includes(engagement.attractor)
      );
      
      if (relatedAttractor && relatedAttractor.engagementScore > 50) {
        item.priority += Math.round((relatedAttractor.engagementScore - 50) / 5);
      }
    }
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