/**
 * Redux slice for managing reader state in Eternal Return of the Digital Self
 * Tracks the reader's journey, patterns, and progression toward endpoints
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ReadingPath, StrangeAttractor, EndpointOrientation } from '../../types';

// Interface for the reader slice of the Redux store
interface ReaderState {
  path: ReadingPath;
  currentNodeId: string | null;
  previousNodeId: string | null;
  endpointProgress: Record<EndpointOrientation, number>;
  attractorEngagement: Record<StrangeAttractor, number>;
  sessionStartTime: number;
  totalReadingTime: number;
}

// Initial state for the reader's path
const initialReadingPath: ReadingPath = {
  sequence: [],
  timestamps: {},
  durations: {},
  revisitPatterns: {},
  attractorsEngaged: {} as Record<StrangeAttractor, number>
};

// Initial state for the reader slice
const initialState: ReaderState = {
  path: initialReadingPath,
  currentNodeId: null,
  previousNodeId: null,
  endpointProgress: {
    past: 0,
    present: 0,
    future: 0
  },
  attractorEngagement: {} as Record<StrangeAttractor, number>,
  sessionStartTime: Date.now(),
  totalReadingTime: 0
};

// Create the reader slice
const readerSlice = createSlice({
  name: 'reader',
  initialState,
  reducers: {
    // Record navigation to a node
    navigateToNode: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      const now = Date.now();
      
      // Update previous node's duration if there was one
      if (state.currentNodeId) {
        const duration = now - (state.path.timestamps[state.currentNodeId] || now);
        state.path.durations[state.currentNodeId] = 
          (state.path.durations[state.currentNodeId] || 0) + duration;
        state.previousNodeId = state.currentNodeId;
      }
      
      // Update current node
      state.currentNodeId = nodeId;
      
      // Add to sequence
      state.path.sequence.push(nodeId);
      
      // Record timestamp
      state.path.timestamps[nodeId] = now;
      
      // Track revisit pattern
      state.path.revisitPatterns[nodeId] = (state.path.revisitPatterns[nodeId] || 0) + 1;
    },
    
    // Record engagement with a strange attractor
    engageAttractor: (state, action: PayloadAction<StrangeAttractor>) => {
      const attractor = action.payload;
      state.path.attractorsEngaged[attractor] = (state.path.attractorsEngaged[attractor] || 0) + 1;
      state.attractorEngagement[attractor] = (state.attractorEngagement[attractor] || 0) + 1;
    },
    
    // Update endpoint progress based on reading patterns
    updateEndpointProgress: (state, action: PayloadAction<{ 
      orientation: EndpointOrientation, 
      value: number 
    }>) => {
      const { orientation, value } = action.payload;
      state.endpointProgress[orientation] = Math.min(100, Math.max(0, value));
    },
    
    // Calculate and update total reading time
    updateReadingTime: (state) => {
      const now = Date.now();
      state.totalReadingTime += now - state.sessionStartTime;
      state.sessionStartTime = now;
    },
    
    // Reset the reader's state (for testing)
    resetReader: (state) => {
      state.path = initialReadingPath;
      state.currentNodeId = null;
      state.previousNodeId = null;
      state.endpointProgress = {
        past: 0,
        present: 0,
        future: 0
      };
      state.attractorEngagement = {} as Record<StrangeAttractor, number>;
      state.sessionStartTime = Date.now();
      state.totalReadingTime = 0;
    }
  }
});

// Export actions
export const { 
  navigateToNode, 
  engageAttractor, 
  updateEndpointProgress,
  updateReadingTime,
  resetReader 
} = readerSlice.actions;

// Export selector functions
export const selectCurrentNodeId = (state: { reader: ReaderState }) => 
  state.reader.currentNodeId;

export const selectPreviousNodeId = (state: { reader: ReaderState }) => 
  state.reader.previousNodeId;

export const selectReadingPath = (state: { reader: ReaderState }) => 
  state.reader.path;

export const selectEndpointProgress = (state: { reader: ReaderState }) => 
  state.reader.endpointProgress;

export const selectMostVisitedNodes = (state: { reader: ReaderState }, count: number = 3) => {
  const { revisitPatterns } = state.reader.path;
  
  return Object.entries(revisitPatterns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([nodeId, count]) => ({ nodeId, count }));
};

export const selectMostEngagedAttractors = (state: { reader: ReaderState }, count: number = 3) => {
  const { attractorsEngaged } = state.reader.path;
  
  return Object.entries(attractorsEngaged)
    .sort((a, b) => b[1] - a[1])
    .slice(0, count)
    .map(([attractor, count]) => ({ attractor, count }));
};

export const selectRecentPath = (state: { reader: ReaderState }, count: number = 5) => {
  return state.reader.path.sequence.slice(-count);
};

export const selectNodeRevisitCount = (state: { reader: ReaderState }, nodeId: string) => {
  return state.reader.path.revisitPatterns[nodeId] || 0;
};

export const selectTotalReadingTime = (state: { reader: ReaderState }) => {
  // Calculate current session time + stored total
  const currentSessionTime = Date.now() - state.reader.sessionStartTime;
  return state.reader.totalReadingTime + currentSessionTime;
};

export default readerSlice.reducer;