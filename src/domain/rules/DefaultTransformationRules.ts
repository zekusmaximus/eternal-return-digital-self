/**
 * Default transformation rules that replace the complex logic from legacy services
 * These rules consolidate character bleed, visit count, and pattern-based transformations
 */

import { TransformationRule } from '../models/TransformationContext';
import { Conditions } from '../services/Conditions';
import { Transformations } from '../services/Transformations';
import { RuleBuilder } from '../services/RuleBuilder';

/**
 * Character bleed transformation rules
 * Replaces CharacterBleedService logic
 */
export const createCharacterBleedRules = (): TransformationRule[] => [
  // Algorithm to Archaeologist - Data corruption effects
  RuleBuilder
    .create('algo-to-arch-corruption')
    .withName('Algorithm to Archaeologist - Data Corruption')
    .withPriority(100)
    .when(Conditions.characterTransition('Algorithm', 'Archaeologist'))
    .apply(Transformations.characterBleed('Algorithm', 'Archaeologist'))
    .build(),

  // Algorithm to LastHuman - Pattern recognition effects
  RuleBuilder
    .create('algo-to-human-patterns')
    .withName('Algorithm to LastHuman - Pattern Recognition')
    .withPriority(100)
    .when(Conditions.characterTransition('Algorithm', 'LastHuman'))
    .apply(Transformations.characterBleed('Algorithm', 'LastHuman'))
    .build(),

  // Archaeologist to Algorithm - Temporal displacement
  RuleBuilder
    .create('arch-to-algo-temporal')
    .withName('Archaeologist to Algorithm - Temporal Displacement')
    .withPriority(100)
    .when(Conditions.characterTransition('Archaeologist', 'Algorithm'))
    .apply(Transformations.characterBleed('Archaeologist', 'Algorithm'))
    .build(),

  // LastHuman to others - Memory overlay effects
  RuleBuilder
    .create('human-to-others-memory')
    .withName('LastHuman to Others - Memory Overlay')
    .withPriority(100)
    .when(Conditions.or(
      Conditions.characterTransition('LastHuman', 'Algorithm'),
      Conditions.characterTransition('LastHuman', 'Archaeologist')
    ))
    .apply(Transformations.characterBleed('LastHuman', 'Algorithm')) // Will handle both cases
    .build()
];

/**
 * Visit count awareness rules
 * Replaces complex visit count logic from TransformationEngine
 */
export const createVisitCountRules = (): TransformationRule[] => [
  // First revisit - Pattern recognition begins
  RuleBuilder
    .create('first-revisit-awareness')
    .withName('First Revisit - Pattern Recognition')
    .withPriority(50)
    .when(Conditions.visitCount(2))
    .apply(Transformations.addComment('pattern', 'revisit detected', 'marginalia'))
    .build(),

  // Multiple visits - Recursive awareness
  RuleBuilder
    .create('recursive-awareness')
    .withName('Multiple Visits - Recursive Awareness')
    .withPriority(60)
    .when(Conditions.visitCount(3))
    .apply(Transformations.addComment('loop', 'recursive pattern detected', 'inline'))
    .build(),

  // Heavy revisiting - System awareness
  RuleBuilder
    .create('system-awareness')
    .withName('Heavy Revisiting - System Awareness')
    .withPriority(70)
    .when(Conditions.visitCount(5))
    .apply(Transformations.emphasize('system', 'glitch'))
    .build(),

  // Extreme revisiting - Fragmentation
  RuleBuilder
    .create('content-fragmentation')
    .withName('Extreme Revisiting - Content Fragmentation')
    .withPriority(80)
    .when(Conditions.visitCount(7))
    .apply(Transformations.fragment('memory', '...', 'progressive'))
    .build()
];

/**
 * Journey pattern rules
 * Replaces PathAnalyzer pattern detection logic
 */
