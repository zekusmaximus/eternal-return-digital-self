import { configureStore } from '@reduxjs/toolkit';
import { rootReducer } from '../index';
import {
  visitNode,
  applyTransformation,
  resetNodes,
  selectNodeById
} from '../slices/nodesSlice';
import {
  navigateToNode,
  engageAttractor,
  resetReader
} from '../slices/readerSlice';
import {
  setViewMode,
  toggleMiniConstellation,
  resetInterface
} from '../slices/interfaceSlice';
import { RootState } from '../types';

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
  }
};

describe('Store Integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: rootReducer,
      middleware: (getDefaultMiddleware) => 
        getDefaultMiddleware({
          serializableCheck: {
            ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER'],
          },
        }),
    });
  });

  describe('Node and Reader Integration', () => {
    it('should update node state when reader visits a node', () => {
      // Visit a node
      store.dispatch(visitNode('test-node'));
      
      // Check that the node state was updated
      const state = store.getState() as RootState;
      const node = selectNodeById({ nodes: state.nodes }, 'test-node');
      assert.toBeDefined(node);
      assert.equals(node?.visitCount, 1);
      assert.equals(node?.currentState, 'visited');
    });

    it('should track reader path when navigating to nodes', () => {
      // Navigate to a node
      store.dispatch(navigateToNode({
        nodeId: 'test-node',
        character: 'Archaeologist' as const,
        temporalValue: 5,
        attractors: ['memory-fragment' as const]
      }));
      
      // Check that the reader state was updated
      const state = store.getState() as RootState;
      assert.equals(state.reader.currentNodeId, 'test-node');
      assert.toHaveLength(state.reader.path.sequence, 1);
      assert.equals(state.reader.path.sequence[0], 'test-node');
    });

    it('should integrate node visits with reader path tracking', () => {
      // Navigate to and visit a node
      store.dispatch(navigateToNode({
        nodeId: 'test-node',
        character: 'Archaeologist' as const,
        temporalValue: 5,
        attractors: ['memory-fragment' as const]
      }));
      
      store.dispatch(visitNode('test-node'));
      
      // Check both node and reader state
      const state = store.getState() as RootState;
      const node = selectNodeById({ nodes: state.nodes }, 'test-node');
      
      assert.equals(node?.visitCount, 1);
      assert.equals(state.reader.currentNodeId, 'test-node');
      assert.toHaveLength(state.reader.path.sequence, 1);
    });
  });

  describe('Interface and State Integration', () => {
    it('should update interface state independently', () => {
      // Change interface settings
      store.dispatch(setViewMode('reading'));
      store.dispatch(toggleMiniConstellation());
      
      // Check that interface state was updated
      const state = store.getState() as RootState;
      assert.equals(state.interface.viewMode, 'reading');
      assert.equals(state.interface.showMiniConstellation, false);
    });

    it('should maintain separate state slices', () => {
      // Update all state slices
      store.dispatch(visitNode('test-node'));
      store.dispatch(navigateToNode({
        nodeId: 'test-node',
        character: 'Archaeologist' as const,
        temporalValue: 5,
        attractors: ['memory-fragment' as const]
      }));
      store.dispatch(setViewMode('reading'));
      
      // Check that all slices are updated independently
      const state = store.getState() as RootState;
      assert.equals(state.nodes.data['test-node']?.visitCount, 1);
      assert.equals(state.reader.currentNodeId, 'test-node');
      assert.equals(state.interface.viewMode, 'reading');
    });
  });

  describe('Reset Functionality', () => {
    it('should reset all state slices', () => {
      // Set some values in all slices
      store.dispatch(visitNode('test-node'));
      store.dispatch(navigateToNode({
        nodeId: 'test-node',
        character: 'Archaeologist' as const,
        temporalValue: 5,
        attractors: ['memory-fragment' as const]
      }));
      store.dispatch(setViewMode('reading'));
      
      // Reset all slices
      store.dispatch(resetNodes());
      store.dispatch(resetReader());
      store.dispatch(resetInterface());
      
      // Check that all slices are reset
      const state = store.getState() as RootState;
      assert.equals(Object.keys(state.nodes.data).length, 0);
      assert.equals(state.reader.currentNodeId, null);
      assert.equals(state.interface.viewMode, 'constellation');
    });
  });

  describe('Complex Integration Scenarios', () => {
    it('should handle complex interaction sequences', () => {
      // Complex sequence: navigate -> visit -> transform -> change view -> engage attractor
      store.dispatch(navigateToNode({
        nodeId: 'test-node',
        character: 'Archaeologist' as const,
        temporalValue: 5,
        attractors: ['memory-fragment' as const]
      }));
      
      store.dispatch(visitNode('test-node'));
      
      store.dispatch(applyTransformation({
        nodeId: 'test-node',
        transformation: {
          condition: { visitCount: 1 },
          transformations: [{
            type: 'replace' as const,
            selector: 'test',
            replacement: 'transformed'
          }]
        }
      }));
      
      store.dispatch(setViewMode('reading'));
      
      store.dispatch(engageAttractor('memory-fragment' as const));
      
      // Verify all state changes
      const state = store.getState() as RootState;
      const node = selectNodeById({ nodes: state.nodes }, 'test-node');
      
      assert.equals(state.reader.currentNodeId, 'test-node');
      assert.equals(node?.visitCount, 1);
      assert.toHaveLength(node?.transformations || [], 1);
      assert.equals(state.interface.viewMode, 'reading');
      assert.equals(state.reader.attractorEngagement['memory-fragment'], 1);
    });
  });
});