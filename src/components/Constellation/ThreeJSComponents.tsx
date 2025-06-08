import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { NodesInstanced } from './NodesInstanced';
import ConnectionsBatched from './ConnectionsBatched';
import { InstancedMesh, Color } from 'three';
import * as THREE from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useFrame, useThree } from '@react-three/fiber';
import { useCallback, useState, useEffect, useMemo, MutableRefObject, useRef } from 'react';

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
}

// WebGL error handler component
const WebGLErrorHandler = () => {
  const { gl } = useThree();
  const [hasError, setHasError] = useState(false);
  
  useEffect(() => {
    if (!gl.domElement) return;
    
    // Handle WebGL context loss
    const handleContextLost = (event: Event) => {
      console.error("[ThreeJS] WebGL context lost", event);
      setHasError(true);
      // Prevent the default behavior which would attempt automatic recovery
      event.preventDefault();
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
  }, [gl]);
  
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

// Resource optimizer component
const ResourceOptimizer = () => {
  const { gl } = useThree();
  // Use ref to store a unique ID for this renderer instance
  const rendererIdRef = useRef(`optimizer-${Date.now()}`);
  
  useEffect(() => {
    // Track instance for debugging
    const rendererId = rendererIdRef.current;
    console.log("[ThreeJS ResourceOptimizer] Initializing for renderer:", rendererId);
    
    // Set WebGL parameters for better stability
    gl.getContext().getExtension('WEBGL_lose_context');
    
    // Lower precision to reduce memory usage
    const glContext = gl.getContext();
    const maxPrecision = glContext.getShaderPrecisionFormat(
      glContext.FRAGMENT_SHADER,
      glContext.MEDIUM_FLOAT
    );
    console.log("[ThreeJS] Using WebGL precision:", maxPrecision);
    
    // Track memory metrics over time to identify leaks
    const memoryHistory: Array<{time: number, textures: number, geometries: number}> = [];
    
    // Garbage collection hint (helps prevent memory leaks)
    const intervalId = setInterval(() => {
      if (gl && gl.info) {
        const currentMemory = {
          time: Date.now(),
          textures: gl.info.memory.textures,
          geometries: gl.info.memory.geometries
        };
        
        memoryHistory.push(currentMemory);
        // Keep last 10 records
        if (memoryHistory.length > 10) memoryHistory.shift();
        
        // Check for concerning memory growth
        if (memoryHistory.length > 5) {
          const oldestRecord = memoryHistory[0];
          const textureGrowth = currentMemory.textures - oldestRecord.textures;
          const geometryGrowth = currentMemory.geometries - oldestRecord.geometries;
          
          if (textureGrowth > 10 || geometryGrowth > 10) {
            console.warn("[ThreeJS] Possible memory leak detected:", {
              textureGrowth,
              geometryGrowth,
              elapsed: (currentMemory.time - oldestRecord.time) / 1000 + "s"
            });
          }
        }
        
        console.log("[ThreeJS] Memory usage:", gl.info.memory);
        console.log("[ThreeJS] Render calls:", gl.info.render);
        console.log("[ThreeJS] Active textures:", gl.info.memory.textures);
        console.log("[ThreeJS] Active geometries:", gl.info.memory.geometries);
      }
    }, 5000); // Log every 5 seconds
    
    // Implement proper cleanup when component unmounts
    return () => {
      console.log("[ThreeJS] Cleaning up resources for renderer:", rendererId);
      clearInterval(intervalId);
      
      try {
        // Dispose of renderer resources
        gl.dispose();
        console.log("[ThreeJS] Disposed renderer resources");
      } catch (err) {
        console.error("[ThreeJS] Error during resource cleanup:", err);
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
  onWebGLError
}) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 40], fov: 35 }} // Increased FOV for wider view
      gl={{
        powerPreference: "default", // Changed from high-performance to default for better stability
        antialias: false, // Disable antialiasing to improve performance
        precision: "mediump", // Use medium precision to save resources
        logarithmicDepthBuffer: false, // Disable for better performance
        stencil: false, // Disable stencil buffer when not needed
        alpha: true, // Enable alpha for better compositing
        preserveDrawingBuffer: true // Help with context recovery
      }}
      onCreated={({ gl }) => {
        // Generate unique ID for this renderer instance
        const rendererId = `three-renderer-${Date.now()}`;
        
        // Log detailed WebGL information
        console.log("[ThreeJS] WebGL context created", {
          rendererId,
          memory: gl.info.memory,
          programs: gl.info.programs?.length || 'unknown'
        });

        // Notify parent component about WebGL context creation
        if (onWebGLContextCreated) {
          onWebGLContextCreated(gl);
        }
        
        // Try to get more detailed GPU info
        try {
          const canvas = gl.domElement;
          const glContext = canvas.getContext('webgl');
          if (glContext) {
            const debugInfo = glContext.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              const vendor = glContext.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
              const renderer = glContext.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
              console.log("[ThreeJS] GPU details:", { vendor, renderer, rendererId });
            }
          }
        } catch (err) {
          console.warn("[ThreeJS] Could not get detailed GPU info:", err);
        }
        
        // Check current view mode to track transitions
        console.log("[ThreeJS] Checking active components when WebGL initialized");
        
        // Add context loss handling
        const canvas = gl.domElement;
        canvas.addEventListener('webglcontextlost', (event) => {
          console.error("[ThreeJS] WebGL context lost event triggered", event);
          console.error("[ThreeJS] Last memory state:", gl.info.memory);
          console.error("[ThreeJS] Renderer instance:", rendererId);
          
          // Log stack trace to identify source of context loss
          console.error("[ThreeJS] Context loss stack trace:", new Error().stack);
          
          event.preventDefault();
          if (onWebGLError) {
            onWebGLError(new Error("WebGL context lost"));
          }
        });
        
        // Auto-recovery disabled to avoid interference with NodeView
        canvas.addEventListener('webglcontextrestored', (event) => {
          console.log("[ThreeJS] WebGL context restored", event);
        });
      }}
      performance={{ min: 0.5 }} // Allow frame rate to drop to improve stability
      frameloop="demand" // Changed from "always" to demand to reduce GPU load when not animating
      dpr={[0.8, 1.5]} // Automatically adjust resolution based on device performance
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
      />
      <ConnectionsBatched
        // No longer passing ref here since ConnectionsBatched doesn't use it
        connections={mappedConnections}
        nodePositions={nodePositions}
      />
      
      {/* Add WebGL error handler */}
      <WebGLErrorHandler />
      
      {/* Add resource optimizer */}
      <ResourceOptimizer />
      
      {/* Post-processing effects - more conditionally rendered based on performance */}
      <OptimizedEffects onlyForHighEnd={true} />
      
      {/* Camera controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        minDistance={12} // Reduced min distance to allow closer view
        maxDistance={80} // Increased max distance for wider view
      />
    </Canvas>
  );
};

// Performance-optimized stars component that adapts based on device capabilities
const AdaptiveStars = () => {
  // Reference to track current frame rate
  const frameRateRef = useRef<{ value: number; samples: number[] }>({ value: 60, samples: [] });
  
  // Dynamically adjust star count based on performance
  const updateFrameRate = useCallback((fps: number) => {
    frameRateRef.current.samples.push(fps);
    
    // Keep only the last 10 samples
    if (frameRateRef.current.samples.length > 10) {
      frameRateRef.current.samples.shift();
    }
    
    // Calculate average frame rate
    const sum = frameRateRef.current.samples.reduce((a, b) => a + b, 0);
    frameRateRef.current.value = sum / frameRateRef.current.samples.length;
  }, []);
  
  // Monitor frame rate
  useFrame((state) => {
    updateFrameRate(state.clock.getDelta() * 1000);
  });
  
  // Dynamic stars based on performance
  const starCount = useMemo(() => {
    const fps = frameRateRef.current.value;
    // Reduce star count when frame rate drops
    if (fps < 30) return 1000;
    if (fps < 45) return 1500;
    return 2000;
  }, []); // No dependencies needed as we're using ref value that's updated outside of React's lifecycle
  
  return (
    <Stars
      radius={50}
      depth={25}
      count={starCount}
      factor={3}
      saturation={0.2}
      fade
      speed={0.3}
    />
  );
};

// Custom useRef implementation removed to avoid conflict with React's useRef

// Conditionally rendered post-processing effects based on device performance
const OptimizedEffects = ({ onlyForHighEnd = false }) => {
  // Use high-quality effects only on powerful devices
  const [useHighQuality, setUseHighQuality] = useState(false);
  
  // Check device capabilities on mount - with more thorough performance checking
  useEffect(() => {
    const checkPerformance = async () => {
      try {
        // Simple detection based on GPU info from WebGL context
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        
        if (!gl) {
          console.warn("[ThreeJS] WebGL not supported");
          setUseHighQuality(false);
          return;
        }
        
        // Check for high-end GPU indicators
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : '';
        console.log("[ThreeJS] GPU renderer:", renderer);
        
        // More conservative quality detection to prevent context loss
        // Only enable high quality for definitely high-end GPUs
        const isHighEnd = /(nvidia|geforce|radeon rx|amd radeon pro)/i.test(renderer) &&
                        !/(mobile|intel)/i.test(renderer);
                        
        // If onlyForHighEnd is true, disable effects for all but the highest end systems
        if (onlyForHighEnd && !isHighEnd) {
          setUseHighQuality(false);
          return;
        }
        
        setUseHighQuality(isHighEnd);
        
        // Clean up
        canvas.remove();
      } catch (err) {
        console.error("[ThreeJS] Error checking GPU performance:", err);
        setUseHighQuality(false);
      }
    };
    
    checkPerformance();
  }, [onlyForHighEnd]);
  
  return (
    // Only render effects if high quality is enabled
    // This can dramatically reduce GPU load on lower-end devices
    useHighQuality ? (
      <EffectComposer multisampling={0}>
        <Bloom
          intensity={0.4} // Reduced from 0.6
          luminanceThreshold={0.4} // Increased from 0.3
          luminanceSmoothing={0.7}
          radius={0.3} // Fixed lower value
          mipmapBlur={false} // Disabled regardless of high quality
        />
      </EffectComposer>
    ) : null
  );
};

export default ThreeJSComponents;