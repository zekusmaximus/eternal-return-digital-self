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
import { forwardRef, useMemo, useRef } from 'react';
import { Color, InstancedMesh, ShaderMaterial } from 'three';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';

// Simple noise function implementation (a basic version of Simplex noise)
const createSimpleNoise = () => {
  return (x: number, y: number, z: number, time: number) => {
    // Create a simple 3D noise using sine waves with different frequencies
    return Math.sin(x * 0.3 + time * 0.7) * 0.3 +
           Math.sin(y * 0.5 + time * 0.3) * 0.3 +
           Math.sin(z * 0.2 + time * 0.5) * 0.3;
  };
};

// Initialize the noise function
const noise3D = createSimpleNoise();

// Circuit pattern vertex shader
const circuitVertexShader = `
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// Circuit pattern fragment shader
const circuitFragmentShader = `
  uniform vec3 color;
  uniform float time;
  
  varying vec3 vPosition;
  varying vec3 vNormal;
  varying vec2 vUv;
  
  // Simple hash function
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
  }
  
  void main() {
    // Basic circuit pattern
    vec2 gridPos = floor(vPosition.xy * 10.0);
    float circuit = hash(gridPos) > 0.7 ? 1.0 : 0.0;
    
    // Circuit lines
    vec2 grid = fract(vPosition.xy * 10.0);
    float line = smoothstep(0.95, 0.98, max(grid.x, grid.y));
    
    // Flowing effect on circuit lines
    float flow = sin(vPosition.x * 5.0 + vPosition.y * 3.0 + time * 2.0) * 0.5 + 0.5;
    
    // Combine effects
    vec3 finalColor = color * (0.5 + 0.5 * circuit + line * flow);
    
    // Add rim lighting
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 3.0);
    finalColor += color * rim * 0.5;
    
    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// Force field vertex shader for hover effect
