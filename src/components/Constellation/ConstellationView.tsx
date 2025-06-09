import { useSelector, useDispatch } from 'react-redux';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { setViewMode, selectSelectedNodeId, selectHoveredNodeId, selectIsInitialChoicePhase } from '../../store/slices/interfaceSlice';
import './ConstellationView.css';
import { useMemo, useRef, lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { InstancedMesh } from 'three';
import * as THREE from 'three';
import { Connection } from '../../types';
import { webGLContextManager } from '../../services/WebGLContextManager';
import { viewManager } from '../../services/ViewManager';

// Centralized position management system
class PositionSynchronizer {
  private static instance: PositionSynchronizer;
  private basePositions: { [key: string]: [number, number, number] } = {};
  private currentPositions: { [key: string]: [number, number, number] } = {};
  private lastUpdateTime: number = 0;
  private updateCallbacks: Set<(positions: { [key: string]: [number, number, number] }) => void> = new Set();
  private isUpdating: boolean = false;
  
  static getInstance(): PositionSynchronizer {
    if (!PositionSynchronizer.instance) {
      PositionSynchronizer.instance = new PositionSynchronizer();
    }
    return PositionSynchronizer.instance;
  }
  
  setBasePositions(positions: { [key: string]: [number, number, number] }) {
    this.basePositions = { ...positions };
    this.currentPositions = { ...positions };
  }
  
  updatePositions(time: number, isMinimap: boolean = false) {
    if (this.isUpdating) return this.currentPositions;
    
    this.isUpdating = true;
    const UPDATE_INTERVAL = 0.15; // 150ms in seconds
    
    if (time - this.lastUpdateTime >= UPDATE_INTERVAL) {
      this.lastUpdateTime = time;
      
      // Calculate new positions with noise (same algorithm as before)
      Object.keys(this.basePositions).forEach(nodeId => {
        const basePos = this.basePositions[nodeId];
        if (!basePos) return;
        
        if (isMinimap) {
          // For minimap: completely fixed positions
          this.currentPositions[nodeId] = [...basePos];
        } else {
          // For main view: apply very subtle movement
          const nx = Math.sin(basePos[0] * 0.1 + time * 0.02) * 0.01;
          const ny = Math.sin((basePos[1] + 100) * 0.1 + time * 0.02) * 0.01;
          const nz = Math.sin((basePos[2] + 200) * 0.1 + time * 0.02) * 0.01;
          
          // Much smaller maximum offset to keep nodes more stable
          const maxOffset = 0.01;
          const xOffset = Math.min(Math.abs(nx), maxOffset) * Math.sign(nx);
          const yOffset = Math.min(Math.abs(ny), maxOffset) * Math.sign(ny);
          const zOffset = Math.min(Math.abs(nz), maxOffset) * Math.sign(nz);
          
          // Store the exact same position for all components
          const newPos = [
            basePos[0] + xOffset,
            basePos[1] + yOffset,
            basePos[2] + zOffset
          ] as [number, number, number];
          
          this.currentPositions[nodeId] = newPos;
        }
      });
      
      // Notify all subscribers
      this.updateCallbacks.forEach(callback => {
        try {
          callback({ ...this.currentPositions });
        } catch (error) {
          console.error('Error in position update callback:', error);
        }
      });
    }
    
    this.isUpdating = false;
    return this.currentPositions;
  }
  
  getCurrentPositions() {
    return { ...this.currentPositions };
  }
  
  subscribeToUpdates(callback: (positions: { [key: string]: [number, number, number] }) => void) {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }
  
  reset() {
    this.basePositions = {};
    this.currentPositions = {};
    this.lastUpdateTime = 0;
    this.updateCallbacks.clear();
    this.isUpdating = false;
  }
}

// Dynamically import Three.js related dependencies
// Use explicit path with extension to help TypeScript
const ThreeJSComponents = lazy(() => import('./ThreeJSComponents.tsx'));

// Loading component for Suspense fallback
const ConstellationLoading = () => (
  <div className="constellation-loading">
    <div className="loading-spinner"></div>
    <p>Generating constellation view...</p>
  </div>
);

// WebGL error notification component
const WebGLErrorNotification = ({ onDismiss }: { onDismiss: () => void }) => {
  return (
    <div className="webgl-error-container">
      <div className="webgl-error-header">WebGL Error Detected</div>
      <div className="webgl-error-message">
        A graphics rendering error occurred. This may affect the constellation display.
        You can continue using the application in text-only mode.
      </div>
      <div className="webgl-error-actions">
        <button className="webgl-error-action" onClick={onDismiss}>
          Continue in Text Mode
        </button>
      </div>
    </div>
  );
};

const ConstellationView = () => {
  const dispatch = useDispatch();
  const [webGLError, setWebGLError] = useState<Error | null>(null);
  const nodes = useSelector(selectConstellationNodes);
  const connections = useSelector(selectConnections);
  const triumvirateActive = useSelector((state: { nodes: { triumvirateActive: boolean } }) => state.nodes.triumvirateActive);
  const triumvirateNodes = useMemo(() => ['arch-discovery', 'algo-awakening', 'human-discovery'], []);
  const isInitialChoicePhase = useSelector(selectIsInitialChoicePhase);
  const selectedNodeId = useSelector(selectSelectedNodeId);
  const hoveredNodeId = useSelector(selectHoveredNodeId);
  const instancedMeshRef = useRef<InstancedMesh>(null!);
  const contextIdRef = useRef<string | null>(null);
  
  // Register this component with ViewManager only once on mount/unmount
  useEffect(() => {
    console.log('[ConstellationView] Component mounted');
    viewManager.registerViewMount('constellation', true);
    
    return () => {
      // Inform ViewManager when unmounting
      console.log('[ConstellationView] Component unmounting');
      viewManager.registerViewMount('constellation', false);
      
      // Make sure to clean up WebGL context when unmounting
      if (contextIdRef.current) {
        console.log(`[ConstellationView] Unmounting, disposing WebGL context: ${contextIdRef.current}`);
        webGLContextManager.disposeContext(contextIdRef.current);
        contextIdRef.current = null;
      }
    };
  }, []); // Empty dependency array ensures this only runs on mount/unmount

  // Create formatted connections for ThreeJSComponents
  // Convert from {start, end} format to {source, target} format
  const mappedConnections = useMemo(() =>
    connections.map(c => ({ source: c.start, target: c.end })),
  [connections]);
  
  // Create Connection objects with correct types for ThreeJSComponents
  const connectionObjects = useMemo(() =>
    connections.map(c => ({ source: c.start, target: c.end } as Connection)),
  [connections]);

  // Centralized position management
  const positionSynchronizer = useRef(PositionSynchronizer.getInstance());
  const [synchronizedPositions, setSynchronizedPositions] = useState<{ [key: string]: [number, number, number] }>({});
  
  const nodePositions = useMemo(() => {
    // Debug
    console.log("Calculating positions for nodes:", nodes.length);
    
    const positions: { [key: string]: [number, number, number] } = {};
    
    // Special case for empty nodes array to avoid issues
    if (nodes.length === 0) {
      console.warn("No nodes to position");
      return positions;
    }
    
    // Generate distinct positions for each node in a spherical layout
    nodes.forEach((node, index) => {
      const numNodes = nodes.length;
      // Increased radius to spread nodes out more
      const radius = 15;
      
      // Fibonacci sphere algorithm for more even distribution
      const offset = 2.0 / numNodes;
      const increment = Math.PI * (3.0 - Math.sqrt(5.0));
      
      const y = ((index * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1 - y * y);
      const phi = index * increment;
      
      const x = Math.cos(phi) * r * radius;
      const z = Math.sin(phi) * r * radius;
      
      positions[node.id] = [x, y * radius, z];
    });
    
    // Set base positions in synchronizer
    positionSynchronizer.current.setBasePositions(positions);
    
    return positions;
  }, [nodes]);
  
  // Subscribe to position updates
  useEffect(() => {
    const unsubscribe = positionSynchronizer.current.subscribeToUpdates((newPositions) => {
      setSynchronizedPositions(newPositions);
    });
    
    return () => {
      unsubscribe();
    };
  }, []);
  
  // Use synchronized positions if available, otherwise fall back to base positions
  const finalNodePositions = Object.keys(synchronizedPositions).length > 0 ? synchronizedPositions : nodePositions;

  // Handle WebGL context registration - memoized to prevent recreating on each render
  const handleWebGLContextCreated = useCallback((renderer: THREE.WebGLRenderer) => {
    // Don't re-register if we already have a context ID
    if (contextIdRef.current) {
      console.log(`[ConstellationView] Context already registered: ${contextIdRef.current}`);
      return;
    }
    
    // Register with the WebGL context manager
    const id = webGLContextManager.registerContext(
      renderer,
      'constellation',
      2, // High priority
      // Suspend function
      () => {
        console.log('[ConstellationView] Suspending WebGL rendering');
        // Logic to pause rendering or reduce frame rate
      },
      // Resume function
      () => {
        console.log('[ConstellationView] Resuming WebGL rendering');
        // Logic to resume normal rendering
      }
    );
    
    contextIdRef.current = id;
    console.log(`[ConstellationView] Registered WebGL context: ${id}`);
  }, []); // Empty dependency array ensures stable callback

  // The application-wide WebGL context loss event listener has been removed.
  // Error handling is now centralized in the ThreeJSComponents' WebGLErrorHandler,
  // which propagates the error up via the onWebGLError prop.

  return (
    <div className="constellation-container">
      <Suspense fallback={<ConstellationLoading />}>
        <ThreeJSComponents
          nodes={nodes}
          nodePositions={finalNodePositions}
          connections={connectionObjects}
          mappedConnections={mappedConnections}
          instancedMeshRef={instancedMeshRef}
          isInitialChoicePhase={isInitialChoicePhase}
          triumvirateActive={triumvirateActive}
          triumvirateNodes={triumvirateNodes}
          onWebGLContextCreated={handleWebGLContextCreated}
          onWebGLError={(error) => {
            console.error("[ConstellationView] WebGL error reported:", error);
            setWebGLError(error);
          }}
          positionSynchronizer={positionSynchronizer.current}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
          isMinimap={false}
        />
      </Suspense>
      
      {/* Show WebGL error notification when an error occurs */}
      {webGLError && (
        <WebGLErrorNotification
          onDismiss={() => {
            // Switch to reading mode to avoid WebGL rendering
            dispatch(setViewMode('reading'));
            setWebGLError(null);
          }}
        />
      )}
    </div>
  );
};

// Component has been refactored to integrate with WebGLContextManager and ViewManager

export default ConstellationView;