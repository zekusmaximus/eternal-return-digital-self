import { useSelector } from 'react-redux';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars } from '@react-three/drei';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { NodesInstanced } from './NodesInstanced';
import './ConstellationView.css';
import { useMemo, useRef } from 'react';
import ConnectionsBatched from './ConnectionsBatched';
import { InstancedMesh, Color } from 'three';
import { EffectComposer, Bloom } from '@react-three/postprocessing';

const ConstellationView = () => {
  const nodes = useSelector(selectConstellationNodes);
  const connections = useSelector(selectConnections);
  const instancedMeshRef = useRef<InstancedMesh>(null!);

  const mappedConnections = useMemo(() => connections.map(c => ({ source: c.start, target: c.end })), [connections]);

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
      console.log(`Node ${index} (${node.id}) position:`, [x, y * radius, z]);
    });
    
    return positions;
  }, [nodes]);

  return (
    <div className="constellation-container">
      <Canvas
        camera={{ position: [0, 0, 40], fov: 30 }}
        gl={{
          powerPreference: "high-performance",
          antialias: false, // Disable antialiasing to improve performance
          precision: "mediump" // Use medium precision to save resources
        }}
        performance={{ min: 0.5 }} // Allow frame rate to drop to improve stability
      >
        {/* Enhanced lighting setup for better visual effects */}
        <color attach="background" args={[0x020209]} />
        <fog attach="fog" args={[0x020209, 30, 80]} />
        
        {/* Stars background - optimized to prevent Box3 errors */}
        <Stars
          radius={50}
          depth={25}
          count={2500}
          factor={3}
          saturation={0.2}
          fade
          speed={0.3}
        />
        
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
          connections={connections}
        />
        <ConnectionsBatched
          // No longer passing ref here since ConnectionsBatched doesn't use it
          connections={mappedConnections}
          nodePositions={nodePositions}
        />
        
        {/* Post-processing effects - optimized for performance */}
        <EffectComposer multisampling={0}>
          <Bloom
            intensity={0.6}
            luminanceThreshold={0.3}
            luminanceSmoothing={0.7}
            radius={0.5}
            mipmapBlur={true}
          />
        </EffectComposer>
        
        {/* Camera controls */}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          minDistance={15}
          maxDistance={70}
        />
      </Canvas>
    </div>
  );
};

export default ConstellationView;