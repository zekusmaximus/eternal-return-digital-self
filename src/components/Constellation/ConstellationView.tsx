import { useSelector } from 'react-redux';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { selectConstellationNodes, selectConnections } from '../../store/slices/nodesSlice';
import { NodesInstanced } from './NodesInstanced';
import './ConstellationView.css';
import { useMemo, useRef } from 'react';
import ConnectionsBatched from './ConnectionsBatched';
import { InstancedMesh } from 'three';

const ConstellationView = () => {
  const nodes = useSelector(selectConstellationNodes);
  const connections = useSelector(selectConnections);
  const instancedMeshRef = useRef<InstancedMesh>(null!);

  const mappedConnections = useMemo(() => connections.map(c => ({ source: c.start, target: c.end })), [connections]);

  const nodePositions = useMemo(() => {
    const positions: { [key: string]: [number, number, number] } = {};
    nodes.forEach((node, index) => {
      const numNodes = nodes.length;
      const radius = 5;
      const phi = Math.acos(-1 + (2 * index) / numNodes);
      const theta = Math.sqrt(numNodes * Math.PI) * phi;
      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);
      positions[node.id] = [x, y, z];
    });
    return positions;
  }, [nodes]);

  return (
    <div className="constellation-container">
      <Canvas camera={{ position: [0, 0, 30], fov: 25 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <NodesInstanced ref={instancedMeshRef} nodes={nodes} nodePositions={nodePositions} connections={connections} />
        <ConnectionsBatched ref={instancedMeshRef} connections={mappedConnections} nodePositions={nodePositions} />
        <OrbitControls />
      </Canvas>
    </div>
  );
};

export default ConstellationView;