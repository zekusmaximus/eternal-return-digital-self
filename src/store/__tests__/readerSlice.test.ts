import readerReducer, {
  ReaderState,
  navigateToNode,
  engageAttractor,
  updateEndpointProgress,
  resetReader,
  addVisitedNode,
  selectCurrentNodeId,
  selectPreviousNodeId,
  selectReadingPath,
  selectEndpointProgress,
  selectMostVisitedNodes,
  selectMostEngagedAttractors,
  selectRecentPath,
  selectNodeRevisitCount,
  selectVisited
} from '../slices/readerSlice';
import { Character, StrangeAttractor } from '../../types';

// Simple assertion functions to match the pattern used in existing tests
const assert = {
  equals: (actual: unknown, expected: unknown, message?: string): void => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  toBe: (actual: unknown, expected: unknown, message?: string): void => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  toHaveLength: (actual: unknown[], expected: number, message?: string): void => {
    if (actual.length !== expected) {
      throw new Error(message || `Expected array length ${expected}, got ${actual.length}`);
    }
  },
  toContain: (actual: unknown[], expected: unknown, message?: string): void => {
    if (!actual.includes(expected)) {
      throw new Error(message || `Expected array to contain ${expected}`);
    }
  },
  toBeDefined: (actual: unknown, message?: string): void => {
    if (actual === undefined || actual === null) {
      throw new Error(message || `Expected value to be defined`);
    }
  },
  toBeUndefined: (actual: unknown, message?: string): void => {
    if (actual !== undefined && actual !== null) {
      throw new Error(message || `Expected value to be undefined`);
    }
  },
  toHaveProperty: (actual: object, property: string, message?: string): void => {
    if (!(property in actual)) {
      throw new Error(message || `Expected object to have property ${property}`);
    }
  }
};

// Mock initial state
const mockInitialState: ReaderState = {
  path: {
    sequence: [],
    revisitPatterns: {},
    attractorsEngaged: {} as Record<StrangeAttractor, number>,
    detailedVisits: [],
    transitions: [],
    characterFocus: {} as Record<Character, number>,
    temporalLayerFocus: {} as Record<'past' | 'present' | 'future', number>,
    patternSequences: {
      repeatedSequences: [],
      characterSequences: [],
      temporalSequences: []
    }
  },
  currentNodeId: null,
  previousNodeId: null,
  endpointProgress: {
    past: 0,
    present: 0,
    future: 0
  },
  attractorEngagement: {} as Record<StrangeAttractor, number>,
  visited: []
};

