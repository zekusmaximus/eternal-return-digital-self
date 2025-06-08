import { useSelector, useDispatch } from 'react-redux';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { setViewMode } from '../../store/slices/interfaceSlice';
import './ConstellationView.css';
import { useMemo, useRef, lazy, Suspense, useState, useEffect } from 'react';
import { InstancedMesh } from 'three';
import * as THREE from 'three';
import { Connection } from '../../types';
import { webGLContextManager } from '../../services/WebGLContextManager';
import { viewManager } from '../../services/ViewManager';

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
  const instancedMeshRef = useRef<InstancedMesh>(null!);
  const [contextId, setContextId] = useState<string | null>(null);
  
  // Register this component with ViewManager
  useEffect(() => {
    viewManager.registerViewMount('constellation', true);
    
    return () => {
      // Inform ViewManager when unmounting
      viewManager.registerViewMount('constellation', false);
      
      // Make sure to clean up WebGL context when unmounting
      if (contextId) {
        console.log(`[ConstellationView] Unmounting, disposing WebGL context: ${contextId}`);
        webGLContextManager.disposeContext(contextId);
      }
    };
  }, [contextId]);

  // Create formatted connections for ThreeJSComponents
  // Convert from {start, end} format to {source, target} format
  const mappedConnections = useMemo(() =>
    connections.map(c => ({ source: c.start, target: c.end })),
  [connections]);
  
  // Create Connection objects with correct types for ThreeJSComponents
  const connectionObjects = useMemo(() =>
    connections.map(c => ({ source: c.start, target: c.end } as Connection)),
  [connections]);

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
      // Reduce radius to fit within viewport better
      const radius = 8;
      
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
    
    return positions;
  }, [nodes]);

  // Handle WebGL context registration
  const handleWebGLContextCreated = (renderer: THREE.WebGLRenderer) => {
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
    
    setContextId(id);
    console.log(`[ConstellationView] Registered WebGL context: ${id}`);
  };

  // Listen for application-wide WebGL context loss events
  useEffect(() => {
    const handleContextLoss = (event: CustomEvent) => {
      const { contextId: lostContextId, type } = event.detail;
      
      // Only handle if this matches our context or is constellation type
      if (contextId === lostContextId || type === 'constellation') {
        console.error("[ConstellationView] Received WebGL context loss event");
        setWebGLError(new Error("WebGL context lost - application event"));
      }
    };
    
    // Add event listener for context loss
    window.addEventListener(
      'webgl-context-loss',
      handleContextLoss as EventListener
    );
    
    return () => {
      window.removeEventListener(
        'webgl-context-loss',
        handleContextLoss as EventListener
      );
    };
  }, [contextId]);

  return (
    <div className="constellation-container">
      <Suspense fallback={<ConstellationLoading />}>
        <ThreeJSComponents
          nodes={nodes}
          nodePositions={nodePositions}
          connections={connectionObjects}
          mappedConnections={mappedConnections}
          instancedMeshRef={instancedMeshRef}
          onWebGLContextCreated={handleWebGLContextCreated}
          onWebGLError={(error) => {
            console.error("[ConstellationView] WebGL error reported:", error);
            setWebGLError(error);
          }}
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