import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { NodesInstanced } from './NodesInstanced';
import { ConnectionsBatched } from './ConnectionsBatched';
import { InstancedMesh, Color } from 'three';
import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useState, useEffect, MutableRefObject, useRef, useMemo } from 'react';

// Import node types from store or create interface
import { ConstellationNode, Connection, NodePositions } from '../../types';

// Convert connection format from source/target to start/end
const convertConnections = (connections: Connection[]): { start: string; end: string }[] => {
  return connections.map(conn => ({
    start: conn.source,
    end: conn.target
  }));
};

interface ThreeJSComponentsProps {
  nodes: ConstellationNode[];
  nodePositions: NodePositions;
  connections: Connection[];
  mappedConnections: { source: string; target: string }[];
  instancedMeshRef: MutableRefObject<InstancedMesh>;
  onWebGLContextCreated?: (renderer: THREE.WebGLRenderer) => void; // Callback when WebGL renderer is created
  onWebGLError?: (error: Error) => void; // Callback for WebGL errors
  isInitialChoicePhase: boolean;
  triumvirateActive: boolean;
  triumvirateNodes: string[];
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  isMinimap?: boolean;
}

// WebGL error handler component
const WebGLErrorHandler = ({ onWebGLError }: { onWebGLError?: (error: Error) => void }) => {
  const { gl } = useThree();
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    if (!gl.domElement) return;
    
    // Handle WebGL context loss
    const handleContextLost = (event: Event) => {
      console.error("[ThreeJS] WebGL context lost", event);
      setHasError(true);
      event.preventDefault();
      if (onWebGLError) {
        onWebGLError(new Error("WebGL context lost"));
      }
    };
    
    // Handle WebGL context restoration
    const handleContextRestored = (event: Event) => {
      console.log("[ThreeJS] WebGL context restored", event);
      setHasError(false);
    };
    
    // Add event listeners to the canvas
    gl.domElement.addEventListener('webglcontextlost', handleContextLost);
    gl.domElement.addEventListener('webglcontextrestored', handleContextRestored);
    
    return () => {
      // Clean up event listeners
      gl.domElement.removeEventListener('webglcontextlost', handleContextLost);
      gl.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
    };
  }, [gl, onWebGLError]);
  
  // Display error message when context is lost
  if (hasError) {
    return (
      <group>
        <mesh position={[0, 0, -5]}>
          <planeGeometry args={[10, 2]} />
          <meshBasicMaterial color="red" transparent opacity={0.8} />
        </mesh>
      </group>
    );
  }
  
  return null;
};

// Simplified resource optimizer component - reduced logging and overhead
const ResourceOptimizer = () => {
  const { gl } = useThree();
  // Removed unused ref
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Set WebGL parameters for better stability
    try {
      gl.getContext().getExtension('WEBGL_lose_context');
    } catch (err) {
      console.warn("[ThreeJS] Could not get WebGL extension:", err);
    }
    
    // Clear any existing interval to prevent duplicates
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    // Return cleanup function without creating new interval -
    // removed continuous memory monitoring to reduce overhead
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [gl]);
  
  return null;
};

