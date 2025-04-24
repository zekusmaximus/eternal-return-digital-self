/**
 * Redux slice for managing node state in Eternal Return of the Digital Self
 * Handles node initialization, visits, and transformations
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { Node, NodeState, NodeVisualState, TransformationRule } from '../../types';

// Interface for the nodes slice of the Redux store
interface NodesState {
  data: Record<string, NodeState>;
  initialized: boolean;
  loading: boolean;
  error: string | null;
}

// Initial state for the nodes slice
const initialState: NodesState = {
  data: {},
  initialized: false,
  loading: false,
  error: null,
};

// Node data (will be loaded from external source in production)
// This is placeholder data for development
const initialNodeData: Node[] = [
  {
    id: "arch-discovery",
    title: "Patterns in Decay",
    character: "Archaeologist",
    temporalValue: 1,
    initialConnections: ["algo-awakening", "human-discovery"],
    contentSource: "arch-discovery.md",
    coreConcept: "Dr. Mira Kalani discovers emergent patterns in her partner's corrupted consciousness scan, challenging her preservation framework.",
    strangeAttractors: ["recursion-pattern", "memory-fragment", "quantum-uncertainty"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  // Add other nodes here...
];

// Async thunk for initializing nodes
export const initializeNodes = createAsyncThunk(
  'nodes/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // In production, this would fetch node data from an API or files
      // For now, we're using the hardcoded data above
      return initialNodeData;
    } catch (error) {
      return rejectWithValue('Failed to initialize nodes');
    }
  }
);

// Async thunk for loading node content
export const loadNodeContent = createAsyncThunk(
  'nodes/loadContent',
  async (nodeId: string, { rejectWithValue }) => {
    try {
      // In production, this would load content from files or API
      // For now, we'll return a placeholder
      return {
        nodeId,
        content: 'Placeholder content for ' + nodeId,
      };
    } catch (error) {
      return rejectWithValue(`Failed to load content for node ${nodeId}`);
    }
  }
);

// Create the nodes slice
const nodesSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {
    // Record a visit to a node
    visitNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      const node = state.data[nodeId];
      
      if (node) {
        // Update visit count and timestamp
        node.visitCount += 1;
        node.lastVisitTimestamp = Date.now();
        
        // Update node state based on visit count
        // More complex state calculation will be moved to a separate service
        if (node.visitCount === 1) {
          node.currentState = 'visited';
        } else if (node.visitCount >= node.transformationThresholds.fragmented) {
          node.currentState = 'fragmented';
        } else if (node.visitCount >= node.transformationThresholds.complex) {
          node.currentState = 'complex';
        } else if (node.visitCount >= node.transformationThresholds.revisit) {
          node.currentState = 'revisited';
        }
      }
    },
    
    // Reveal a new connection between nodes
    revealConnection: (state, action: PayloadAction<{ nodeId: string, targetId: string }>) => {
      const { nodeId, targetId } = action.payload;
      const node = state.data[nodeId];
      
      if (node && !node.revealedConnections.includes(targetId)) {
        node.revealedConnections.push(targetId);
      }
    },
    
    // Apply a transformation to a node's content
    applyTransformation: (state, action: PayloadAction<{ 
      nodeId: string, 
      transformation: TransformationRule 
    }>) => {
      const { nodeId, transformation } = action.payload;
      const node = state.data[nodeId];
      
      if (node) {
        node.transformations.push(transformation);
      }
    },
    
    // Reset all nodes to initial state (for testing)
    resetNodes: (state) => {
      Object.keys(state.data).forEach(nodeId => {
        const node = state.data[nodeId];
        node.visitCount = 0;
        node.lastVisitTimestamp = 0;
        node.currentState = 'unvisited';
        node.revealedConnections = [...node.initialConnections];
        node.transformations = [];
      });
    },
  },
  extraReducers: (builder) => {
    // Handle initialization
    builder.addCase(initializeNodes.pending, (state) => {
      state.loading = true;
      state.error = null;
    });
    builder.addCase(initializeNodes.fulfilled, (state, action) => {
      state.loading = false;
      state.initialized = true;
      
      // Convert Node[] to Record<string, NodeState>
      action.payload.forEach(node => {
        state.data[node.id] = {
          ...node,
          visitCount: 0,
          lastVisitTimestamp: 0,
          currentState: 'unvisited',
          revealedConnections: [...node.initialConnections],
          transformations: [],
        };
      });
    });
    builder.addCase(initializeNodes.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
    
    // Handle content loading (will be expanded in future)
    builder.addCase(loadNodeContent.pending, (state) => {
      state.loading = true;
    });
    builder.addCase(loadNodeContent.fulfilled, (state) => {
      state.loading = false;
    });
    builder.addCase(loadNodeContent.rejected, (state, action) => {
      state.loading = false;
      state.error = action.payload as string;
    });
  },
});

// Export actions
export const { 
  visitNode, 
  revealConnection, 
  applyTransformation,
  resetNodes 
} = nodesSlice.actions;

// Export selector functions
export const selectNodeById = (state: { nodes: NodesState }, nodeId: string) => 
  state.nodes.data[nodeId];

export const selectNodesByCharacter = (state: { nodes: NodesState }, character: string) =>
  Object.values(state.nodes.data).filter(node => node.character === character);

export const selectNodesByTemporalValue = (state: { nodes: NodesState }, temporalValue: number) =>
  Object.values(state.nodes.data).filter(node => node.temporalValue === temporalValue);

export const selectNodesByVisualState = (state: { nodes: NodesState }, visualState: NodeVisualState) =>
  Object.values(state.nodes.data).filter(node => node.currentState === visualState);

export const selectAllConnections = (state: { nodes: NodesState }) => {
  const connections: Array<{ source: string, target: string }> = [];
  
  Object.values(state.nodes.data).forEach(node => {
    node.revealedConnections.forEach(targetId => {
      connections.push({
        source: node.id,
        target: targetId
      });
    });
  });
  
  return connections;
};

export default nodesSlice.reducer;