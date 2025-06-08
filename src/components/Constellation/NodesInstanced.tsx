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
import { forwardRef, useMemo, useRef, useEffect, useState } from 'react';
import { Color, InstancedMesh, ShaderMaterial, Frustum, Matrix4, Vector3 } from 'three';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';

// Cached simple noise function implementation
// Using a more optimized approach with pre-computed values
const noise3D = (() => {
  // Pre-compute some frequency values
  const freqX = 0.3;
  const freqY = 0.5;
  const freqZ = 0.2;
  const timeScaleX = 0.7;
  const timeScaleY = 0.3;
  const timeScaleZ = 0.5;
  const amplitude = 0.3;
  
  // Create lookup tables for sin values to reduce calculations
  const LOOKUP_SIZE = 256;
  const sinLookup = new Float32Array(LOOKUP_SIZE);
  for (let i = 0; i < LOOKUP_SIZE; i++) {
    sinLookup[i] = Math.sin((i / LOOKUP_SIZE) * Math.PI * 2);
  }
  
  // Get sin value from lookup table
  const fastSin = (val: number): number => {
    // Normalize value to 0-1 range
    const idx = Math.floor((val % (Math.PI * 2)) / (Math.PI * 2) * LOOKUP_SIZE) & (LOOKUP_SIZE - 1);
    return sinLookup[idx];
  };
  
  return (x: number, y: number, z: number, time: number): number => {
    // Using faster calculation with lookup
    return fastSin(x * freqX + time * timeScaleX) * amplitude +
           fastSin(y * freqY + time * timeScaleY) * amplitude +
           fastSin(z * freqZ + time * timeScaleZ) * amplitude;
  };
})();

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

// Create a class for managing node visibility and LOD
class NodeVisibilityManager {
  private frustum: Frustum;
  private matrix: Matrix4;
  private camera: THREE.Camera;
  private visibleNodes: Set<string>;
  private distanceThresholds: { [key: string]: number };
  private lastUpdateTime: number;
  private updateInterval: number;
  
  constructor(camera: THREE.Camera) {
    this.frustum = new Frustum();
    this.matrix = new Matrix4();
    this.camera = camera;
    this.visibleNodes = new Set();
    this.distanceThresholds = {
      high: 20,   // High detail within 20 units
      medium: 40, // Medium detail within 40 units
      low: 60     // Low detail within 60 units
    };
    this.lastUpdateTime = 0;
    this.updateInterval = 250; // Update visibility every 250ms
  }
  
  updateFrustum() {
    this.matrix.multiplyMatrices(
      this.camera.projectionMatrix,
      this.camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.matrix);
  }
  
  shouldUpdate(time: number): boolean {
    if (time - this.lastUpdateTime > this.updateInterval) {
      this.lastUpdateTime = time;
      return true;
    }
    return false;
  }
  
  checkNodeVisibility(nodeId: string, position: Vector3): {
    isVisible: boolean,
    detailLevel: 'high' | 'medium' | 'low' | 'culled'
  } {
    // Always consider important nodes visible
    if (this.visibleNodes.has(nodeId)) {
      this.visibleNodes.delete(nodeId);
    }
    
    // Check if in frustum
    const isInFrustum = this.frustum.containsPoint(position);
    if (!isInFrustum) {
      return { isVisible: false, detailLevel: 'culled' };
    }
    
    // Calculate distance to camera for LOD
    const distance = position.distanceTo(this.camera.position);
    
    // Determine detail level based on distance
    let detailLevel: 'high' | 'medium' | 'low' | 'culled';
    if (distance <= this.distanceThresholds.high) {
      detailLevel = 'high';
    } else if (distance <= this.distanceThresholds.medium) {
      detailLevel = 'medium';
    } else if (distance <= this.distanceThresholds.low) {
      detailLevel = 'low';
    } else {
      detailLevel = 'culled';
    }
    
    // Add to visible nodes
    this.visibleNodes.add(nodeId);
    
    return { isVisible: true, detailLevel };
  }
  
