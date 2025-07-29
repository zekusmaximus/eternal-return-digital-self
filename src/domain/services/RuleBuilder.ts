/**
 * Fluent API for building transformation rules
 * Provides a clean, readable way to create complex transformation rules
 */

import { TransformationRule, ConditionFunction, TransformationFunction } from '../models/TransformationContext';

export class RuleBuilder {
  private rule: Partial<TransformationRule> = {};

  /**
   * Create a new rule builder with the specified ID
   */
  static create(id: string): RuleBuilder {
    return new RuleBuilder().withId(id);
  }

  /**
   * Set the rule ID
   */
  withId(id: string): RuleBuilder {
    this.rule.id = id;
    return this;
  }

  /**
   * Set the rule name (optional, defaults to ID)
   */
  withName(name: string): RuleBuilder {
    this.rule.name = name;
    return this;
  }

  /**
   * Set the rule priority (higher numbers = higher priority)
   */
  withPriority(priority: number): RuleBuilder {
    this.rule.priority = priority;
    return this;
  }

  /**
   * Set the condition function that determines when this rule applies
   */
  when(condition: ConditionFunction): RuleBuilder {
    this.rule.condition = condition;
    return this;
  }

  /**
   * Set the transformation function that modifies the content
   */
  apply(transformation: TransformationFunction): RuleBuilder {
    this.rule.apply = transformation;
    return this;
  }

  /**
   * Build and return the completed transformation rule
   */
  build(): TransformationRule {
    if (!this.rule.id) {
      throw new Error('Rule must have an ID');
    }
    if (!this.rule.condition) {
      throw new Error('Rule must have a condition function');
    }
    if (!this.rule.apply) {
      throw new Error('Rule must have a transformation function');
    }

    return {
      id: this.rule.id,
      name: this.rule.name || this.rule.id,
      condition: this.rule.condition,
      apply: this.rule.apply,
      priority: this.rule.priority || 0
    };
  }
}