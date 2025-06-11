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
    
    // Skip caching for empty conditions
    if (Object.keys(condition).length === 0) {
      return true;
    }
    
    // Generate cache key
    const cacheKey = this.getConditionCacheKey(condition, readerState, nodeState);
    
    // Check cache first
    const cachedResult = this.conditionCache.get(cacheKey);
    if (cachedResult !== undefined) {
      this.stats.conditionCacheHits++;
      return cachedResult;
    }
    
    // For debugging
    // console.log('Evaluating condition:', JSON.stringify(condition));
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
    
    // 6. Endpoint progress condition
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
    
    // 9. Character bleed condition
    if (condition.characterBleed) {
      if (!this.checkCharacterBleed(readerState, nodeState)) {
        return false;
      }
    }
      // 10. Journey pattern condition
    if (condition.journeyPattern?.length) {
      if (!this.matchesJourneyPattern(condition.journeyPattern, readerState.path.sequence)) {
        return false;
      }
    }
    
    // 11. Character focus condition
    if (condition.characterFocus) {
      if (!this.checkCharacterFocus(condition.characterFocus, readerState, nodeState)) {
        return false;
      }
    }
    
    // 12. Temporal focus condition
    if (condition.temporalFocus) {
      if (!this.checkTemporalFocus(condition.temporalFocus, readerState, nodeState)) {
        return false;
      }
    }
    
    // 13. Attractor affinity condition
    if (condition.attractorAffinity) {
      if (!this.checkAttractorAffinity(condition.attractorAffinity, readerState, nodeState)) {
        return false;
      }
    }
    
    // 14. Attractor engagement condition
    if (condition.attractorEngagement) {
      if (!this.checkAttractorEngagement(condition.attractorEngagement, readerState, nodeState)) {
        return false;
      }
    }
    
    // 15. Recursive pattern condition
    if (condition.recursivePattern) {
      if (!this.checkRecursivePattern(condition.recursivePattern, readerState, nodeState)) {
        return false;
      }
    }
    
    // 16. Journey fingerprint condition
    if (condition.journeyFingerprint) {
      if (!this.checkJourneyFingerprint(condition.journeyFingerprint, readerState, nodeState)) {
        return false;
      }
    }
    
    // Cache the result before returning
    this.conditionCache.put(cacheKey, true);
    
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
   * Checks if there is character bleed - when the previous visited node
   * had a different character than the current node
   */
  private checkCharacterBleed(readerState: ReaderState, nodeState: NodeState): boolean {
    // Check if we have detailed visits and at least 2 visits
    if (!readerState.path.detailedVisits || readerState.path.detailedVisits.length < 2) {
      return false;
    }
    
    // Get the second-to-last visit (previous visit)
    const previousVisit = readerState.path.detailedVisits[readerState.path.detailedVisits.length - 2];
    
    // Compare the character of the previous visit with the current node's character
    return previousVisit.character !== nodeState.character;
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
   * Utilizes caching for improved performance
   */
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
   * Applies a text transformation to the given content with caching
   */  /**
   * Applies a text transformation to the given content with enhanced caching
   */
  applyTextTransformation(content: string, transformation: TextTransformation): string {
    if (!transformation.selector) return content;
    
    // Prevent infinite loops by checking if content is already heavily transformed
    if (content.includes('data-transform-type') && content.length > 10000) {
      console.warn('[TransformationEngine] Content appears heavily transformed, skipping to prevent infinite loop');
      return content;
    }
    
    this.stats.transformations++;
    
    // Generate more efficient cache key for this transformation
    const transformCacheKey = this.getTransformationCacheKey(content, [transformation], {
      contentPrefix: 50,
      includeTransformations: true
    });
    
    // Check cache first
    const cachedTransformation = this.transformationCache.get(transformCacheKey);
    if (cachedTransformation !== undefined) {
      this.stats.transformationCacheHits++;
      return cachedTransformation;
    }

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
   * Applies multiple transformations to content with enhanced caching
   */  /**
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
   */
  /**
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
}

// Export a singleton instance for use throughout the application
export const transformationEngine = new TransformationEngine();