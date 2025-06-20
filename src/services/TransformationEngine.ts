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
  EndpointOrientation,
  Character
} from '../types';
import { ReaderState } from '../store/slices/readerSlice';
import { pathAnalyzer } from './PathAnalyzer';
import { CharacterBleedService, CharacterBleedEffect } from './CharacterBleedService';
// Import additional PathAnalyzer types for journey transformations
import { 
  ReadingPattern, 
  RecursivePattern, 
  CharacterFocusIntensity,
  TemporalJumpingPattern
} from './PathAnalyzer';

// LRU Cache implementation for memoization
class LRUCache<K, V> {
  private capacity: number;
  private cache: Map<K, V>;
  private keys: K[];

  constructor(capacity: number) {
    this.capacity = capacity;
    this.cache = new Map<K, V>();
    this.keys = [];
  }

  get(key: K): V | undefined {
    if (!this.cache.has(key)) return undefined;
    
    // Move key to the end of keys array (most recently used)
    this.keys = this.keys.filter(k => k !== key);
    this.keys.push(key);
    
    return this.cache.get(key);
  }

  put(key: K, value: V): void {
    if (this.cache.has(key)) {
      // Update existing key
      this.cache.set(key, value);
      this.keys = this.keys.filter(k => k !== key);
      this.keys.push(key);
      return;
    }

    // Check if we need to evict the least recently used item
    if (this.keys.length >= this.capacity) {
      const lruKey = this.keys.shift();
      if (lruKey !== undefined) {
        this.cache.delete(lruKey);
      }
    }

    // Add new key-value pair
    this.cache.set(key, value);
    this.keys.push(key);
  }

  clear(): void {
    this.cache.clear();
    this.keys = [];
  }

  size(): number {
    return this.cache.size;
  }

  getStats(): { size: number, capacity: number } {
    return {
      size: this.cache.size,
      capacity: this.capacity
    };
  }
}

/**
 * Enhanced transformation condition interface with all supported condition types.
 * 
 * This interface supports both basic navigation-based conditions and advanced
 * PathAnalyzer-integrated conditions for sophisticated content adaptation.
 * 
 * Basic Conditions:
 * - visitCount: Minimum number of visits to current node
 * - visitPattern: Specific sequence of nodes that must have been visited
 * - previouslyVisitedNodes: Set of nodes that must have been visited (any order)
 * - strangeAttractorsEngaged: Thematic attractors that must be engaged
 * - temporalPosition: Required temporal layer (past/present/future)
 * - endpointProgress: Progress toward philosophical endpoints
 * - revisitPattern: Specific revisit requirements for nodes
 * - characterBleed: Transition between different character perspectives
 * - journeyPattern: Recent navigation sequence matching
 * 
 * Advanced PathAnalyzer Conditions:
 * - characterFocus: Character preference patterns and intensity analysis
 * - temporalFocus: Temporal layer focus patterns and progression analysis
 * - attractorAffinity: Thematic affinity patterns and continuity analysis
 * - attractorEngagement: Detailed engagement metrics and trend analysis
 * - recursivePattern: Recursive navigation patterns and strength analysis
 * - journeyFingerprint: Complete navigation style and behavioral patterns
 * 
 * Logical Operators:
 * - anyOf: At least one condition must be true (OR)
 * - allOf: All conditions must be true (AND)
 * - not: Condition must be false (NOT)
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
  
  // Character bleed condition - detects when previous node had different character
  characterBleed?: boolean;
    // Journey pattern condition - matches recent navigation sequences
  journeyPattern?: string[];
  
  // Character focus condition - evaluates character preference patterns
  characterFocus?: {
    characters: Character[];
    minFocusRatio?: number; // Default 0.4 (40%)
    includeIntensity?: boolean; // Use character focus intensity metrics
  };
  
  // Temporal focus condition - evaluates temporal layer focus patterns
  temporalFocus?: {
    temporalLayers: TemporalLabel[];
    minFocusRatio?: number; // Default 0.4 (40%)
    includeProgression?: boolean; // Check for chronological patterns
  };
  
  // Attractor affinity condition - evaluates thematic affinity patterns
  attractorAffinity?: {
    attractors: StrangeAttractor[];
    minAffinityRatio?: number; // Default 0.25 (25%)
    includeThematicContinuity?: boolean; // Check thematic connections
  };
  
  // Attractor engagement condition - evaluates engagement level conditions
  attractorEngagement?: {
    attractor: StrangeAttractor;
    minEngagementScore?: number; // Default 50 (0-100 scale)
    trendRequired?: 'rising' | 'falling' | 'stable' | 'any';
  };
  
  // Recursive pattern condition - evaluates recursive navigation patterns
  recursivePattern?: {
    minPatternStrength?: number; // Default 0.6
    maxPatternLength?: number; // Default 4
    requireRecency?: boolean; // Pattern must be recent
  };
  
  // Journey fingerprint condition - evaluates navigation style patterns
  journeyFingerprint?: {
    explorationStyle?: 'linear' | 'recursive' | 'wandering' | 'focused' | 'chaotic';
    temporalPreference?: 'past-oriented' | 'present-focused' | 'future-seeking' | 'time-fluid';
    narrativeApproach?: 'systematic' | 'intuitive' | 'thematic' | 'experimental';
    minComplexityIndex?: number; // 0-1 scale
    minFocusIndex?: number; // 0-1 scale
  };
  
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
 * Cache key generation options
 */
interface CacheKeyOptions {
  includeNodeState?: boolean;
  includeReaderState?: boolean;
  includeTransformations?: boolean;
  contentPrefix?: number; // Number of characters from content to include in key
}

/**
 * Service class that handles the evaluation and application of transformation conditions
 * with enhanced caching and performance optimizations
 */
export class TransformationEngine {
  // Cache for condition evaluation results - increased size for better hit rate
  private conditionCache = new LRUCache<string, boolean>(500);
  
  // Cache for transformed text - increased size for better hit rate
  private transformationCache = new LRUCache<string, string>(200);
  
  // Cache for batched transformation results (multiple transformations applied at once)
  private batchedTransformationCache = new LRUCache<string, string>(100);
  
  // Cache hit/miss statistics
  private stats = {
    conditionEvaluations: 0,
    conditionCacheHits: 0,
    transformations: 0,
    transformationCacheHits: 0,
    batchedTransformations: 0,
    batchedCacheHits: 0
  };
  
  // Last modification timestamp for cache invalidation
  private lastModificationTime: number = Date.now();

  /**
   * Create a hash key for condition caching with enhanced options
   * This optimized version only includes the necessary data in the key
   * to avoid cache misses due to irrelevant state changes
   */
  private getConditionCacheKey(
    condition: TransformationCondition,
    readerState: ReaderState,
    nodeState: NodeState
  ): string {
    // Hash the condition object
    const conditionHash = JSON.stringify(condition);    // Create a minimal reader state hash with only the parts that affect condition evaluation
    const readerStateHash = JSON.stringify({
      path: {
        sequence: readerState.path.sequence,
        revisitPatterns: readerState.path.revisitPatterns,
        detailedVisits: readerState.path.detailedVisits, // Include for characterBleed condition
        characterFocus: readerState.path.characterFocus, // Include for character focus conditions
        temporalLayerFocus: readerState.path.temporalLayerFocus, // Include for temporal focus conditions
        attractorsEngaged: readerState.path.attractorsEngaged // Include for attractor conditions
      },
      endpointProgress: readerState.endpointProgress
    });
    
    // Create a minimal node state hash
    const nodeStateHash = JSON.stringify({
      id: nodeState.id,
      visitCount: nodeState.visitCount,
      temporalValue: nodeState.temporalValue,
      strangeAttractors: nodeState.strangeAttractors
    });
    
    // Combine the hashes with a version number for easy invalidation
    return `v1:${nodeState.id}:${conditionHash}:${readerStateHash}:${nodeStateHash}`;
  }
  
