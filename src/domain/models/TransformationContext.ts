/**
 * Domain model for transformation context
 * Contains all necessary information for transformation decisions
 */

import { Character, StrangeAttractor, TemporalLabel } from '../../types';

export interface TransformationContext {
  nodeId: string;
  visitCount: number;
  currentCharacter: Character;
  previousCharacter?: Character;
  readerPath: string[];
  attractorsEngaged: StrangeAttractor[];
  temporalLayer: TemporalLabel;
}

export interface TransformationRule {
  id: string;
  name: string;
  condition: ConditionFunction;
  apply: TransformationFunction;
  priority: number;
}

export type ConditionFunction = (context: TransformationContext) => boolean;
export type TransformationFunction = (content: string, context: TransformationContext) => string;

export interface SimpleTransformation {
  type: 'replace' | 'emphasize' | 'fragment' | 'expand' | 'comment';
  target: string;
  replacement?: string;
  style?: string;
  intensity?: number;
}

/**
 * Result of applying transformations to content
 */
export interface TransformationResult {
  originalContent: string;
  transformedContent: string;
  appliedRules: string[];
  metadata: {
    transformationCount: number;
    processingTime?: number;
    cacheHit?: boolean;
  };
}