describe('readerSlice', () => {
  let state: ReaderState;

  beforeEach(() => {
    state = { ...mockInitialState };
  });

  describe('reducers', () => {
    describe('navigateToNode', () => {
      it('should record navigation to a node', () => {
        const actionPayload = {
          nodeId: 'test-node',
          character: 'Archaeologist' as Character,
          temporalValue: 5,
          attractors: ['memory-fragment' as StrangeAttractor]
        };
        
        const newState = readerReducer(state, navigateToNode(actionPayload));
        
        assert.equals(newState.currentNodeId, 'test-node');
        assert.toHaveLength(newState.path.sequence, 1);
        assert.equals(newState.path.sequence[0], 'test-node');
        assert.equals(newState.path.revisitPatterns['test-node'], 1);
      });

      it('should track revisit patterns', () => {
        let newState = { ...state };
        
        // Visit the same node twice
        const actionPayload = {
          nodeId: 'test-node',
          character: 'Archaeologist' as Character,
          temporalValue: 5,
          attractors: ['memory-fragment' as StrangeAttractor]
        };
        
        newState = readerReducer(newState, navigateToNode(actionPayload));
        newState = readerReducer(newState, navigateToNode(actionPayload));
        
        assert.equals(newState.path.revisitPatterns['test-node'], 2);
      });
    });

    describe('engageAttractor', () => {
      it('should record engagement with a strange attractor', () => {
        const attractor = 'memory-fragment' as StrangeAttractor;
        const newState = readerReducer(state, engageAttractor(attractor));
        
        assert.equals(newState.path.attractorsEngaged[attractor], 1);
        assert.equals(newState.attractorEngagement[attractor], 1);
      });

      it('should increment attractor engagement count', () => {
        let newState = { ...state };
        const attractor = 'memory-fragment' as StrangeAttractor;
        
        newState = readerReducer(newState, engageAttractor(attractor));
        newState = readerReducer(newState, engageAttractor(attractor));
        
        assert.equals(newState.path.attractorsEngaged[attractor], 2);
        assert.equals(newState.attractorEngagement[attractor], 2);
      });
    });

    describe('updateEndpointProgress', () => {
      it('should update endpoint progress', () => {
        const newState = readerReducer(
          state, 
          updateEndpointProgress({ orientation: 'past', value: 50 })
        );
        
        assert.equals(newState.endpointProgress.past, 50);
      });

      it('should clamp endpoint progress between 0 and 100', () => {
        let newState = readerReducer(
          state, 
          updateEndpointProgress({ orientation: 'past', value: -10 })
        );
        assert.equals(newState.endpointProgress.past, 0);
        
        newState = readerReducer(
          state, 
          updateEndpointProgress({ orientation: 'past', value: 150 })
        );
        assert.equals(newState.endpointProgress.past, 100);
      });
    });

    describe('resetReader', () => {
      it('should reset reader state to initial values', () => {
        // Set some values first
        let newState = { ...state };
        newState = readerReducer(
          newState, 
          navigateToNode({
            nodeId: 'test-node',
            character: 'Archaeologist' as Character,
            temporalValue: 5,
            attractors: ['memory-fragment' as StrangeAttractor]
          })
        );
        
        // Reset
        newState = readerReducer(newState, resetReader());
        
        assert.equals(newState.currentNodeId, null);
        assert.toHaveLength(newState.path.sequence, 0);
        assert.equals(newState.endpointProgress.past, 0);
      });
    });

    describe('addVisitedNode', () => {
      it('should add a node to visited history', () => {
        const visitedNode = {
          id: 'test-node',
          title: 'Test Node',
          synopsis: 'Test synopsis'
        };
        
        const newState = readerReducer(state, addVisitedNode(visitedNode));
        
        assert.toHaveLength(newState.visited || [], 1);
        assert.equals(newState.visited?.[0].id, 'test-node');
      });

      it('should not add consecutive duplicate nodes', () => {
        const visitedNode = {
          id: 'test-node',
          title: 'Test Node',
          synopsis: 'Test synopsis'
        };
        
        let newState = readerReducer(state, addVisitedNode(visitedNode));
        newState = readerReducer(newState, addVisitedNode(visitedNode)); // Add same node again
        
        assert.toHaveLength(newState.visited || [], 1); // Should still be 1
      });
    });
  });

  describe('selectors', () => {
    const mockState: { reader: ReaderState } = {
      reader: state
    };

    describe('selectCurrentNodeId', () => {
      it('should select the current node ID', () => {
        const nodeId = selectCurrentNodeId(mockState);
        assert.equals(nodeId, null);
      });
    });

    describe('selectPreviousNodeId', () => {
      it('should select the previous node ID', () => {
        const nodeId = selectPreviousNodeId(mockState);
        assert.equals(nodeId, null);
      });
    });

    describe('selectReadingPath', () => {
      it('should select the reading path', () => {
        const path = selectReadingPath(mockState);
        assert.toBeDefined(path);
        assert.toHaveLength(path.sequence, 0);
      });
    });

    describe('selectEndpointProgress', () => {
      it('should select endpoint progress', () => {
        const progress = selectEndpointProgress(mockState);
        assert.toBeDefined(progress);
        assert.equals(progress.past, 0);
        assert.equals(progress.present, 0);
        assert.equals(progress.future, 0);
      });
    });

    describe('selectMostVisitedNodes', () => {
      it('should select most visited nodes', () => {
        const result = selectMostVisitedNodes(mockState, 3);
        assert.toBeDefined(result);
        assert.toHaveLength(result, 0);
      });
    });

    describe('selectMostEngagedAttractors', () => {
      it('should select most engaged attractors', () => {
        const result = selectMostEngagedAttractors(mockState, 3);
        assert.toBeDefined(result);
        assert.toHaveLength(result, 0);
      });
    });

    describe('selectRecentPath', () => {
      it('should select recent path', () => {
        const result = selectRecentPath(mockState, 5);
        assert.toBeDefined(result);
        assert.toHaveLength(result, 0);
      });
    });

    describe('selectNodeRevisitCount', () => {
      it('should select node revisit count', () => {
        const count = selectNodeRevisitCount(mockState, 'test-node');
        assert.equals(count, 0);
      });
    });

    describe('selectVisited', () => {
      it('should select visited nodes', () => {
        const result = selectVisited(mockState);
        assert.toBeDefined(result);
        assert.toHaveLength(result || [], 0);
      });
    });
  });
});