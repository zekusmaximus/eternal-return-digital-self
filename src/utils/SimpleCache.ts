/**
 * Simple Cache Utility
 * 
 * Replaces the complex PerformanceOptimizationService with a lightweight,
 * focused caching solution that provides the essential caching benefits
 * without the overhead of performance monitoring and optimization strategies.
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

export interface SimpleCacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  evictionPolicy: 'lru' | 'fifo' | 'lfu';
}

/**
 * Simple LRU Cache implementation
 */
export class SimpleCache<T = unknown> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder: string[] = []; // For LRU tracking
  private config: SimpleCacheConfig;

  constructor(config: Partial<SimpleCacheConfig> = {}) {
    this.config = {
      maxSize: 50,
      ttl: 5000, // 5 seconds default
      evictionPolicy: 'lru',
      ...config
    };
  }

  /**
   * Get value from cache
   */
  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return undefined;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.delete(key);
      return undefined;
    }

    // Update access tracking
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    // Update LRU order
    if (this.config.evictionPolicy === 'lru') {
      this.updateAccessOrder(key);
    }

    return entry.value;
  }

  /**
   * Set value in cache
   */
  set(key: string, value: T): void {
    const now = Date.now();
    
    // If key exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.value = value;
      entry.timestamp = now;
      entry.lastAccessed = now;
      entry.accessCount++;
      
      if (this.config.evictionPolicy === 'lru') {
        this.updateAccessOrder(key);
      }
      return;
    }

    // Check if we need to evict
    if (this.cache.size >= this.config.maxSize) {
      this.evictOne();
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      value,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now
    };

    this.cache.set(key, entry);
    
    if (this.config.evictionPolicy === 'lru') {
      this.accessOrder.push(key);
    }
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return false;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > this.config.ttl) {
      this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete key from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    
    if (deleted && this.config.evictionPolicy === 'lru') {
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
    }
    
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    oldestEntry: number;
    newestEntry: number;
  } {
    const entries = Array.from(this.cache.values());
    const totalAccesses = entries.reduce((sum, entry) => sum + entry.accessCount, 0);
    const hits = entries.filter(entry => entry.accessCount > 1).length;
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: totalAccesses > 0 ? hits / totalAccesses : 0,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : 0,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : 0
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.config.ttl) {
        this.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }

  /**
   * Update access order for LRU
   */
  private updateAccessOrder(key: string): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
    }
    this.accessOrder.push(key);
  }

  /**
   * Evict one entry based on policy
   */
  private evictOne(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.accessOrder[0];
        break;
      
      case 'lfu': {
        // Find least frequently used
        let minAccess = Infinity;
        keyToEvict = '';
        for (const [key, entry] of this.cache.entries()) {
          if (entry.accessCount < minAccess) {
            minAccess = entry.accessCount;
            keyToEvict = key;
          }
        }
        break;
      }
      
      case 'fifo':
      default: {
        // Find oldest entry
        let oldestTime = Infinity;
        keyToEvict = '';
        for (const [key, entry] of this.cache.entries()) {
          if (entry.timestamp < oldestTime) {
            oldestTime = entry.timestamp;
            keyToEvict = key;
          }
        }
        break;
      }
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
    }
  }
}

/**
 * Global cache instances for different systems
 */
export const systemCaches = {
  triumvirate: new SimpleCache({
    maxSize: 50,
    ttl: 10000, // 10 seconds
    evictionPolicy: 'lru'
  }),
  
  attractors: new SimpleCache({
    maxSize: 100,
    ttl: 5000, // 5 seconds
    evictionPolicy: 'lru'
  }),
  
  unified: new SimpleCache({
    maxSize: 25,
    ttl: 3000, // 3 seconds
    evictionPolicy: 'lru'
  })
};

/**
 * Utility function to create cache key from objects
 */
export function createCacheKey(prefix: string, ...parts: unknown[]): string {
  const keyParts = parts.map(part => {
    if (typeof part === 'object' && part !== null) {
      return JSON.stringify(part);
    }
    return String(part);
  });
  
  return `${prefix}:${keyParts.join(':')}`;
}

/**
 * Cleanup all system caches
 */
export function cleanupAllCaches(): void {
  Object.values(systemCaches).forEach(cache => {
    cache.cleanup();
  });
}

/**
 * Clear all system caches
 */
export function clearAllCaches(): void {
  Object.values(systemCaches).forEach(cache => {
    cache.clear();
  });
}

/**
 * Get combined cache statistics
 */
export function getAllCacheStats(): Record<string, ReturnType<SimpleCache['getStats']>> {
  const stats: Record<string, ReturnType<SimpleCache['getStats']>> = {};
  
  Object.entries(systemCaches).forEach(([name, cache]) => {
    stats[name] = cache.getStats();
  });
  
  return stats;
}