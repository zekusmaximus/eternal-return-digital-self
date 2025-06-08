import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { nodeSelected } from '../../store/slices/interfaceSlice';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Bounds } from '@react-three/drei';
import { NodesInstanced } from '../Constellation/NodesInstanced';
import ConnectionsBatched from '../Constellation/ConnectionsBatched';
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
      // Reduced radius to ensure nodes fit better in circle
      const radius = 4;
      
      // Using a Fibonacci sphere pattern for more evenly distributed points
      const offset = 2.0 / numNodes;
      const increment = Math.PI * (3.0 - Math.sqrt(5.0));
      
      // Calculate position on sphere using fibonacci distribution
      const y = ((index * offset) - 1) + (offset / 2);
      const r = Math.sqrt(1 - y * y);
      const phi = index * increment;
      
      // Keep nodes in a planar arrangement for better visibility in small circle
      const x = Math.cos(phi) * r * radius;
      const z = Math.sin(phi) * r * radius;
      // Slightly flatten the Y dimension to fit better in circle
      positions[node.id] = [x, y * radius * 0.5, z];
    });
    return positions;
  }, [nodes]);

  return (
    <div
      ref={containerRef}
      className="mini-constellation-container"
      style={{
        width: '120px',
        height: '120px',
        overflow: 'hidden',
        position: 'relative',
        borderRadius: '50%', // Make it circular for better containment
        cursor: isInteracting ? 'grabbing' : 'grab', // Show grab cursor to indicate draggability
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        transition: 'box-shadow 0.3s ease'
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
        frameloop="demand"  // Only render when needed to reduce jitter
        camera={{
          position: [0, 0, 12], // Moved camera closer for better interaction
          fov: 25,              // Wider field of view for better visibility
          near: 0.1,
          far: 100
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
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Bounds fit clip observe scale={0.65}> {/* Reduced scale to ensure nodes fit inside circle */}
          <NodesInstanced
            ref={instancedMeshRef}
            nodes={nodes}
            nodePositions={nodePositions}
            connections={connections}
            overrideSelectedNodeId={currentNodeId}
            onNodeClick={handleNodeClick}
            clickableNodeIds={clickableNodeIds}
            isMinimap={true}
          />
          <ConnectionsBatched ref={instancedMeshRef} connections={mappedConnections} nodePositions={nodePositions} />
        </Bounds>
        
        {/* Simple optimized rotation controls */}
        <group>
          <OrbitControls
            enableZoom={false}
            enablePan={false}
            rotateSpeed={0.8}             // Higher speed for better responsiveness
            enableDamping={true}
            dampingFactor={0.4}           // Lower damping for more direct control
            
            // Lock rotation to horizontal only
            minPolarAngle={Math.PI / 2}   // 90 degrees - equator plane
            maxPolarAngle={Math.PI / 2}   // 90 degrees - equator plane
            
            // Allow full rotation around Y axis
            minAzimuthAngle={-Infinity}
            maxAzimuthAngle={Infinity}
            
            // No auto-rotation
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