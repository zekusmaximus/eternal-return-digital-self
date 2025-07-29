/**
 * Simplified reader state slice
 * Replaces complex reader tracking with essential journey state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Character, StrangeAttractor, TemporalLabel } from '../../../types';

export interface SimpleReaderState {
  // Current navigation state
  currentNodeId: string | null;
  previousNodeId: string | null;
  
  // Essential journey tracking
  visitedNodes: string[];
  visitCounts: Record<string, number>;
  
  // Character and temporal context
  currentCharacter: Character | null;
  previousCharacter: Character | null;
  currentTemporalLayer: TemporalLabel | null;
  
  // Simplified attractor engagement
  engagedAttractors: StrangeAttractor[];
  
  // Basic pattern recognition
  hasRevisitPattern: boolean;
  hasCharacterTransition: boolean;
}

const initialState: SimpleReaderState = {
  currentNodeId: null,
  previousNodeId: null,
  visitedNodes: [],
  visitCounts: {},
  currentCharacter: null,
  previousCharacter: null,
  currentTemporalLayer: null,
  engagedAttractors: [],
  hasRevisitPattern: false,
  hasCharacterTransition: false,
};

const readerSlice = createSlice({
  name: 'reader',
  initialState,
  reducers: {
    // Navigate to a new node
    navigateToNode: (state, action: PayloadAction<{
      nodeId: string;
      character: Character;
      temporalLayer: TemporalLabel;
    }>) => {
      const { nodeId, character, temporalLayer } = action.payload;
      
      // Update navigation state
      state.previousNodeId = state.currentNodeId;
      state.currentNodeId = nodeId;
      
      // Update character context
      state.previousCharacter = state.currentCharacter;
      state.currentCharacter = character;
      state.currentTemporalLayer = temporalLayer;
      
      // Track visits
      if (!state.visitedNodes.includes(nodeId)) {
        state.visitedNodes.push(nodeId);
      }
      state.visitCounts[nodeId] = (state.visitCounts[nodeId] || 0) + 1;
      
      // Update pattern flags
      state.hasRevisitPattern = state.visitCounts[nodeId] > 1;
      state.hasCharacterTransition = state.previousCharacter !== null && 
                                    state.previousCharacter !== character;
    },

    // Engage with a strange attractor
    engageAttractor: (state, action: PayloadAction<StrangeAttractor>) => {
      const attractor = action.payload;
      if (!state.engagedAttractors.includes(attractor)) {
        state.engagedAttractors.push(attractor);
      }
    },

    // Reset reader state
    resetReader: (state) => {
      Object.assign(state, initialState);
    },
  },
});

export const {
  navigateToNode,
  engageAttractor,
  resetReader,
} = readerSlice.actions;

// Simple selectors
export const selectCurrentNodeId = (state: { reader: SimpleReaderState }) =>
  state.reader.currentNodeId;

export const selectPreviousNodeId = (state: { reader: SimpleReaderState }) =>
  state.reader.previousNodeId;

export const selectVisitCount = (state: { reader: SimpleReaderState }, nodeId: string) =>
  state.reader.visitCounts[nodeId] || 0;

export const selectCurrentCharacter = (state: { reader: SimpleReaderState }) =>
  state.reader.currentCharacter;

export const selectPreviousCharacter = (state: { reader: SimpleReaderState }) =>
  state.reader.previousCharacter;

export const selectHasCharacterTransition = (state: { reader: SimpleReaderState }) =>
  state.reader.hasCharacterTransition;

export const selectHasRevisitPattern = (state: { reader: SimpleReaderState }) =>
  state.reader.hasRevisitPattern;

export const selectEngagedAttractors = (state: { reader: SimpleReaderState }) =>
  state.reader.engagedAttractors;

export default readerSlice.reducer;