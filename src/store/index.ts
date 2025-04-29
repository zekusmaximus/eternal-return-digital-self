declare const process: { env: { NODE_ENV?: string } };

/**
 * Redux store configuration for Eternal Return of the Digital Self
 * Implements state management for node transformations and reader journey tracking
 */

import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { 
  persistStore, 
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import nodesReducer, { NodesState } from './slices/nodesSlice'; // Import NodesState type
import readerReducer, { ReaderState } from './slices/readerSlice'; // Import ReaderState type
import interfaceReducer, { InterfaceState } from './slices/interfaceSlice';

// Persist configuration
const persistConfig = {
  key: 'eternal-return',
  version: 1,
  storage,
  // Only blacklist UI state that doesn't need to persist
  blacklist: ['interface'],
};

// Combine reducers from different slices
const rootReducer = combineReducers({
  nodes: nodesReducer,
  reader: readerReducer,
  interface: interfaceReducer,
});

// Let TypeScript infer RootState from rootReducer
export type RootState = {
  nodes: NodesState;
  reader: ReaderState;
  interface: InterfaceState;
};

// Create a persisted reducer to maintain state between sessions
const persistedReducer = persistReducer(
  persistConfig,
  rootReducer
);

// Configure store with middleware and devtools
export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools:
    (typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production') ||
    (typeof window !== 'undefined' && 'process' in window && typeof (window as { process: { env: { NODE_ENV?: string } } }).process.env.NODE_ENV !== 'undefined' && (window as { process: { env: { NODE_ENV?: string } } }).process.env.NODE_ENV !== 'production'),
});

// Create persistor for redux-persist
export const persistor = persistStore(store);

// Export types for hooks
export type AppDispatch = typeof store.dispatch;

/**
 * Calculate node state based on visit history and reading patterns
 * This function will be used by the NodeStateCalculator service
 * 
 * @param nodeId The ID of the node to calculate state for
 * @returns The calculated visual state for the node
 */
export const calculateNodeState = (nodeId: string): string => {
  const state = store.getState();
  const node = state.nodes.data[nodeId];
  // Removed unused 'path' variable
  
  if (!node) return 'unvisited';
  
  // Basic visit count logic for initial implementation
  if (node.visitCount === 0) return 'unvisited';
  if (node.visitCount === 1) return 'visited';
  if (node.visitCount > 1 && node.visitCount < node.transformationThresholds.complex) {
    return 'revisited';
  }
  if (node.visitCount >= node.transformationThresholds.complex && 
      node.visitCount < node.transformationThresholds.fragmented) {
    return 'complex';
  }
  if (node.visitCount >= node.transformationThresholds.fragmented) {
    return 'fragmented';
  }
  
  // Default fallback
  return 'unvisited';
};

/**
 * Get the transformed content for a node based on its current state
 * This is a placeholder for the more complex content transformation logic
 * that will be implemented in a separate service
 * 
 * @param nodeId The ID of the node to get content for
 * @returns The transformed content for the current state
 */
export const getNodeContent = (nodeId: string) => {
  // Placeholder implementation using nodeId
  return `Content for node ${nodeId}`;
};

export default store;