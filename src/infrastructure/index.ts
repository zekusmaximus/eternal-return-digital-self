/**
 * Infrastructure Layer Exports
 * Simplified state management and persistence
 */

// State management
export * from './state/store';
export * from './state/slices/transformationSlice';
export * from './state/slices/readerSlice';
export * from './state/slices/contentSlice';

// Re-export main store for easy access
export { simplifiedStore as store, simplifiedPersistor as persistor } from './state/store';