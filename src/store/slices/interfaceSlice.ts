import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../types';

type ViewMode = 'constellation' | 'reading';

export interface InterfaceState {
  viewMode: ViewMode;
  showMiniConstellation: boolean;
  showMetaInterface: boolean;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  lastInteraction: number;
  showStrangeAttractors: boolean;
  constellationZoom: number;
  constellationRotation: {
    x: number;
    y: number;
    z: number;
  };
  textSize: 'small' | 'medium' | 'large';
  highContrast: boolean;
  animations: 'reduced' | 'full';
  transitionSpeed: number;
  helpModalOpen: boolean;
  aboutModalOpen: boolean;
  isInitialChoicePhase: boolean;
}

const initialState: InterfaceState = {
  viewMode: 'constellation',
  showMiniConstellation: true,
  showMetaInterface: false,
  hoveredNodeId: null,
  selectedNodeId: null,
  lastInteraction: 0,
  showStrangeAttractors: false,
  constellationZoom: 1,
  constellationRotation: {
    x: 0,
    y: 0,
    z: 0,
  },
  textSize: 'medium',
  highContrast: false,
  animations: 'full',
  transitionSpeed: 500,
  helpModalOpen: false,
  aboutModalOpen: false,
  isInitialChoicePhase: true,
};

const interfaceSlice = createSlice({
  name: 'interface',
  initialState,
  reducers: {
    setViewMode: (state, action: PayloadAction<ViewMode>) => {
      state.viewMode = action.payload;
    },
    toggleMiniConstellation: (state) => {
      state.showMiniConstellation = !state.showMiniConstellation;
    },
    toggleMetaInterface: (state) => {
      state.showMetaInterface = !state.showMetaInterface;
    },
    toggleStrangeAttractors: (state) => {
      state.showStrangeAttractors = !state.showStrangeAttractors;
    },
    setConstellationZoom: (state, action: PayloadAction<number>) => {
      state.constellationZoom = Math.max(0.5, Math.min(2.5, action.payload));
    },
    setConstellationRotation: (
      state,
      action: PayloadAction<{ x?: number; y?: number; z?: number }>
    ) => {
      const { x, y, z } = action.payload;
      if (x !== undefined) state.constellationRotation.x = x;
      if (y !== undefined) state.constellationRotation.y = y;
      if (z !== undefined) state.constellationRotation.z = z;
    },
    setTextSize: (
      state,
      action: PayloadAction<'small' | 'medium' | 'large'>
    ) => {
      state.textSize = action.payload;
    },
    toggleHighContrast: (state) => {
      state.highContrast = !state.highContrast;
    },
    setAnimations: (state, action: PayloadAction<'reduced' | 'full'>) => {
      state.animations = action.payload;
    },
    setTransitionSpeed: (state, action: PayloadAction<number>) => {
      state.transitionSpeed = Math.max(0, Math.min(1000, action.payload));
    },
    toggleHelpModal: (state) => {
      state.helpModalOpen = !state.helpModalOpen;
    },
    toggleAboutModal: (state) => {
      state.aboutModalOpen = !state.aboutModalOpen;
    },
    resetInterface: () => {
      return initialState;
    },
    nodeHovered: (state, action: PayloadAction<string>) => {
      state.hoveredNodeId = action.payload;
      state.lastInteraction = Date.now();
    },
    nodeUnhovered: (state) => {
      state.hoveredNodeId = null;
    },
    nodeSelected: (state, action: PayloadAction<string>) => {
      if (state.selectedNodeId === action.payload) {
        // If the same node is clicked again, do nothing or handle as a "deselect"
        return;
      }
      state.selectedNodeId = action.payload;
      state.viewMode = 'reading';
      state.lastInteraction = Date.now();
      if (state.isInitialChoicePhase) {
        state.isInitialChoicePhase = false;
      }
    },
    returnToConstellation: (state) => {
      state.viewMode = 'constellation';
    },
    setInitialChoicePhaseCompleted: (state) => {
      state.isInitialChoicePhase = false;
    },
  },
});

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
  resetInterface,
  nodeHovered,
  nodeUnhovered,
  nodeSelected,
  returnToConstellation,
  setInitialChoicePhaseCompleted,
} = interfaceSlice.actions;

export const selectViewMode = (state: RootState) => state.interface.viewMode;
export const selectShowMiniConstellation = (state: RootState) =>
  state.interface.showMiniConstellation;
export const selectShowMetaInterface = (state: RootState) =>
  state.interface.showMetaInterface;
export const selectShowStrangeAttractors = (state: RootState) =>
  state.interface.showStrangeAttractors;
export const selectConstellationControls = (state: RootState) => ({
  zoom: state.interface.constellationZoom,
  rotation: state.interface.constellationRotation,
});
export const selectAccessibilitySettings = (state: RootState) => ({
  textSize: state.interface.textSize,
  highContrast: state.interface.highContrast,
  animations: state.interface.animations,
  transitionSpeed: state.interface.transitionSpeed,
});
export const selectModalStates = (state: RootState) => ({
  helpModalOpen: state.interface.helpModalOpen,
  aboutModalOpen: state.interface.aboutModalOpen,
});

export const selectHoveredNodeId = (state: RootState) =>
  state.interface.hoveredNodeId;
export const selectSelectedNodeId = (state: RootState) =>
  state.interface.selectedNodeId;
export const selectIsInitialChoicePhase = (state: RootState) => state.interface.isInitialChoicePhase;

export default interfaceSlice.reducer;