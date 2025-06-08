/**
 * TransformationPriorityQueue
 *
 * Utility for managing prioritized transformations and resolving conflicts
 * in the Narramorph content transformation system.
 *
 * Performance optimized with:
 * - Lazy evaluation strategy
 * - Visibility-based prioritization
 * - Advanced caching mechanism
 * - Memory efficient processing
 */

import { TextTransformation } from '../types';

/**
 * Represents a transformation with its priority and metadata
 */
export interface PrioritizedTransformation {
  transformation: TextTransformation;
  priority: number;
  conflictGroup?: string; // Identifier for potentially conflicting transformations
  hash?: string; // Hash for quick comparison and caching
  nodeId?: string; // ID of the node this transformation applies to
  isVisible?: boolean; // Whether this transformation is in the viewport
  lazyEvaluated?: boolean; // Whether this transformation has been lazily evaluated
  scheduledTime?: number; // Timestamp for when this transformation should be processed
}

/**
 * Visibility status of a content node
 */
export interface ContentVisibility {
  nodeId: string;
  isVisible: boolean;
  priority: number; // Higher number = higher priority
  lastUpdate: number; // Timestamp of last update
}

/**
 * Cache for storing resolved transformation sets
 */
interface ResolvedTransformationsCache {
  [key: string]: {
    transformations: TextTransformation[];
    timestamp: number;
  }
}

/**
 * Priority queue for content transformations with lazy evaluation and visibility-based prioritization
 */
export class TransformationPriorityQueue {
  private transformations: PrioritizedTransformation[] = [];
  private resolvedCache: ResolvedTransformationsCache = {};
  
  // Content visibility tracking
  private contentVisibility: Map<string, ContentVisibility> = new Map();
  
  // Lazy evaluation queue
  private lazyQueue: PrioritizedTransformation[] = [];
  private isProcessingLazyQueue = false;
  
  // Cache settings
  private readonly CACHE_EXPIRY_TIME = 30 * 1000; // 30 seconds
  private readonly MAX_CACHE_SIZE = 100; // Increased for better hit rate
  
  // Performance statistics
  private stats = {
    cacheHits: 0,
    cacheMisses: 0,
    lastCacheCleanup: Date.now(),
    lazyEvaluations: 0,
    deferredTransformations: 0,
    visibleNodeCount: 0
  };
  
  // Lazy evaluation settings
  private readonly LAZY_BATCH_SIZE = 5; // Process 5 transformations per batch
  private readonly LAZY_BATCH_INTERVAL = 50; // 50ms between batches
  
  /**
   * Generate a hash for a transformation
   * Used for quick comparisons and caching
   */
  private hashTransformation(transformation: TextTransformation): string {
    const { type, selector, emphasis, fragmentStyle, expandStyle, replacement } = transformation;
    return `${type}:${selector}:${emphasis || ''}:${fragmentStyle || ''}:${expandStyle || ''}:${replacement?.substring(0, 10) || ''}`;
  }
  
  /**
   * Generate a hash for the current queue state
   * Used as cache key for resolved transformations
   */
  private getQueueHash(): string {
    if (this.transformations.length === 0) return 'empty';
    
    // Create a sorted representation of the queue for consistent hashing
    return this.transformations
      .map(item => item.hash || this.hashTransformation(item.transformation))
      .sort()
      .join('|');
  }
  
  /**
   * Clean expired items from the cache
   */
  private cleanCache(): void {
    const now = Date.now();
    
    // Only clean cache periodically to avoid overhead
    if (now - this.stats.lastCacheCleanup < 10000) return;
    
    let cacheEntries = Object.entries(this.resolvedCache);
    
    // Remove expired entries
    cacheEntries = cacheEntries.filter(([, value]) =>
      now - value.timestamp <= this.CACHE_EXPIRY_TIME
    );
    
    // If cache is still too large, remove oldest entries
    if (cacheEntries.length > this.MAX_CACHE_SIZE) {
      cacheEntries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
      cacheEntries = cacheEntries.slice(cacheEntries.length - this.MAX_CACHE_SIZE);
    }
    
    // Rebuild cache
    this.resolvedCache = Object.fromEntries(cacheEntries);
    this.stats.lastCacheCleanup = now;
  }
  
  /**
   * Sets the visibility status for a content node
   * This is called by the IntersectionObserver in NarramorphRenderer
   */
  public setContentVisibility(nodeId: string, isVisible: boolean, priority: number = 1): void {
    this.contentVisibility.set(nodeId, {
      nodeId,
      isVisible,
      priority,
      lastUpdate: Date.now()
    });
    
    // Update stats
    this.stats.visibleNodeCount = Array.from(this.contentVisibility.values())
      .filter(v => v.isVisible).length;
    
    // Re-prioritize transformations based on new visibility info
    this.reprioritizeTransformations();
    
    // If a node becomes visible, process any lazy transformations for it
    if (isVisible) {
      this.processLazyQueueForNode(nodeId);
    }
  }
  
