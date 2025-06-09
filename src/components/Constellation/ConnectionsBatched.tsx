import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BufferGeometry, InstancedMesh, DoubleSide } from 'three';
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
}

// Connection line shader code for thick white lines with pulsing colors for available
const connectionVertexShader = `
  uniform float time;
  varying vec3 vColor;
  varying float vPosition;
  
  void main() {
    vColor = color;
    vPosition = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const connectionFragmentShader = `
  uniform float time;
  varying vec3 vColor;
  varying float vPosition;
  
  void main() {
    // Detect available connections (medium blue color range)
    bool isAvailable = vColor.r > 0.2 && vColor.r < 0.3 && vColor.g > 0.5 && vColor.b > 0.9;
    
    vec3 finalColor;
    
    if (isAvailable) {
      // Available connections: thick pulsing colors
      float pulse = sin(time * 3.0) * 0.4 + 0.6; // Pulsing between 0.2 and 1.0
      
      // Cycle through bright colors
      float colorCycle = time * 2.0;
      vec3 color1 = vec3(0.0, 0.8, 1.0); // Bright cyan
      vec3 color2 = vec3(0.2, 1.0, 0.2); // Bright green  
      vec3 color3 = vec3(1.0, 0.4, 0.8); // Bright pink
      
      float phase = mod(colorCycle, 3.0);
      if (phase < 1.0) {
        finalColor = mix(color1, color2, phase);
      } else if (phase < 2.0) {
        finalColor = mix(color2, color3, phase - 1.0);
      } else {
        finalColor = mix(color3, color1, phase - 2.0);
      }
      
      finalColor *= pulse * 1.5; // Apply pulsing and boost brightness
    } else {
      // Default connections: thick white lines
      finalColor = vec3(1.0, 1.0, 1.0); // Pure white
    }
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Using forwardRef for API compatibility
export const ConnectionsBatched = forwardRef<InstancedMesh, ConnectionsBatchedProps>(
  (props, ref) => {
  const { connections, nodePositions, selectedNodeId, hoveredNodeId, positionSynchronizer } = props;
  
  // We use our own lineSegmentsRef since we're actually using LineSegments, not InstancedMesh
  const lineSegmentsRef = useRef<THREE.LineSegments>(null!);
  
  // Acknowledge forwarded ref with null - we don't actually use an InstancedMesh
  React.useImperativeHandle(ref, () => null!);
  const geometryRef = useRef<BufferGeometry>(null!);
  
  // Create a reference for the custom shader material
  const connectionMaterialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, lineCount } = useMemo(() => {
    const positions = new Float32Array(connections.length * 2 * 3);
    const colors = new Float32Array(connections.length * 2 * 3);
    let lineCount = 0;

    for (const connection of connections) {
      const startNodePos = nodePositions[connection.source];
      const endNodePos = nodePositions[connection.target];

      if (startNodePos && endNodePos) {
        // Calculate direction vector from source to target node
        const directionVector = new THREE.Vector3(
          endNodePos[0] - startNodePos[0],
          endNodePos[1] - startNodePos[1],
          endNodePos[2] - startNodePos[2]
        ).normalize();
        
        // Define node radius (matching sphere geometry radius in NodesInstanced.tsx)
        const nodeRadius = 0.5;
        
        // Adjust connection endpoints to node boundaries instead of centers
        const adjustedStartPos = [
          startNodePos[0] + directionVector.x * nodeRadius,
          startNodePos[1] + directionVector.y * nodeRadius,
          startNodePos[2] + directionVector.z * nodeRadius
        ];
        
        const adjustedEndPos = [
          endNodePos[0] - directionVector.x * nodeRadius,
          endNodePos[1] - directionVector.y * nodeRadius,
          endNodePos[2] - directionVector.z * nodeRadius
        ];
        
        // Use the adjusted positions for connections
        positions.set(adjustedStartPos, lineCount * 6);
        positions.set(adjustedEndPos, lineCount * 6 + 3);

        // Access values from props directly
        const isSelected = selectedNodeId === connection.source || selectedNodeId === connection.target;
        const isHovered = hoveredNodeId === connection.source || hoveredNodeId === connection.target;
        
        // Enhanced color logic with available state
        let color;
        if (isSelected) {
          color = new THREE.Color(0x00bfff); // Bright blue for selected
        } else if (isHovered) {
          color = new THREE.Color(0x88ccff); // Light blue for hovered
        } else if (selectedNodeId && (connection.source === selectedNodeId || connection.target === selectedNodeId)) {
          color = new THREE.Color(0x4488ff); // Medium blue for available connections
        } else {
          color = new THREE.Color(0x666666); // Lighter gray for default
        }
        
        colors.set([color.r, color.g, color.b], lineCount * 6);
        colors.set([color.r, color.g, color.b], lineCount * 6 + 3);

        lineCount++;
      }
    }
    return { positions, colors, lineCount };
  }, [connections, nodePositions, selectedNodeId, hoveredNodeId]); // Add missing dependencies

  // Memoize geometry initialization to prevent unnecessary updates
  useEffect(() => {
    const geometry = geometryRef.current;
    if (!geometry) return;

    // Only initialize if attributes don't exist or have different lengths
    const currentPositions = geometry.attributes.position?.array;
    const currentColors = geometry.attributes.color?.array;
    
    if (!currentPositions || 
        !currentColors || 
        currentPositions.length !== positions.length || 
        currentColors.length !== colors.length) {
      
      try {
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setDrawRange(0, lineCount * 2);
      } catch (error) {
        console.error("Error initializing geometry attributes:", error);
      }
    }

    // Always update the data
    const positionAttribute = geometry.attributes.position as THREE.Float32BufferAttribute;
    const colorAttribute = geometry.attributes.color as THREE.Float32BufferAttribute;
    
    if (positionAttribute && colorAttribute) {
      positionAttribute.array.set(positions);
      colorAttribute.array.set(colors);
      positionAttribute.needsUpdate = true;
      colorAttribute.needsUpdate = true;
    }
  }, [positions, colors, lineCount]);

  // Time tracking for synchronized updates
  const lastUpdateTime = useRef(0);
  const UPDATE_INTERVAL = 0.15; // 150ms in seconds - matching NodesInstanced

  useFrame((state) => {
    const currentTime = state.clock.elapsedTime;
    const timeSinceLastUpdate = currentTime - lastUpdateTime.current;
    
    // Skip if refs are not ready
    if (!geometryRef.current || !geometryRef.current.attributes.position || !geometryRef.current.attributes.color) {
      return;
    }
    
    // Update shader time uniform
    if (connectionMaterialRef.current) {
      connectionMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    
    // Get synchronized positions from the synchronizer
    const syncedPositions = positionSynchronizer.updatePositions(currentTime);
    
    // CRITICAL SYNC FIX: Update positions and colors at synchronized intervals
    const shouldUpdatePositions = timeSinceLastUpdate >= UPDATE_INTERVAL;
    const shouldUpdateColors = timeSinceLastUpdate >= UPDATE_INTERVAL / 3; // Update colors more frequently
    
    // Track last update time for position updates
    if (shouldUpdatePositions) {
      lastUpdateTime.current = currentTime;
    }
    
    try {
      const positionAttribute = geometryRef.current.attributes.position as THREE.BufferAttribute;
      const colorAttribute = geometryRef.current.attributes.color as THREE.BufferAttribute;
      
      let positionsUpdated = false;
      let colorsUpdated = false;
      
      // Use synchronized positions from the position synchronizer
      for (let i = 0; i < connections.length; i++) {
        const connection = connections[i];
        
        // Get synchronized positions for both nodes
        const startPos = syncedPositions[connection.source];
        const endPos = syncedPositions[connection.target];
        
        if (!startPos || !endPos) {
          console.warn(`ConnectionsBatched: Missing synchronized position for connection ${connection.source} -> ${connection.target}`);
          continue;
        }
        
        // Calculate direction vector
        const directionVector = new THREE.Vector3(
          endPos[0] - startPos[0],
          endPos[1] - startPos[1],
          endPos[2] - startPos[2]
        ).normalize();
        
        // Define node radius (matching NodesInstanced sphere radius)
        const nodeRadius = 0.5;
        
        // Adjust connection endpoints to node boundaries
        const adjustedStartPos = new THREE.Vector3(
          startPos[0] + directionVector.x * nodeRadius,
          startPos[1] + directionVector.y * nodeRadius,
          startPos[2] + directionVector.z * nodeRadius
        );
        
        const adjustedEndPos = new THREE.Vector3(
          endPos[0] - directionVector.x * nodeRadius,
          endPos[1] - directionVector.y * nodeRadius,
          endPos[2] - directionVector.z * nodeRadius
        );
        
        if (shouldUpdatePositions) {
          positionAttribute.setXYZ(i * 2, adjustedStartPos.x, adjustedStartPos.y, adjustedStartPos.z);
          positionAttribute.setXYZ(i * 2 + 1, adjustedEndPos.x, adjustedEndPos.y, adjustedEndPos.z);
          positionsUpdated = true;
        }
        
        // Check if this connection needs color update
        const isSelected = selectedNodeId === connection.source || selectedNodeId === connection.target;
        const isHovered = hoveredNodeId === connection.source || hoveredNodeId === connection.target;
        
        // Track if this is a high-priority connection that needs immediate updates
        const isHighPriorityConnection = isSelected || isHovered;
        
        // Always update colors for selected/hovered connections, otherwise throttle
        if (isHighPriorityConnection || shouldUpdateColors) {
          let color;
          if (isSelected) {
            // Enhanced pulse animation for selected connections
            const pulse = Math.sin(state.clock.elapsedTime * 2.5) * 0.2 + 1.0;
            color = new THREE.Color(0x00bfff).multiplyScalar(pulse);
            if (connectionMaterialRef.current) {
              connectionMaterialRef.current.linewidth = 2;
            }
          } else if (isHovered) {
            color = new THREE.Color(0x88ccff);
            if (connectionMaterialRef.current) {
              connectionMaterialRef.current.linewidth = 2;
            }
          } else if (selectedNodeId && (connection.source === selectedNodeId || connection.target === selectedNodeId)) {
            // Enhanced pulse for available connections
            const availablePulse = Math.sin(state.clock.elapsedTime * 2.0) * 0.3 + 1.0;
            color = new THREE.Color(0x4488ff).multiplyScalar(availablePulse);
            if (connectionMaterialRef.current) {
              connectionMaterialRef.current.linewidth = 3; // Thicker for available connections
            }
          } else {
            color = new THREE.Color(0x666666);
            if (connectionMaterialRef.current) {
              connectionMaterialRef.current.linewidth = 1;
            }
          }
          
          colorAttribute.setXYZ(i * 2, color.r, color.g, color.b);
          colorAttribute.setXYZ(i * 2 + 1, color.r, color.g, color.b);
          colorsUpdated = true;
        }
      }
      
      // Only mark attributes as needing update if they changed
      if (positionsUpdated) {
        positionAttribute.needsUpdate = true;
      }
      if (colorsUpdated) {
        colorAttribute.needsUpdate = true;
      }
    } catch (error) {
      console.error("Error updating connection positions and colors:", error);
    }
  });

  // Create the shader material with enhanced visibility
  useEffect(() => {
    if (geometryRef.current) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          thickness: { value: 2.0 } // Base thickness
        },
        vertexShader: connectionVertexShader,
        fragmentShader: connectionFragmentShader,
        vertexColors: true,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
        depthTest: true
      });
      
      if (lineSegmentsRef.current) {
        lineSegmentsRef.current.material = material;
        connectionMaterialRef.current = material;
        // Ensure connections are visible regardless of frustum culling
        lineSegmentsRef.current.frustumCulled = false;
        // Set render order to ensure connections render after nodes
        lineSegmentsRef.current.renderOrder = 10;
      }
    }
  }, []);

  // Enhanced connection management to ensure proper rendering
  useEffect(() => {
    if (geometryRef.current && lineCount > 0) {
      geometryRef.current.setDrawRange(0, lineCount * 2);
      
      // Log connection counts to help with debugging
      console.log(`Setting draw range for ${lineCount} connections (${lineCount * 2} vertices)`);
      
      // Force immediate update to ensure connections are visible
      if (geometryRef.current.attributes.position) {
        geometryRef.current.attributes.position.needsUpdate = true;
      }
      if (geometryRef.current.attributes.color) {
        geometryRef.current.attributes.color.needsUpdate = true;
      }
    }
  }, [lineCount]);

  return (
    <lineSegments ref={lineSegmentsRef} frustumCulled={false}>
      <bufferGeometry ref={geometryRef} />
    </lineSegments>
  );
});

