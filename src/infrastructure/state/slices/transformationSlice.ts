/**
 * Simplified transformation state slice
 * Replaces complex transformation logic from nodesSlice with clean state management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { TransformationContext, TransformationResult } from '../../../domain/models/TransformationContext';

export interface TransformationState {
  // Current transformation contexts by node ID
  contexts: Record<string, TransformationContext>;
  
  // Cached transformation results by node ID
  results: Record<string, TransformationResult>;
  
  // Simple loading state
  loading: boolean;
  
  // Error state
  error: string | null;
}

const initialState: TransformationState = {
  contexts: {},
  results: {},
  loading: false,
  error: null,
};

const transformationSlice = createSlice({
  name: 'transformation',
  initialState,
  reducers: {
    // Set transformation context for a node
    setTransformationContext: (state, action: PayloadAction<{
      nodeId: string;
      context: TransformationContext;
    }>) => {
      const { nodeId, context } = action.payload;
      state.contexts[nodeId] = context;
      state.error = null;
    },

    // Store transformation result
    setTransformationResult: (state, action: PayloadAction<{
      nodeId: string;
      result: TransformationResult;
    }>) => {
      const { nodeId, result } = action.payload;
      state.results[nodeId] = result;
      state.error = null;
    },

    // Clear transformation data for a node
    clearNodeTransformation: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      delete state.contexts[nodeId];
      delete state.results[nodeId];
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },

    // Set error state
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },

    // Reset all transformation state
    resetTransformations: (state) => {
      state.contexts = {};
      state.results = {};
      state.loading = false;
      state.error = null;
    },
  },
});

export const {
  setTransformationContext,
  setTransformationResult,
  clearNodeTransformation,
  setLoading,
  setError,
  resetTransformations,
} = transformationSlice.actions;

// Simple selectors
export const selectTransformationContext = (state: { transformation: TransformationState }, nodeId: string) =>
  state.transformation.contexts[nodeId];

export const selectTransformationResult = (state: { transformation: TransformationState }, nodeId: string) =>
  state.transformation.results[nodeId];

export const selectTransformationLoading = (state: { transformation: TransformationState }) =>
  state.transformation.loading;

export const selectTransformationError = (state: { transformation: TransformationState }) =>
  state.transformation.error;

export default transformationSlice.reducer;