  /**
   * Get visibility status for a content node
   */
  public getContentVisibility(nodeId: string): boolean {
    return this.contentVisibility.get(nodeId)?.isVisible || false;
  }
  
  /**
   * Process lazy evaluation queue for a specific node
   */
  private processLazyQueueForNode(nodeId: string): void {
    if (this.isProcessingLazyQueue) return;
    this.isProcessingLazyQueue = true;
    
    // Filter the lazy queue for this node
    const nodeTransformations = this.lazyQueue.filter(
      t => t.nodeId === nodeId
    );
    
    // Remove these transformations from the lazy queue
    this.lazyQueue = this.lazyQueue.filter(
      t => t.nodeId !== nodeId
    );
    
    // Process transformations in batches
    this.processLazyBatch(nodeTransformations, 0);
  }
  
  /**
   * Process a batch of lazy transformations
   */
  private processLazyBatch(
    transformations: PrioritizedTransformation[],
    startIndex: number
  ): void {
    if (startIndex >= transformations.length) {
      this.isProcessingLazyQueue = false;
      return;
    }
    
    // Process a batch
    const endIndex = Math.min(startIndex + this.LAZY_BATCH_SIZE, transformations.length);
    const batch = transformations.slice(startIndex, endIndex);
    
    // Mark as evaluated and add to main queue
    batch.forEach(t => {
      t.lazyEvaluated = true;
      this.transformations.push(t);
      this.stats.lazyEvaluations++;
    });
    
    // Schedule next batch
    setTimeout(() => {
      this.processLazyBatch(transformations, endIndex);
    }, this.LAZY_BATCH_INTERVAL);
  }
  
  /**
   * Reprioritize transformations based on visibility
   * This boosts priority for visible content and lowers it for hidden content
   */
  private reprioritizeTransformations(): void {
    // Adjust priority based on content visibility
    this.transformations.forEach(t => {
      if (!t.nodeId) return;
      
      const visibility = this.contentVisibility.get(t.nodeId);
      if (!visibility) return;
      
      // Set visibility flag
      t.isVisible = visibility.isVisible;
      
      // Adjust priority based on visibility
      if (visibility.isVisible) {
        // Apply priority boost based on node priority
        t.priority += visibility.priority;
      } else {
        // Lower priority for invisible content
        t.priority = Math.max(0, t.priority - 5);
      }
    });
  }
  
  /**
   * Add a transformation to the queue with a specified priority
   * Enhanced with lazy evaluation support
   */
  public enqueue(
    transformation: TextTransformation,
    priority: number,
    conflictGroup?: string,
    nodeId?: string
  ): void {
    const hash = this.hashTransformation(transformation);
    
    // Check if this node is visible
    const isVisible = nodeId ? this.getContentVisibility(nodeId) : true;
    const visibilityInfo = nodeId ? this.contentVisibility.get(nodeId) : undefined;
    
    // Create transformation object
    const transformationObj: PrioritizedTransformation = {
      transformation,
      priority: isVisible ? priority + (visibilityInfo?.priority || 0) : priority,
      conflictGroup,
      hash,
      nodeId,
      isVisible
    };
    
    // Use lazy evaluation for low priority transformations that aren't visible
    // High priority transformations are always processed immediately
    const isHighPriority = priority > 5 || transformation.priority === 'high';
    
    if (!isVisible && !isHighPriority) {
      // Add to lazy queue for deferred processing
      this.lazyQueue.push(transformationObj);
      this.stats.deferredTransformations++;
    } else {
      // Add to main queue for immediate processing
      this.transformations.push(transformationObj);
    }
  }
  
  /**
   * Add multiple transformations with the same priority
   * Enhanced with lazy evaluation support
   */
  public enqueueAll(
    transformations: TextTransformation[],
    priority: number,
    conflictGroup?: string,
    nodeId?: string
  ): void {
    transformations.forEach(transformation => {
      this.enqueue(transformation, priority, conflictGroup, nodeId);
    });
  }
  
  /**
   * Adjust the priority of a transformation
   */
  public adjustPriority(selector: string, type: string, priorityAdjustment: number): void {
    for (const item of this.transformations) {
      if (item.transformation.selector === selector && item.transformation.type === type) {
        item.priority += priorityAdjustment;
        break;
      }
    }
  }
  
  /**
   * Get all transformations ordered by priority (highest first)
   */
  public getAll(): PrioritizedTransformation[] {
    return [...this.transformations].sort((a, b) => b.priority - a.priority);
  }
  
