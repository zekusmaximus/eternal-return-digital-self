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
import { contentVariantService } from '../services/ContentVariantService';
import { transformationEngine } from '../services/TransformationEngine';

// Persist configuration
const persistConfig = {
  key: 'eternal-return',
  version: 1,
  storage,
  // Only blacklist UI state that doesn't need to persist
  blacklist: ['interface'],
};

// Combine reducers from different slices
export const rootReducer = combineReducers({
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
 * Enhanced with journey context, character bleed, and recursive pattern detection
 *
 * @param nodeId The ID of the node to calculate state for
 * @returns The calculated visual state for the node
 */
export const calculateNodeState = (nodeId: string): string => {
  const state = store.getState();
  const node = state.nodes.data[nodeId];
  const readerState = state.reader;
  
  if (!node) return 'unvisited';
  
  // Enhanced state calculation with journey context
  if (node.visitCount === 0) return 'unvisited';
  
  // Check for character bleed effects
  const hasCharacterBleed = readerState.path.detailedVisits &&
    readerState.path.detailedVisits.length >= 2 &&
    readerState.path.detailedVisits[readerState.path.detailedVisits.length - 2].character !== node.character;
  
  // Check for recursive patterns
  const nodeVisitCount = readerState.path.sequence.filter(id => id === nodeId).length;
  const hasRecursivePattern = nodeVisitCount > 2;
  
  // Check for high attractor engagement
  const totalAttractorEngagement = Object.values(readerState.path.attractorsEngaged).reduce((sum, count) => sum + count, 0);
  const hasHighAttractorEngagement = totalAttractorEngagement > 10;
  
  // Enhanced state logic with modifiers
  if (node.visitCount >= node.transformationThresholds.fragmented) {
    if (hasRecursivePattern && hasCharacterBleed) return 'fragmented-recursive-bleed';
    if (hasRecursivePattern) return 'fragmented-recursive';
    if (hasCharacterBleed) return 'fragmented-bleed';
    return 'fragmented';
  }
  
  if (node.visitCount >= node.transformationThresholds.complex) {
    if (hasHighAttractorEngagement && hasCharacterBleed) return 'complex-attractor-bleed';
    if (hasCharacterBleed) return 'complex-bleed';
    if (hasHighAttractorEngagement) return 'complex-attractor';
    return 'complex';
  }
  
  if (node.visitCount >= node.transformationThresholds.revisit) {
    if (hasRecursivePattern) return 'revisited-recursive';
    if (hasCharacterBleed) return 'revisited-bleed';
    return 'revisited';
  }
  
  if (node.visitCount === 1) {
    if (hasCharacterBleed) return 'visited-bleed';
    return 'visited';
  }
  
  // Default fallback
  return 'unvisited';
};

/**
 * Get the transformed content for a node based on its current state
 * Integrates with ContentVariantService and TransformationEngine for
 * sophisticated content selection and transformation
 *
 * @param nodeId The ID of the node to get content for
 * @returns The transformed content for the current state
 */
export const getNodeContent = (nodeId: string): string => {
  const state = store.getState();
  const node = state.nodes.data[nodeId];
  const readerState = state.reader;
  
  if (!node) {
    console.warn(`[getNodeContent] Node ${nodeId} not found`);
    return '';
  }

  // If content hasn't been loaded yet, return loading message
  if (!node.content && !node.enhancedContent) {
    return 'Loading content...';
  }

  try {
    // Use ContentVariantService for enhanced content selection
    if (node.enhancedContent) {
      // Create content selection context manually to avoid type conflicts
      const lastVisitedCharacter = readerState.path.sequence.length > 1
        ? state.nodes.data[readerState.path.sequence[readerState.path.sequence.length - 2]]?.character
        : undefined;
      
      const characterSequence = readerState.path.sequence
        .slice(-5)
        .map(id => state.nodes.data[id]?.character)
        .filter((char): char is NonNullable<typeof char> => char !== undefined);
      
      const recursiveAwareness = readerState.path.sequence.length > 0
        ? 1 - (new Set(readerState.path.sequence).size / readerState.path.sequence.length)
        : 0;
      
      const selectionContext = {
        visitCount: node.visitCount,
        lastVisitedCharacter,
        journeyPattern: readerState.path.sequence.slice(-5),
        characterSequence,
        attractorsEngaged: readerState.path.attractorsEngaged,
        recursiveAwareness
      };
      
      const selectedContent = contentVariantService.selectContentVariant(node.enhancedContent, selectionContext);
      
      // Apply transformations using TransformationEngine
      const allNodes = state.nodes.data;
      const transformedContent = transformationEngine.getTransformedContent(node, readerState, allNodes);
      
      return transformedContent || selectedContent;
    }

    // Fallback to legacy content system
    if (node.content) {
      const availableCounts = Object.keys(node.content)
        .map(Number)
        .sort((a, b) => b - a);
      const lookupKey = Math.max(0, node.visitCount - 1);
      const bestMatch = availableCounts.find(count => lookupKey >= count);
      
      if (bestMatch !== undefined) {
        const baseContent = node.content[bestMatch];
        
        // Apply transformations if available
        if (node.transformations && node.transformations.length > 0) {
          const applicableTransformations = transformationEngine.evaluateAllTransformations(
            node.transformations,
            readerState,
            node
          );
          return transformationEngine.applyTransformations(baseContent, applicableTransformations);
        }
        
        return baseContent;
      }
    }

    return node.currentContent || 'No content available';
  } catch (error) {
    console.error(`[getNodeContent] Error getting content for node ${nodeId}:`, error);
    return node.currentContent || node.enhancedContent?.base || 'Error loading content';
  }
};

export default store;