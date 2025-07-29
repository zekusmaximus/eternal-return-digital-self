/**
 * Simplified Redux store configuration
 * Replaces complex state management with clean, focused slices
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

// Import simplified slices
import transformationReducer, { TransformationState } from './slices/transformationSlice';
import readerReducer, { SimpleReaderState } from './slices/readerSlice';
import contentReducer, { ContentState } from './slices/contentSlice';

// Keep the existing interface slice for UI state
import interfaceReducer, { InterfaceState } from '../../store/slices/interfaceSlice';

// Simplified root state type
export interface SimplifiedRootState {
  transformation: TransformationState;
  reader: SimpleReaderState;
  content: ContentState;
  interface: InterfaceState;
}

// Persist configuration - only persist essential data
const persistConfig = {
  key: 'eternal-return-simplified',
  version: 1,
  storage,
  // Only blacklist UI state that doesn't need to persist
  blacklist: ['interface', 'transformation'], // Don't persist transformation cache
};

// Combine the simplified reducers
const rootReducer = combineReducers({
  transformation: transformationReducer,
  reader: readerReducer,
  content: contentReducer,
  interface: interfaceReducer,
});

// Create persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure simplified store
export const simplifiedStore = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore non-serializable values in redux-persist actions
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

// Create persistor
export const simplifiedPersistor = persistStore(simplifiedStore);

// Export types
export type SimplifiedAppDispatch = typeof simplifiedStore.dispatch;

// Export store as default
export default simplifiedStore;