export const createJourneyPatternRules = (): TransformationRule[] => [
  // Sequence pattern detection
  RuleBuilder
    .create('arch-algo-human-sequence')
    .withName('Archaeologist-Algorithm-Human Sequence')
    .withPriority(40)
    .when(Conditions.hasVisitedSequence(['arch-discovery', 'algo-awakening', 'human-discovery']))
    .apply(Transformations.addComment('connection', 'narrative sequence detected', 'footnote'))
    .build(),

  // Recursive navigation pattern
  RuleBuilder
    .create('recursive-navigation')
    .withName('Recursive Navigation Pattern')
    .withPriority(45)
    .when(Conditions.and(
      Conditions.visitCount(2),
      Conditions.hasVisitedNodes(['arch-discovery', 'algo-awakening'])
    ))
    .apply(Transformations.emphasize('return', 'fade'))
    .build(),

  // Character focus pattern
  RuleBuilder
    .create('archaeologist-focus')
    .withName('Archaeologist Character Focus')
    .withPriority(30)
    .when(Conditions.and(
      Conditions.isCharacter('Archaeologist'),
      Conditions.hasVisitedNodes(['arch-discovery', 'arch-loss', 'arch-glitch'])
    ))
    .apply(Transformations.addComment('perspective', 'archaeological focus detected', 'marginalia'))
    .build()
];

/**
 * Attractor engagement rules
 * Replaces StrangeAttractorSystem logic
 */
export const createAttractorRules = (): TransformationRule[] => [
  // Memory fragment attractor
  RuleBuilder
    .create('memory-fragment-engagement')
    .withName('Memory Fragment Attractor Engagement')
    .withPriority(35)
    .when(Conditions.hasEngagedAttractors(['memory-fragment']))
    .apply(Transformations.emphasize('memory', 'highlight'))
    .build(),

  // Recursion pattern attractor
  RuleBuilder
    .create('recursion-pattern-engagement')
    .withName('Recursion Pattern Attractor Engagement')
    .withPriority(35)
    .when(Conditions.hasEngagedAttractors(['recursion-pattern']))
    .apply(Transformations.fragment('pattern', '→', 'character'))
    .build(),

  // Identity pattern attractor
  RuleBuilder
    .create('identity-pattern-engagement')
    .withName('Identity Pattern Attractor Engagement')
    .withPriority(35)
    .when(Conditions.hasEngagedAttractors(['identity-pattern']))
    .apply(Transformations.addComment('identity', 'self-recognition pattern', 'inline'))
    .build()
];

/**
 * Temporal layer rules
 * Replaces temporal analysis from PathAnalyzer
 */
export const createTemporalRules = (): TransformationRule[] => [
  // Past temporal layer emphasis
  RuleBuilder
    .create('past-temporal-emphasis')
    .withName('Past Temporal Layer Emphasis')
    .withPriority(25)
    .when(Conditions.and(
      Conditions.hasVisitedNodes(['arch-discovery', 'arch-loss']),
      Conditions.isCharacter('Archaeologist')
    ))
    .apply(Transformations.emphasize('past', 'italic'))
    .build(),

  // Future temporal layer emphasis
  RuleBuilder
    .create('future-temporal-emphasis')
    .withName('Future Temporal Layer Emphasis')
    .withPriority(25)
    .when(Conditions.and(
      Conditions.hasVisitedNodes(['algo-evolution', 'human-upload']),
      Conditions.or(
        Conditions.isCharacter('Algorithm'),
        Conditions.isCharacter('LastHuman')
      )
    ))
    .apply(Transformations.emphasize('future', 'bold'))
    .build()
];

/**
 * Get all default transformation rules
 * This replaces the complex rule loading from multiple services
 */
export const getAllDefaultRules = (): TransformationRule[] => [
  ...createCharacterBleedRules(),
  ...createVisitCountRules(),
  ...createJourneyPatternRules(),
  ...createAttractorRules(),
  ...createTemporalRules()
];

/**
 * Load default rules into a rule manager
 * Replaces the complex initialization from legacy services
 */
export const loadDefaultRules = (ruleManager: { addRule: (rule: TransformationRule) => void }): void => {
  const rules = getAllDefaultRules();
  
  console.log(`Loading ${rules.length} default transformation rules`);
  
  rules.forEach(rule => {
    try {
      ruleManager.addRule(rule);
    } catch (error) {
      console.error(`Failed to load rule ${rule.id}:`, error);
    }
  });
  
  console.log('Default transformation rules loaded successfully');
};