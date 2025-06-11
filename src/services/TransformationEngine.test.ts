/**
 * Test file for TransformationEngine new condition types
 * Demonstrates characterBleed and journeyPattern functionality
 */

import { TransformationEngine } from './TransformationEngine';
import { ReaderState } from '../store/slices/readerSlice';
import { NodeState } from '../types';

// Create a test instance
const transformationEngine = new TransformationEngine();

// Mock reader state with detailed visits for character bleed testing
const mockReaderStateWithCharacterBleed: ReaderState = {
  path: {
    sequence: ['node1', 'node2', 'node3'],
    revisitPatterns: {},
    attractorsEngaged: {} as Record<string, number>,
    detailedVisits: [
      {
        nodeId: 'node1',
        character: 'Archaeologist',
        temporalLayer: 'past',
        engagedAttractors: [],
        index: 0,
        revisitCount: 1
      },
      {
        nodeId: 'node2',
        character: 'Algorithm', // Different character
        temporalLayer: 'present',
        engagedAttractors: [],
        index: 1,
        revisitCount: 1
      }
    ]
  },
  currentNodeId: 'node3',
  previousNodeId: 'node2',
  endpointProgress: { past: 0, present: 0, future: 0 },
  attractorEngagement: {} as Record<string, number>
};

// Mock reader state for journey pattern testing
const mockReaderStateWithJourneyPattern: ReaderState = {
  path: {
    sequence: ['node1', 'node2', 'node3', 'node4', 'node5'],
    revisitPatterns: {},
    attractorsEngaged: {} as Record<string, number>
  },
  currentNodeId: 'node5',
  previousNodeId: 'node4',
  endpointProgress: { past: 0, present: 0, future: 0 },
  attractorEngagement: {} as Record<string, number>
};

// Mock current node state
const mockCurrentNodeState: NodeState = {
  id: 'node3',
  title: 'Test Node',
  character: 'LastHuman', // Different from previous character
  temporalValue: 5,
  initialConnections: [],
  contentSource: 'test.md',
  coreConcept: 'Test concept',
  strangeAttractors: [],
  transformationThresholds: {
    visit: 1,
    revisit: 2,
    complex: 3,
    fragmented: 5
  },
  visitCount: 1,
  currentState: 'visited',
  revealedConnections: [],
  transformations: [],
  content: null,
  currentContent: null
};

// Test character bleed condition
console.log('Testing character bleed condition...');

// Should return true because previous character (Algorithm) differs from current (LastHuman)
const characterBleedResult = transformationEngine.evaluateCondition(
  { characterBleed: true },
  mockReaderStateWithCharacterBleed,
  mockCurrentNodeState
);

console.log('Character bleed test result:', characterBleedResult); // Should be true

// Test with same character (should return false)
const mockReaderStateSameCharacter: ReaderState = {
  ...mockReaderStateWithCharacterBleed,
  path: {
    ...mockReaderStateWithCharacterBleed.path,
    detailedVisits: [
      {
        nodeId: 'node1',
        character: 'LastHuman', // Same character
        temporalLayer: 'past',
        engagedAttractors: [],
        index: 0,
        revisitCount: 1
      },
      {
        nodeId: 'node2',
        character: 'LastHuman', // Same character
        temporalLayer: 'present',
        engagedAttractors: [],
        index: 1,
        revisitCount: 1
      }
    ]
  }
};

const sameCharacterResult = transformationEngine.evaluateCondition(
  { characterBleed: true },
  mockReaderStateSameCharacter,
  mockCurrentNodeState
);

console.log('Same character test result:', sameCharacterResult); // Should be false

// Test journey pattern condition
console.log('\nTesting journey pattern condition...');

// Should return true because the last 3 nodes match the pattern
const journeyPatternResult = transformationEngine.evaluateCondition(
  { journeyPattern: ['node3', 'node4', 'node5'] },
  mockReaderStateWithJourneyPattern,
  mockCurrentNodeState
);

console.log('Journey pattern test result:', journeyPatternResult); // Should be true

// Test with non-matching pattern
const nonMatchingPatternResult = transformationEngine.evaluateCondition(
  { journeyPattern: ['node1', 'node2', 'node6'] }, // node6 doesn't exist
  mockReaderStateWithJourneyPattern,
  mockCurrentNodeState
);

console.log('Non-matching pattern test result:', nonMatchingPatternResult); // Should be false

// Test combined conditions
console.log('\nTesting combined conditions...');

const combinedResult = transformationEngine.evaluateCondition(
  {
    allOf: [
      { characterBleed: true },
      { journeyPattern: ['node3', 'node4', 'node5'] }
    ]
  },
  mockReaderStateWithCharacterBleed, // This has character bleed but wrong sequence
  mockCurrentNodeState
);

console.log('Combined conditions test result:', combinedResult); // Should be false (journey pattern won't match)

console.log('\nAll tests completed!');
