import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BufferGeometry, InstancedMesh } from 'three';
import { useAppSelector } from '../../store/hooks';
import { Connection, NodePositions } from '../../types';
import { useFrame } from '@react-three/fiber';
import { selectConstellationNodes } from '../../store/slices/nodesSlice';

interface ConnectionsBatchedProps {
  connections: Connection[];
  nodePositions: NodePositions;
}

const tempVecStart = new THREE.Vector3();
const tempVecEnd = new THREE.Vector3();
const tempMatrix = new THREE.Matrix4();

const ConnectionsBatched = forwardRef<InstancedMesh, ConnectionsBatchedProps>(({ connections, nodePositions }, ref) => {
  const lineSegmentsRef = useRef<THREE.LineSegments>(null!);
  const geometryRef = useRef<BufferGeometry>(null!);
  const selectedNodeId = useAppSelector((state) => state.interface.selectedNodeId);
  const nodes = useAppSelector(selectConstellationNodes);
  const instancedMeshRef = ref as React.MutableRefObject<InstancedMesh>;

  const nodeIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    nodes.forEach((node, i) => map.set(node.id, i));
    return map;
  }, [nodes]);

  const { positions, colors, lineCount } = useMemo(() => {
    const positions = new Float32Array(connections.length * 2 * 3);
    const colors = new Float32Array(connections.length * 2 * 3);
    let lineCount = 0;

    for (const connection of connections) {
      const startNodePos = nodePositions[connection.source];
      const endNodePos = nodePositions[connection.target];

      if (startNodePos && endNodePos) {
        positions.set(startNodePos, lineCount * 6);
        positions.set(endNodePos, lineCount * 6 + 3);

        const isSelected = selectedNodeId === connection.source || selectedNodeId === connection.target;
        const color = isSelected ? new THREE.Color(0x00bfff) : new THREE.Color(0x444444);
        colors.set([color.r, color.g, color.b], lineCount * 6);
        colors.set([color.r, color.g, color.b], lineCount * 6 + 3);

        lineCount++;
      }
    }
    return { positions, colors, lineCount };
  }, [connections, nodePositions, selectedNodeId]);

  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setDrawRange(0, lineCount * 2);

    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }, [positions, colors, lineCount]);

  useFrame(() => {
    if (!instancedMeshRef.current || !geometryRef.current) return;

    const positionAttribute = geometryRef.current.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < connections.length; i++) {
      const connection = connections[i];
      const startIndex = nodeIndexMap.get(connection.source);
      const endIndex = nodeIndexMap.get(connection.target);

      if (startIndex !== undefined && endIndex !== undefined) {
        instancedMeshRef.current.getMatrixAt(startIndex, tempMatrix);
        tempVecStart.setFromMatrixPosition(tempMatrix);
        positionAttribute.setXYZ(i * 2, tempVecStart.x, tempVecStart.y, tempVecStart.z);

        instancedMeshRef.current.getMatrixAt(endIndex, tempMatrix);
        tempVecEnd.setFromMatrixPosition(tempMatrix);
        positionAttribute.setXYZ(i * 2 + 1, tempVecEnd.x, tempVecEnd.y, tempVecEnd.z);
      }
    }
    positionAttribute.needsUpdate = true;
  });

  return (
    <lineSegments ref={lineSegmentsRef} frustumCulled={false}>
      <bufferGeometry ref={geometryRef} />
      <lineBasicMaterial vertexColors toneMapped={false} />
    </lineSegments>
  );
});

export default ConnectionsBatched;