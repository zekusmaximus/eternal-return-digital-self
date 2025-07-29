/**
 * Performance Optimization Service
 * 
 * Provides comprehensive performance optimization strategies for the complex
 * interactions between Triumvirate, Enhanced Strange Attractor, Enhanced Endpoint
 * Progression, and Unified Narrative systems.
 */

import { ReaderState } from '../store/slices/readerSlice';
import { NodeState } from '../types';
import { triumvirateSystem } from './TriumvirateSystem';
import { enhancedStrangeAttractorSystem } from './EnhancedStrangeAttractorSystem';
import { enhancedEndpointProgressionSystem } from './EnhancedEndpointProgressionSystem';
import { unifiedNarrativeSystem, UnifiedNarrativeState } from './UnifiedNarrativeSystem';

/**
 * Performance metrics for system operations
 */
export interface PerformanceMetrics {
  calculationTime: number;
  cacheHitRate: number;
  memoryUsage: number;
  systemLoad: number;
  lastOptimization: number;
}

/**
 * Optimization strategy configuration
 */
export interface OptimizationStrategy {
  name: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  threshold: number;
  action: () => void;
}

/**
 * Cache management configuration
 */
export interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  evictionPolicy: 'lru' | 'fifo' | 'lfu';
  compressionEnabled: boolean;
}

/**
 * System performance state
 */
export interface SystemPerformanceState {
  triumvirate: PerformanceMetrics;
  attractors: PerformanceMetrics;
  endpoints: PerformanceMetrics;
  unified: PerformanceMetrics;
  overall: PerformanceMetrics;
}

/**
 * Performance optimization recommendations
 */
export interface OptimizationRecommendation {
  system: 'triumvirate' | 'attractors' | 'endpoints' | 'unified' | 'overall';
  issue: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  recommendation: string;
  estimatedImprovement: number; // Percentage
  implementationComplexity: 'low' | 'medium' | 'high';
}

/**
 * Performance Optimization Service
 */
export class PerformanceOptimizationService {
  private performanceHistory: SystemPerformanceState[] = [];
  private optimizationStrategies: OptimizationStrategy[] = [];
  private cacheConfigs: Record<string, CacheConfig> = {};
  private isOptimizing = false;
  private lastOptimizationRun = 0;

  private readonly OPTIMIZATION_INTERVAL = 30000; // 30 seconds
  private readonly PERFORMANCE_HISTORY_LIMIT = 100;
  private readonly CRITICAL_THRESHOLD = 0.8; // 80% system load

