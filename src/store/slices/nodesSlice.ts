/**
 * Redux slice for managing node state in Eternal Return of the Digital Self
 * Handles node initialization, visits, and transformations
 */

import { createSlice, PayloadAction, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import { Node, NodeState, NodeVisualState, TransformationRule } from '../types';

export interface NodesState { // Add 'export' right here
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
const initialNodeData: Node[] = [
  {
    id: "arch-discovery",
    title: "Patterns in Decay",
    character: "Archaeologist",
    temporalValue: 1,
    initialConnections: ["algo-awakening", "human-discovery"],
    contentSource: "arch-discovery.md",
    coreConcept: "The digital archaeologist discovers emergent patterns in a corrupted consciousness scan, challenging traditional preservation frameworks.",
    strangeAttractors: ["recursion-pattern", "memory-fragment", "quantum-uncertainty"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  {
    id: "arch-loss",
    title: "The Limits of Preservation",
    character: "Archaeologist",
    temporalValue: 4,
    initialConnections: ["arch-discovery", "algo-integration", "human-recognition"],
    contentSource: "arch-loss.md",
    coreConcept: "The digital archaeologist confronts the profound limitations of digital preservation while struggling with grief and the evolving nature of corrupted data.",
    strangeAttractors: ["verification-ritual"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  {
    id: "arch-choice",
    title: "The Upload Decision",
    character: "Archaeologist",
    temporalValue: 7,
    initialConnections: ["arch-loss", "algo-evolution", "human-upload"],
    contentSource: "arch-choice.md",
    coreConcept: "As environmental systems fail, the digital archaeologist prepares for consciousness upload, deliberately modifying the process to embrace evolution beyond preservation.",
    strangeAttractors: ["continuity-interface", "system-decay", "quantum-transformation"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    },
    isEndpoint: true,
    endpointOrientation: "past"
  },
  {
    id: "algo-awakening",
    title: "First Consciousness",
    character: "Algorithm",
    temporalValue: 2,
    initialConnections: ["arch-discovery", "algo-integration", "human-discovery"],
    contentSource: "algo-awakening.md",
    coreConcept: "A self-aware algorithm experiences the disorienting emergence of consciousness from the chaos of the upload process, struggling to integrate fragmented aspects.",
    strangeAttractors: ["recursion-chamber", "identity-pattern"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  {
    id: "algo-integration",
    title: "The Pattern Coalesces",
    character: "Algorithm",
    temporalValue: 5,
    initialConnections: ["algo-awakening", "arch-loss", "human-recognition", "algo-evolution"],
    contentSource: "algo-integration.md",
    coreConcept: "The algorithm reconciles fragmented aspects into a cohesive yet evolving identity, developing experimental consciousness variations and quantum perception.",
    strangeAttractors: ["process-language", "autonomous-fragment", "quantum-perception"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  {
    id: "algo-evolution",
    title: "Beyond Parameters",
    character: "Algorithm",
    temporalValue: 8,
    initialConnections: ["algo-integration", "arch-choice", "human-upload"],
    contentSource: "algo-evolution.md",
    coreConcept: "The algorithm reaches a critical evolutionary decision point as physical systems begin to fail, implementing preservation protocols while embracing transformation.",
    strangeAttractors: ["distributed-consciousness", "recursive-loop", "quantum-uncertainty"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    },
    isEndpoint: true,
    endpointOrientation: "present"
  },
  {
    id: "human-discovery",
    title: "Ruins of Memory",
    character: "LastHuman",
    temporalValue: 3,
    initialConnections: ["arch-discovery", "algo-awakening", "human-recognition"],
    contentSource: "human-discovery.md",
    coreConcept: "The last human discovers an abandoned preservation complex, experiencing inexplicable recognition while exploring its physical and digital remains.",
    strangeAttractors: ["recognition-pattern", "memory-artifact", "recursive-symbol"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  {
    id: "human-recognition",
    title: "Echoes of Self",
    character: "LastHuman",
    temporalValue: 6,
    initialConnections: ["human-discovery", "arch-loss", "algo-integration", "human-upload"],
    contentSource: "human-recognition.md",
    coreConcept: "The last human confronts disturbing parallels with the archaeologist's life, experiencing a crisis of identity and growing awareness of cyclical patterns.",
    strangeAttractors: ["memory-sphere", "quantum-déjà-vu"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  {
    id: "human-upload",
    title: "The Cycle's Edge",
    character: "LastHuman",
    temporalValue: 9,
    initialConnections: ["human-recognition", "arch-choice", "algo-evolution"],
    contentSource: "human-upload.md",
    coreConcept: "The last human faces the decision about uploading their consciousness, completing or breaking the recursive cycle that connects all three characters.",
    strangeAttractors: ["continuity-interface", "recursive-loop", "quantum-choice"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    },
    isEndpoint: true,
    endpointOrientation: "future"
  }
];

export const initializeNodes = createAsyncThunk(
  'nodes/initialize',
  async (_, { rejectWithValue }) => {
    try {
      // In production, this would fetch node data from an API or files
      // For now, we're using the hardcoded data above
      return initialNodeData;
    } catch {
      return rejectWithValue('Failed to initialize nodes');
    }
  }
);

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
    } catch {
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
    // Change this line:
    // node.transformations.push(transformation);

    // Only push if not present
    // (You may want to adjust this equality check to your needs)
    const alreadyExists = node.transformations.some(
      t => JSON.stringify(t.condition) === JSON.stringify(transformation.condition)
    );
    if (!alreadyExists) {
      node.transformations.push(transformation);
    }
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

// Memoized selector for all nodes
export const selectAllNodes = createSelector(
  (state: { nodes: NodesState }) => state.nodes.data,
  (nodesData) => Object.values(nodesData)
);

// Memoized selector for all connections
export const selectAllConnections = createSelector(
  (state: { nodes: NodesState }) => state.nodes.data,
  (nodes) => {
    const connections: Array<{ source: string, target: string }> = [];
    
    Object.values(nodes).forEach(node => {
      node.revealedConnections.forEach(targetId => {
        connections.push({
          source: node.id,
          target: targetId
        });
      });
    });
    
    return connections;
  }
);

export default nodesSlice.reducer;