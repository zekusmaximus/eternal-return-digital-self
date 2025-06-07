import React, { forwardRef, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { BufferGeometry, InstancedMesh, DoubleSide } from 'three';
import { useAppSelector } from '../../store/hooks';
import { Connection, NodePositions } from '../../types';
import { useFrame } from '@react-three/fiber';

interface ConnectionsBatchedProps {
  connections: Connection[];
  nodePositions: NodePositions;
}

// Connection line shader code for glowing effects
const connectionVertexShader = `
  // Using the built-in 'color' attribute instead of redefining it
  uniform float time;
  varying vec3 vColor;
  varying float vPosition;
  
  void main() {
    vColor = color;
    vPosition = position.y;
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    gl_Position = projectedPosition;
  }
`;

const connectionFragmentShader = `
  uniform float time;
  varying vec3 vColor;
  varying float vPosition;
  
  void main() {
    // Create flowing effect along the connection
    float flow = sin(vPosition * 10.0 + time * 3.0) * 0.5 + 0.5;
    
    // Create pulsating glow effect
    float pulse = sin(time * 2.0) * 0.2 + 0.8;
    
    // Combine effects
    vec3 finalColor = vColor * (1.0 + flow * 0.3) * pulse;
    
    // Add subtle variation based on time
    finalColor += vec3(sin(time * 0.2) * 0.05, sin(time * 0.3) * 0.05, sin(time * 0.4) * 0.05);
    
    gl_FragColor = vec4(finalColor, 0.9);
  }
`;

// Using forwardRef for API compatibility
const ConnectionsBatched = forwardRef<InstancedMesh, ConnectionsBatchedProps>(
  (props, ref) => {
    const { connections, nodePositions } = props;
    console.log("ConnectionsBatched rendering with:", {
      connectionCount: connections.length,
      nodePositionsCount: Object.keys(nodePositions).length
    });
    
    // We use our own lineSegmentsRef since we're actually using LineSegments, not InstancedMesh
    // The forwardRef is just for API compatibility
    const lineSegmentsRef = useRef<THREE.LineSegments>(null!);
    
    // Acknowledge forwarded ref with null - we don't actually use an InstancedMesh
    // This is a proper use of the ref parameter required by forwardRef
    React.useImperativeHandle(ref, () => null!);
  const geometryRef = useRef<BufferGeometry>(null!);
  const selectedNodeId = useAppSelector((state) => state.interface.selectedNodeId);
  // We're not using instancedMeshRef or nodeIndexMap anymore since we're using direct positions

  // Create a reference for the custom shader material
  const connectionMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const hoveredNodeId = useAppSelector(state => state.interface.hoveredNodeId);

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
        const isHovered = hoveredNodeId === connection.source || hoveredNodeId === connection.target;
        
        // Enhanced color logic
        let color;
        if (isSelected) {
          color = new THREE.Color(0x00bfff); // Bright blue for selected
        } else if (isHovered) {
          color = new THREE.Color(0x88ccff); // Light blue for hovered
        } else {
          color = new THREE.Color(0x444444); // Default dark gray
        }
        
        colors.set([color.r, color.g, color.b], lineCount * 6);
        colors.set([color.r, color.g, color.b], lineCount * 6 + 3);

        lineCount++;
      }
    }
    return { positions, colors, lineCount };
  }, [connections, nodePositions, selectedNodeId, hoveredNodeId]);

  useEffect(() => {
    console.log("ConnectionsBatched initializing geometry with:", {
      lineCount,
      positionsLength: positions.length,
      colorsLength: colors.length
    });
    
    const geometry = geometryRef.current;
    if (!geometry) {
      console.warn("ConnectionsBatched: geometryRef.current is null");
      return;
    }

    try {
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.setDrawRange(0, lineCount * 2);

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;
      
      console.log("ConnectionsBatched: Successfully initialized geometry attributes");
    } catch (error) {
      console.error("Error initializing geometry attributes:", error);
    }
  }, [positions, colors, lineCount]);

  // Frame counter for throttling updates
  const frameCount = useRef(0);

  useFrame((state) => {
    // Increment frame counter
    frameCount.current += 1;
    
    // Skip if refs are not ready
    if (!geometryRef.current) {
      return;
    }
    
    // Update shader time uniform - this is relatively inexpensive
    if (connectionMaterialRef.current) {
      connectionMaterialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }
    
    // Skip if attributes are not ready
    if (!geometryRef.current.attributes.position || !geometryRef.current.attributes.color) {
      return;
    }
    
    // Only update positions every 2 frames to reduce GPU load
    const shouldUpdatePositions = frameCount.current % 2 === 0;
    // Only update colors every 3 frames (except for selected/hovered items)
    const shouldUpdateColors = frameCount.current % 3 === 0;
    
    try {
      const positionAttribute = geometryRef.current.attributes.position as THREE.BufferAttribute;
      const colorAttribute = geometryRef.current.attributes.color as THREE.BufferAttribute;
      
      let positionsUpdated = false;
      let colorsUpdated = false;
      
      // Update each connection
      for (let i = 0; i < connections.length; i++) {
        const connection = connections[i];
        
        // Use the nodePositions directly instead of trying to get from instancedMesh
        const startPos = nodePositions[connection.source];
        const endPos = nodePositions[connection.target];
        
        if (!startPos || !endPos) {
          continue; // Skip if positions aren't available
        }
        
        // Update positions less frequently to save resources
        if (shouldUpdatePositions) {
          positionAttribute.setXYZ(i * 2, startPos[0], startPos[1], startPos[2]);
          positionAttribute.setXYZ(i * 2 + 1, endPos[0], endPos[1], endPos[2]);
          positionsUpdated = true;
        }
        
        // Check if this connection needs immediate color update (selected/hovered)
        const isSelected = selectedNodeId === connection.source || selectedNodeId === connection.target;
        const isHovered = hoveredNodeId === connection.source || hoveredNodeId === connection.target;
        
        // Always update colors for selected/hovered connections, otherwise throttle
        if (isSelected || isHovered || shouldUpdateColors) {
          let color;
          if (isSelected) {
            // Simplified color animation for selected connections
            const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 + 0.9;
            color = new THREE.Color(0x00bfff).multiplyScalar(pulse);
          } else if (isHovered) {
            color = new THREE.Color(0x88ccff);
          } else {
            color = new THREE.Color(0x444444);
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

  // Create the shader material
  useEffect(() => {
    if (geometryRef.current) {
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 }
        },
        vertexShader: connectionVertexShader,
        fragmentShader: connectionFragmentShader,
        vertexColors: true,
        transparent: true,
        side: DoubleSide,
        depthWrite: false,
      });
      
      if (lineSegmentsRef.current) {
        lineSegmentsRef.current.material = material;
        connectionMaterialRef.current = material;
      }
    }
  }, []);

  return (
    <lineSegments ref={lineSegmentsRef} frustumCulled={false}>
      <bufferGeometry ref={geometryRef} />
    </lineSegments>
  );
});

export default ConnectionsBatched;