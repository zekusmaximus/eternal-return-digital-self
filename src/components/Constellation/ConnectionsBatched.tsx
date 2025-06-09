import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Connection, NodePositions } from '../../types';
import { useFrame } from '@react-three/fiber';

interface ConnectionsBatchedProps {
  connections: Connection[];
  nodePositions: NodePositions;
  selectedNodeId?: string | null;
  hoveredNodeId?: string | null;
  positionSynchronizer: {
    updatePositions: (time: number, isMinimap?: boolean) => { [key: string]: [number, number, number] };
    getCurrentPositions: () => { [key: string]: [number, number, number] };
  };
  isMinimap?: boolean;
}

// --- Reusable utility objects to prevent reallocation in the render loop ---
const baseColor = new THREE.Color();
const pulseColor = new THREE.Color();

export const ConnectionsBatched: React.FC<ConnectionsBatchedProps> = (props) => {
    const { connections, nodePositions, selectedNodeId, hoveredNodeId, positionSynchronizer, isMinimap } = props;

    const lineSegmentsRef = useRef<THREE.LineSegments>(null!);
    const geometryRef = useRef<THREE.BufferGeometry>(null!);

    // This effect sets up the geometry and its attributes once.
    useEffect(() => {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(connections.length * 2 * 3);
        const colors = new Float32Array(connections.length * 2 * 3);

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        
        if (lineSegmentsRef.current) {
            lineSegmentsRef.current.geometry = geometry;
        }
        geometryRef.current = geometry;

        return () => {
            geometry.dispose();
        }
    }, [connections.length]);

    useFrame((state) => {
        if (!geometryRef.current) return;

        const positionAttribute = geometryRef.current.attributes.position as THREE.BufferAttribute;
        const colorAttribute = geometryRef.current.attributes.color as THREE.BufferAttribute;
        
        // Use dynamic positions for the main view, and static for the minimap
        const currentPositions = isMinimap ? nodePositions : positionSynchronizer.updatePositions(state.clock.elapsedTime);

        for (let i = 0; i < connections.length; i++) {
            const connection = connections[i];
            const startPos = currentPositions[connection.source];
            const endPos = currentPositions[connection.target];

            if (startPos && endPos) {
                positionAttribute.setXYZ(i * 2, startPos[0], startPos[1], startPos[2]);
                positionAttribute.setXYZ(i * 2 + 1, endPos[0], endPos[1], endPos[2]);
            }

            const isSelected = selectedNodeId === connection.source || selectedNodeId === connection.target;
            const isHovered = hoveredNodeId === connection.source || hoveredNodeId === connection.target;
            const isAvailable = !isSelected && !isHovered && selectedNodeId && (connection.source === selectedNodeId || connection.target === selectedNodeId);

            let finalColor;

            if (isSelected) {
                finalColor = baseColor.set(0x00bfff);
            } else if (isHovered) {
                finalColor = baseColor.set(0x88ccff);
            } else if (isAvailable) {
                const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 5);
                finalColor = pulseColor.set(0x4488ff).lerp(baseColor.set(0xffffff), pulse);
            } else {
                finalColor = baseColor.set(0xffffff); // Default to white
            }
            
            colorAttribute.setXYZ(i * 2, finalColor.r, finalColor.g, finalColor.b);
            colorAttribute.setXYZ(i * 2 + 1, finalColor.r, finalColor.g, finalColor.b);
        }

        positionAttribute.needsUpdate = true;
        // Always update colors for simplicity, as the available check is complex
        colorAttribute.needsUpdate = true;
    });

    return (
        <lineSegments ref={lineSegmentsRef}>
            {/* The geometry is created and managed in the useEffect/useFrame hooks */}
            <lineBasicMaterial vertexColors={true} toneMapped={false} fog={false} />
        </lineSegments>
    );
};
