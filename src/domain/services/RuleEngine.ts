/**
 * Core rule engine that manages transformation rules
 * Handles rule registration, evaluation, and application
 */

import { TransformationRule, TransformationContext } from '../models/TransformationContext';

export interface RuleManager {
  addRule(rule: TransformationRule): void;
  removeRule(ruleId: string): void;
  getApplicableRules(context: TransformationContext): TransformationRule[];
  getAllRules(): TransformationRule[];
  clearRules(): void;
}

export class SimpleRuleManager implements RuleManager {
  private rules: Map<string, TransformationRule> = new Map();

  /**
   * Add a transformation rule
   */
  addRule(rule: TransformationRule): void {
    this.rules.set(rule.id, rule);
  }

  /**
   * Remove a rule by ID
   */
  removeRule(ruleId: string): void {
    this.rules.delete(ruleId);
  }

  /**
   * Get all rules that apply to the given context
   * Returns rules sorted by priority (highest first)
   */
  getApplicableRules(context: TransformationContext): TransformationRule[] {
    const applicableRules: TransformationRule[] = [];

    for (const rule of this.rules.values()) {
      try {
        if (rule.condition(context)) {
          applicableRules.push(rule);
        }
      } catch (error) {
        console.warn(`Error evaluating rule ${rule.id}:`, error);
        // Continue with other rules
      }
    }

    // Sort by priority (highest first)
    return applicableRules.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Get all registered rules (for debugging/inspection)
   */
  getAllRules(): TransformationRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.rules.clear();
  }

  /**
   * Get rule count
   */
  getRuleCount(): number {
    return this.rules.size;
  }

  /**
   * Check if a rule exists
   */
  hasRule(ruleId: string): boolean {
    return this.rules.has(ruleId);
  }
}

export class RuleEngine {
  constructor(private ruleManager: RuleManager) {}

  /**
   * Apply all applicable rules to content
   */
  transform(content: string, context: TransformationContext): string {
    const applicableRules = this.ruleManager.getApplicableRules(context);
    
    if (applicableRules.length === 0) {
      return content;
    }

    // Apply rules in priority order
    let transformedContent = content;
    
    for (const rule of applicableRules) {
      try {
        transformedContent = rule.apply(transformedContent, context);
      } catch (error) {
        console.warn(`Error applying rule ${rule.id}:`, error);
        // Continue with other rules
      }
    }

    return transformedContent;
  }

  /**
   * Get applicable rules for debugging
   */
  getApplicableRules(context: TransformationContext): TransformationRule[] {
    return this.ruleManager.getApplicableRules(context);
  }

  /**
   * Add a rule to the engine
   */
  addRule(rule: TransformationRule): void {
    this.ruleManager.addRule(rule);
  }

  /**
   * Remove a rule from the engine
   */
  removeRule(ruleId: string): void {
    this.ruleManager.removeRule(ruleId);
  }

  /**
   * Clear all rules
   */
  clearRules(): void {
    this.ruleManager.clearRules();
  }
}