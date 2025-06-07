import React, { useMemo, useRef } from 'react';
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

const MiniConstellation: React.FC<MiniConstellationProps> = ({ currentNodeId }) => {
  const dispatch = useDispatch();
  const nodes = useSelector(selectConstellationNodes);
  const connections = useSelector(selectConnections);
  const instancedMeshRef = useRef<InstancedMesh>(null!);

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
    <div className="mini-constellation-container" style={{ width: '200px', height: '200px' }}>
      <Canvas>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} />
        <Bounds fit clip observe>
          <NodesInstanced
            ref={instancedMeshRef}
            nodes={nodes}
            nodePositions={nodePositions}
            connections={connections}
            overrideSelectedNodeId={currentNodeId}
            onNodeClick={handleNodeClick}
            clickableNodeIds={clickableNodeIds}
          />
          <ConnectionsBatched ref={instancedMeshRef} connections={mappedConnections} nodePositions={nodePositions} />
        </Bounds>
        <OrbitControls enableZoom={false} enablePan={false} />
      </Canvas>
    </div>
  );
};

export default MiniConstellation;