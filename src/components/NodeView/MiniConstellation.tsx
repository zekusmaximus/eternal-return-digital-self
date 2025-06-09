import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { nodeSelected } from '../../store/slices/interfaceSlice';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';
import { NodesInstanced } from '../Constellation/NodesInstanced';
import { ConnectionsBatched } from '../Constellation/ConnectionsBatched';
import { InstancedMesh } from 'three';

interface MiniConstellationProps {
  currentNodeId: string;
}

// Unique ID for this component instance to prevent context collisions
const MiniConstellation: React.FC<MiniConstellationProps> = ({ currentNodeId }) => {
  const dispatch = useDispatch();
  const nodes = useSelector(selectConstellationNodes);
  const connections = useSelector(selectConnections);
  const instancedMeshRef = useRef<InstancedMesh>(null!);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInteracting, setIsInteracting] = useState(false);
  const canvasId = useMemo(() => `mini-constellation-canvas-${Date.now()}`, []);

  // Clear any existing WebGL contexts when unmounting to prevent conflicts
  useEffect(() => {
    return () => {
      try {
        // Clean up function runs on unmount
        const canvas = document.getElementById(canvasId);
        if (canvas && canvas instanceof HTMLCanvasElement) {
          // Force WebGL context release
          const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
          if (gl) {
            gl.getExtension('WEBGL_lose_context')?.loseContext();
          }
        }
      } catch (error) {
        console.warn('Error cleaning up WebGL context:', error);
      }
    };
  }, [canvasId]);

  const mappedConnections = useMemo(() => connections.map(c => ({ source: c.start, target: c.end })), [connections]);
  const clickableNodeIds = useMemo(() => {
    const connectedIds = new Set<string>();
    connections.forEach(conn => {
      if (conn.start === currentNodeId) {
        connectedIds.add(conn.end);
      } else if (conn.end === currentNodeId) {
        connectedIds.add(conn.start);
      }
    });
    return Array.from(connectedIds);
  }, [connections, currentNodeId]);

  const handleNodeClick = (nodeId: string) => {
    dispatch(nodeSelected(nodeId));
  };

  const nodePositions = useMemo(() => {
    const positions: { [key: string]: [number, number, number] } = {};
    nodes.forEach((node, index) => {
      const numNodes = nodes.length;
      // Optimized radius for the container size
      const radius = 4.5;
      
      // Using a circular arrangement for better visibility in small space
      const angle = (index / numNodes) * Math.PI * 2;
      
      // Calculate position in a mostly flat circle
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      // Minimal vertical variation to keep nodes visible
      const y = Math.sin(angle * 2) * (radius * 0.1); // Very slight vertical variation
      
      positions[node.id] = [x, y, z];
    });
    return positions;
  }, [nodes]);

  // Create position synchronizer for MiniConstellation
  const positionSynchronizer = useMemo(() => ({
    updatePositions: (_time: number, isMinimap?: boolean) => {
      // For minimap, return fixed positions without any movement
      if (isMinimap) {
        return nodePositions;
      }
      // For main view, this wouldn't be used in MiniConstellation
      return nodePositions;
    },
    getCurrentPositions: () => nodePositions
  }), [nodePositions]);

  return (
    <div
      ref={containerRef}
      className="mini-constellation-container"
      style={{
        width: '160px',  // Slightly larger for better visibility
        height: '160px', // Slightly larger for better visibility
        overflow: 'hidden',
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        borderRadius: '50%',
        cursor: isInteracting ? 'grabbing' : 'grab',
        transition: 'transform 0.3s ease',
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        backgroundColor: 'rgba(0,0,0,0.3)',
        border: '2px solid rgba(255,255,255,0.2)',
        zIndex: 1000, // Ensure it's above other elements
        pointerEvents: 'auto' // Ensure pointer events work
      }}
      // Add separate onMouseEnter/onMouseLeave for hover effects
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = '0 0 15px rgba(255,255,255,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = '0 0 10px rgba(0,0,0,0.3)';
        setIsInteracting(false);
      }}
    >
      <Canvas
        id={canvasId}
        frameloop="always"  // Always render for smooth interaction
        camera={{
          position: [0, 0, 12], // Pull camera back further for complete view
          fov: 45,              // Balanced field of view
          near: 0.1,
          far: 100,
          zoom: 1.0             // Reset zoom to default
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'default',  // Switched to default for better compatibility
          preserveDrawingBuffer: true  // Needed for stable WebGL context
        }}
        dpr={[1, 2]} // Limit pixel ratio to prevent performance issues
        performance={{ min: 0.5 }} // Allow reducing quality for better performance
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        <pointLight position={[-10, -10, 10]} intensity={0.5} />
        <Bounds fit clip observe scale={0.7}> {/* Even smaller scale to ensure all nodes are visible */}
          <NodesInstanced
            ref={instancedMeshRef}
            nodes={nodes}
            nodePositions={nodePositions}
            connections={connections}
            overrideSelectedNodeId={currentNodeId}
            onNodeClick={handleNodeClick}
            clickableNodeIds={clickableNodeIds}
            isMinimap={true}
            isInitialChoicePhase={false}
            positionSynchronizer={positionSynchronizer}
          />
          <ConnectionsBatched 
            ref={instancedMeshRef} 
            connections={mappedConnections} 
            nodePositions={nodePositions}
            positionSynchronizer={positionSynchronizer}
          />
        </Bounds>
        
        {/* Simple optimized rotation controls */}
        <group>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.8}             // Moderate speed for good control
            enableDamping={true}
            dampingFactor={0.3}           // Less damping for more responsive feel
            
            // Allow reasonable vertical rotation
            minPolarAngle={Math.PI / 4}   // 45 degrees from top
            maxPolarAngle={Math.PI * 3/4} // 45 degrees from bottom
            
            // Allow full rotation around Y axis
            minAzimuthAngle={-Infinity}
            maxAzimuthAngle={Infinity}
            
            // Disable auto-rotation to allow manual control
            autoRotate={false}
            
            // Update interaction state for cursor feedback
            onStart={() => setIsInteracting(true)}
            onEnd={() => setIsInteracting(false)}
            
            // Make sure target is centered
            target={[0, 0, 0]}
            makeDefault
          />
        </group>
      </Canvas>
    </div>
  );
};

export default MiniConstellation;