  /**
   * Create a hash key for transformation caching
   * Takes content and transformations into account
   */
  private getTransformationCacheKey(
    content: string,
    transformations: TextTransformation[],
    options: CacheKeyOptions = {}
  ): string {
    const {
      contentPrefix = 30,
      includeTransformations = true
    } = options;
    
    // Use a prefix of the content to keep key size reasonable
    const contentHash = content.substring(0, contentPrefix);
    
    // For transformations, hash only the essential properties
    const transformationsHash = includeTransformations
      ? transformations.map(t =>
          `${t.type}:${t.selector?.substring(0, 10)}:${t.priority}`
        ).join('|')
      : '';
    
    // Add a timestamp component for version-based invalidation
    const versionComponent = Math.floor(this.lastModificationTime / 1000); // Seconds precision
    
    return `v1:${contentHash}:${transformations.length}:${versionComponent}:${transformationsHash}`;
  }
  
  /**
   * Invalidate all caches - call this when transformation rules change
   */
  public invalidateCaches(): void {
    this.conditionCache.clear();
    this.transformationCache.clear();
    this.batchedTransformationCache.clear();
    this.lastModificationTime = Date.now();
  }
  /**
   * Core method to evaluate if a transformation should apply based on the condition
   * and current reader and node state, with caching for performance
   */
  evaluateCondition(
    condition: TransformationCondition,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    this.stats.conditionEvaluations++;
    
    if (Object.keys(condition).length === 0) {
      return true;
    }
    
    const cacheKey = this.getConditionCacheKey(condition, readerState, nodeState);
    const cachedResult = this.conditionCache.get(cacheKey);
    
    if (cachedResult !== undefined) {
      this.stats.conditionCacheHits++;
      return cachedResult;
    }
    
    const result = this.evaluateConditionInternal(condition, readerState, nodeState);
    this.conditionCache.put(cacheKey, result);
    
    return result;
  }

  /**
   * Internal condition evaluation logic separated from caching concerns
   */
  private evaluateConditionInternal(
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
    
    // Use condition evaluators map for cleaner logic
    return this.evaluateBasicConditions(condition, readerState, nodeState) &&
           this.evaluateAdvancedConditions(condition, readerState, nodeState);
  }

  /**
   * Evaluate basic navigation-based conditions
   */
  private evaluateBasicConditions(
    condition: TransformationCondition,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const basicChecks = [
      () => this.checkVisitCount(condition, nodeState),
      () => this.checkPreviouslyVisitedNodes(condition, readerState),
      () => this.checkVisitPattern(condition, readerState),
      () => this.checkStrangeAttractors(condition, readerState),
      () => this.checkTemporalPosition(condition, nodeState),
      () => this.checkEndpointProgress(condition, readerState),
      () => this.checkRevisitPattern(condition, readerState),
      () => this.checkCharacterBleed(condition, readerState, nodeState),
      () => this.checkJourneyPattern(condition, readerState)
    ];

    return basicChecks.every(check => check());
  }

  /**
   * Evaluate advanced PathAnalyzer-based conditions
   */
  private evaluateAdvancedConditions(
    condition: TransformationCondition,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const advancedChecks = [
      () => !condition.characterFocus || this.checkCharacterFocus(condition.characterFocus, readerState, nodeState),
      () => !condition.temporalFocus || this.checkTemporalFocus(condition.temporalFocus, readerState, nodeState),
      () => !condition.attractorAffinity || this.checkAttractorAffinity(condition.attractorAffinity, readerState, nodeState),
      () => !condition.attractorEngagement || this.checkAttractorEngagement(condition.attractorEngagement, readerState, nodeState),
      () => !condition.recursivePattern || this.checkRecursivePattern(condition.recursivePattern, readerState, nodeState),
      () => !condition.journeyFingerprint || this.checkJourneyFingerprint(condition.journeyFingerprint, readerState, nodeState)
    ];

    return advancedChecks.every(check => check());
  }

  /**
   * Individual condition check methods
   */
  private checkVisitCount(condition: TransformationCondition, nodeState: NodeState): boolean {
    return condition.visitCount === undefined || nodeState.visitCount >= condition.visitCount;
  }

  private checkPreviouslyVisitedNodes(condition: TransformationCondition, readerState: ReaderState): boolean {
    if (!condition.previouslyVisitedNodes?.length) return true;
    
    const visitedNodes = readerState.path.sequence || [];
    return condition.previouslyVisitedNodes.every(nodeId => visitedNodes.includes(nodeId));
  }

  private checkVisitPattern(condition: TransformationCondition, readerState: ReaderState): boolean {
    return !condition.visitPattern?.length || 
           this.matchesPattern(condition.visitPattern, readerState.path.sequence);
  }

  private checkStrangeAttractors(condition: TransformationCondition, readerState: ReaderState): boolean {
    return !condition.strangeAttractorsEngaged?.length || 
           this.checkAttractorsEngaged(condition.strangeAttractorsEngaged, readerState);
  }

  private checkTemporalPosition(condition: TransformationCondition, nodeState: NodeState): boolean {
    return !condition.temporalPosition || 
           this.getNodeTemporalPosition(nodeState) === condition.temporalPosition;
  }

  private checkEndpointProgress(condition: TransformationCondition, readerState: ReaderState): boolean {
    if (!condition.endpointProgress) return true;
    
    const { orientation, minValue } = condition.endpointProgress;
    return readerState.endpointProgress?.[orientation] >= minValue;
  }

  private checkRevisitPattern(condition: TransformationCondition, readerState: ReaderState): boolean {
    if (!condition.revisitPattern?.length) return true;
    
    const revisitPatterns = readerState.path.revisitPatterns || {};
    return condition.revisitPattern.every(pattern => {
      const visits = revisitPatterns[pattern.nodeId] || 0;
      return visits >= pattern.minVisits;
    });
  }

  private checkCharacterBleed(condition: TransformationCondition, readerState: ReaderState, nodeState: NodeState): boolean {
    return !condition.characterBleed || this.hasCharacterBleed(readerState, nodeState);
  }

  private checkJourneyPattern(condition: TransformationCondition, readerState: ReaderState): boolean {
    return !condition.journeyPattern?.length || 
           this.matchesJourneyPattern(condition.journeyPattern, readerState.path.sequence);
  }

  /**
   * Renamed for clarity - checks if there is character bleed
   */
  private hasCharacterBleed(readerState: ReaderState, nodeState: NodeState): boolean {
    if (!readerState.path.detailedVisits || readerState.path.detailedVisits.length < 2) {
      return false;
    }
    
    const previousVisit = readerState.path.detailedVisits[readerState.path.detailedVisits.length - 2];
    return previousVisit.character !== nodeState.character;
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
    if (node.temporalValue <= 6) return 'present';    return 'future';
  }
  
