import { useSelector, useDispatch } from 'react-redux';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { setViewMode, selectSelectedNodeId, selectHoveredNodeId, selectIsInitialChoicePhase } from '../../store/slices/interfaceSlice';
import './ConstellationView.css';
import { useMemo, useRef, lazy, Suspense, useState, useEffect, useCallback } from 'react';
import { InstancedMesh } from 'three';
import * as THREE from 'three';
import { Connection } from '../../types';
import { useWebGLContext } from '../../infrastructure/webgl/WebGLContextProvider';
import { useNodePositions } from '../../hooks/useNodePositions';

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
  const { registerContext, disposeContext } = useWebGLContext();
  
  // Register this component with ViewManager only once on mount/unmount
  useEffect(() => {
    console.log('[ConstellationView] Component mounted');
    
    return () => {
      // Inform ViewManager when unmounting
      console.log('[ConstellationView] Component unmounting');
      
      // Make sure to clean up WebGL context when unmounting
      if (contextIdRef.current) {
        console.log(`[ConstellationView] Unmounting, disposing WebGL context: ${contextIdRef.current}`);
        disposeContext(contextIdRef.current);
        contextIdRef.current = null;
      }
    };
  }, [disposeContext]); // Empty dependency array ensures this only runs on mount/unmount

  // Create formatted connections for ThreeJSComponents
  // Convert from {start, end} format to {source, target} format
  const mappedConnections = useMemo(() =>
    connections.map(c => ({ source: c.start, target: c.end })),
  [connections]);
  
  // Create Connection objects with correct types for ThreeJSComponents
  const connectionObjects = useMemo(() =>
    connections.map(c => ({ source: c.start, target: c.end } as Connection)),
  [connections]);

  // Use the new custom hook to calculate node positions
  const finalNodePositions = useNodePositions(nodes);

  // Handle WebGL context registration - memoized to prevent recreating on each render
  const handleWebGLContextCreated = useCallback((renderer: THREE.WebGLRenderer) => {
    // Don't re-register if we already have a context ID
    if (contextIdRef.current) {
      console.log(`[ConstellationView] Context already registered: ${contextIdRef.current}`);
      return;
    }
    
    // Register with the WebGL context provider
    const id = registerContext(renderer, 'constellation');
    
    contextIdRef.current = id;
    console.log(`[ConstellationView] Registered WebGL context: ${id}`);
  }, [registerContext]); // Empty dependency array ensures stable callback

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