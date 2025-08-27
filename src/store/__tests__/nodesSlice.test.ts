import nodesReducer, {
  NodesState,
  visitNode,
  revealConnection,
  applyTransformation,
  resetNodes,
  selectNodeById,
  selectNodesByCharacter,
  selectNodesByTemporalValue,
  selectNodesByVisualState,
  selectAllNodes,
  selectConnections,
  selectConstellationNodes
} from '../slices/nodesSlice';
import { NodeState, Node } from '../../types';

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
const mockInitialState: NodesState = {
  data: {},
  initialized: false,
  loading: false,
  error: null,
  triumvirateActive: true
};

// Mock node data
const mockNode: Node = {
  id: "test-node",
  title: "Test Node",
  character: "Archaeologist",
  temporalValue: 5,
  initialConnections: ["node-2"],
  contentSource: "test.md",
  coreConcept: "Test concept",
  strangeAttractors: ["memory-fragment"],
  transformationThresholds: {
    visit: 1,
    revisit: 2,
    complex: 4,
    fragmented: 7
  }
};

const mockNodeState: NodeState = {
  ...mockNode,
  visitCount: 0,
  visitState: 'unvisited',
  currentState: 'unvisited',
  revealedConnections: [...mockNode.initialConnections],
  transformations: [],
  content: null,
  enhancedContent: null,
  currentContent: null,
  originalContent: null,
  lastTransformedContent: null,
  appliedTransformationIds: [],
  contentVersion: 0,
  transformationState: 'clean'
};