const ThreeJSComponents: React.FC<ThreeJSComponentsProps> = ({
  nodes,
  nodePositions,
  connections,
  mappedConnections,
  instancedMeshRef,
  onWebGLContextCreated,
  onWebGLError,
  isInitialChoicePhase,
  triumvirateActive,
  triumvirateNodes,
  selectedNodeId,
  hoveredNodeId,
  isMinimap,
}) => {
  // Store original positions for position synchronizer
  const originalPositions = useRef<{[key: string]: [number, number, number]}>({});

  // Update original positions when nodes or nodePositions change
  useEffect(() => {
    nodes.forEach(node => {
      const position = nodePositions[node.id] || [0, 0, 0];
      originalPositions.current[node.id] = [...position];
    });
  }, [nodes, nodePositions]);

  // Create position synchronizer for the main constellation
  const positionSynchronizer = useMemo(() => ({
    updatePositions: (time: number, isMinimap?: boolean) => {
      const currentPositions: { [key: string]: [number, number, number] } = {};
      
      nodes.forEach(node => {
        const basePos = originalPositions.current[node.id];
        if (!basePos) {
          currentPositions[node.id] = nodePositions[node.id] || [0, 0, 0];
          return;
        }

        if (!isMinimap) {
          // Main constellation with more noticeable movement
          const nx = Math.sin(basePos[0] * 0.1 + time * 0.02) * 0.01;
          const ny = Math.sin((basePos[1] + 100) * 0.1 + time * 0.02) * 0.01;
          const nz = Math.sin((basePos[2] + 200) * 0.1 + time * 0.02) * 0.01;

          const maxOffset = 0.01;
          const xOffset = Math.min(Math.abs(nx), maxOffset) * Math.sign(nx);
          const yOffset = Math.min(Math.abs(ny), maxOffset) * Math.sign(ny);
          const zOffset = Math.min(Math.abs(nz), maxOffset) * Math.sign(nz);

          currentPositions[node.id] = [
            basePos[0] + xOffset,
            basePos[1] + yOffset,
            basePos[2] + zOffset
          ];
        } else {
          currentPositions[node.id] = [...basePos];
        }
      });
      
      return currentPositions;
    },
    getCurrentPositions: () => {
      const currentPositions: { [key: string]: [number, number, number] } = {};
      nodes.forEach(node => {
        currentPositions[node.id] = originalPositions.current[node.id] || nodePositions[node.id] || [0, 0, 0];
      });
      return currentPositions;
    }
  }), [nodes, nodePositions]);

  return (
    <Canvas
      camera={{ 
        position: [0, 0, 70], // Move camera further back to push constellation away
        fov: 45, // CRITICAL FIX: Wider field of view to see more nodes
        near: 1, // CRITICAL FIX: Closer near plane
        far: 200 // CRITICAL FIX: Further far plane
      }}
      gl={{
        powerPreference: "default",
        antialias: false,
        precision: "lowp", // Use low precision to save resources and improve stability
        logarithmicDepthBuffer: false,
        stencil: false,
        alpha: true,
        preserveDrawingBuffer: true,
        failIfMajorPerformanceCaveat: false // Don't fail on low-end hardware
      }}
      onCreated={({ gl }) => {
        // Simplified logging
        console.log("[ThreeJS] WebGL context created");
        
        // Explicitly discard depth and stencil buffers to save memory
        const context = gl.getContext();
        if (context) {
          context.pixelStorei(context.UNPACK_COLORSPACE_CONVERSION_WEBGL, context.NONE);
        }

        // Notify parent component about WebGL context creation
        if (onWebGLContextCreated) {
          onWebGLContextCreated(gl);
        }
      }}
      performance={{ min: 0.5 }}
      frameloop="demand"
      dpr={[0.5, 1.0]} // Lower resolution range for better stability
    >
      {/* Enhanced lighting setup for better visual effects */}
      <color attach="background" args={[0x020209]} />
      <fog attach="fog" args={[0x020209, 30, 80]} />
      
      {/* Stars background - further optimized with reduced count and adaptive visibility */}
      <AdaptiveStars />
      
      {/* Ambient light for overall scene illumination */}
      <ambientLight intensity={0.2} />
      
      {/* Main directional light */}
      <directionalLight
        position={[10, 10, 10]}
        intensity={0.8}
        color={new Color(0xffffff)}
      />
      
      {/* Additional point lights for atmosphere */}
      <pointLight
        position={[0, 10, 0]}
        intensity={0.5}
        color={new Color(0x8866ff)}
      />
      <pointLight
        position={[-10, -10, -10]}
        intensity={0.3}
        color={new Color(0x6688ff)}
      />
      
      {/* Constellation components */}
      {/* Explicitly pass separate refs to avoid sharing ref issues */}
      <NodesInstanced
        ref={instancedMeshRef}
        nodes={nodes}
        nodePositions={nodePositions}
        connections={convertConnections(connections)}
        isInitialChoicePhase={isInitialChoicePhase}
        triumvirateActive={triumvirateActive}
        triumvirateNodes={triumvirateNodes}
        positionSynchronizer={positionSynchronizer}
      />
      <ConnectionsBatched
        // No longer passing ref here since ConnectionsBatched doesn't use it
        connections={mappedConnections}
        nodePositions={nodePositions}
        selectedNodeId={selectedNodeId}
        hoveredNodeId={hoveredNodeId}
        isMinimap={isMinimap}
        positionSynchronizer={positionSynchronizer}
      />
      
      {/* Add WebGL error handler */}
      <WebGLErrorHandler onWebGLError={onWebGLError} />
      
      {/* Add resource optimizer */}
      <ResourceOptimizer />
      
      {/* Post-processing effects - disabled for stability */}
      <OptimizedEffects />
      
      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        minDistance={50} // Increase minimum zoom distance for further back constellation
        maxDistance={120} // Increase maximum zoom distance for further back constellation
        enableZoom={true}
        zoomSpeed={0.5} // Slower zoom for better control
        enablePan={true}
        panSpeed={0.5} // Slower pan for better control
        maxPolarAngle={Math.PI} // Allow full vertical rotation
        minPolarAngle={0} // Allow full vertical rotation
      />
    </Canvas>
  );
};

// Simplified stars component with fixed parameters to reduce render overhead
const AdaptiveStars = () => {
  // Fixed star count - prevents continuous re-rendering
  const starCount = 1000;
  
  return (
    <Stars
      radius={50}
      depth={25}
      count={starCount}
      factor={3}
      saturation={0.2}
      fade
      speed={0.1} // Reduced animation speed
    />
  );
};

// Custom useRef implementation removed to avoid conflict with React's useRef

// Simplified post-processing effects - completely disabled for stability
const OptimizedEffects = () => {
  // Simply return null to disable all post-processing effects
  return null;
};

export default ThreeJSComponents;