const forceFieldVertexShader = `
  uniform float time;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    vPosition = position;
    vNormal = normalize(normalMatrix * normal);
    
    // Add subtle pulsating effect
    float pulse = sin(time * 2.0) * 0.05 + 1.05;
    vec3 newPosition = position * pulse;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

// Force field fragment shader for hover effect
const forceFieldFragmentShader = `
  uniform vec3 color;
  uniform float time;
  varying vec3 vPosition;
  varying vec3 vNormal;
  
  void main() {
    // Create flowing wave pattern
    float wave = sin(vPosition.x * 5.0 + vPosition.y * 3.0 + time * 2.0) * 0.5 + 0.5;
    
    // Rim effect for sphere edge glow
    float rim = 1.0 - max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
    rim = pow(rim, 3.0);
    
    // Transparency based on rim and wave pattern
    float alpha = rim * 0.7 * wave;
    
    // Final color with slight pulsation
    float pulse = sin(time * 3.0) * 0.2 + 0.8;
    vec3 finalColor = color * pulse * (0.5 + wave * 0.5);
    
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

interface NodesInstancedProps {
  nodes: ConstellationNode[];
  nodePositions: NodePositions;
  connections: { start: string; end: string }[];
  overrideSelectedNodeId?: string;
  onNodeClick?: (nodeId: string) => void;
  clickableNodeIds?: string[];
}

// Define base colors for each triad
const triadColors = {
  LastHuman: new Color('#ff6666'), // Reddish
  Archaeologist: new Color('#66ff66'), // Greenish
  Algorithm: new Color('#6666ff'), // Bluish
};

export const NodesInstanced = forwardRef<InstancedMesh, NodesInstancedProps>(
  (props, ref) => {
  const {
    nodes,
    nodePositions,
    connections,
    overrideSelectedNodeId,
    onNodeClick,
    clickableNodeIds,
  } = props;
  const dispatch = useDispatch<AppDispatch>();
  
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

  // Create refs for accessing objects in the scene
  const materialRefs = useRef<ShaderMaterial[]>([]);
  const forceFieldMaterialRefs = useRef<ShaderMaterial[]>([]);
  const nodeMeshRefs = useRef<THREE.Object3D[]>([]);
  const forceFieldMeshRefs = useRef<THREE.Object3D[]>([]);
  
  // Store original positions for the noise animation
  const originalPositions = useRef<{[key: string]: [number, number, number]}>({});
  
  // Initialize original positions
  useMemo(() => {
    nodes.forEach(node => {
      const position = nodePositions[node.id] || [0, 0, 0];
      originalPositions.current[node.id] = [...position];
    });
  }, [nodes, nodePositions]);
  
  // Update shader time uniform and apply noise movement
  // Frame counter for throttling updates
  const frameCount = useRef(0);
  
  // Optimization: Only update certain elements on certain frames
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    frameCount.current += 1;
    
    // Update time uniforms on every frame (critical for visual continuity)
    materialRefs.current.forEach(material => {
      if (material?.uniforms?.time) {
        material.uniforms.time.value = time;
      }
    });
    
    // Update force field materials on every frame
    forceFieldMaterialRefs.current.forEach(material => {
      if (material?.uniforms?.time) {
        material.uniforms.time.value = time;
      }
    });
    
    // Throttle the expensive noise-based position updates to every 2nd frame
    if (frameCount.current % 2 === 0) {
      // Apply organic movement to nodes using noise - with optimized calculations
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeMesh = nodeMeshRefs.current[i];
        
        if (!nodeMesh) continue; // Skip if mesh doesn't exist
        
        const origPos = originalPositions.current[node.id];
        if (!origPos) continue; // Skip if no original position
        
        // Apply subtle noise-based movement - reduced amplitude
        const noiseAmount = 0.03; // Reduced movement for better performance
        const nx = noise3D(origPos[0], origPos[1], origPos[2], time * 0.3); // Slower updates
        const ny = noise3D(origPos[0] + 100, origPos[1] + 100, origPos[2] + 100, time * 0.25);
        const nz = noise3D(origPos[0] + 200, origPos[1] + 200, origPos[2] + 200, time * 0.2);
        
        nodeMesh.position.x = origPos[0] + nx * noiseAmount;
        nodeMesh.position.y = origPos[1] + ny * noiseAmount;
        nodeMesh.position.z = origPos[2] + nz * noiseAmount;
        
        // Update force field position only if it exists
        const forceMesh = forceFieldMeshRefs.current[i];
        if (forceMesh) {
          forceMesh.position.copy(nodeMesh.position);
        }
      }
    }
  });
  
  // Create a dummy instanced mesh to maintain API compatibility with ref
  // while still using individual meshes for better control
  return (
    <group>
      {/* This invisible instanced mesh is just for ref compatibility */}
      {ref && (
        <instancedMesh
          ref={ref}
          args={[
            new THREE.BufferGeometry(),
            new THREE.MeshBasicMaterial(),
            0
          ]}
          visible={false}
        />
      )}
      {nodes.map((node, index) => {
        const position = nodePositions[node.id] || [0, 0, 0];
        const isSelected = selectedNodeId === node.id;
        const isConnected = connectedNodeIds.has(node.id);
        const isHovered = hoveredNodeId === node.id;
        
        // Determine color based on node state
        const baseColor = triadColors[node.character];
        const color = baseColor.clone();
        if (isSelected) {
          color.multiplyScalar(1.5); // Lighter shade
        } else if (isConnected) {
          color.multiplyScalar(0.5); // Darker shade
        } else if (isHovered) {
          color.multiplyScalar(1.2); // Slightly lighter for hover
        }
        
        return (
          <group key={node.id}>
            {/* Force field effect (only visible when hovered or selected) */}
            {(isHovered || isSelected) && (
              <mesh
                ref={(mesh) => {
                  if (mesh) {
                    forceFieldMeshRefs.current[index] = mesh;
                  }
                }}
                position={[position[0], position[1], position[2]]}>
                <sphereGeometry args={[0.7, 16, 16]} />
                <shaderMaterial 
                  ref={(material) => {
                    if (material) {
                      forceFieldMaterialRefs.current[index] = material;
                    }
                  }}
                  vertexShader={forceFieldVertexShader}
                  fragmentShader={forceFieldFragmentShader}
                  uniforms={{
                    color: { value: color },
                    time: { value: 0 }
                  }}
                  transparent={true}
                  depthWrite={false}
                />
              </mesh>
            )}
            
            {/* Main node mesh */}
            <mesh
              ref={(mesh) => {
                if (mesh) {
                  nodeMeshRefs.current[index] = mesh;
                }
              }}
              position={[position[0], position[1], position[2]]}
              onClick={(e) => {
                e.stopPropagation();
                if (onNodeClick) {
                  if (clickableNodeIds && !clickableNodeIds.includes(node.id)) {
                    return;
                  }
                  onNodeClick(node.id);
                } else {
                  if (selectedNodeId === null) {
                    dispatch(nodeSelected(node.id));
                    dispatch(visitNode(node.id));
                    dispatch(navigateToNode(node.id));
                    return;
                  }
                  
                  const isConnected = connections.some(
                    (c) =>
                      (c.start === selectedNodeId && c.end === node.id) ||
                      (c.start === node.id && c.end === selectedNodeId)
                  );
                  
                  if (isConnected) {
                    dispatch(nodeSelected(node.id));
                    dispatch(visitNode(node.id));
                    dispatch(navigateToNode(node.id));
                  }
                }
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                if (node.id !== hoveredNodeId) {
                  dispatch(nodeHovered(node.id));
                }
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                dispatch(nodeUnhovered());
              }}
            >
              <octahedronGeometry args={[0.5, 0]} />
              <shaderMaterial 
                ref={(material) => {
                  if (material) {
                    // Store reference to this material
                    materialRefs.current[index] = material;
                  }
                }}
                vertexShader={circuitVertexShader}
                fragmentShader={circuitFragmentShader}
                uniforms={{
                  color: { value: color },
                  time: { value: 0 }
                }}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
});