describe('nodesSlice', () => {
  let state: NodesState;

  beforeEach(() => {
    state = {
      ...mockInitialState,
      data: {
        [mockNode.id]: mockNodeState
      }
    };
  });

  describe('reducers', () => {
    describe('visitNode', () => {
      it('should increment visit count and update state', () => {
        const newState = nodesReducer(state, visitNode(mockNode.id));
        
        assert.equals(newState.data[mockNode.id].visitCount, 1);
        assert.equals(newState.data[mockNode.id].currentState, 'visited');
        assert.equals(newState.triumvirateActive, false);
      });

      it('should update state based on visit count thresholds', () => {
        // Test complex state
        let newState = { ...state };
        for (let i = 0; i < mockNode.transformationThresholds.complex; i++) {
          newState = nodesReducer(newState, visitNode(mockNode.id));
        }
        
        assert.equals(newState.data[mockNode.id].currentState, 'complex');
        
        // Test fragmented state
        for (let i = 0; i < mockNode.transformationThresholds.fragmented; i++) {
          newState = nodesReducer(newState, visitNode(mockNode.id));
        }
        
        assert.equals(newState.data[mockNode.id].currentState, 'fragmented');
      });
    });

    describe('revealConnection', () => {
      it('should add a new connection to revealed connections', () => {
        const targetId = "new-connection";
        const newState = nodesReducer(
          state, 
          revealConnection({ nodeId: mockNode.id, targetId })
        );
        
        assert.toContain(newState.data[mockNode.id].revealedConnections, targetId);
      });

      it('should not add duplicate connections', () => {
        const targetId = mockNode.initialConnections[0];
        const newState = nodesReducer(
          state, 
          revealConnection({ nodeId: mockNode.id, targetId })
        );
        
        const connections = newState.data[mockNode.id].revealedConnections;
        const count = connections.filter(id => id === targetId).length;
        assert.equals(count, 1);
      });
    });

    describe('applyTransformation', () => {
      it('should add a new transformation rule', () => {
        const transformation = {
          condition: { visitCount: 1 },
          transformations: [{
            type: 'replace' as const,
            selector: 'test',
            replacement: 'transformed'
          }]
        };
        
        const newState = nodesReducer(
          state,
          applyTransformation({ nodeId: mockNode.id, transformation })
        );
        
        assert.toHaveLength(newState.data[mockNode.id].transformations, 1);
        // Since we're not using Jest, we'll check the properties individually
        assert.equals(newState.data[mockNode.id].transformations[0].condition.visitCount, 1);
        assert.equals(newState.data[mockNode.id].transformations[0].transformations[0].type, 'replace');
        assert.equals(newState.data[mockNode.id].transformations[0].transformations[0].selector, 'test');
        assert.equals(newState.data[mockNode.id].transformations[0].transformations[0].replacement, 'transformed');
      });

      it('should not add duplicate transformation rules', () => {
        const transformation = {
          condition: { visitCount: 1 },
          transformations: [{
            type: 'replace' as const,
            selector: 'test',
            replacement: 'transformed'
          }]
        };
        
        let newState = nodesReducer(
          state,
          applyTransformation({ nodeId: mockNode.id, transformation })
        );
        
        // Apply the same transformation again
        newState = nodesReducer(
          newState,
          applyTransformation({ nodeId: mockNode.id, transformation })
        );
        
        assert.toHaveLength(newState.data[mockNode.id].transformations, 1);
      });
    });

    describe('resetNodes', () => {
      it('should reset all nodes to initial state', () => {
        // First visit the node
        let newState = nodesReducer(state, visitNode(mockNode.id));
        newState = nodesReducer(newState, resetNodes());
        
        assert.equals(newState.data[mockNode.id].visitCount, 0);
        assert.equals(newState.data[mockNode.id].currentState, 'unvisited');
        assert.equals(newState.data[mockNode.id].revealedConnections.length, mockNode.initialConnections.length);
        assert.toHaveLength(newState.data[mockNode.id].transformations, 0);
        assert.equals(newState.triumvirateActive, true);
      });
    });
  });

  describe('selectors', () => {
    const mockState: { nodes: NodesState } = {
      nodes: state
    };

    describe('selectNodeById', () => {
      it('should select a node by its ID', () => {
        const node = selectNodeById(mockState, mockNode.id);
        assert.toBeDefined(node);
        assert.equals(node?.id, mockNode.id);
      });

      it('should return undefined for non-existent node', () => {
        const node = selectNodeById(mockState, 'non-existent');
        assert.toBeUndefined(node);
      });
    });

    describe('selectNodesByCharacter', () => {
      it('should select nodes by character', () => {
        const nodes = selectNodesByCharacter(mockState, 'Archaeologist');
        assert.toHaveLength(nodes, 1);
        assert.equals(nodes[0].character, 'Archaeologist');
      });
    });

    describe('selectNodesByTemporalValue', () => {
      it('should select nodes by temporal value', () => {
        const nodes = selectNodesByTemporalValue(mockState, 5);
        assert.toHaveLength(nodes, 1);
        assert.equals(nodes[0].temporalValue, 5);
      });
    });

    describe('selectNodesByVisualState', () => {
      it('should select nodes by visual state', () => {
        const nodes = selectNodesByVisualState(mockState, 'unvisited');
        assert.toHaveLength(nodes, 1);
        assert.equals(nodes[0].currentState, 'unvisited');
      });
    });

    describe('selectAllNodes', () => {
      it('should select all nodes', () => {
        const nodes = selectAllNodes(mockState);
        assert.toHaveLength(nodes, 1);
        assert.equals(nodes[0].id, mockNode.id);
      });
    });

    describe('selectConnections', () => {
      it('should select all connections', () => {
        const connections = selectConnections(mockState);
        assert.toHaveLength(connections, 1);
        assert.equals(connections[0].start, mockNode.id);
        assert.equals(connections[0].end, mockNode.initialConnections[0]);
      });
    });

    describe('selectConstellationNodes', () => {
      it('should format nodes for constellation view', () => {
        const constellationNodes = selectConstellationNodes(mockState);
        assert.toHaveLength(constellationNodes, 1);
        assert.toHaveProperty(constellationNodes[0], 'x');
        assert.toHaveProperty(constellationNodes[0], 'y');
        assert.toHaveProperty(constellationNodes[0], 'color');
        assert.equals(constellationNodes[0].color, '#ff6b6b'); // Archaeologist color
      });
    });
  });
});