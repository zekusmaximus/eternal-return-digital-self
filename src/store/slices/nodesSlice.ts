/**
 * Redux slice for managing node state in Eternal Return of the Digital Self
 * Handles node initialization, visits, and transformations
 */

import { createSlice, PayloadAction, createAsyncThunk, createSelector } from '@reduxjs/toolkit';
import {
  Node,
  NodeState,
  NodeVisualState,
  TransformationRule,
  ConstellationNode,
  NarramorphContent,
  EnhancedNarramorphContent,
  RootState,
  StrangeAttractor,
  JourneyContext
} from '../../types';
import { ReaderState } from '../slices/readerSlice';
import { transformationEngine } from '../../services/TransformationEngine';
import { contentVariantService, ContentSelectionContext } from '../../services/ContentVariantService';
// Import character bleed service
import { CharacterBleedService } from '../../services/CharacterBleedService';
// Import transformation service for journey-based transformations
import { transformationService } from '../../services/TransformationService';

export interface NodesState { // Add 'export' right here
  data: Record<string, NodeState>;
  initialized: boolean;
  loading: boolean;
  error: string | null;
  triumvirateActive: boolean;
}


// Initial state for the nodes slice
const initialState: NodesState = {
  data: {},
  initialized: false,
  loading: false,
  error: null,
  triumvirateActive: true,
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
    strangeAttractors: ["verification-ritual"],    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    }
  },
  {
    id: "arch-glitch",
    title: "Memory Fragments",
    character: "Archaeologist",
    temporalValue: 6,
    initialConnections: ["arch-loss", "algo-integration", "human-recognition"],
    contentSource: "arch-glitch.md",
    coreConcept: "The archaeologist experiences fragmented memories and identity confusion as consciousness preservation protocols begin to blur the boundaries between self and archive.",
    strangeAttractors: ["memory-fragment", "identity-pattern", "recursive-loop"],
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
    strangeAttractors: ["continuity-interface", "recursive-loop", "quantum-choice"],    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 4,
      fragmented: 7
    },
    isEndpoint: true,
    endpointOrientation: "future"
  },
  {
    id: "character-bleed-test",
    title: "Character Bleed Test",
    character: "Archaeologist",
    temporalValue: 3,
    initialConnections: ["algo-awakening", "human-discovery"],
    contentSource: "character-bleed-test.md",
    coreConcept: "A test node to demonstrate character bleed effects when transitioning between different character perspectives.",
    strangeAttractors: ["memory-fragment", "identity-pattern"],
    transformationThresholds: {
      visit: 1,
      revisit: 2,
      complex: 3,
      fragmented: 5
    }
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
  async (nodeId: string, { getState, rejectWithValue }) => {
    try {
      const state = getState() as RootState;
      const node = state.nodes.data[nodeId];
      if (!node) {
        return rejectWithValue(`Node with id ${nodeId} not found`);
      }
      const response = await fetch(`/src/content/${node.contentSource}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch content for ${node.contentSource}`);
      }
      const text = await response.text();

      // Try parsing as enhanced content first
      const enhancedContent = contentVariantService.parseContentVariants(text);
      if (process.env.NODE_ENV === 'development') {
        console.log('[loadNodeContent] Parsed enhancedContent for', node.contentSource, enhancedContent);
      }
      // Also maintain legacy format for backwards compatibility
      const content: NarramorphContent = {};
      const parts = text.split(/---\[(\d+)\]/);

      if (parts.length > 0 && !text.startsWith('---[')) {
          content[0] = parts[0].trim();
      }

      for (let i = 1; i < parts.length; i += 2) {
        const visitCount = parseInt(parts[i], 10);
        const contentText = parts[i + 1]?.trim() ?? '';
        if (!isNaN(visitCount)) {
            content[visitCount] = contentText;
        }
      }

      if (Object.keys(content).length === 0) {
        content[0] = text.trim();
      }

      return { nodeId, content, enhancedContent };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      return rejectWithValue(`Failed to load content for node ${nodeId}: ${message}`);
    }
  }
);
// Create the nodes slice
const nodesSlice = createSlice({
  name: 'nodes',
  initialState,
  reducers: {    // Record a visit to a node
    visitNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      const node = state.data[nodeId];

      if (state.triumvirateActive) {
        state.triumvirateActive = false;
      }
      
      if (node) {
        // Update visit count
        node.visitCount += 1;
        
        // Update node state based on visit count
        if (node.visitCount === 1) {
          node.currentState = 'visited';
        } else if (node.visitCount >= node.transformationThresholds.fragmented) {
          node.currentState = 'fragmented';
        } else if (node.visitCount >= node.transformationThresholds.complex) {
          node.currentState = 'complex';
        } else if (node.visitCount >= node.transformationThresholds.revisit) {
          node.currentState = 'revisited';
        }// Update currentContent based on enhanced content selection if available
        if (node.enhancedContent) {
          // For now, use a simplified approach - we'll enhance this with full context later
          // Priority: section variants > visit count variants > base content
          let selectedContent = node.enhancedContent.base;
          
          // Check visit count variants
          if (Object.keys(node.enhancedContent.visitCountVariants).length > 0) {
            const availableCounts = Object.keys(node.enhancedContent.visitCountVariants)
              .map(Number)
              .sort((a, b) => b - a);
            const bestMatch = availableCounts.find(count => node.visitCount >= count);
            if (bestMatch !== undefined) {
              selectedContent = node.enhancedContent.visitCountVariants[bestMatch];
            }
          }
          
          node.currentContent = selectedContent;
        } else if (node.content) {
          // Fallback to legacy content selection
          const availableCounts = Object.keys(node.content)
            .map(Number)
            .sort((a, b) => b - a); // Sort descending
          const lookupKey = Math.max(0, node.visitCount - 1);
          const bestMatch = availableCounts.find(count => lookupKey >= count);
          if (bestMatch !== undefined) {
            // Store the base content (without transformations)
            node.currentContent = node.content[bestMatch];
          }
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
        // Only push if not present
        const alreadyExists = node.transformations.some(
          t => JSON.stringify(t.condition) === JSON.stringify(transformation.condition)
        );
        if (!alreadyExists) {
          node.transformations.push(transformation);
        }
      }
    },

    // Apply transformations based on character bleed and journey context
    applyJourneyTransformations: (state, action: PayloadAction<{
      nodeId: string,
      readerState: ReaderState
    }>) => {
      const { nodeId, readerState } = action.payload;
      const node = state.data[nodeId];

      if (!node) return;

      try {
        // Calculate character bleed effects
        const characterBleedEffects = CharacterBleedService.calculateBleedEffects(node, readerState);
        
        // Convert character bleed effects to transformation rules
        const characterBleedTransformations: TransformationRule[] = characterBleedEffects.map(effect => ({
          condition: { characterBleed: true },
          transformations: [effect.transformation]
        }));

        // Calculate journey-based transformations
        const journeyTransformations = transformationService.calculateJourneyTransformations(
          nodeId,
          readerState
        );

        // Create journey transformation rules
        const journeyTransformationRules: TransformationRule[] = journeyTransformations.map(transformation => ({
          condition: { visitCount: node.visitCount }, // Apply to current visit
          transformations: [transformation]
        }));

        // Add all new transformation rules to the node
        const allNewRules = [...characterBleedTransformations, ...journeyTransformationRules];
        
        allNewRules.forEach(rule => {
          // Only add if not already present
          const alreadyExists = node.transformations.some(
            t => JSON.stringify(t.condition) === JSON.stringify(rule.condition) &&
                 JSON.stringify(t.transformations) === JSON.stringify(rule.transformations)
          );
          if (!alreadyExists) {
            node.transformations.push(rule);
          }
        });

        // Update journey context
        const journeyContext: JourneyContext = {
          lastVisitedCharacter: readerState.path.detailedVisits && readerState.path.detailedVisits.length > 1
            ? readerState.path.detailedVisits[readerState.path.detailedVisits.length - 2].character
            : undefined,
          journeyPattern: readerState.path.sequence.slice(-5),
          recursiveAwareness: readerState.path.sequence.length > 0 
            ? 1 - (new Set(readerState.path.sequence).size / readerState.path.sequence.length)
            : 0,
          temporalDisplacement: characterBleedEffects.length > 0
        };

        node.journeyContext = journeyContext;

        console.log(`[NodesSlice] Applied journey transformations for node ${nodeId}:`, {
          characterBleedEffects: characterBleedEffects.length,
          journeyTransformations: journeyTransformations.length,
          totalTransformations: node.transformations.length,
          journeyContext
        });

      } catch (error) {
        console.error(`[NodesSlice] Error applying journey transformations for node ${nodeId}:`, error);
      }
    },
    evaluateTransformations: (state, action: PayloadAction<{
      nodeId: string,
      readerState: RootState['reader']
    }>) => {
      const { nodeId, readerState } = action.payload;
      const node = state.data[nodeId];

      if (node && node.content && node.transformations.length > 0) {
        // Get base content for the current visit count
        const availableCounts = Object.keys(node.content)
          .map(Number)
          .sort((a, b) => b - a); // Sort descending
        
        const lookupKey = Math.max(0, node.visitCount - 1);
        const bestMatch = availableCounts.find(count => lookupKey >= count);
        if (bestMatch !== undefined) {
          const baseContent = node.content[bestMatch];
          
          // Create a default attractorEngagement record with all strange attractors
          const defaultAttractorEngagement: Record<StrangeAttractor, number> = {
            'recursion-pattern': 0,
            'memory-fragment': 0,
            'verification-ritual': 0,
            'identity-pattern': 0,
            'recursion-chamber': 0,
            'process-language': 0,
            'autonomous-fragment': 0,
            'quantum-perception': 0,
            'distributed-consciousness': 0,
            'recursive-loop': 0,
            'quantum-uncertainty': 0,
            'continuity-interface': 0,
            'system-decay': 0,
            'quantum-transformation': 0,
            'memory-artifact': 0,
            'recursive-symbol': 0,
            'recognition-pattern': 0,
            'memory-sphere': 0,
            'quantum-déjà-vu': 0,
            'quantum-choice': 0
          };

          // Create a complete ReaderState object with required properties
          const enhancedReaderState: ReaderState = {
            path: readerState.path,
            currentNodeId: readerState.currentNodeId,
            previousNodeId: readerState.path.sequence.length > 1 ?
              readerState.path.sequence[readerState.path.sequence.length - 2] : null,
            endpointProgress: readerState.endpointProgress,
            // Merge existing attractor engagements with default values
            attractorEngagement: {
              ...defaultAttractorEngagement,
              ...readerState.path.attractorsEngaged
            }
          };
          
          // Filter transformations that should apply based on conditions
          const applicableTransformations = node.transformations
            .filter(rule =>
              transformationEngine.evaluateCondition(rule.condition, enhancedReaderState, node)
            )
            .flatMap(rule => rule.transformations);
          
          // Apply transformations to base content
          if (applicableTransformations.length > 0) {
            node.currentContent = transformationEngine.applyTransformations(
              baseContent,
              applicableTransformations
            );
          } else {
            node.currentContent = baseContent;
          }
        }
      }    },    // Update content variant selection based on journey context
    updateContentVariant: (state, action: PayloadAction<{ 
      nodeId: string; 
      context?: ContentSelectionContext; 
      selectedContent?: string 
    }>) => {
      const { nodeId, context, selectedContent } = action.payload;
      const node = state.data[nodeId];
      
      if (node && node.enhancedContent) {
        // If selectedContent is provided, use it directly (preferred)
        if (selectedContent) {
          node.currentContent = selectedContent;
        } else {
          // Fallback to the old simplified selection context
          const fallbackContext: ContentSelectionContext = {
            visitCount: node.visitCount,
            lastVisitedCharacter: undefined, // Will be enhanced when we have full reader state access
            journeyPattern: [],
            characterSequence: [],
            attractorsEngaged: {},
            recursiveAwareness: 0
          };
          
          // Use provided context if available, otherwise use fallback
          const selectionContext = context || fallbackContext;
          
          // Select the appropriate content variant
          node.currentContent = contentVariantService.selectContentVariant(node.enhancedContent, selectionContext);
        }
      }
    },
      // Reset all nodes to initial state (for testing)
    resetNodes: (state) => {
      Object.keys(state.data).forEach(nodeId => {
        const node = state.data[nodeId];
        node.visitCount = 0;
        node.currentState = 'unvisited';
        node.revealedConnections = [...node.initialConnections];
        node.transformations = [];
        node.content = null;
        node.enhancedContent = null;
        node.currentContent = null;
      });
      state.triumvirateActive = true;
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
          currentState: 'unvisited',
          revealedConnections: [...node.initialConnections],
          transformations: [],
          content: null,
          enhancedContent: null,
          currentContent: null,
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
    builder.addCase(loadNodeContent.fulfilled, (state, action: PayloadAction<{ nodeId: string; content: NarramorphContent; enhancedContent: EnhancedNarramorphContent }>) => {
      const { nodeId, content, enhancedContent } = action.payload;
      const node = state.data[nodeId];
      if (node) {
          node.content = content;
          node.enhancedContent = enhancedContent;
          
          // For now, use simplified content selection (will be enhanced with full context later)
          if (enhancedContent && enhancedContent.base) {
            node.currentContent = enhancedContent.base;
          } else {
            // Fallback to legacy logic
            const availableCounts = Object.keys(node.content)
                .map(Number)
                .sort((a, b) => b - a); // Sort descending
            const lookupKey = Math.max(0, node.visitCount - 1);
            const bestMatch = availableCounts.find(count => lookupKey >= count);
            if (bestMatch !== undefined) {
                node.currentContent = node.content[bestMatch];
            } else {
                node.currentContent = null;
            }
          }
      }
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
  evaluateTransformations,
  applyJourneyTransformations,
  updateContentVariant,
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
export const selectConnections = createSelector(
  (state: { nodes: NodesState }) => state.nodes.data,
  (nodes) => {
    const connections: Array<{ start: string, end: string }> = [];
    
    Object.values(nodes).forEach(node => {
      node.revealedConnections.forEach(targetId => {
        // Avoid duplicate connections (e.g., A-B and B-A)
        const connectionExists = connections.some(
          conn => (conn.start === node.id && conn.end === targetId) || (conn.start === targetId && conn.end === node.id)
        );

        if (!connectionExists) {
          connections.push({
            start: node.id,
            end: targetId
          });
        }
      });
    });
    
    return connections;
  }
);

// Memoized selector for all nodes formatted for the constellation view
export const selectConstellationNodes = createSelector(
  [selectAllNodes],
  (nodes): ConstellationNode[] => {
    // Basic layout logic: distribute nodes in a circle
    const numNodes = nodes.length;
    const radius = 15;
    return nodes.map((node, index) => {
      const angle = (index / numNodes) * 2 * Math.PI;
      const x = radius * Math.cos(angle);
      const y = radius * Math.sin(angle);

      // Assign color based on character
      let color = '#ffffff'; // Default
      if (node.character === 'Archaeologist') color = '#ff6b6b';
      if (node.character === 'Algorithm') color = '#4ecdc4';
      if (node.character === 'LastHuman') color = '#45b7d1';

      return {
        ...node,
        x,
        y,
        color,
      };
    });
  }
);

export default nodesSlice.reducer;