  /**
   * Get the transformations with resolved conflicts and visibility-based prioritization
   * For each conflict group, only the highest priority transformation is kept
   * Results are cached for performance and lazily evaluated
   */
  public getResolvedTransformations(): TextTransformation[] {
    // Trigger processing of lazy queue for visible nodes if needed
    const visibleNodes = Array.from(this.contentVisibility.values())
      .filter(v => v.isVisible)
      .map(v => v.nodeId);
      
    // Process any lazy transformations for visible nodes that haven't been processed yet
    if (visibleNodes.length > 0 && this.lazyQueue.length > 0) {
      const visibleTransformations = this.lazyQueue.filter(
        t => t.nodeId && visibleNodes.includes(t.nodeId)
      );
      
      if (visibleTransformations.length > 0) {
        this.lazyQueue = this.lazyQueue.filter(
          t => !t.nodeId || !visibleNodes.includes(t.nodeId)
        );
        
        // Add these to the main queue
        this.transformations.push(...visibleTransformations);
      }
    }
    
    // Ensure all transformations are properly prioritized based on latest visibility info
    this.reprioritizeTransformations();
    
    // Check cache first
    const queueHash = this.getQueueHash();
    const cachedResult = this.resolvedCache[queueHash];
    
    if (cachedResult) {
      this.stats.cacheHits++;
      return cachedResult.transformations;
    }
    
    this.stats.cacheMisses++;
    
    // Clean cache periodically
    this.cleanCache();
    
    // If not in cache, compute the result
    // Group transformations by conflict group
    const conflictGroups: Record<string, PrioritizedTransformation[]> = {};
    const noConflict: PrioritizedTransformation[] = [];
    
    // Separate transformations into conflict groups and no-conflict
    for (const item of this.transformations) {
      if (item.conflictGroup) {
        if (!conflictGroups[item.conflictGroup]) {
          conflictGroups[item.conflictGroup] = [];
        }
        conflictGroups[item.conflictGroup].push(item);
      } else {
        noConflict.push(item);
      }
    }
    
    // For each conflict group, get the highest priority transformation
    const resolved: PrioritizedTransformation[] = [...noConflict];
    
    for (const group of Object.values(conflictGroups)) {
      if (group.length > 0) {
        // Sort by priority, but give visible transformations higher precedence
        group.sort((a, b) => {
          // First prioritize by visibility
          if (a.isVisible && !b.isVisible) return -1;
          if (!a.isVisible && b.isVisible) return 1;
          // Then by numeric priority
          return b.priority - a.priority;
        });
        resolved.push(group[0]);
      }
    }
    
    // Sort final resolved transformations by visibility first, then by priority
    // and extract the transformation objects
    const result = resolved
      .sort((a, b) => {
        // First sort by visibility
        if (a.isVisible && !b.isVisible) return -1;
        if (!a.isVisible && b.isVisible) return 1;
        // Then by priority
        return b.priority - a.priority;
      })
      .map(item => item.transformation);
    
    // Cache the result
    this.resolvedCache[queueHash] = {
      transformations: result,
      timestamp: Date.now()
    };
    
    return result;
  }
  
  /**
   * Clear the queue and optionally the cache
   */
  public clear(clearCache: boolean = false): void {
    this.transformations = [];
    this.lazyQueue = [];
    
    if (clearCache) {
      this.resolvedCache = {};
      this.stats = {
        cacheHits: 0,
        cacheMisses: 0,
        lastCacheCleanup: Date.now(),
        lazyEvaluations: 0,
        deferredTransformations: 0,
        visibleNodeCount: 0
      };
    }
  }
  
  /**
   * Get the number of transformations in the queue
   */
  public size(): number {
    return this.transformations.length;
  }
  
  /**
   * Check if a transformation with the given selector and type exists in the queue
   */
  public contains(selector: string, type: string): boolean {
    return this.transformations.some(
      item => item.transformation.selector === selector && 
              item.transformation.type === type
    );
  }
  
  /**
   * Get comprehensive performance statistics
   */
  public getStats(): {
    cacheSize: number;
    hitRate: number;
    totalRequests: number;
    lazyEvaluations: number;
    deferredTransformations: number;
    queueSizes: {
      main: number;
      lazy: number;
    };
    visibleNodes: number;
  } {
    const totalRequests = this.stats.cacheHits + this.stats.cacheMisses;
    return {
      cacheSize: Object.keys(this.resolvedCache).length,
      hitRate: totalRequests > 0 ? this.stats.cacheHits / totalRequests : 0,
      totalRequests,
      lazyEvaluations: this.stats.lazyEvaluations,
      deferredTransformations: this.stats.deferredTransformations,
      queueSizes: {
        main: this.transformations.length,
        lazy: this.lazyQueue.length
      },
      visibleNodes: this.stats.visibleNodeCount
    };
  }
}

// Export a singleton instance for use throughout the application
export const transformationPriorityQueue = new TransformationPriorityQueue();