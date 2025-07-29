/**
 * Tests for the unified TransformationPipeline
 * Validates the core transformation logic and rule application
 */

// Jest global type declarations
declare global {
  function describe(name: string, fn: () => void): void;
  function it(name: string, fn: () => void): void;
  function beforeEach(fn: () => void): void;
  function expect(actual: unknown): {
    toBe(expected: unknown): void;
    toHaveLength(length: number): void;
    toContain(item: unknown): void;
    toBeDefined(): void;
    toBeLessThan(value: number): void;
    toBeCloseTo(value: number, precision?: number): void;
    toBeGreaterThan(value: number): void;
    toBeGreaterThanOrEqual(value: number): void;
    toBeLessThanOrEqual(value: number): void;
    toMatch(pattern: RegExp | string): void;
    not: {
      toBe(expected: unknown): void;
      toThrow(): void;
    };
  };
  function expect(fn: () => void): {
    not: {
      toThrow(): void;
    };
  };
}

import { createTransformationPipeline } from '../../domain/services/TransformationPipeline';
import { TransformationContext, TransformationRule } from '../../domain/models/TransformationContext';
import { RuleBuilder } from '../../domain/services/RuleBuilder';
import { Conditions } from '../../domain/services/Conditions';
import { Transformations } from '../../domain/services/Transformations';

