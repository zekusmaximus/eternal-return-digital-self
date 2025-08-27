import interfaceReducer, {
  InterfaceState,
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
  selectViewMode,
  selectShowMiniConstellation,
  selectShowMetaInterface,
  selectShowStrangeAttractors,
  selectConstellationControls,
  selectAccessibilitySettings,
  selectModalStates,
  selectHoveredNodeId,
  selectSelectedNodeId,
  selectIsInitialChoicePhase
} from '../slices/interfaceSlice';
import { RootState } from '../types';

// Simple assertion functions to match the pattern used in existing tests
const assert = {
  equals: (actual: unknown, expected: unknown, message?: string): void => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  toBe: (actual: unknown, expected: unknown, message?: string): void => {
    if (actual !== expected) {
      throw new Error(message || `Expected ${expected}, got ${actual}`);
    }
  },
  toHaveLength: (actual: unknown[], expected: number, message?: string): void => {
    if (actual.length !== expected) {
      throw new Error(message || `Expected array length ${expected}, got ${actual.length}`);
    }
  },
  toContain: (actual: unknown[], expected: unknown, message?: string): void => {
    if (!actual.includes(expected)) {
      throw new Error(message || `Expected array to contain ${expected}`);
    }
  },
  toBeDefined: (actual: unknown, message?: string): void => {
    if (actual === undefined || actual === null) {
      throw new Error(message || `Expected value to be defined`);
    }
  },
  toBeUndefined: (actual: unknown, message?: string): void => {
    if (actual !== undefined && actual !== null) {
      throw new Error(message || `Expected value to be undefined`);
    }
  },
  toHaveProperty: (actual: object, property: string, message?: string): void => {
    if (!(property in actual)) {
      throw new Error(message || `Expected object to have property ${property}`);
    }
  }
};

// Mock initial state
const mockInitialState: InterfaceState = {
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
    z: 0
  },
  textSize: 'medium',
  highContrast: false,
  animations: 'full',
  transitionSpeed: 500,
  helpModalOpen: false,
  aboutModalOpen: false,
  isInitialChoicePhase: true
};

// Mock full RootState
const mockRootState: RootState = {
  nodes: {
    data: {},
    initialized: false,
    loading: false,
    error: null,
    triumvirateActive: true
  },
  reader: {
    path: {
      sequence: [],
      timestamps: {},
      durations: {},
      revisitPatterns: {},
      attractorsEngaged: {
        'recursion-pattern': 0,
        'memory-fragment': 0,
        'verification-ritual': 0,
        'identity-pattern': 0,
        'recursion-chamber': 0,
        'process-language': 0,
        'autonomous-fragment': 0,
        'quantum-perception': 0,
        'distributed-consciousness': 0,
        'recursive-loop': 0,
        'quantum-uncertainty': 0,
        'continuity-interface': 0,
        'system-decay': 0,
        'quantum-transformation': 0,
        'memory-artifact': 0,
        'recursive-symbol': 0,
        'recognition-pattern': 0,
        'memory-sphere': 0,
        'quantum-déjà-vu': 0,
        'quantum-choice': 0
      }
    },
    currentNodeId: null,
    previousNodeId: null,
    endpointProgress: {
      past: 0,
      present: 0,
      future: 0
    },
    attractorEngagement: {
      'recursion-pattern': 0,
      'memory-fragment': 0,
      'verification-ritual': 0,
      'identity-pattern': 0,
      'recursion-chamber': 0,
      'process-language': 0,
      'autonomous-fragment': 0,
      'quantum-perception': 0,
      'distributed-consciousness': 0,
      'recursive-loop': 0,
      'quantum-uncertainty': 0,
      'continuity-interface': 0,
      'system-decay': 0,
      'quantum-transformation': 0,
      'memory-artifact': 0,
      'recursive-symbol': 0,
      'recognition-pattern': 0,
      'memory-sphere': 0,
      'quantum-déjà-vu': 0,
      'quantum-choice': 0
    },
    sessionStartTime: 0,
    totalReadingTime: 0
  },
  interface: {
    viewMode: 'constellation',
    showMiniConstellation: true,
    showMetaInterface: false,
    hoveredNodeId: null,
    selectedNodeId: null,
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
    aboutModalOpen: false,
    isInitialChoicePhase: true
  }
};

