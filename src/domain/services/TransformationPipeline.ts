/**
 * Main transformation pipeline - single entry point for all content transformations
 * Consolidates all transformation logic into one coherent system
 */

import { TransformationContext } from '../models/TransformationContext';
import { RuleEngine, SimpleRuleManager } from './RuleEngine';

export interface ContentTransformer {
  transform(content: string, context: TransformationContext): string;
  addRule(rule: import('../models/TransformationContext').TransformationRule): void;
  removeRule(ruleId: string): void;
  clearRules(): void;
  getApplicableRules(context: TransformationContext): import('../models/TransformationContext').TransformationRule[];
}

export class TransformationPipeline implements ContentTransformer {
  constructor(private ruleEngine: RuleEngine) {}

  /**
   * Transform content based on context and applicable rules
   * This is the main entry point for all transformations
   */
  transform(content: string, context: TransformationContext): string {
    // Validate inputs
    if (!content) {
      console.warn('TransformationPipeline: Empty content provided');
      return '';
    }

    if (!context) {
      console.warn('TransformationPipeline: No context provided');
      return content;
    }

    // Prevent infinite loops by checking for already transformed content
    if (this.isAlreadyTransformed(content)) {
      console.warn('TransformationPipeline: Content appears already transformed, skipping');
      return content;
    }

    try {
      // Apply transformations through rule engine
      const transformedContent = this.ruleEngine.transform(content, context);
      
      // Log transformation for debugging
      if (process.env.NODE_ENV === 'development' && transformedContent !== content) {
        console.log(`TransformationPipeline: Transformed content for node ${context.nodeId}`, {
          originalLength: content.length,
          transformedLength: transformedContent.length,
          rulesApplied: this.ruleEngine.getApplicableRules(context).length
        });
      }

      return transformedContent;
    } catch (error) {
      console.error('TransformationPipeline: Error during transformation:', error);
      return content; // Return original content on error
    }
  }

  /**
   * Add a transformation rule to the pipeline
   */
  addRule(rule: import('../models/TransformationContext').TransformationRule): void {
    this.ruleEngine.addRule(rule);
  }

  /**
   * Remove a transformation rule from the pipeline
   */
  removeRule(ruleId: string): void {
    this.ruleEngine.removeRule(ruleId);
  }

  /**
   * Clear all transformation rules
   */
  clearRules(): void {
    this.ruleEngine.clearRules();
  }

  /**
   * Get all rules that would apply to the given context (for debugging)
   */
  getApplicableRules(context: TransformationContext): import('../models/TransformationContext').TransformationRule[] {
    return this.ruleEngine.getApplicableRules(context);
  }

  /**
   * Check if content has already been transformed to prevent infinite loops
   */
  private isAlreadyTransformed(content: string): boolean {
    // Look for transformation markers
    const transformationMarkers = [
      'class="marginalia"',
      'class="glitch-text"',
      'class="fade-text"',
      'class="footnote-ref"',
      'TEMPORAL_MARKER:',
      'data-text='
    ];

    return transformationMarkers.some(marker => content.includes(marker));
  }
}

/**
 * Factory function to create a transformation pipeline with default configuration
 */
export function createTransformationPipeline(): TransformationPipeline {
  const ruleManager = new SimpleRuleManager();
  const ruleEngine = new RuleEngine(ruleManager);
  return new TransformationPipeline(ruleEngine);
}

/**
 * Simple cache for transformation results
 * Replaces complex LRU cache with simple Map-based cache
 */
export class SimpleTransformationCache {
  private cache = new Map<string, string>();
  private readonly maxSize = 50; // Much smaller than original complex cache

  get(key: string): string | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: string): void {
    // Simple cache eviction - remove oldest entry when full
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.cache.has(key);
  }

  size(): number {
    return this.cache.size;
  }
}