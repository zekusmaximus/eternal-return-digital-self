/**
 * Domain service providing condition functions for transformation rules
 * Pure functions with no external dependencies
 */

import { Character, StrangeAttractor } from '../../types';
import { ConditionFunction, TransformationContext } from '../models/TransformationContext';

export class Conditions {
  /**
   * Check if visit count meets minimum threshold
   */
  static visitCount(min: number): ConditionFunction {
    return (context: TransformationContext) => context.visitCount >= min;
  }

  /**
   * Check for character transition between specific characters
   */
  static characterTransition(from: Character, to: Character): ConditionFunction {
    return (context: TransformationContext) => 
      context.previousCharacter === from && 
      context.currentCharacter === to;
  }

  /**
   * Check if reader has visited all specified nodes
   */
  static hasVisitedNodes(nodeIds: string[]): ConditionFunction {
    return (context: TransformationContext) => 
      nodeIds.every(id => context.readerPath.includes(id));
  }

  /**
   * Check if reader has engaged with specific attractors
   */
  static hasEngagedAttractors(attractors: StrangeAttractor[]): ConditionFunction {
    return (context: TransformationContext) =>
      attractors.every(attractor => context.attractorsEngaged.includes(attractor));
  }

  /**
   * Check if current character matches specified character
   */
  static isCharacter(character: Character): ConditionFunction {
    return (context: TransformationContext) => context.currentCharacter === character;
  }

  /**
   * Check if reader path contains a specific sequence
   */
  static hasVisitedSequence(sequence: string[]): ConditionFunction {
    return (context: TransformationContext) => {
      const path = context.readerPath;
      for (let i = 0; i <= path.length - sequence.length; i++) {
        let matches = true;
        for (let j = 0; j < sequence.length; j++) {
          if (path[i + j] !== sequence[j]) {
            matches = false;
            break;
          }
        }
        if (matches) return true;
      }
      return false;
    };
  }

  /**
   * Logical AND - all conditions must be true
   */
  static and(...conditions: ConditionFunction[]): ConditionFunction {
    return (context: TransformationContext) => 
      conditions.every(condition => condition(context));
  }

  /**
   * Logical OR - at least one condition must be true
   */
  static or(...conditions: ConditionFunction[]): ConditionFunction {
    return (context: TransformationContext) => 
      conditions.some(condition => condition(context));
  }

  /**
   * Logical NOT - condition must be false
   */
  static not(condition: ConditionFunction): ConditionFunction {
    return (context: TransformationContext) => !condition(context);
  }
}