  /**
   * Checks if the recent navigation sequence matches the provided journey pattern
   * The pattern must appear at the end of the sequence (most recent visits)
   */
  private matchesJourneyPattern(pattern: string[], visitsSequence: string[]): boolean {
    if (pattern.length === 0) return true;
    if (visitsSequence.length < pattern.length) return false;
    
    // Check if the pattern matches the most recent visits
    const recentVisits = visitsSequence.slice(-pattern.length);
      for (let i = 0; i < pattern.length; i++) {
      if (recentVisits[i] !== pattern[i]) {
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * Checks if character focus conditions are met
   */
  private checkCharacterFocus(
    characterFocus: NonNullable<TransformationCondition['characterFocus']>,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const { characters, minFocusRatio = 0.4, includeIntensity = false } = characterFocus;
    
    if (includeIntensity) {
      // Use PathAnalyzer's character focus intensity analysis
      const characterIntensities = pathAnalyzer.calculateCharacterFocusIntensity(readerState, { [nodeState.id]: nodeState });
      
      return characters.some(character => {
        const intensity = characterIntensities.find(ci => ci.character === character);
        return intensity && intensity.intensity >= minFocusRatio;
      });
    } else {
      // Simple focus ratio check
      const { characterFocus: charFocus } = readerState.path;
      if (!charFocus) return false;
      
      const totalVisits = readerState.path.detailedVisits?.length || 0;
      if (totalVisits === 0) return false;
      
      return characters.some(character => {
        const visits = (charFocus as Record<string, number>)[character] || 0;
        const focusRatio = visits / totalVisits;
        return focusRatio >= minFocusRatio;
      });
    }
  }
  
  /**
   * Checks if temporal focus conditions are met
   */
  private checkTemporalFocus(
    temporalFocus: NonNullable<TransformationCondition['temporalFocus']>,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const { temporalLayers, minFocusRatio = 0.4, includeProgression = false } = temporalFocus;
    
    const { temporalLayerFocus } = readerState.path;
    if (!temporalLayerFocus) return false;
    
    const totalVisits = readerState.path.detailedVisits?.length || 0;
    if (totalVisits === 0) return false;
    
    // Check basic temporal focus
    const hasBasicFocus = temporalLayers.some(layer => {
      const visits = (temporalLayerFocus as Record<string, number>)[layer] || 0;
      const focusRatio = visits / totalVisits;
      return focusRatio >= minFocusRatio;
    });
    
    if (!includeProgression) {
      return hasBasicFocus;
    }
    
    // Check for progression patterns using PathAnalyzer
    const patterns = pathAnalyzer.analyzePathPatterns(readerState, { [nodeState.id]: nodeState });
    const temporalPatterns = patterns.filter(p => p.type === 'temporal');
    
    return hasBasicFocus && temporalPatterns.some(p => p.strength >= 0.3);
  }
  
  /**
   * Checks if attractor affinity conditions are met
   */
  private checkAttractorAffinity(
    attractorAffinity: NonNullable<TransformationCondition['attractorAffinity']>,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const { attractors, minAffinityRatio = 0.25, includeThematicContinuity = false } = attractorAffinity;
    
    const { attractorsEngaged } = readerState.path;
    if (!attractorsEngaged) return false;
    
    const totalEngagements = Object.values(attractorsEngaged).reduce((sum: number, count: number) => sum + count, 0);
    if (totalEngagements === 0) return false;
    
    // Check basic affinity
    const hasBasicAffinity = attractors.some(attractor => {
      const engagements = (attractorsEngaged as Record<string, number>)[attractor] || 0;
      const affinityRatio = engagements / totalEngagements;
      return affinityRatio >= minAffinityRatio;
    });
    
    if (!includeThematicContinuity) {
      return hasBasicAffinity;
    }
    
    // Check for thematic continuity using PathAnalyzer
    const patterns = pathAnalyzer.analyzePathPatterns(readerState, { [nodeState.id]: nodeState });
    const thematicPatterns = patterns.filter(p => p.type === 'thematic');
    
    return hasBasicAffinity && thematicPatterns.some(p => p.strength >= 0.5);
  }
  
  /**
   * Checks if attractor engagement conditions are met
   */
  private checkAttractorEngagement(
    attractorEngagement: NonNullable<TransformationCondition['attractorEngagement']>,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const { attractor, minEngagementScore = 50, trendRequired = 'any' } = attractorEngagement;
    
    // Use PathAnalyzer's attractor engagement analysis
    const engagements = pathAnalyzer.calculateAttractorEngagement(readerState, { [nodeState.id]: nodeState });
    
    const engagement = engagements.find(e => e.attractor === attractor);
    if (!engagement) return false;
    
    // Check engagement score
    if (engagement.engagementScore < minEngagementScore) return false;
    
    // Check trend if specified
    if (trendRequired !== 'any' && engagement.trend !== trendRequired) return false;
    
    return true;
  }
  
  /**
   * Checks if recursive pattern conditions are met
   */
  private checkRecursivePattern(
    recursivePattern: NonNullable<TransformationCondition['recursivePattern']>,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const { minPatternStrength = 0.6, maxPatternLength = 4, requireRecency = false } = recursivePattern;
    
    // Use PathAnalyzer's recursive pattern analysis
    const patterns = pathAnalyzer.analyzeRecursivePatterns(readerState, { [nodeState.id]: nodeState });
    
    if (patterns.length === 0) return false;
    
    // Filter patterns by criteria
    const validPatterns = patterns.filter(pattern => {
      // Check strength
      if (pattern.strength < minPatternStrength) return false;
      
      // Check length
      if (pattern.length > maxPatternLength) return false;
      
      // Check recency if required
      if (requireRecency) {
        const recentThreshold = readerState.path.sequence.length * 0.7;
        if (pattern.lastOccurrenceIndex < recentThreshold) return false;
      }
      
      return true;
    });
    
    return validPatterns.length > 0;
  }
  
  /**
   * Checks if journey fingerprint conditions are met
   */
  private checkJourneyFingerprint(
    journeyFingerprint: NonNullable<TransformationCondition['journeyFingerprint']>,
    readerState: ReaderState,
    nodeState: NodeState
  ): boolean {
    const {
      explorationStyle,
      temporalPreference,
      narrativeApproach,
      minComplexityIndex,
      minFocusIndex
    } = journeyFingerprint;
    
    // Use PathAnalyzer's journey fingerprint analysis
    const fingerprint = pathAnalyzer.generateJourneyFingerprint(readerState, { [nodeState.id]: nodeState });
    
    // Check exploration style
    if (explorationStyle && fingerprint.explorationStyle !== explorationStyle) {
      return false;
    }
    
    // Check temporal preference
    if (temporalPreference && fingerprint.temporalPreference !== temporalPreference) {
      return false;
    }
    
    // Check narrative approach
    if (narrativeApproach && fingerprint.narrativeApproach !== narrativeApproach) {
      return false;
    }
    
    // Check complexity index
    if (minComplexityIndex !== undefined && fingerprint.complexityIndex < minComplexityIndex) {
      return false;
    }
    
    // Check focus index
    if (minFocusIndex !== undefined && fingerprint.focusIndex < minFocusIndex) {
      return false;
    }
    
    return true;
  }
  
  /**
   * Evaluates a transformation rule against the current reader and node state
   * Returns whether the transformation should be applied and the applicable transformations
   * Enhanced with better caching for improved performance
   */
  evaluateTransformation(
    rule: { condition: TransformationCondition; transformations: TextTransformation[] },
    readerState: ReaderState,
    nodeState: NodeState
  ): TransformationResult {
    // Generate rule-specific cache key that doesn't include the entire rule JSON
    const ruleCacheKey = `rule:${JSON.stringify(rule.condition)}:${nodeState.id}:${nodeState.visitCount}`;
    
    // Check cache first
    const cachedResult = this.conditionCache.get(ruleCacheKey);
    if (cachedResult !== undefined) {
      this.stats.conditionCacheHits++;
      return {
        shouldApply: cachedResult,
        appliedTransformations: cachedResult ? rule.transformations : []
      };
    }
    
    // Not found in cache, evaluate condition
    this.stats.conditionEvaluations++;
    const shouldApply = this.evaluateCondition(rule.condition, readerState, nodeState);
    
    // Cache the result
    this.conditionCache.put(ruleCacheKey, shouldApply);
    
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
   * Applies a text transformation to the given content with enhanced caching
   * Refactored to reduce cognitive complexity by delegating each transformation type to a helper method
   */
  applyTextTransformation(content: string, transformation: TextTransformation): string {
    if (!transformation.selector) return content;
    if (content.includes('data-transform-type') && content.length > 10000) {
      console.warn('[TransformationEngine] Content appears heavily transformed, skipping to prevent infinite loop');
      return content;
    }
    this.stats.transformations++;
    const transformCacheKey = this.getTransformationCacheKey(content, [transformation], {
      contentPrefix: 50,
      includeTransformations: true
    });
    const cachedTransformation = this.transformationCache.get(transformCacheKey);
    if (cachedTransformation !== undefined) {
      this.stats.transformationCacheHits++;
      return cachedTransformation;
    }
    let result: string;
    switch (transformation.type) {
      case 'replace':
        result = this.applyReplaceTransformation(content, transformation);
        break;
      case 'fragment':
        result = this.applyFragmentTransformation(content, transformation);
        break;
      case 'expand':
        result = this.applyExpandTransformation(content, transformation);
        break;
      case 'emphasize':
        result = this.applyEmphasizeTransformation(content, transformation);
        break;
      case 'metaComment':
        result = this.applyMetaCommentTransformation(content, transformation);
        break;
      default:
        result = content;
    }
    this.transformationCache.put(transformCacheKey, result);
    return result;
  }

  // --- Helper methods for each transformation type ---

  private applyReplaceTransformation(content: string, transformation: TextTransformation): string {
    const replacement = transformation.replacement || '';
    const escapedSelector = this.escapeRegExp(transformation.selector!);
    const selectorRegex = new RegExp(escapedSelector, 'g');
    if (
      transformation.preserveFormatting &&
      (transformation.selector!.includes('*') ||
        transformation.selector!.includes('_') ||
        transformation.selector!.includes('`'))
    ) {
      const markdownRegex = /(\*\*|\*|__|_|`{3}|`)/g;
      const formatMarkers = transformation.selector!.match(markdownRegex) || [];
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

  private applyFragmentTransformation(content: string, transformation: TextTransformation): string {
    if (!transformation.fragmentPattern) return content;
    const fragmentPattern = transformation.fragmentPattern;
    const fragmentStyle = transformation.fragmentStyle || 'character';
    let fragmentedText = '';
    switch (fragmentStyle) {
      case 'character':
        fragmentedText = transformation.selector!.split('').join(fragmentPattern);
        break;
      case 'word':
        fragmentedText = transformation.selector!.split(' ').join(` ${fragmentPattern} `);
        break;
      case 'progressive': {
        const chars = transformation.selector!.split('');
        fragmentedText = chars
          .map((char, index) => {
            const fragmentCount = Math.floor(index / (chars.length / 5)) + 1;
            return char + fragmentPattern.repeat(fragmentCount);
          })
          .join('');
        break;
      }
      default:
        fragmentedText = transformation.selector!.split('').join(fragmentPattern);
    }
    const escapedSelector = this.escapeRegExp(transformation.selector!);
    const selectorRegex = new RegExp(escapedSelector, 'g');
    return content.replace(selectorRegex, fragmentedText);
  }

  private applyExpandTransformation(content: string, transformation: TextTransformation): string {
    const replacement = transformation.replacement || '';
    const expandStyle = transformation.expandStyle || 'append';
    const escapedSelector = this.escapeRegExp(transformation.selector!);
    const selectorRegex = new RegExp(escapedSelector, 'g');
    switch (expandStyle) {
      case 'append':
        return content.replace(selectorRegex, `${transformation.selector} ${replacement}`);
      case 'inline':
        return content.replace(
          selectorRegex,
          `${transformation.selector} <span class="narramorph-inline-expansion">[${replacement}]</span>`
        );
      case 'paragraph':
        return content.replace(
          selectorRegex,
          `${transformation.selector}\n\n<div class="narramorph-paragraph-expansion">${replacement}</div>`
        );
      case 'reveal':
        return content.replace(
          selectorRegex,
          `${transformation.selector} <span class="narramorph-reveal-expansion">${replacement}</span>`
        );
      default:
        return content.replace(selectorRegex, `${transformation.selector} ${replacement}`);
    }
  }

  private applyEmphasizeTransformation(content: string, transformation: TextTransformation): string {
    let emphasizedText = transformation.selector!;
    const intensity = transformation.intensity || 1;
    switch (transformation.emphasis) {
      case 'italic':
        emphasizedText = intensity > 1
          ? `<em class="intensity-${intensity}">${transformation.selector}</em>`
          : `*${transformation.selector}*`;
        break;
      case 'bold':
        emphasizedText = intensity > 1
          ? `<strong class="intensity-${intensity}">${transformation.selector}</strong>`
          : `**${transformation.selector}**`;
        break;
      case 'color':
        emphasizedText = `<span class="emphasized-text intensity-${intensity}">${transformation.selector}</span>`;
        break;
      case 'spacing': {
        const spacer = ' '.repeat(intensity);
        emphasizedText = transformation.selector!.split('').join(spacer);
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
    const escapedSelector = this.escapeRegExp(transformation.selector!);
    const selectorRegex = new RegExp(escapedSelector, 'g');
    return content.replace(selectorRegex, emphasizedText);
  }

  private applyMetaCommentTransformation(content: string, transformation: TextTransformation): string {
    const commentStyle = transformation.commentStyle || 'inline';
    const commentText = transformation.replacement || '';
    const escapedSelector = this.escapeRegExp(transformation.selector!);
    const selectorRegex = new RegExp(escapedSelector, 'g');
    switch (commentStyle) {
      case 'inline':
        return content.replace(
          selectorRegex,
          `${transformation.selector} <span class="narramorph-comment">[${commentText}]</span>`
        );
      case 'footnote': {
        const footnoteId = `footnote-${this.generateShortHash(transformation.selector!)}`;
        const hasFootnotes = content.includes('<div class="narramorph-footnotes">');
        let contentWithFootnote = content.replace(
          selectorRegex,
          `${transformation.selector}<sup class="narramorph-footnote-marker" id="${footnoteId}-ref">[†]</sup>`
        );
        if (hasFootnotes) {
          const footnoteInsertRegex = /<\/div>\s*<div class="narramorph-footnotes">/;
          if (footnoteInsertRegex.test(contentWithFootnote)) {
            contentWithFootnote = contentWithFootnote.replace(
              footnoteInsertRegex,
              `</div>\n\n<div class="narramorph-footnotes">\n<p id="${footnoteId}" class="narramorph-footnote">† <a href="#${footnoteId}-ref">↩</a> ${commentText}</p>`
            );
          } else {
            contentWithFootnote += `\n\n<p id="${footnoteId}" class="narramorph-footnote">† <a href="#${footnoteId}-ref">↩</a> ${commentText}</p>`;
          }
        } else {
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
   * Applies multiple transformations to content with enhanced caching and batching
   * for improved performance
   */
  applyTransformations(content: string, transformations: TextTransformation[]): string {
    // Quick return for empty cases
    if (!content) {
      console.warn('Content is empty or undefined');
      return '';
    }
    
    if (!Array.isArray(transformations) || transformations.length === 0) {
      return content;
    }

    // Prevent infinite loops by checking if content is already heavily transformed
    if (content.includes('data-transform-type') && 
        (content.length > 15000 || transformations.length > 20)) {
      console.warn('[TransformationEngine] Content appears heavily transformed or too many transformations, skipping batch to prevent infinite loop');
      return content;
    }
    
    this.stats.batchedTransformations++;
    
    // Generate an optimized cache key for this set of transformations
    const batchCacheKey = this.getTransformationCacheKey(content, transformations);
    
    // Check batched transformations cache first
    const cachedBatchResult = this.batchedTransformationCache.get(batchCacheKey);
    if (cachedBatchResult !== undefined) {
      this.stats.batchedCacheHits++;
      return cachedBatchResult;
    }
    
    try {
      // First sort transformations by priority to ensure consistent application order
      // This ensures cache hits even if transformations are provided in different orders
      const sortedTransformations = [...transformations].sort((a, b) => {
        // Convert string priority to numeric value
        const getPriorityValue = (p?: string) => {
          if (p === 'high') return 3;
          if (p === 'medium') return 2;
          if (p === 'low') return 1;
          return 0;
        };
        return getPriorityValue(b.priority) - getPriorityValue(a.priority);
      });
      
      // Apply transformations in batches for better performance
      // This reduces the number of string manipulations
      const result = sortedTransformations.reduce(
        (currentContent, transformation) =>
          this.applyTextTransformation(currentContent, transformation),
        content
      );
      
      // Cache the result in the batched cache
      this.batchedTransformationCache.put(batchCacheKey, result);
        return result;
    } catch (error) {
      console.error('Error applying transformations:', error);
      return content; // Return original content on error
    }
  }

  /**
   * Applies character bleed transformations to content based on character transition effects
   * @param content The content to transform
   * @param nodeState The current node state 
   * @param readerState The current reader state
   * @param characterBleedEffects Array of character bleed effects from CharacterBleedService
   * @returns Transformed content with character bleed effects applied
   */
  applyCharacterBleedTransformations(
    content: string,
    nodeState: NodeState,
    readerState: ReaderState,
    characterBleedEffects: CharacterBleedEffect[]
  ): string {
    // Quick validation
    if (!content) {
      console.warn('[TransformationEngine] applyCharacterBleedTransformations: Content is empty');
      return '';
    }

    if (!Array.isArray(characterBleedEffects) || characterBleedEffects.length === 0) {
      console.log('[TransformationEngine] applyCharacterBleedTransformations: No character bleed effects to apply');
      return content;
    }

    try {
      console.log(`[TransformationEngine] Applying ${characterBleedEffects.length} character bleed transformations to node ${nodeState.id}`);      // Extract TextTransformation objects from CharacterBleedEffect array
      // and enhance them with proper priority ordering
      const bleedTransformations: TextTransformation[] = characterBleedEffects.map((effect, index) => {
        const transformation = { ...effect.transformation };
        
        // Set high priority for character bleed effects to ensure they're applied first
        if (!transformation.priority) {
          transformation.priority = 'high';
        }

        console.log(`[TransformationEngine] Character bleed transformation ${index + 1}: ${effect.type} on "${effect.selector.substring(0, 30)}..." (${effect.sourceCharacter} → ${effect.targetCharacter})`);

        return transformation;
      });

      // Generate cache key for character bleed transformations
      const bleedCacheKey = this.getCharacterBleedCacheKey(
        content, 
        nodeState, 
        readerState, 
        characterBleedEffects
      );

      // Check cache first
      const cachedResult = this.batchedTransformationCache.get(bleedCacheKey);
      if (cachedResult !== undefined) {
        this.stats.batchedCacheHits++;
        console.log('[TransformationEngine] Character bleed transformations retrieved from cache');
        return cachedResult;
      }

      // Apply transformations using existing pipeline with enhanced error handling
      const transformedContent = this.applyTransformations(content, bleedTransformations);

      // Cache the result
      this.batchedTransformationCache.put(bleedCacheKey, transformedContent);

      console.log(`[TransformationEngine] Successfully applied character bleed transformations. Content length: ${content.length} → ${transformedContent.length}`);

      return transformedContent;

    } catch (error) {
      console.error('[TransformationEngine] Error applying character bleed transformations:', error);
      console.error('[TransformationEngine] Effects that failed:', characterBleedEffects.map(e => ({
        type: e.type,
        selector: e.selector.substring(0, 30),
        sourceCharacter: e.sourceCharacter,
        targetCharacter: e.targetCharacter
      })));
      
      // Return original content on error to prevent breaking the application
      return content;
    }
  }
  /**
   * Generates a cache key specifically for character bleed transformations
   * @param content The content being transformed
   * @param nodeState The current node state
   * @param readerState The current reader state  
   * @param characterBleedEffects The character bleed effects being applied
   * @returns Cache key string
   */
  private getCharacterBleedCacheKey(
    content: string,
    nodeState: NodeState,
    readerState: ReaderState,
    characterBleedEffects: CharacterBleedEffect[]
  ): string {
    // Create a compact cache key that captures the essential elements
    const contentHash = content.substring(0, 50); // First 50 chars of content
    const nodeKey = `${nodeState.id}:${nodeState.character}:${nodeState.visitCount}`;
    
    // Get the last visited character to capture the transition
    const detailedVisits = readerState.path.detailedVisits || [];
    const lastVisitedCharacter = detailedVisits.length >= 2
      ? detailedVisits[detailedVisits.length - 2].character
      : 'none';
    
    // Create a hash of the bleed effects
    const effectsHash = characterBleedEffects
      .map(e => `${e.type}:${e.selector.substring(0, 10)}:${e.sourceCharacter}:${e.targetCharacter}:${e.intensity}`)
      .join('|');
    
    const transitionKey = `${lastVisitedCharacter}→${nodeState.character}`;
    
    return `bleed:${contentHash}:${nodeKey}:${transitionKey}:${effectsHash}:${this.lastModificationTime}`;
  }
  
  /**
   * Clears all caches - useful when content or conditions change significantly
   */
  clearCaches(): void {
    this.conditionCache.clear();
    this.transformationCache.clear();
    this.batchedTransformationCache.clear();
    this.stats = {
      conditionEvaluations: 0,
      conditionCacheHits: 0,
      transformations: 0,
      transformationCacheHits: 0,
      batchedTransformations: 0,
      batchedCacheHits: 0
    };
  }
  
  /**
   * Returns cache statistics for monitoring performance
   */  /**
   * Returns comprehensive cache statistics for monitoring performance
   */
  getCacheStats(): {
    conditionCache: { size: number, capacity: number, hitRate: number },
    transformationCache: { size: number, capacity: number, hitRate: number },
    batchedTransformationCache: { size: number, capacity: number, hitRate: number }
  } {
    return {
      conditionCache: {
        ...this.conditionCache.getStats(),
        hitRate: this.stats.conditionEvaluations > 0
          ? this.stats.conditionCacheHits / this.stats.conditionEvaluations
          : 0
      },
      transformationCache: {
        ...this.transformationCache.getStats(),
        hitRate: this.stats.transformations > 0
          ? this.stats.transformationCacheHits / this.stats.transformations
          : 0
      },
      batchedTransformationCache: {
        ...this.batchedTransformationCache.getStats(),
        hitRate: this.stats.batchedTransformations > 0
          ? this.stats.batchedCacheHits / this.stats.batchedTransformations
          : 0
      }
    };
  }

  /**
   * Applies journey-based transformations to content based on detected patterns from PathAnalyzer
   * @param content The content to transform
   * @param nodeState The current node state
   * @param readerState The current reader state  
   * @param patterns Array of reading patterns from PathAnalyzer
   * @returns Array of TextTransformation objects for applying to content
   */
  applyJourneyTransformations(
    content: string,
    nodeState: NodeState,
    readerState: ReaderState,
    patterns: ReadingPattern[]
  ): TextTransformation[] {
    // Quick validation
    if (!content || !patterns || patterns.length === 0) {
      console.log('[TransformationEngine] applyJourneyTransformations: No patterns to apply');
      return [];
    }

    try {
      console.log(`[TransformationEngine] Applying journey transformations for ${patterns.length} patterns to node ${nodeState.id}`);

      // Generate cache key for journey transformations
      const journeyCacheKey = this.getJourneyCacheKey(content, nodeState, readerState, patterns);

      // Check cache first  
      const cachedResult = this.batchedTransformationCache.get(journeyCacheKey);
      if (cachedResult !== undefined) {
        this.stats.batchedCacheHits++;
        console.log('[TransformationEngine] Journey transformations retrieved from cache');
        return this.parseTransformationsFromCachedContent(cachedResult);
      }

      const transformations: TextTransformation[] = [];

      // Process each pattern type and generate appropriate transformations
      patterns.forEach((pattern, index) => {
        console.log(`[TransformationEngine] Processing pattern ${index + 1}: ${pattern.type} (strength: ${pattern.strength})`);

        switch (pattern.type) {
          case 'sequence':
            transformations.push(...this.createRecursiveSequenceTransformations(pattern, nodeState, readerState));
            break;

          case 'character':
            transformations.push(...this.createCharacterFocusTransformations(pattern, nodeState, readerState));
            break;

          case 'temporal':
            transformations.push(...this.createTemporalPatternTransformations(pattern, nodeState, readerState));
            break;

          case 'thematic':
            transformations.push(...this.createThematicContinuityTransformations(pattern, nodeState, readerState));
            break;

          case 'rhythm':
            // Rhythm patterns could add pacing-based transformations
            transformations.push(...this.createRhythmPatternTransformations(pattern, nodeState, readerState));
            break;

          default:
            console.warn(`[TransformationEngine] Unknown pattern type: ${pattern.type}`);
        }
      });

      // Filter out invalid transformations and limit for performance
      const validTransformations = transformations
        .filter(t => t.selector && t.selector.length > 0)
        .slice(0, 8); // Limit to prevent overwhelming content

      // Cache the transformations by storing a reference string
      const transformationsCacheData = JSON.stringify(validTransformations);
      this.batchedTransformationCache.put(journeyCacheKey, transformationsCacheData);

      console.log(`[TransformationEngine] Generated ${validTransformations.length} journey transformations`);

      return validTransformations;

    } catch (error) {
      console.error('[TransformationEngine] Error in applyJourneyTransformations:', error);
      return [];
    }
  }

  /**
   * Generates a cache key specifically for journey transformations
   */
  private getJourneyCacheKey(
    content: string,
    nodeState: NodeState,
    readerState: ReaderState,
    patterns: ReadingPattern[]
  ): string {
    const contentHash = content.substring(0, 50);
    const nodeKey = `${nodeState.id}:${nodeState.character}:${nodeState.visitCount}`;
    
    // Create pattern signature  
    const patternSignature = patterns
      .map(p => `${p.type}:${p.strength.toFixed(2)}:${(p.relatedNodes || []).length}`)
      .join('|');

    // Recent path for context
    const recentPath = readerState.path.sequence.slice(-5).join('→');
    
    return `journey:${contentHash}:${nodeKey}:${recentPath}:${patternSignature}:${this.lastModificationTime}`;
  }

  /**
   * Creates transformations for recursive sequence patterns
   * Generates meta-commentary about pattern recognition
   */
  private createRecursiveSequenceTransformations(
    pattern: ReadingPattern,
    nodeState: NodeState,
    readerState: ReaderState
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];

    // Get detailed recursive patterns for this analysis
    const recursivePatterns: RecursivePattern[] = pathAnalyzer.analyzeRecursivePatterns(readerState, { [nodeState.id]: nodeState });
    const strongPatterns = recursivePatterns.filter(p => p.strength >= 0.6);

    if (strongPatterns.length > 0) {
      // Add meta-commentary about pattern recognition
      transformations.push({
        type: 'metaComment',
        selector: 'pattern',
        replacement: `recursive navigation detected: ${strongPatterns[0].sequence.join('→')} (×${strongPatterns[0].occurrences})`,
        commentStyle: 'marginalia',
        intensity: Math.ceil(pattern.strength * 3),
        priority: 'high'
      });

      // For very strong patterns, add fragmentation to show algorithmic recognition
      if (pattern.strength > 0.8) {
        transformations.push({
          type: 'fragment',
          selector: 'recognition',
          fragmentPattern: '...',
          fragmentStyle: 'progressive',
          intensity: 2,
          priority: 'medium'
        });
      }

      // Emphasize repeated elements if this node is part of the pattern
      if (strongPatterns.some(p => p.sequence.includes(nodeState.id))) {
        transformations.push({
          type: 'emphasize',
          selector: 'loop',
          emphasis: 'color',
          intensity: 2,
          priority: 'medium'
        });
      }
    }

    return transformations;
  }

  /**
   * Creates transformations for character focus patterns
   * Generates perspective bleeding effects  
   */
  private createCharacterFocusTransformations(
    pattern: ReadingPattern,
    nodeState: NodeState,
    readerState: ReaderState
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];

    // Get character focus intensity data
    const characterIntensities: CharacterFocusIntensity[] = pathAnalyzer.calculateCharacterFocusIntensity(readerState, { [nodeState.id]: nodeState });
    const focusedCharacters = characterIntensities.filter(ci => ci.intensity >= 0.4);

    if (focusedCharacters.length > 0 && pattern.relatedCharacters) {
      const dominantCharacter = focusedCharacters[0].character;
      
      // Create perspective bleeding effects
      if (dominantCharacter !== nodeState.character) {
        transformations.push({
          type: 'metaComment',
          selector: 'perspective',
          replacement: `${dominantCharacter} perspective bleeding through (focus: ${Math.round(focusedCharacters[0].intensity * 100)}%)`,
          commentStyle: 'interlinear',
          intensity: Math.ceil(pattern.strength * 3),
          priority: 'high'
        });

        // Add character-specific emphasis
        transformations.push({
          type: 'emphasize',
          selector: 'I',
          emphasis: 'glitch',
          intensity: 2,
          priority: 'medium'
        });
      }

      // For high intensity focus, add perspective shift commentary
      if (focusedCharacters[0].intensity > 0.7) {
        transformations.push({
          type: 'expand',
          selector: 'thought',
          replacement: `[${dominantCharacter} cognitive patterns emerging]`,
          expandStyle: 'inline',
          priority: 'low'
        });
      }
    }

    return transformations;
  }

  /**
   * Creates transformations for temporal patterns
   * Generates temporal displacement awareness effects
   */
  private createTemporalPatternTransformations(
    pattern: ReadingPattern,
    nodeState: NodeState,
    readerState: ReaderState
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];

    // Get temporal jumping patterns
    const temporalJumping: TemporalJumpingPattern = pathAnalyzer.analyzeTemporalJumping(readerState, { [nodeState.id]: nodeState });
    
    if (temporalJumping.volatility > 0.5 || temporalJumping.jumpFrequency > 0.3) {
      // Add temporal displacement awareness
      transformations.push({
        type: 'metaComment',
        selector: 'time',
        replacement: `temporal displacement detected: ${temporalJumping.totalJumps} jumps, ${temporalJumping.preferredJumpDirection} bias`,
        commentStyle: 'footnote',
        intensity: Math.ceil(pattern.strength * 3),
        priority: 'high'
      });

      // For high volatility, fragment time-related words
      if (temporalJumping.volatility > 0.7) {
        transformations.push({
          type: 'fragment',
          selector: 'moment',
          fragmentPattern: '≈',
          fragmentStyle: 'character',
          intensity: 3,
          priority: 'medium'
        });

        transformations.push({
          type: 'fragment',
          selector: 'now',
          fragmentPattern: '≈',
          fragmentStyle: 'word',
          intensity: 3,
          priority: 'medium'
        });
      }      // Emphasize temporal anchoring if strong
      const strongAnchor = Object.entries(temporalJumping.temporalAnchoring)
        .find(([, value]) => value > 0.6);
      
      if (strongAnchor) {
        transformations.push({
          type: 'emphasize',
          selector: strongAnchor[0],
          emphasis: 'highlight',
          intensity: 2,
          priority: 'medium'
        });
      }
    }

    return transformations;
  }
  
  /**
   * Creates transformations for thematic continuity patterns  
   * Generates strange attractor resonance effects
   */
  private createThematicContinuityTransformations(
    pattern: ReadingPattern,
    nodeState: NodeState,
    readerState: ReaderState
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];

    if (pattern.relatedAttractors && pattern.relatedAttractors.length > 0) {
      // Get attractor engagement levels
      const attractorEngagements = pathAnalyzer.calculateAttractorEngagement(readerState, { [nodeState.id]: nodeState });
      
      pattern.relatedAttractors.forEach(attractor => {
        const engagement = attractorEngagements.find(e => e.attractor === attractor);
        
        if (engagement && engagement.engagementScore >= 50) {
          // Create resonance effects based on engagement
          transformations.push({
            type: 'metaComment',
            selector: attractor.replace('-', ' '),
            replacement: `strange attractor resonance: ${engagement.engagementScore}/100 (${engagement.trend})`,
            commentStyle: 'marginalia',
            intensity: Math.ceil(pattern.strength * 3),
            priority: 'high'
          });

          // For strong engagement, emphasize attractor concepts
          if (engagement.engagementScore > 75) {
            transformations.push({
              type: 'emphasize',
              selector: attractor.replace('-', ' '),
              emphasis: 'color',
              intensity: 3,
              priority: 'medium'
            });
          }

          // For trending attractors, add expansion
          if (engagement.trend === 'rising') {
            transformations.push({
              type: 'expand',
              selector: attractor.replace('-', ' '),
              replacement: `[amplifying]`,
              expandStyle: 'inline',
              priority: 'low'
            });
          }
        }
      });

      // Check for thematic continuity across recent visits
      const recentVisits = readerState.path.detailedVisits?.slice(-5) || [];
      const attractorContinuity = this.calculateAttractorContinuity(recentVisits, nodeState);
      
      if (attractorContinuity > 0.6) {
        transformations.push({
          type: 'replace',
          selector: 'connection',
          replacement: 'strange attractor web',
          preserveFormatting: true,
          priority: 'medium'
        });
      }
    }

    return transformations;
  }
  /**
   * Creates transformations for rhythm patterns
   * Generates narrative pacing effects
   */
  private createRhythmPatternTransformations(
    _pattern: ReadingPattern, // Marked as unused but kept for API consistency
    nodeState: NodeState,
    readerState: ReaderState
  ): TextTransformation[] {
    const transformations: TextTransformation[] = [];

    // Analyze journey fingerprint for rhythm patterns
    const fingerprint = pathAnalyzer.generateJourneyFingerprint(readerState, { [nodeState.id]: nodeState });

    // Based on exploration style, add appropriate rhythm effects
    switch (fingerprint.explorationStyle) {
      case 'linear':
        transformations.push({
          type: 'metaComment',
          selector: 'sequence',
          replacement: 'linear progression detected',
          commentStyle: 'inline',
          intensity: 1,
          priority: 'low'
        });
        break;

      case 'recursive':
        transformations.push({
          type: 'emphasize',
          selector: 'return',
          emphasis: 'spacing',
          intensity: 2,
          priority: 'medium'
        });
        break;

      case 'wandering':
        transformations.push({
          type: 'fragment',
          selector: 'direction',
          fragmentPattern: '~',
          fragmentStyle: 'word',
          intensity: 1,
          priority: 'low'
        });
        break;

      case 'chaotic':
        transformations.push({
          type: 'fragment',
          selector: 'order',
          fragmentPattern: '!',
          fragmentStyle: 'progressive',
          intensity: 3,
          priority: 'medium'
        });
        break;
    }

    // Add velocity-based effects
    if (fingerprint.velocityIndex > 0.7) {
      transformations.push({
        type: 'emphasize',
        selector: 'pace',
        emphasis: 'bold',
        intensity: 2,
        priority: 'medium'
      });
    }

    return transformations;
  }
  /**
   * Helper method to calculate attractor continuity across recent visits
   */
  private calculateAttractorContinuity(recentVisits: Array<{ engagedAttractors?: StrangeAttractor[] }>, currentNode: NodeState): number {
    if (recentVisits.length < 2) return 0;

    const currentAttractors = currentNode.strangeAttractors || [];
    if (currentAttractors.length === 0) return 0;

    let continuityScore = 0;
    let totalComparisons = 0;    // Compare with each recent visit
    recentVisits.forEach(visit => {
      if (visit.engagedAttractors && visit.engagedAttractors.length > 0) {
        const visitAttractors = visit.engagedAttractors;
        const sharedAttractors = currentAttractors.filter(attractor => 
          visitAttractors.includes(attractor)
        );
        
        continuityScore += sharedAttractors.length / Math.max(currentAttractors.length, visitAttractors.length);
        totalComparisons++;
      }
    });

    return totalComparisons > 0 ? continuityScore / totalComparisons : 0;
  }

  /**
   * Master integration method that coordinates all transformation systems
   * Provides a single entry point for comprehensive content transformation
   * 
   * @param content The original content to transform
   * @param nodeState The current node state
   * @param readerState The current reader state
   * @param allNodes All node states for context
   * @returns Fully transformed content with all effects applied
   */
  calculateAllTransformations(
    content: string,
    nodeState: NodeState,
    readerState: ReaderState,
    allNodes: Record<string, NodeState> = {}
  ): TextTransformation[] {
    // Quick validation and early returns
    if (!content || !nodeState || !readerState) {
      console.warn('[TransformationEngine] calculateAllTransformations: Missing required parameters');
      return [];
    }

    // Prevent infinite loops by checking if content is already heavily transformed
    if (content.includes('data-transform-type') && content.length > 15000) {
      console.warn('[TransformationEngine] Content appears heavily transformed, skipping to prevent infinite loop');
      return [];
    }

    try {
      console.log(`[TransformationEngine] Calculating all transformations for node ${nodeState.id}`);

      // Generate comprehensive cache key for the entire transformation pipeline
      const masterCacheKey = this.getMasterTransformationCacheKey(content, nodeState, readerState);

      // Check master cache first
      const cachedResult = this.batchedTransformationCache.get(masterCacheKey);
      if (cachedResult !== undefined) {
        this.stats.batchedCacheHits++;
        console.log('[TransformationEngine] All transformations retrieved from master cache');
        return this.parseTransformationsFromCachedContent(cachedResult);
      }

      const allTransformations: TextTransformation[] = [];

      // STEP 1: Character Bleed Transformations (Highest Priority)
      // These should be applied first as they affect how subsequent content is interpreted
      console.log('[TransformationEngine] Step 1: Calculating character bleed transformations');
      const characterBleedEffects = CharacterBleedService.calculateBleedEffects(nodeState, readerState);
      
      if (characterBleedEffects.length > 0) {        // Convert character bleed effects to TextTransformations with high priority
        const characterBleedTransformations: TextTransformation[] = characterBleedEffects.map((effect: CharacterBleedEffect) => ({
          ...effect.transformation,
          priority: 'high' as const,
          applyImmediately: true
        }));
        
        allTransformations.push(...characterBleedTransformations.slice(0, 3)); // Limit for performance
        console.log(`[TransformationEngine] Added ${Math.min(characterBleedTransformations.length, 3)} character bleed transformations`);
      }

      // STEP 2: Journey Pattern Transformations (High Priority)
      // These respond to navigation patterns and reading behavior
      console.log('[TransformationEngine] Step 2: Calculating journey pattern transformations');
      const patterns = pathAnalyzer.analyzePathPatterns(readerState, allNodes);
      
      if (patterns.length > 0) {
        const journeyTransformations = this.applyJourneyTransformations(content, nodeState, readerState, patterns);
        
        // Ensure journey transformations have high priority but lower than character bleed
        const prioritizedJourneyTransformations = journeyTransformations.map(t => ({
          ...t,
          priority: 'high' as const
        }));
        
        allTransformations.push(...prioritizedJourneyTransformations.slice(0, 4)); // Limit for performance
        console.log(`[TransformationEngine] Added ${Math.min(prioritizedJourneyTransformations.length, 4)} journey pattern transformations`);
      }

      // STEP 3: Node-Specific Transformation Rules (Medium Priority)
      // These are transformations specific to the current node's conditions
      console.log('[TransformationEngine] Step 3: Evaluating node-specific transformation rules');
      const nodeTransformations = this.evaluateAllTransformations(nodeState.transformations || [], readerState, nodeState);
      
      if (nodeTransformations.length > 0) {
        const prioritizedNodeTransformations = nodeTransformations.map(t => ({
          ...t,
          priority: t.priority || 'medium' as const
        }));
        
        allTransformations.push(...prioritizedNodeTransformations.slice(0, 3)); // Limit for performance
        console.log(`[TransformationEngine] Added ${Math.min(prioritizedNodeTransformations.length, 3)} node-specific transformations`);
      }

      // STEP 4: Apply priority-based sorting to ensure correct application order
      const sortedTransformations = this.sortTransformationsByPriority(allTransformations);

      // STEP 5: Apply deduplication to prevent redundant transformations
      const deduplicatedTransformations = this.deduplicateTransformations(sortedTransformations);

      // Cache the final result
      const transformationsCacheData = JSON.stringify(deduplicatedTransformations);
      this.batchedTransformationCache.put(masterCacheKey, transformationsCacheData);

      console.log(`[TransformationEngine] Master transformation calculation complete:`, {
        characterBleed: characterBleedEffects.length,
        journeyPatterns: patterns.length,
        nodeRules: nodeState.transformations?.length || 0,
        totalTransformations: deduplicatedTransformations.length,
        cacheKey: masterCacheKey.substring(0, 50) + '...'
      });

      return deduplicatedTransformations;

    } catch (error) {
      console.error('[TransformationEngine] Error in calculateAllTransformations:', error);
      return [];
    }
  }

  /**
   * Single entry point for getting fully transformed content
   * Combines calculateAllTransformations with content application
   * 
   * @param nodeState The current node state  
   * @param readerState The current reader state
   * @param allNodes All node states for context (optional)
   * @returns Fully transformed content ready for display
   */
  getTransformedContent(
    nodeState: NodeState,
    readerState: ReaderState,
    allNodes: Record<string, NodeState> = {}
  ): string {
    // Get the base content
    const baseContent = nodeState.currentContent || nodeState.enhancedContent?.base || '';
    
    if (!baseContent) {
      console.warn(`[TransformationEngine] No content available for node ${nodeState.id}`);
      return '';
    }

    try {
      // Calculate all transformations using the master method
      const allTransformations = this.calculateAllTransformations(baseContent, nodeState, readerState, allNodes);

      // Apply transformations in the correct order
      const transformedContent = this.applyTransformations(baseContent, allTransformations);

      console.log(`[TransformationEngine] Content transformation complete for node ${nodeState.id}:`, {
        originalLength: baseContent.length,
        transformedLength: transformedContent.length,
        transformationsApplied: allTransformations.length
      });

      return transformedContent;

    } catch (error) {
      console.error(`[TransformationEngine] Error in getTransformedContent for node ${nodeState.id}:`, error);
      return baseContent; // Return original content on error
    }
  }

  /**
   * Generates a master cache key for the entire transformation pipeline
   * @param content The content being transformed
   * @param nodeState The current node state
   * @param readerState The current reader state
   * @returns Cache key string
   */
  private getMasterTransformationCacheKey(
    content: string,
    nodeState: NodeState,
    readerState: ReaderState
  ): string {
    // Create compact representation of key state
    const contentHash = content.substring(0, 30);
    const nodeKey = `${nodeState.id}:${nodeState.character}:${nodeState.visitCount}`;
    
    // Reader state essentials
    const pathSignature = readerState.path.sequence.slice(-5).join('→');
    const attractorSignature = Object.keys(readerState.path.attractorsEngaged || {}).slice(0, 3).join(',');
    
    // Character transition context
    const detailedVisits = readerState.path.detailedVisits || [];
    const lastCharacter = detailedVisits.length >= 2 
      ? detailedVisits[detailedVisits.length - 2].character 
      : 'none';
    const characterTransition = `${lastCharacter}→${nodeState.character}`;

    return `master:${contentHash}:${nodeKey}:${pathSignature}:${attractorSignature}:${characterTransition}:${this.lastModificationTime}`;
  }

  /**
   * Sorts transformations by priority to ensure correct application order
   * @param transformations Array of transformations to sort
   * @returns Sorted transformations array
   */
  private sortTransformationsByPriority(transformations: TextTransformation[]): TextTransformation[] {
    const getPriorityValue = (priority?: string): number => {
      switch (priority) {
        case 'high': return 3;
        case 'medium': return 2;
        case 'low': return 1;
        default: return 0;
      }
    };

    return [...transformations].sort((a, b) => {
      // First sort by priority
      const priorityDiff = getPriorityValue(b.priority) - getPriorityValue(a.priority);
      if (priorityDiff !== 0) return priorityDiff;

      // Then by applyImmediately flag
      if (a.applyImmediately && !b.applyImmediately) return -1;
      if (!a.applyImmediately && b.applyImmediately) return 1;

      // Finally by transformation type (replace and fragment first for better visual flow)
      const typeOrder = { replace: 0, fragment: 1, emphasize: 2, expand: 3, metaComment: 4 };
      const aOrder = typeOrder[a.type as keyof typeof typeOrder] ?? 5;
      const bOrder = typeOrder[b.type as keyof typeof typeOrder] ?? 5;
      
      return aOrder - bOrder;
    });
  }

  /**
   * Removes duplicate transformations to prevent redundant application
   * @param transformations Array of transformations to deduplicate
   * @returns Deduplicated transformations array
   */
  private deduplicateTransformations(transformations: TextTransformation[]): TextTransformation[] {
    const seen = new Set<string>();
    const deduplicated: TextTransformation[] = [];

    transformations.forEach(transformation => {
      // Create a unique key for this transformation
      const key = `${transformation.type}:${transformation.selector}:${transformation.replacement || ''}`;
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(transformation);
      }
    });

    if (deduplicated.length < transformations.length) {
      console.log(`[TransformationEngine] Deduplicated transformations: ${transformations.length} → ${deduplicated.length}`);
    }

    return deduplicated;
  }

  /**
   * Helper method to parse transformations from cached content string
   * @param cachedData Cached transformation data as JSON string
   * @returns Array of parsed transformations
   */
  private parseTransformationsFromCachedContent(cachedData: string): TextTransformation[] {
    try {
      return JSON.parse(cachedData) as TextTransformation[];
    } catch (error) {
      console.warn('[TransformationEngine] Failed to parse cached transformations:', error);
      return [];
    }
  }
}

// Export a singleton instance for use throughout the application
export const transformationEngine = new TransformationEngine();