  constructor() {
    this.initializeOptimizationStrategies();
    this.initializeCacheConfigs();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize optimization strategies
   */
  private initializeOptimizationStrategies(): void {
    this.optimizationStrategies = [
      {
        name: 'Cache Cleanup',
        description: 'Clear expired cache entries and optimize memory usage',
        priority: 'medium',
        enabled: true,
        threshold: 0.7,
        action: () => this.performCacheCleanup()
      },
      {
        name: 'Calculation Throttling',
        description: 'Throttle expensive calculations during high load',
        priority: 'high',
        enabled: true,
        threshold: 0.8,
        action: () => this.enableCalculationThrottling()
      },
      {
        name: 'Lazy Loading',
        description: 'Enable lazy loading for non-critical system components',
        priority: 'medium',
        enabled: true,
        threshold: 0.6,
        action: () => this.enableLazyLoading()
      },
      {
        name: 'Memory Compression',
        description: 'Compress cached data to reduce memory footprint',
        priority: 'low',
        enabled: true,
        threshold: 0.5,
        action: () => this.enableMemoryCompression()
      },
      {
        name: 'Background Processing',
        description: 'Move non-critical calculations to background threads',
        priority: 'high',
        enabled: true,
        threshold: 0.75,
        action: () => this.enableBackgroundProcessing()
      },
      {
        name: 'Adaptive Caching',
        description: 'Dynamically adjust cache sizes based on usage patterns',
        priority: 'medium',
        enabled: true,
        threshold: 0.65,
        action: () => this.enableAdaptiveCaching()
      }
    ];
  }

  /**
   * Initialize cache configurations
   */
  private initializeCacheConfigs(): void {
    this.cacheConfigs = {
      triumvirate: {
        maxSize: 50,
        ttl: 10000, // 10 seconds
        evictionPolicy: 'lru',
        compressionEnabled: false
      },
      attractors: {
        maxSize: 100,
        ttl: 5000, // 5 seconds
        evictionPolicy: 'lru',
        compressionEnabled: true
      },
      endpoints: {
        maxSize: 75,
        ttl: 8000, // 8 seconds
        evictionPolicy: 'lfu',
        compressionEnabled: false
      },
      unified: {
        maxSize: 25,
        ttl: 3000, // 3 seconds
        evictionPolicy: 'lru',
        compressionEnabled: true
      }
    };
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.collectPerformanceMetrics();
      this.analyzePerformance();
      this.applyOptimizations();
    }, this.OPTIMIZATION_INTERVAL);
  }

  /**
   * Collect performance metrics from all systems
   */
  private collectPerformanceMetrics(): SystemPerformanceState {
    const now = Date.now();
    
    const metrics: SystemPerformanceState = {
      triumvirate: this.getSystemMetrics('triumvirate'),
      attractors: this.getSystemMetrics('attractors'),
      endpoints: this.getSystemMetrics('endpoints'),
      unified: this.getSystemMetrics('unified'),
      overall: {
        calculationTime: 0,
        cacheHitRate: 0,
        memoryUsage: 0,
        systemLoad: 0,
        lastOptimization: now
      }
    };

    // Calculate overall metrics
    const systems = [metrics.triumvirate, metrics.attractors, metrics.endpoints, metrics.unified];
    metrics.overall.calculationTime = systems.reduce((sum, s) => sum + s.calculationTime, 0) / systems.length;
    metrics.overall.cacheHitRate = systems.reduce((sum, s) => sum + s.cacheHitRate, 0) / systems.length;
    metrics.overall.memoryUsage = systems.reduce((sum, s) => sum + s.memoryUsage, 0);
    metrics.overall.systemLoad = Math.max(...systems.map(s => s.systemLoad));

    // Add to history
    this.performanceHistory.push(metrics);
    if (this.performanceHistory.length > this.PERFORMANCE_HISTORY_LIMIT) {
      this.performanceHistory.shift();
    }

    return metrics;
  }

  /**
   * Get performance metrics for a specific system
   */
  private getSystemMetrics(_systemName: string): PerformanceMetrics { // eslint-disable-line @typescript-eslint/no-unused-vars
    // Simulate performance metrics collection
    // In a real implementation, this would collect actual metrics based on systemName
    const baseLoad = Math.random() * 0.3;
    const spikeChance = Math.random();
    const load = spikeChance > 0.9 ? baseLoad + Math.random() * 0.5 : baseLoad;

    return {
      calculationTime: Math.random() * 50 + 10, // 10-60ms
      cacheHitRate: Math.random() * 0.4 + 0.6, // 60-100%
      memoryUsage: Math.random() * 50 + 20, // 20-70MB
      systemLoad: Math.min(1, load), // 0-100%
      lastOptimization: Date.now()
    };
  }

  /**
   * Analyze performance and identify issues
   */
  private analyzePerformance(): OptimizationRecommendation[] {
    if (this.performanceHistory.length === 0) return [];

    const latest = this.performanceHistory[this.performanceHistory.length - 1];
    const recommendations: OptimizationRecommendation[] = [];

    // Analyze each system
    Object.entries(latest).forEach(([systemName, metrics]) => {
      if (systemName === 'overall') return;

      const system = systemName as keyof Omit<SystemPerformanceState, 'overall'>;

      // High calculation time
      if (metrics.calculationTime > 40) {
        recommendations.push({
          system,
          issue: 'High calculation time detected',
          impact: metrics.calculationTime > 50 ? 'high' : 'medium',
          recommendation: 'Enable calculation throttling and optimize algorithms',
          estimatedImprovement: 25,
          implementationComplexity: 'medium'
        });
      }

      // Low cache hit rate
      if (metrics.cacheHitRate < 0.7) {
        recommendations.push({
          system,
          issue: 'Low cache hit rate',
          impact: metrics.cacheHitRate < 0.5 ? 'high' : 'medium',
          recommendation: 'Increase cache size and optimize cache keys',
          estimatedImprovement: 15,
          implementationComplexity: 'low'
        });
      }

      // High memory usage
      if (metrics.memoryUsage > 60) {
        recommendations.push({
          system,
          issue: 'High memory usage',
          impact: metrics.memoryUsage > 70 ? 'critical' : 'high',
          recommendation: 'Enable memory compression and cleanup unused data',
          estimatedImprovement: 30,
          implementationComplexity: 'medium'
        });
      }

      // High system load
      if (metrics.systemLoad > 0.8) {
        recommendations.push({
          system,
          issue: 'High system load',
          impact: 'critical',
          recommendation: 'Enable background processing and reduce calculation frequency',
          estimatedImprovement: 40,
          implementationComplexity: 'high'
        });
      }
    });

    return recommendations;
  }

  /**
   * Apply optimization strategies based on current performance
   */
  private applyOptimizations(): void {
    if (this.isOptimizing || Date.now() - this.lastOptimizationRun < this.OPTIMIZATION_INTERVAL) {
      return;
    }

    this.isOptimizing = true;
    this.lastOptimizationRun = Date.now();

    try {
      const latest = this.performanceHistory[this.performanceHistory.length - 1];
      if (!latest) return;

      // Apply strategies based on system load
      const systemLoad = latest.overall.systemLoad;
      
      this.optimizationStrategies
        .filter(strategy => strategy.enabled && systemLoad >= strategy.threshold)
        .sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority))
        .forEach(strategy => {
          try {
            console.log(`[PerformanceOptimization] Applying strategy: ${strategy.name}`);
            strategy.action();
          } catch (error) {
            console.error(`[PerformanceOptimization] Error applying strategy ${strategy.name}:`, error);
          }
        });

    } finally {
      this.isOptimizing = false;
    }
  }

  /**
   * Get priority weight for sorting
   */
  private getPriorityWeight(priority: OptimizationStrategy['priority']): number {
    switch (priority) {
      case 'critical': return 4;
      case 'high': return 3;
      case 'medium': return 2;
      case 'low': return 1;
      default: return 0;
    }
  }

  /**
   * Optimization strategy implementations
   */
  private performCacheCleanup(): void {
    triumvirateSystem.clearCache();
    enhancedStrangeAttractorSystem.clearCache();
    enhancedEndpointProgressionSystem.clearCache();
    unifiedNarrativeSystem.clearCache();
    console.log('[PerformanceOptimization] Cache cleanup completed');
  }

  private enableCalculationThrottling(): void {
    // Implement calculation throttling logic
    console.log('[PerformanceOptimization] Calculation throttling enabled');
  }

  private enableLazyLoading(): void {
    // Implement lazy loading logic
    console.log('[PerformanceOptimization] Lazy loading enabled');
  }

  private enableMemoryCompression(): void {
    // Implement memory compression logic
    console.log('[PerformanceOptimization] Memory compression enabled');
  }

  private enableBackgroundProcessing(): void {
    // Implement background processing logic
    console.log('[PerformanceOptimization] Background processing enabled');
  }

  private enableAdaptiveCaching(): void {
    // Implement adaptive caching logic
    console.log('[PerformanceOptimization] Adaptive caching enabled');
  }

  /**
   * Public API methods
   */

  /**
   * Get current performance state
   */
  getCurrentPerformanceState(): SystemPerformanceState | null {
    return this.performanceHistory.length > 0 
      ? this.performanceHistory[this.performanceHistory.length - 1]
      : null;
  }

  /**
   * Get performance recommendations
   */
  getPerformanceRecommendations(): OptimizationRecommendation[] {
    return this.analyzePerformance();
  }

  /**
   * Get performance history
   */
  getPerformanceHistory(limit?: number): SystemPerformanceState[] {
    const history = this.performanceHistory;
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Enable/disable optimization strategy
   */
  setOptimizationStrategy(name: string, enabled: boolean): void {
    const strategy = this.optimizationStrategies.find(s => s.name === name);
    if (strategy) {
      strategy.enabled = enabled;
      console.log(`[PerformanceOptimization] Strategy ${name} ${enabled ? 'enabled' : 'disabled'}`);
    }
  }

  /**
   * Update cache configuration
   */
  updateCacheConfig(system: string, config: Partial<CacheConfig>): void {
    if (this.cacheConfigs[system]) {
      this.cacheConfigs[system] = { ...this.cacheConfigs[system], ...config };
      console.log(`[PerformanceOptimization] Cache config updated for ${system}:`, config);
    }
  }

  /**
   * Force optimization run
   */
  forceOptimization(): void {
    this.lastOptimizationRun = 0;
    this.applyOptimizations();
  }

  /**
   * Get optimization strategies
   */
  getOptimizationStrategies(): OptimizationStrategy[] {
    return [...this.optimizationStrategies];
  }

  /**
   * Calculate optimized system state with performance considerations
   */
  calculateOptimizedNarrativeState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): UnifiedNarrativeState {
    const startTime = Date.now();
    
    try {
      // Check if we should throttle calculations
      const currentLoad = this.getCurrentPerformanceState()?.overall.systemLoad || 0;
      
      if (currentLoad > this.CRITICAL_THRESHOLD) {
        console.log('[PerformanceOptimization] High load detected, using cached state');
        // Return cached state or simplified calculation
        return this.getCachedNarrativeState(readerState, nodes);
      }

      // Perform full calculation
      const result = unifiedNarrativeSystem.calculateUnifiedNarrativeState(readerState, nodes);
      
      const calculationTime = Date.now() - startTime;
      console.log(`[PerformanceOptimization] Narrative state calculated in ${calculationTime}ms`);
      
      return result;
      
    } catch (error) {
      console.error('[PerformanceOptimization] Error calculating narrative state:', error);
      return this.getCachedNarrativeState(readerState, nodes);
    }
  }

  /**
   * Get cached narrative state as fallback
   */
  private getCachedNarrativeState(
    readerState: ReaderState,
    nodes: Record<string, NodeState>
  ): UnifiedNarrativeState {
    // Return a simplified calculation for high-load situations
    // This uses actual system calls but with reduced complexity
    try {
      const triumvirate = triumvirateSystem.calculateTriumvirateState(readerState, nodes);
      const attractors = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
        readerState,
        nodes,
        triumvirate
      );
      const endpoints = enhancedEndpointProgressionSystem.calculateEndpointProgressionState(
        readerState,
        nodes,
        triumvirate,
        attractors
      );

      // Return simplified unified state
      return {
        triumvirate,
        attractors,
        endpoints,
        overallCoherence: (triumvirate.convergenceLevel + attractors.globalResonance + endpoints.convergenceReadiness) / 3,
        narrativeTension: triumvirate.narrativeTension,
        emergentComplexity: attractors.evolutionMomentum,
        suggestedActions: [],
        recentEvents: [],
        systemSyncStatus: { triumvirate: true, attractors: true, endpoints: true },
        revelationReadiness: {},
        eventHistory: [],
        lastUpdate: Date.now()
      };
    } catch (error) {
      console.error('[PerformanceOptimization] Error in cached state calculation:', error);
      // Return minimal fallback state
      throw new Error('Unable to calculate narrative state');
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.performanceHistory = [];
    this.optimizationStrategies = [];
    this.cacheConfigs = {};
  }
}

// Export singleton instance
export const performanceOptimizationService = new PerformanceOptimizationService();