  getVisibleNodeCount(): number {
    return this.visibleNodes.size;
  }
}

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
  
  // Get camera from Three.js context for visibility culling
  const { camera } = useThree();
  
  // Create visibility manager
  const visibilityManagerRef = useRef<NodeVisibilityManager | null>(null);
  const [visibleNodeCount, setVisibleNodeCount] = useState(0);

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
  
  // Create visibility manager on initialization
  useEffect(() => {
    if (!visibilityManagerRef.current) {
      visibilityManagerRef.current = new NodeVisibilityManager(camera);
    }
  }, [camera]);
  
  // Update shader time uniform and apply noise movement with optimized LOD
  // Frame counter for throttling updates
  const frameCount = useRef(0);
  const lastUpdatePositionsTime = useRef(0);
  const lastUpdateMaterialsTime = useRef(0);
  
  // Enhanced optimization: Using variable update rates based on priority
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    frameCount.current += 1;
    
    // Initialize visibility manager if needed
    if (!visibilityManagerRef.current) {
      visibilityManagerRef.current = new NodeVisibilityManager(camera);
    }
    
    // Update frustum for visibility checks (less frequently)
    if (visibilityManagerRef.current.shouldUpdate(time)) {
      visibilityManagerRef.current.updateFrustum();
    }
    
    // Time-based throttling for shader updates
    const shouldUpdateMaterials = time - lastUpdateMaterialsTime.current > 0.05; // 50ms
    if (shouldUpdateMaterials) {
      lastUpdateMaterialsTime.current = time;
      
      // Update time uniforms on important materials only
      const importantMaterials = materialRefs.current.filter((_, i) => {
        const node = nodes[i];
        return node && (
          node.id === selectedNodeId ||
          node.id === hoveredNodeId ||
          connections.some(c => c.start === node.id || c.end === node.id)
        );
      });
      
      // Batch updates to reduce overhead
      importantMaterials.forEach(material => {
        if (material?.uniforms?.time) {
          material.uniforms.time.value = time;
        }
      });
      
      // Update force field materials only for selected/hovered nodes
      const importantForceFields = forceFieldMaterialRefs.current.filter((_, i) => {
        const node = nodes[i];
        return node && (node.id === selectedNodeId || node.id === hoveredNodeId);
      });
      
      importantForceFields.forEach(material => {
        if (material?.uniforms?.time) {
          material.uniforms.time.value = time;
        }
      });
    }
    
    // Throttle the expensive noise-based position updates
    // More aggressive throttling for nodes that are not important
    const timeSinceLastPositionUpdate = time - lastUpdatePositionsTime.current;
    const shouldUpdatePositions = timeSinceLastPositionUpdate > 0.1; // 100ms
    
    if (shouldUpdatePositions) {
      lastUpdatePositionsTime.current = time;
      
      // Apply organic movement to nodes using noise - with optimized calculations
      let visibleCount = 0;
      
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeMesh = nodeMeshRefs.current[i];
        
        if (!nodeMesh) continue; // Skip if mesh doesn't exist
        
        const origPos = originalPositions.current[node.id];
        if (!origPos) continue; // Skip if no original position
        
        // Create a Vector3 for position (reused for visibility check)
        const position = new THREE.Vector3(origPos[0], origPos[1], origPos[2]);
        
        // Check visibility and LOD level
        const { detailLevel } = visibilityManagerRef.current.checkNodeVisibility(
          node.id,
          position
        );
        
        // Skip updates for culled nodes
        if (detailLevel === 'culled') {
          // Hide node completely
          nodeMesh.visible = false;
          
          // Also hide force field
          const forceMesh = forceFieldMeshRefs.current[i];
          if (forceMesh) forceMesh.visible = false;
          
          continue;
        }
        
        // Show node
        nodeMesh.visible = true;
        visibleCount++;
        
        // Adjust noise amount based on detail level
        let noiseAmount = 0.03; // Default
        let updateFrequency = 1.0; // Default (every frame)
        
        switch (detailLevel) {
          case 'high':
            // Full detail for important nodes
            noiseAmount = 0.03;
            updateFrequency = 1.0;
            break;
          case 'medium':
            // Medium detail for medium distance
            noiseAmount = 0.02;
            updateFrequency = 0.5; // Every other frame
            break;
          case 'low':
            // Low detail for far distance
            noiseAmount = 0.01;
            updateFrequency = 0.25; // Every fourth frame
            break;
        }
        
        // Special case for important nodes - always high detail
        const isImportantNode = node.id === selectedNodeId || node.id === hoveredNodeId;
        if (isImportantNode) {
          noiseAmount = 0.03;
          updateFrequency = 1.0;
        }
        
        // Deterministic update frequency based on frame count instead of random
        // This is more predictable and avoids using Math.random() for security reasons
        const shouldUpdate =
          updateFrequency >= 1.0 || // Always update high priority nodes
          (updateFrequency >= 0.5 && frameCount.current % 2 === 0) || // Update medium priority every 2nd frame
          (updateFrequency >= 0.25 && frameCount.current % 4 === 0);  // Update low priority every 4th frame
          
        if (shouldUpdate) {
          // Apply subtle noise-based movement - with adaptive amplitude
          const nx = noise3D(origPos[0], origPos[1], origPos[2], time * 0.3);
          const ny = noise3D(origPos[0] + 100, origPos[1] + 100, origPos[2] + 100, time * 0.25);
          const nz = noise3D(origPos[0] + 200, origPos[1] + 200, origPos[2] + 200, time * 0.2);
          
          // Apply optimization: use matrix update instead of individual position properties
          // This is more efficient as it avoids multiple matrix recalculations
          nodeMesh.matrix.makeTranslation(
            origPos[0] + nx * noiseAmount,
            origPos[1] + ny * noiseAmount,
            origPos[2] + nz * noiseAmount
          );
          nodeMesh.matrixAutoUpdate = false;
          
          // Update force field position only if it exists and node is important
          const forceMesh = forceFieldMeshRefs.current[i];
          if (forceMesh && (isImportantNode || detailLevel === 'high')) {
            forceMesh.visible = isImportantNode; // Only show for important nodes
            forceMesh.position.copy(nodeMesh.position);
          } else if (forceMesh) {
            forceMesh.visible = false;
          }
        }
      }
      
      // Update visible node count for metrics
      setVisibleNodeCount(visibleCount);
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
        
        // Calculate node color directly
        const baseColor = triadColors[node.character];
        const nodeColor = baseColor.clone();
        if (isSelected) {
          nodeColor.multiplyScalar(1.5); // Lighter shade
        } else if (isConnected) {
          nodeColor.multiplyScalar(0.5); // Darker shade
        } else if (isHovered) {
          nodeColor.multiplyScalar(1.2); // Slightly lighter for hover
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
                    color: { value: nodeColor },
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
                
                // Emit custom event to hide tooltip when a node is clicked
                const nodeUnhoverEvent = new CustomEvent('node-unhover');
                window.dispatchEvent(nodeUnhoverEvent);
                
                if (onNodeClick) {
                  if (clickableNodeIds && !clickableNodeIds.includes(node.id)) {
                    return;
                  }
                  onNodeClick(node.id);
                } else {
                  if (selectedNodeId === null) {
                    dispatch(nodeSelected(node.id));
                    dispatch(visitNode(node.id));
                    dispatch(navigateToNode({
                      nodeId: node.id,
                      character: node.character,
                      temporalValue: node.temporalValue,
                      attractors: node.strangeAttractors
                    }));
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
                    dispatch(navigateToNode({
                      nodeId: node.id,
                      character: node.character,
                      temporalValue: node.temporalValue,
                      attractors: node.strangeAttractors
                    }));
                  }
                }
              }}
              onPointerOver={(e) => {
                e.stopPropagation();
                if (node.id !== hoveredNodeId) {
                  dispatch(nodeHovered(node.id));
                  
                  // Emit custom event for tooltip positioning
                  // Just use client coordinates from the event directly
                  const nodeHoverEvent = new CustomEvent('node-hover', {
                    detail: {
                      position: {
                        x: e.clientX,
                        y: e.clientY - 40 // Position tooltip 40px above cursor
                      },
                      nodeId: node.id
                    }
                  });
                  window.dispatchEvent(nodeHoverEvent);
                }
              }}
              onPointerOut={(e) => {
                e.stopPropagation();
                dispatch(nodeUnhovered());
                
                // Emit custom event for tooltip hiding
                const nodeUnhoverEvent = new CustomEvent('node-unhover');
                window.dispatchEvent(nodeUnhoverEvent);
              }}
            >
              {/* Use lower poly geometry for distant nodes */}
              {/* Performance optimization: Use lower poly geometry for distant nodes */}
              {!isSelected && !isHovered ? (
                <octahedronGeometry args={[0.5, 0]} /> // Lower poly for distant nodes
              ) : (
                <sphereGeometry args={[0.5, 8, 8]} /> // Higher detail for selected/hovered
              )}
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
                  color: { value: nodeColor },
                  time: { value: 0 }
                }}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Display performance information in development mode */}
      {process.env.NODE_ENV === 'development' && (
        <group position={[-10, 10, 0]}>
          <sprite scale={[5, 0.6, 1]} position={[0, 0, 0]}>
            <spriteMaterial color="#000000" opacity={0.5} transparent={true} />
          </sprite>
          <sprite scale={[4.8, 0.4, 1]} position={[0, 0, 0.1]}>
            <spriteMaterial>
              <canvasTexture attach="map" image={(() => {
                const canvas = document.createElement('canvas');
                canvas.width = 256;
                canvas.height = 32;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                  ctx.fillStyle = 'white';
                  ctx.font = '11px monospace';
                  ctx.fillText(`Visible: ${visibleNodeCount}/${nodes.length} nodes`, 10, 20);
                }
                return canvas;
              })()} />
            </spriteMaterial>
          </sprite>
        </group>
      )}
    </group>
  );
});