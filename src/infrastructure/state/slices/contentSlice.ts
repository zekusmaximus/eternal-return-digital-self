/**
 * Simplified content state slice
 * Replaces complex node content management with clean state
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';

export interface ContentState {
  // Raw content by node ID
  rawContent: Record<string, string>;
  
  // Transformed content by node ID
  transformedContent: Record<string, string>;
  
  // Loading states
  loading: Record<string, boolean>;
  
  // Error states
  errors: Record<string, string>;
}

const initialState: ContentState = {
  rawContent: {},
  transformedContent: {},
  loading: {},
  errors: {},
};

// Async thunk for loading content
export const loadContent = createAsyncThunk(
  'content/load',
  async (params: { nodeId: string; contentSource: string }, { rejectWithValue }) => {
    try {
      const response = await fetch(`/src/content/${params.contentSource}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch content for ${params.contentSource}`);
      }
      const text = await response.text();
      return { nodeId: params.nodeId, content: text };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return rejectWithValue(`Failed to load content for node ${params.nodeId}: ${message}`);
    }
  }
);

const contentSlice = createSlice({
  name: 'content',
  initialState,
  reducers: {
    // Set raw content for a node
    setRawContent: (state, action: PayloadAction<{
      nodeId: string;
      content: string;
    }>) => {
      const { nodeId, content } = action.payload;
      state.rawContent[nodeId] = content;
      delete state.errors[nodeId];
    },

    // Set transformed content for a node
    setTransformedContent: (state, action: PayloadAction<{
      nodeId: string;
      content: string;
    }>) => {
      const { nodeId, content } = action.payload;
      state.transformedContent[nodeId] = content;
    },

    // Clear content for a node
    clearNodeContent: (state, action: PayloadAction<string>) => {
      const nodeId = action.payload;
      delete state.rawContent[nodeId];
      delete state.transformedContent[nodeId];
      delete state.loading[nodeId];
      delete state.errors[nodeId];
    },

    // Set error for a node
    setContentError: (state, action: PayloadAction<{
      nodeId: string;
      error: string;
    }>) => {
      const { nodeId, error } = action.payload;
      state.errors[nodeId] = error;
      state.loading[nodeId] = false;
    },

    // Reset all content
    resetContent: (state) => {
      state.rawContent = {};
      state.transformedContent = {};
      state.loading = {};
      state.errors = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadContent.pending, (state, action) => {
        const nodeId = action.meta.arg.nodeId;
        state.loading[nodeId] = true;
        delete state.errors[nodeId];
      })
      .addCase(loadContent.fulfilled, (state, action) => {
        const { nodeId, content } = action.payload;
        state.rawContent[nodeId] = content;
        state.loading[nodeId] = false;
      })
      .addCase(loadContent.rejected, (state, action) => {
        const nodeId = action.meta.arg.nodeId;
        state.errors[nodeId] = action.payload as string;
        state.loading[nodeId] = false;
      });
  },
});

export const {
  setRawContent,
  setTransformedContent,
  clearNodeContent,
  setContentError,
  resetContent,
} = contentSlice.actions;

// Simple selectors
export const selectRawContent = (state: { content: ContentState }, nodeId: string) =>
  state.content.rawContent[nodeId];

export const selectTransformedContent = (state: { content: ContentState }, nodeId: string) =>
  state.content.transformedContent[nodeId];

export const selectContentLoading = (state: { content: ContentState }, nodeId: string) =>
  state.content.loading[nodeId] || false;

export const selectContentError = (state: { content: ContentState }, nodeId: string) =>
  state.content.errors[nodeId];

export const selectCurrentContent = (state: { content: ContentState }, nodeId: string) =>
  state.content.transformedContent[nodeId] || state.content.rawContent[nodeId];

export default contentSlice.reducer;