describe('TransformationPipeline', () => {
  let pipeline: ReturnType<typeof createTransformationPipeline>;
  let mockContext: TransformationContext;

  beforeEach(() => {
    pipeline = createTransformationPipeline();
    mockContext = {
      nodeId: 'test-node',
      visitCount: 1,
      currentCharacter: 'Archaeologist',
      previousCharacter: undefined,
      readerPath: ['test-node'],
      attractorsEngaged: ['memory-fragment'],
      temporalLayer: 'past',
    };
  });

  describe('Basic Transformation', () => {
    it('should return original content when no rules apply', () => {
      const content = 'This is test content';
      const result = pipeline.transform(content, mockContext);
      expect(result).toBe(content);
    });

    it('should apply simple replacement rule', () => {
      const rule = RuleBuilder
        .create('test-replace')
        .withName('Test Replace')
        .withPriority(10)
        .when(Conditions.visitCount(1))
        .apply(Transformations.replace('test', 'transformed'))
        .build();

      pipeline.addRule(rule);

      const content = 'This is test content';
      const result = pipeline.transform(content, mockContext);
      expect(result).toBe('This is transformed content');
    });

    it('should handle empty content gracefully', () => {
      const result = pipeline.transform('', mockContext);
      expect(result).toBe('');
    });

    it('should handle null context gracefully', () => {
      const content = 'This is test content';
      const result = pipeline.transform(content, null as unknown as TransformationContext);
      expect(result).toBe(content);
    });
  });

  describe('Rule Management', () => {
    it('should add and remove rules correctly', () => {
      const rule = RuleBuilder
        .create('test-rule')
        .withName('Test Rule')
        .withPriority(10)
        .when(Conditions.visitCount(1))
        .apply(Transformations.replace('test', 'transformed'))
        .build();

      pipeline.addRule(rule);
      expect(pipeline.getApplicableRules(mockContext)).toHaveLength(1);

      pipeline.removeRule('test-rule');
      expect(pipeline.getApplicableRules(mockContext)).toHaveLength(0);
    });

    it('should clear all rules', () => {
      const rule1 = RuleBuilder
        .create('rule-1')
        .withName('Rule 1')
        .withPriority(10)
        .when(Conditions.visitCount(1))
        .apply(Transformations.replace('test', 'transformed'))
        .build();

      const rule2 = RuleBuilder
        .create('rule-2')
        .withName('Rule 2')
        .withPriority(20)
        .when(Conditions.visitCount(1))
        .apply(Transformations.emphasize('content', 'bold'))
        .build();

      pipeline.addRule(rule1);
      pipeline.addRule(rule2);
      expect(pipeline.getApplicableRules(mockContext)).toHaveLength(2);

      pipeline.clearRules();
      expect(pipeline.getApplicableRules(mockContext)).toHaveLength(0);
    });
  });

  describe('Rule Priority', () => {
    it('should apply rules in priority order', () => {
      const lowPriorityRule = RuleBuilder
        .create('low-priority')
        .withName('Low Priority')
        .withPriority(10)
        .when(Conditions.visitCount(1))
        .apply(Transformations.replace('test', 'low'))
        .build();

      const highPriorityRule = RuleBuilder
        .create('high-priority')
        .withName('High Priority')
        .withPriority(100)
        .when(Conditions.visitCount(1))
        .apply(Transformations.replace('low', 'high'))
        .build();

      pipeline.addRule(lowPriorityRule);
      pipeline.addRule(highPriorityRule);

      const content = 'This is test content';
      const result = pipeline.transform(content, mockContext);
      expect(result).toBe('This is high content');
    });
  });

  describe('Complex Transformations', () => {
    it('should apply multiple transformations', () => {
      const replaceRule = RuleBuilder
        .create('replace-rule')
        .withName('Replace Rule')
        .withPriority(10)
        .when(Conditions.visitCount(1))
        .apply(Transformations.replace('test', 'transformed'))
        .build();

      const emphasizeRule = RuleBuilder
        .create('emphasize-rule')
        .withName('Emphasize Rule')
        .withPriority(20)
        .when(Conditions.visitCount(1))
        .apply(Transformations.emphasize('transformed', 'bold'))
        .build();

      pipeline.addRule(replaceRule);
      pipeline.addRule(emphasizeRule);

      const content = 'This is test content';
      const result = pipeline.transform(content, mockContext);
      expect(result).toContain('transformed');
      expect(result).toContain('<strong>');
    });

    it('should handle character transitions', () => {
      const transitionContext: TransformationContext = {
        ...mockContext,
        previousCharacter: 'Algorithm',
        currentCharacter: 'Archaeologist',
      };

      const transitionRule = RuleBuilder
        .create('transition-rule')
        .withName('Character Transition Rule')
        .withPriority(50)
        .when(Conditions.characterTransition('Algorithm', 'Archaeologist'))
        .apply(Transformations.characterBleed('Algorithm', 'Archaeologist'))
        .build();

      pipeline.addRule(transitionRule);

      const content = 'The data streams converge into memory fragments';
      const result = pipeline.transform(content, transitionContext);
      expect(result).toContain('glitch-text');
    });
  });

  describe('Error Handling', () => {
    it('should handle transformation errors gracefully', () => {
      const errorRule: TransformationRule = {
        id: 'error-rule',
        name: 'Error Rule',
        priority: 10,
        condition: () => true,
        apply: () => {
          throw new Error('Transformation error');
        },
      };

      pipeline.addRule(errorRule);

      const content = 'This is test content';
      const result = pipeline.transform(content, mockContext);
      // Should return original content on error
      expect(result).toBe(content);
    });

    it('should prevent infinite transformation loops', () => {
      const content = 'This is <span class="glitch-text">already transformed</span> content';
      const result = pipeline.transform(content, mockContext);
      // Should detect already transformed content and skip
      expect(result).toBe(content);
    });
  });

  describe('Performance', () => {
    it('should handle large content efficiently', () => {
      const largeContent = 'This is test content. '.repeat(1000);
      const start = performance.now();
      
      const result = pipeline.transform(largeContent, mockContext);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete in under 100ms
    });

    it('should handle many rules efficiently', () => {
      // Add many rules
      for (let i = 0; i < 100; i++) {
        const rule = RuleBuilder
          .create(`rule-${i}`)
          .withName(`Rule ${i}`)
          .withPriority(i)
          .when(Conditions.visitCount(999)) // Won't match, just testing rule evaluation
          .apply(Transformations.replace('test', 'transformed'))
          .build();
        pipeline.addRule(rule);
      }

      const content = 'This is test content';
      const start = performance.now();
      
      const result = pipeline.transform(content, mockContext);
      
      const end = performance.now();
      const duration = end - start;
      
      expect(result).toBe(content); // No rules should match
      expect(duration).toBeLessThan(50); // Should complete quickly even with many rules
    });
  });
});