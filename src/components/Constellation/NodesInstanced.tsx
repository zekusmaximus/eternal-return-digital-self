import { useDispatch, useSelector } from 'react-redux';
import {
  nodeHovered,
  nodeUnhovered,
  selectHoveredNodeId,
  selectSelectedNodeId,
  nodeSelected,
} from '../../store/slices/interfaceSlice';
import { navigateToNode } from '../../store/slices/readerSlice';
import { visitNode } from '../../store/slices/nodesSlice';
import { AppDispatch } from '../../store';
import { ConstellationNode, NodePositions } from '../../types';
import { forwardRef, useCallback, useEffect, useMemo } from 'react';
import { InstancedMesh as InstancedMeshImpl, Matrix4, Color, Vector3, Quaternion, InstancedMesh } from 'three';
import { ThreeEvent, useFrame } from '@react-three/fiber';
import { Instances, Instance } from '@react-three/drei';

interface NodesInstancedProps {
  nodes: ConstellationNode[];
  nodePositions: NodePositions;
  connections: { start: string; end: string }[];
  overrideSelectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  clickableNodeIds?: string[];
}

const tempMatrix = new Matrix4();
const tempColor = new Color();
const tempVec = new Vector3();
const tempScale = new Vector3();
const tempQuat = new Quaternion();

// Define base colors for each triad
const triadColors = {
  LastHuman: new Color('#ff6666'), // Reddish
  Archaeologist: new Color('#66ff66'), // Greenish
  Algorithm: new Color('#6666ff'), // Bluish
};

export const NodesInstanced = forwardRef<InstancedMesh, NodesInstancedProps>(({
  nodes,
  nodePositions,
  connections,
  overrideSelectedNodeId,
  onNodeClick,
  clickableNodeIds,
}, ref) => {
  const dispatch = useDispatch<AppDispatch>();
  const meshRef = ref as React.MutableRefObject<InstancedMeshImpl>;

  const hoveredNodeId = useSelector(selectHoveredNodeId);
  const reduxSelectedNodeId = useSelector(selectSelectedNodeId);
  const selectedNodeId = overrideSelectedNodeId ?? reduxSelectedNodeId;

  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    connections.forEach((c) => {
      if (c.start === selectedNodeId) connected.add(c.end);
      if (c.end === selectedNodeId) connected.add(c.start);
    });
    return connected;
  }, [selectedNodeId, connections]);

  useFrame((state) => {
    if (!meshRef.current) return;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const position = nodePositions[node.id];
      if (!position) continue;

      const isSelected = selectedNodeId === node.id;
      const isConnected = connectedNodeIds.has(node.id);
      const isHovered = hoveredNodeId === node.id;

      // Hierarchical Color Logic
      const baseColor = triadColors[node.character];
      if (isSelected) {
        tempColor.copy(baseColor).multiplyScalar(1.5); // Lighter shade
      } else if (isConnected) {
        tempColor.copy(baseColor).multiplyScalar(0.5); // Darker shade
      } else if (isHovered) {
        tempColor.copy(baseColor).multiplyScalar(1.2); // Slightly lighter for hover
      } else {
        tempColor.copy(baseColor); // Standard base color
      }
      meshRef.current.setColorAt(i, tempColor);

      // Matrix / Position / Scale logic
      meshRef.current.getMatrixAt(i, tempMatrix);
      tempMatrix.decompose(tempVec, tempQuat, tempScale); // Decompose to get current scale

      const targetScale = isSelected ? 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1 : 1;
      tempScale.lerp(new Vector3(targetScale, targetScale, targetScale), 0.1); // Smooth transition

      tempMatrix.compose(new Vector3(...position), tempQuat, tempScale);
      meshRef.current.setMatrixAt(i, tempMatrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  });

  useEffect(() => {
    // This effect now only runs once to set initial positions
    if (meshRef.current && nodes.length > 0) {
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const position = nodePositions[node.id];
        if (position) {
          tempMatrix.setPosition(position[0], position[1], position[2]);
          meshRef.current.setMatrixAt(i, tempMatrix);
        }
      }
      meshRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [nodes, nodePositions, meshRef]); // Simplified dependencies

  const handlePointerMove = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      if (event.instanceId !== undefined) {
        const nodeId = nodes[event.instanceId]?.id;
        if (nodeId && nodeId !== hoveredNodeId) {
          dispatch(nodeHovered(nodeId));
        }
      }
    },
    [dispatch, nodes, hoveredNodeId]
  );

  const handlePointerOut = useCallback(
    (event: ThreeEvent<PointerEvent>) => {
      event.stopPropagation();
      dispatch(nodeUnhovered());
    },
    [dispatch]
  );

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      if (event.instanceId !== undefined) {
        const clickedNodeId = nodes[event.instanceId]?.id;
        if (clickedNodeId) {
          if (onNodeClick) {
            if (clickableNodeIds && !clickableNodeIds.includes(clickedNodeId)) {
              return;
            }
            onNodeClick(clickedNodeId);
          } else {
            if (selectedNodeId === null) {
              dispatch(nodeSelected(clickedNodeId));
              dispatch(visitNode(clickedNodeId));
              dispatch(navigateToNode(clickedNodeId));
              return;
            }

            const isConnected = connections.some(
              (c) =>
                (c.start === selectedNodeId && c.end === clickedNodeId) ||
                (c.start === clickedNodeId && c.end === selectedNodeId)
            );

            if (isConnected) {
              dispatch(nodeSelected(clickedNodeId));
              dispatch(visitNode(clickedNodeId));
              dispatch(navigateToNode(clickedNodeId));
            }
          }
        }
      }
    },
    [dispatch, nodes, selectedNodeId, connections, onNodeClick, clickableNodeIds]
  );

  return (
    <Instances
      limit={nodes.length}
      ref={meshRef as React.MutableRefObject<InstancedMeshImpl>}
      onClick={handleClick}
      onPointerMove={handlePointerMove}
      onPointerOut={handlePointerOut}
    >
      <sphereGeometry args={[0.5, 32, 32]} />
      <meshStandardMaterial />
      {nodes.map((node) => {
        const position = nodePositions[node.id] || [0, 0, 0];
        return <Instance key={node.id} position={position} />;
      })}
    </Instances>
  );
});