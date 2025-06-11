/**
 * Content Variant System Demo
 * 
 * This file demonstrates how the enhanced content variant system works.
 * To test this manually:
 * 
 * 1. Visit the arch-glitch node in the application
 * 2. Navigate from different character nodes to see character bleed effects
 * 3. Visit the same node multiple times to trigger visit-count variants
 * 4. Engage with memory-fragment attractors to see attractor-based variants
 */

import { contentVariantService, ContentSelectionContext } from '../services/ContentVariantService';
import { EnhancedNarramorphContent } from '../types';

// Example of how the arch-glitch content will be parsed
const exampleRawContent = `
# Memory Fragments

Base content goes here...

---after-algorithm---
Content that appears when coming from an Algorithm node...

---after-last-human---
Content that appears when coming from a Last Human node...

---recursive-awareness---
Content that appears when recursive patterns are detected...

---[1]---
Content for the first revisit...

---[3]---
Content for multiple revisits...
`;

// Example usage:
console.log('=== Content Variant System Demo ===');

// 1. Parse the content
const parsedContent: EnhancedNarramorphContent = contentVariantService.parseContentVariants(exampleRawContent);

console.log('Parsed content structure:', {
  baseContentLength: parsedContent.base.length,
  sectionVariants: Object.keys(parsedContent.sectionVariants),
  visitCountVariants: Object.keys(parsedContent.visitCountVariants)
});

// 2. Simulate different selection contexts
const contexts: Array<{ name: string; context: ContentSelectionContext }> = [
  {
    name: 'First visit',
    context: {
      visitCount: 0,
      lastVisitedCharacter: undefined,
      journeyPattern: [],
      characterSequence: [],
      attractorsEngaged: {},
      recursiveAwareness: 0
    }
  },
  {
    name: 'After visiting Algorithm node',
    context: {
      visitCount: 1,
      lastVisitedCharacter: 'Algorithm' as const,
      journeyPattern: ['algo-awakening', 'arch-glitch'],
      characterSequence: ['Algorithm' as const],
      attractorsEngaged: {},
      recursiveAwareness: 0
    }
  },
  {
    name: 'After visiting Last Human node',
    context: {
      visitCount: 1,
      lastVisitedCharacter: 'LastHuman' as const,
      journeyPattern: ['human-discovery', 'arch-glitch'],
      characterSequence: ['LastHuman' as const],
      attractorsEngaged: {},
      recursiveAwareness: 0
    }
  },
  {
    name: 'High recursive awareness',
    context: {
      visitCount: 2,
      lastVisitedCharacter: undefined,
      journeyPattern: ['arch-glitch', 'arch-loss', 'arch-glitch'],
      characterSequence: ['Archaeologist' as const, 'Archaeologist' as const],
      attractorsEngaged: {},
      recursiveAwareness: 0.8
    }
  },
  {
    name: 'Memory fragment engagement',
    context: {
      visitCount: 2,
      lastVisitedCharacter: undefined,
      journeyPattern: ['arch-discovery', 'arch-glitch'],
      characterSequence: ['Archaeologist' as const],
      attractorsEngaged: { 'memory-fragment': 4 },
      recursiveAwareness: 0.2
    }
  },
  {
    name: 'Multiple visits',
    context: {
      visitCount: 3,
      lastVisitedCharacter: undefined,
      journeyPattern: ['arch-glitch', 'arch-loss', 'arch-glitch'],
      characterSequence: ['Archaeologist' as const, 'Archaeologist' as const],
      attractorsEngaged: {},
      recursiveAwareness: 0.3
    }
  }
];

// 3. Test content selection for each context
contexts.forEach(({ name, context }) => {
  const selectedContent = contentVariantService.selectContentVariant(parsedContent, context);
  const contentPreview = selectedContent.substring(0, 100) + '...';
  
  console.log(`\n${name}:`);
  console.log(`  Selected content: ${contentPreview}`);
  console.log(`  Content length: ${selectedContent.length} characters`);
});

export const contentVariantDemo = {
  parsedContent,
  contexts,
  testSelection: (contextIndex: number) => {
    if (contexts[contextIndex]) {
      return contentVariantService.selectContentVariant(
        parsedContent, 
        contexts[contextIndex].context
      );
    }
    return parsedContent.base;
  }
};