describe('interfaceSlice', () => {
  let state: InterfaceState;

  beforeEach(() => {
    state = { ...mockInitialState };
  });

  describe('reducers', () => {
    describe('setViewMode', () => {
      it('should set the view mode', () => {
        const newState = interfaceReducer(state, setViewMode('reading'));
        assert.equals(newState.viewMode, 'reading');
      });
    });

    describe('toggleMiniConstellation', () => {
      it('should toggle mini constellation visibility', () => {
        const newState = interfaceReducer(state, toggleMiniConstellation());
        assert.equals(newState.showMiniConstellation, false);
        
        const newState2 = interfaceReducer(newState, toggleMiniConstellation());
        assert.equals(newState2.showMiniConstellation, true);
      });
    });

    describe('toggleMetaInterface', () => {
      it('should toggle meta interface visibility', () => {
        const newState = interfaceReducer(state, toggleMetaInterface());
        assert.equals(newState.showMetaInterface, true);
        
        const newState2 = interfaceReducer(newState, toggleMetaInterface());
        assert.equals(newState2.showMetaInterface, false);
      });
    });

    describe('toggleStrangeAttractors', () => {
      it('should toggle strange attractors visibility', () => {
        const newState = interfaceReducer(state, toggleStrangeAttractors());
        assert.equals(newState.showStrangeAttractors, true);
        
        const newState2 = interfaceReducer(newState, toggleStrangeAttractors());
        assert.equals(newState2.showStrangeAttractors, false);
      });
    });

    describe('setConstellationZoom', () => {
      it('should set constellation zoom level', () => {
        const newState = interfaceReducer(state, setConstellationZoom(1.5));
        assert.equals(newState.constellationZoom, 1.5);
      });

      it('should clamp zoom between 0.5 and 2.5', () => {
        let newState = interfaceReducer(state, setConstellationZoom(0.2));
        assert.equals(newState.constellationZoom, 0.5);
        
        newState = interfaceReducer(state, setConstellationZoom(3.0));
        assert.equals(newState.constellationZoom, 2.5);
      });
    });

    describe('setConstellationRotation', () => {
      it('should set constellation rotation', () => {
        const newState = interfaceReducer(
          state, 
          setConstellationRotation({ x: 45, y: 90, z: 180 })
        );
        assert.equals(newState.constellationRotation.x, 45);
        assert.equals(newState.constellationRotation.y, 90);
        assert.equals(newState.constellationRotation.z, 180);
      });

      it('should set individual rotation values', () => {
        let newState = interfaceReducer(state, setConstellationRotation({ x: 45 }));
        assert.equals(newState.constellationRotation.x, 45);
        
        newState = interfaceReducer(newState, setConstellationRotation({ y: 90 }));
        assert.equals(newState.constellationRotation.y, 90);
        
        newState = interfaceReducer(newState, setConstellationRotation({ z: 180 }));
        assert.equals(newState.constellationRotation.z, 180);
      });
    });

    describe('setTextSize', () => {
      it('should set text size', () => {
        const newState = interfaceReducer(state, setTextSize('large'));
        assert.equals(newState.textSize, 'large');
      });
    });

    describe('toggleHighContrast', () => {
      it('should toggle high contrast mode', () => {
        const newState = interfaceReducer(state, toggleHighContrast());
        assert.equals(newState.highContrast, true);
        
        const newState2 = interfaceReducer(newState, toggleHighContrast());
        assert.equals(newState2.highContrast, false);
      });
    });

    describe('setAnimations', () => {
      it('should set animation mode', () => {
        const newState = interfaceReducer(state, setAnimations('reduced'));
        assert.equals(newState.animations, 'reduced');
      });
    });

    describe('setTransitionSpeed', () => {
      it('should set transition speed', () => {
        const newState = interfaceReducer(state, setTransitionSpeed(800));
        assert.equals(newState.transitionSpeed, 800);
      });

      it('should clamp transition speed between 0 and 1000', () => {
        let newState = interfaceReducer(state, setTransitionSpeed(-100));
        assert.equals(newState.transitionSpeed, 0);
        
        newState = interfaceReducer(state, setTransitionSpeed(1500));
        assert.equals(newState.transitionSpeed, 1000);
      });
    });

    describe('toggleHelpModal', () => {
      it('should toggle help modal', () => {
        const newState = interfaceReducer(state, toggleHelpModal());
        assert.equals(newState.helpModalOpen, true);
        
        const newState2 = interfaceReducer(newState, toggleHelpModal());
        assert.equals(newState2.helpModalOpen, false);
      });
    });

    describe('toggleAboutModal', () => {
      it('should toggle about modal', () => {
        const newState = interfaceReducer(state, toggleAboutModal());
        assert.equals(newState.aboutModalOpen, true);
        
        const newState2 = interfaceReducer(newState, toggleAboutModal());
        assert.equals(newState2.aboutModalOpen, false);
      });
    });

    describe('resetInterface', () => {
      it('should reset interface to initial state', () => {
        // Change some values
        let newState = interfaceReducer(state, setViewMode('reading'));
        newState = interfaceReducer(newState, toggleHighContrast());
        
        // Reset
        newState = interfaceReducer(newState, resetInterface());
        
        assert.equals(newState.viewMode, 'constellation');
        assert.equals(newState.highContrast, false);
      });
    });

    describe('nodeHovered', () => {
      it('should set hovered node ID and update last interaction', () => {
        const nodeId = 'test-node';
        const newState = interfaceReducer(state, nodeHovered(nodeId));
        
        assert.equals(newState.hoveredNodeId, nodeId);
        assert.toBeDefined(newState.lastInteraction);
      });
    });

    describe('nodeUnhovered', () => {
      it('should clear hovered node ID', () => {
        // First set a hovered node
        let newState = interfaceReducer(state, nodeHovered('test-node'));
        assert.equals(newState.hoveredNodeId, 'test-node');
        
        // Then unhover
        newState = interfaceReducer(newState, nodeUnhovered());
        assert.equals(newState.hoveredNodeId, null);
      });
    });

    describe('nodeSelected', () => {
      it('should set selected node ID and switch to reading view', () => {
        const nodeId = 'test-node';
        const newState = interfaceReducer(state, nodeSelected(nodeId));
        
        assert.equals(newState.selectedNodeId, nodeId);
        assert.equals(newState.viewMode, 'reading');
      });

      it('should handle initial choice phase', () => {
        const nodeId = 'test-node';
        const newState = interfaceReducer(state, nodeSelected(nodeId));
        
        assert.equals(newState.isInitialChoicePhase, false);
      });
    });

    describe('returnToConstellation', () => {
      it('should switch view mode to constellation', () => {
        // First switch to reading mode
        let newState = interfaceReducer(state, setViewMode('reading'));
        assert.equals(newState.viewMode, 'reading');
        
        // Then return to constellation
        newState = interfaceReducer(newState, returnToConstellation());
        assert.equals(newState.viewMode, 'constellation');
      });
    });

    describe('setInitialChoicePhaseCompleted', () => {
      it('should set initial choice phase to false', () => {
        const newState = interfaceReducer(state, setInitialChoicePhaseCompleted());
        assert.equals(newState.isInitialChoicePhase, false);
      });
    });
  });

  describe('selectors', () => {
    const mockState: RootState = mockRootState;

    describe('selectViewMode', () => {
      it('should select the view mode', () => {
        const viewMode = selectViewMode(mockState);
        assert.equals(viewMode, 'constellation');
      });
    });

    describe('selectShowMiniConstellation', () => {
      it('should select mini constellation visibility', () => {
        const show = selectShowMiniConstellation(mockState);
        assert.equals(show, true);
      });
    });

    describe('selectShowMetaInterface', () => {
      it('should select meta interface visibility', () => {
        const show = selectShowMetaInterface(mockState);
        assert.equals(show, false);
      });
    });

    describe('selectShowStrangeAttractors', () => {
      it('should select strange attractors visibility', () => {
        const show = selectShowStrangeAttractors(mockState);
        assert.equals(show, false);
      });
    });

    describe('selectConstellationControls', () => {
      it('should select constellation controls', () => {
        const controls = selectConstellationControls(mockState);
        assert.toBeDefined(controls);
        assert.toBeDefined(controls.zoom);
        assert.toBeDefined(controls.rotation);
      });
    });

    describe('selectAccessibilitySettings', () => {
      it('should select accessibility settings', () => {
        const settings = selectAccessibilitySettings(mockState);
        assert.toBeDefined(settings);
        assert.equals(settings.textSize, 'medium');
        assert.equals(settings.highContrast, false);
        assert.equals(settings.animations, 'full');
      });
    });

    describe('selectModalStates', () => {
      it('should select modal states', () => {
        const modals = selectModalStates(mockState);
        assert.toBeDefined(modals);
        assert.equals(modals.helpModalOpen, false);
        assert.equals(modals.aboutModalOpen, false);
      });
    });

    describe('selectHoveredNodeId', () => {
      it('should select hovered node ID', () => {
        const nodeId = selectHoveredNodeId(mockState);
        assert.equals(nodeId, null);
      });
    });

    describe('selectSelectedNodeId', () => {
      it('should select selected node ID', () => {
        const nodeId = selectSelectedNodeId(mockState);
        assert.equals(nodeId, null);
      });
    });

    describe('selectIsInitialChoicePhase', () => {
      it('should select initial choice phase', () => {
        const isInitial = selectIsInitialChoicePhase(mockState);
        assert.equals(isInitial, true);
      });
    });
  });
});