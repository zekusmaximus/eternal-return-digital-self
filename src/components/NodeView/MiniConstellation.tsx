import { useMemo, useRef, useState, useEffect, forwardRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { nodeSelected, selectSelectedNodeId } from '../../store/slices/interfaceSlice';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { NodesInstanced } from '../Constellation/NodesInstanced';
import { ConnectionsBatched } from '../Constellation/ConnectionsBatched';
import { InstancedMesh } from 'three';

// No props are needed, so we can remove the interface.
// No props are needed for this component.
// Unique ID for this component instance to prevent context collisions
const MiniConstellation = forwardRef<HTMLDivElement, Record<string, never>>((_props, ref) => {
  const dispatch = useDispatch();
  const nodes = useSelector(selectConstellationNodes);
  const selectedNodeId = useSelector(selectSelectedNodeId);
  const connections = useSelector(selectConnections);
  const instancedMeshRef = useRef<InstancedMesh>(null!);
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
    if (selectedNodeId) {
      connections.forEach(conn => {
        if (conn.start === selectedNodeId) {
          connectedIds.add(conn.end);
        } else if (conn.end === selectedNodeId) {
          connectedIds.add(conn.start);
        }
      });
    }
    return Array.from(connectedIds);
  }, [connections, selectedNodeId]);

  const handleNodeClick = (nodeId: string) => {
    dispatch(nodeSelected(nodeId));
  };

  const nodePositions = useMemo(() => {
    const positions: { [key: string]: [number, number, number] } = {};
    
    // Use the same Fibonacci sphere algorithm as the main constellation
    nodes.forEach((node, index) => {
      const numNodes = nodes.length;
      // Use smaller radius for minimap
      const radius = 3.0;
      
      // Fibonacci sphere algorithm (same as ConstellationView)
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
      ref={ref}
      className="mini-constellation-container"
      style={{
        width: '100%',
        height: '100%',
        borderRadius: '8px',
        cursor: isInteracting ? 'grabbing' : 'grab',
        boxShadow: '0 0 10px rgba(0,0,0,0.3)',
        backgroundColor: 'rgba(0,0,0,0.1)',
        border: '1px solid rgba(255,255,255,0.2)',
        zIndex: 1000,
        pointerEvents: 'auto',
        padding: 0,
        margin: 0,
        overflow: 'hidden',
        position: 'relative'
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
        frameloop="always"
        style={{ 
          width: '100%', 
          height: '100%',
          cursor: 'grab',
          touchAction: 'none'
        }}
        camera={{
          position: [0, 0, 8],
          fov: 35,
          near: 0.1,
          far: 100
        }}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference: 'default',
          preserveDrawingBuffer: true
        }}
        dpr={[1, 2]} // Limit pixel ratio to prevent performance issues
        performance={{ min: 0.5 }} // Allow reducing quality for better performance
      >
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1.0} />
        <pointLight position={[-10, -10, 10]} intensity={0.5} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          rotateSpeed={1.5}
          enableDamping={true}
          dampingFactor={0.1}
          minPolarAngle={0}
          maxPolarAngle={Math.PI}
          onStart={() => setIsInteracting(true)}
          onEnd={() => setIsInteracting(false)}
          target={[0, 0, 0]}
        />
        
        <group scale={[0.6, 0.6, 0.6]}>
          <NodesInstanced
            ref={instancedMeshRef}
            nodes={nodes}
            nodePositions={nodePositions}
            connections={connections}
            overrideSelectedNodeId={selectedNodeId ?? undefined}
            onNodeClick={handleNodeClick}
            clickableNodeIds={clickableNodeIds}
            isMinimap={true}
            isInitialChoicePhase={false}
            positionSynchronizer={positionSynchronizer}
          />
          <ConnectionsBatched
            connections={mappedConnections}
            nodePositions={nodePositions}
            selectedNodeId={selectedNodeId}
            hoveredNodeId={null}
            positionSynchronizer={positionSynchronizer}
            isMinimap={true}
          />
        </group>
      </Canvas>
    </div>
  );
});

export default MiniConstellation;
