/**
 * Redux slice for managing interface state in Eternal Return of the Digital Self
 * Controls view modes, UI elements, and visualization settings
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../types';
// Possible view modes for the interface
type ViewMode = 'constellation' | 'reading';

export interface InterfaceState { // Add 'export' here
  viewMode: ViewMode;
  showMiniConstellation: boolean;
  showMetaInterface: boolean;
  // ... existing code ...
}

// Initial state for the interface slice
const initialState = {
  viewMode: 'constellation',
  showMiniConstellation: true,
  showMetaInterface: false,
  showStrangeAttractors: false,
  constellationZoom: 1,
  constellationRotation: {
    x: 0,
    y: 0,
    z: 0
  },
  textSize: 'medium',
  highContrast: false,
  animations: 'full',
  transitionSpeed: 500,
  helpModalOpen: false,
  aboutModalOpen: false
};

// Create the interface slice
const interfaceSlice = createSlice({
  name: 'interface',
  initialState,
  reducers: {
    // Change the view mode (constellation vs. reading)
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    
    // Toggle mini-constellation visibility in reading mode
    toggleMiniConstellation: (state) => {
      state.showMiniConstellation = !state.showMiniConstellation;
    },
    
    // Toggle meta-interface elements that appear after sufficient exploration
    toggleMetaInterface: (state) => {
      state.showMetaInterface = !state.showMetaInterface;
    },
    
    // Toggle visualization of strange attractors in the constellation
    toggleStrangeAttractors: (state) => {
      state.showStrangeAttractors = !state.showStrangeAttractors;
    },
    
    // Set zoom level for constellation view
    setConstellationZoom: (state, action: PayloadAction<number>) => {
      state.constellationZoom = Math.max(0.5, Math.min(2.5, action.payload));
    },
    
    // Set rotation for constellation view
    setConstellationRotation: (state, action: PayloadAction<{
      x?: number;
      y?: number;
      z?: number;
    }>) => {
      const { x, y, z } = action.payload;
      if (x !== undefined) state.constellationRotation.x = x;
      if (y !== undefined) state.constellationRotation.y = y;
      if (z !== undefined) state.constellationRotation.z = z;
    },
    
    // Set text size preference
    setTextSize: (state, action: PayloadAction<'small' | 'medium' | 'large'>) => {
      state.textSize = action.payload;
    },
    
    // Toggle high contrast mode for accessibility
    toggleHighContrast: (state) => {
      state.highContrast = !state.highContrast;
    },
    
    // Set animation preference
    setAnimations: (state, action: PayloadAction<'reduced' | 'full'>) => {
      state.animations = action.payload;
    },
    
    // Set transition speed
    setTransitionSpeed: (state, action: PayloadAction<number>) => {
      state.transitionSpeed = Math.max(0, Math.min(1000, action.payload));
    },
    
    // Toggle help modal
    toggleHelpModal: (state) => {
      state.helpModalOpen = !state.helpModalOpen;
    },
    
    // Toggle about modal
    toggleAboutModal: (state) => {
      state.aboutModalOpen = !state.aboutModalOpen;
    },
    
    // Reset interface to default settings
    resetInterface: () => {
      return initialState;
    }
  }
});

// Export actions
export const { 
  setViewMode,
  toggleMiniConstellation,
  toggleMetaInterface,
  toggleStrangeAttractors,
  setConstellationZoom,
  setConstellationRotation,
  setTextSize,
  toggleHighContrast,
  setAnimations,
  setTransitionSpeed,
  toggleHelpModal,
  toggleAboutModal,
  resetInterface
} = interfaceSlice.actions;

// Export selector functions
export const selectViewMode = (state: RootState) =>
  state.interface.viewMode;

export const selectShowMiniConstellation = (state: RootState) =>
  state.interface.showMiniConstellation;

export const selectShowMetaInterface = (state: RootState) =>
  state.interface.showMetaInterface;

export const selectShowStrangeAttractors = (state: RootState) =>
  state.interface.showStrangeAttractors;

export const selectConstellationControls = (state: RootState) => ({
  zoom: state.interface.constellationZoom,
  rotation: state.interface.constellationRotation
});

export const selectAccessibilitySettings = (state: RootState) => ({
  textSize: state.interface.textSize,
  highContrast: state.interface.highContrast,
  animations: state.interface.animations,
  transitionSpeed: state.interface.transitionSpeed
});

export const selectModalStates = (state: RootState) => ({
  helpModalOpen: state.interface.helpModalOpen,
  aboutModalOpen: state.interface.aboutModalOpen
});

export default interfaceSlice.reducer;