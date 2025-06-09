import { useDispatch, useSelector } from 'react-redux';
import {
  nodeHovered,
  nodeUnhovered,
  selectHoveredNodeId,
  selectSelectedNodeId,
  nodeSelected,
  setViewMode,
  setInitialChoicePhaseCompleted,
} from '../../store/slices/interfaceSlice';
import { navigateToNode } from '../../store/slices/readerSlice';
import { visitNode } from '../../store/slices/nodesSlice';
import { AppDispatch } from '../../store';
import { ConstellationNode, NodePositions } from '../../types';
import { forwardRef, useMemo, useRef, useEffect } from 'react';
import { Color, InstancedMesh, ShaderMaterial, Frustum, Matrix4, Vector3 } from 'three';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';

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
  isMinimap?: boolean; // Flag to indicate if this is used in the minimap
  isInitialChoicePhase: boolean;
}

// Define base colors for each triad - match exact character names from nodesSlice.ts
const triadColors = {
  LastHuman: new Color('#ff6666'), // Reddish
  Archaeologist: new Color('#66ff66'), // Greenish
  Algorithm: new Color('#6666ff'), // Bluish
};

// Create a more permissive lookup that doesn't rely on exact matching
// Helper to get color for node based on character with proper type safety
const getNodeColor = (character: string | undefined): Color => {
  if (!character) return new Color('#ffffff');
  
  // Direct lookup with type safety
  if (character === 'LastHuman') return triadColors.LastHuman;
  if (character === 'Archaeologist') return triadColors.Archaeologist;
  if (character === 'Algorithm') return triadColors.Algorithm;
  
  // Case-insensitive lookup as fallback
  const lowerChar = character.toLowerCase();
  if (lowerChar.includes('human')) return triadColors.LastHuman;
  if (lowerChar.includes('arch')) return triadColors.Archaeologist;
  if (lowerChar.includes('algo')) return triadColors.Algorithm;
  
  // Default
  console.warn(`Unknown character type: ${character}, using default color`);
  return new Color('#ffffff');
};

// We've fixed node visibility by:
// 1. Using larger distance thresholds to prevent aggressive culling
// 2. Implementing proper hover/unhover event handling
// 3. Using direct position updates instead of matrix manipulation
// 4. Ensuring proper color assignment for all character types

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
      high: 60,   // High detail within 60 units (increased from 50)
      medium: 90,  // Medium detail within 90 units (increased from 70)
      low: 120     // Low detail within 120 units (increased from 90)
    };
    this.lastUpdateTime = 0;
    this.updateInterval = 150; // Update visibility more frequently (was 250ms)
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
    // Track nodes that we've processed
    if (this.visibleNodes.has(nodeId)) {
      // Don't delete from visibleNodes here - we want to maintain the set
    }
    
    // Calculate distance for LOD purposes
    const distance = position.distanceTo(this.camera.position);
    
    // CRITICAL FIX: Always return nodes as visible, even if outside frustum
    // This ensures all nodes are always visible, regardless of camera position
    // We'll just use the distance for LOD purposes
    
    // Add to visible nodes set
    this.visibleNodes.add(nodeId);
    
    // Distance already calculated above
    
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
    isInitialChoicePhase,
  } = props;
  const dispatch = useDispatch<AppDispatch>();
  
  const hoveredNodeId = useSelector(selectHoveredNodeId);
  const reduxSelectedNodeId = useSelector(selectSelectedNodeId);
  const selectedNodeId = overrideSelectedNodeId ?? reduxSelectedNodeId;
  
  // Get camera from Three.js context for visibility culling
  const { camera } = useThree();
  
  // Create visibility manager
  const visibilityManagerRef = useRef<NodeVisibilityManager | null>(null);
  // Track nodes visibility
  const forceUpdateCounter = useRef({ count: 0 });
  
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
      
      // Force occasional full visibility update to catch any missed nodes
      forceUpdateCounter.current.count++;
      
      // More frequent checks (every second) to ensure nodes stay visible
      if (forceUpdateCounter.current.count % 6 === 0) {
        console.log("Performing visibility validation check...");
        let visibleCount = 0;
        
        // Every ~1 second, ensure all nodes have been evaluated
        nodes.forEach(node => {
          const mesh = nodeMeshRefs.current[nodes.indexOf(node)];
          if (mesh) {
            // Always ensure nodes are visible
            const isImportant = node.id === selectedNodeId ||
                             node.id === hoveredNodeId ||
                             connectedNodeIds.has(node.id);
            
            if (mesh.visible === false) {
              // Force important nodes to always be visible
              if (isImportant) {
                console.log(`Forcing visibility for important node: ${node.id}`);
                mesh.visible = true;
              }
            }
            
            if (mesh.visible) {
              visibleCount++;
            }
          }
        });
        
        console.log(`Visible nodes: ${visibleCount} / ${nodes.length}`);
        
        // Emergency fallback - if too few nodes are visible, make all visible
        if (visibleCount < nodes.length * 0.7) {
          console.warn("Too few nodes visible, forcing all nodes to be visible");
          nodes.forEach((_, idx) => {
            const mesh = nodeMeshRefs.current[idx];
            if (mesh) {
              mesh.visible = true;
            }
          });
        }
      }
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
      // And apply pulsing effect for designated starting nodes
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const nodeMesh = nodeMeshRefs.current[i] as THREE.Mesh; // Cast for scale property
        
        if (!nodeMesh) {
          continue; // Skip if mesh doesn't exist
        }
        
        const origPos = originalPositions.current[node.id];
        if (!origPos) {
          continue; // Skip if no original position
        }

        // Determine if this node is a designated starting node for pulsing logic
        let isDesignatedStartingNodeForPulse = false;
        if (isInitialChoicePhase && !props.isMinimap) { // Pulse only in main view during initial phase
          if (node.contentSource === 'arch-discovery.md' ||
              node.contentSource === 'algo-awakening.md' ||
              node.contentSource === 'human-discovery.md') {
            isDesignatedStartingNodeForPulse = true;
          }
        }

        if (isDesignatedStartingNodeForPulse) {
          const pulseSpeed = 3;
          const pulseAmount = 0.15; // Scale pulsates between 0.85 and 1.15 approx.
          const baseScale = 1.0;
          const targetScale = baseScale + Math.sin(time * pulseSpeed) * pulseAmount;
          nodeMesh.scale.set(targetScale, targetScale, targetScale);
        } else {
          // Ensure non-pulsing nodes (or minimap nodes, or when not in initial phase) have normal scale
          if (nodeMesh.scale.x !== 1.0 || nodeMesh.scale.y !== 1.0 || nodeMesh.scale.z !== 1.0) {
            nodeMesh.scale.set(1.0, 1.0, 1.0);
          }
        }
        
        // Create a Vector3 for position (reused for visibility check)
        const position = new THREE.Vector3(origPos[0], origPos[1], origPos[2]);
        
        // Check visibility and LOD level
        const { detailLevel } = visibilityManagerRef.current.checkNodeVisibility(
          node.id,
          position
        );
        
        // Define isImportantNode once to avoid duplicates
        const isImportantNode = node.id === selectedNodeId ||
                               node.id === hoveredNodeId ||
                               connectedNodeIds.has(node.id);
                                
        // Always show all nodes regardless of culling
        // Forced visibility fix to prevent nodes from disappearing
        nodeMesh.visible = true;
        
        // Only hide force field for non-important nodes
        const forceMesh = forceFieldMeshRefs.current[i];
        if (forceMesh) {
          forceMesh.visible = isImportantNode;
        }
        
        // Adjust noise amount based on detail level
        let noiseAmount = 0.03; // Default
        
        switch (detailLevel) {
          case 'high':
            // Full detail for important nodes
            noiseAmount = 0.03;
            break;
          case 'medium':
            // Medium detail for medium distance
            noiseAmount = 0.02;
            break;
          case 'low':
            // Low detail for far distance
            noiseAmount = 0.01;
            break;
        }
        
        // Special case for important nodes - always high detail
        if (isImportantNode) {
          noiseAmount = 0.03;
        }
        
        // More consistent update frequency with prioritization for important nodes
        // Always update important nodes and those in high/medium detail levels
        const shouldUpdate =
          isImportantNode || // Always update important nodes
          detailLevel === 'high' || // Always update high detail nodes
          (detailLevel === 'medium' && frameCount.current % 2 === 0) || // Medium every 2nd frame
          (detailLevel === 'low' && frameCount.current % 3 === 0);  // Low every 3rd frame
          
        if (shouldUpdate) {
          // Apply subtle noise-based movement - with adaptive amplitude
          // Calculate noise values
          const nx = noise3D(origPos[0], origPos[1], origPos[2], time * 0.3);
          const ny = noise3D(origPos[0] + 100, origPos[1] + 100, origPos[2] + 100, time * 0.25);
          const nz = noise3D(origPos[0] + 200, origPos[1] + 200, origPos[2] + 200, time * 0.2);
          
          // Check if this is the minimap view
          if (props.isMinimap) {
            // For minimap: completely fixed positions - no movement at all
            // This provides absolute stability for the minimap view
            nodeMesh.position.set(
              origPos[0], // Exact original X position - no movement
              origPos[1], // Exact original Y position - no movement
              origPos[2]  // Exact original Z position - no movement
            );
          } else {
            // For main view: full 3D movement
            nodeMesh.position.set(
              origPos[0] + nx * noiseAmount,
              origPos[1] + ny * noiseAmount,
              origPos[2] + nz * noiseAmount
            );
          }
          nodeMesh.matrixAutoUpdate = true;
          
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
      
      // No need to update visible node count since we removed the display
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

        let isDesignatedStartingNode = false;
        let labelText = '';

        if (isInitialChoicePhase) {
          if (node.contentSource === 'arch-discovery.md') {
            isDesignatedStartingNode = true;
            labelText = 'Choice';
          } else if (node.contentSource === 'algo-awakening.md') {
            isDesignatedStartingNode = true;
            labelText = 'Awakening';
          } else if (node.contentSource === 'human-discovery.md') {
            isDesignatedStartingNode = true;
            labelText = 'Discovery';
          }
        }
        
        // Calculate node color using our more permissive function
        const nodeColor = getNodeColor(node.character).clone();
        
        // Apply color adjustments based on node state
        if (isSelected) {
          nodeColor.multiplyScalar(1.5); // Lighter shade
        } else if (isConnected) {
          nodeColor.multiplyScalar(0.5); // Darker shade
        } else if (isHovered) {
          nodeColor.multiplyScalar(1.2); // Slightly lighter for hover
        } else if (isDesignatedStartingNode) {
          // Potentially give starting nodes a distinct look even if not selected/hovered,
          // or this could be handled by the pulsing effect later.
          // For now, let's ensure they don't get dimmed like 'isConnected' if they are also connected.
          // This logic might need refinement based on how visual effects are combined.
          // If it's a starting node, we might want its base color to be more prominent.
          // Example: nodeColor.multiplyScalar(1.1); // Slightly brighter if it's a starting node
        }
        
        // The main node group's position is determined by nodePositions,
        // but individual elements within this group (like the sphere and text) will be positioned relatively.
        return (
          <group key={node.id} position={position}>
            {isDesignatedStartingNode && isInitialChoicePhase && !props.isMinimap && labelText && (
              <Text
                position={[0, 0.8, 0]} // Position slightly above the node sphere
                fontSize={0.35} // Slightly increased font size
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.02}
                outlineColor="#000000"
                material-depthTest={false} // Ensures text is visible
                material-transparent={true}
              >
                {labelText}
              </Text>
            )}

            {/* Force field effect (only visible when hovered or selected) */}
            {(isHovered || isSelected) && (
              <mesh
                ref={(mesh) => {
                  if (mesh) {
                    forceFieldMeshRefs.current[index] = mesh;
                  }
                }}
                // Position is now relative to the parent group, so [0,0,0] for the force field center
                position={[0, 0, 0]}>
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
                // Position is now relative to the parent group, so [0,0,0] for the node sphere center
                position={[0, 0, 0]}
              onClick={(e) => {
                e.stopPropagation();
                
                // Emit custom event to hide tooltip when a node is clicked
                const nodeUnhoverEvent = new CustomEvent('node-unhover');
                window.dispatchEvent(nodeUnhoverEvent);

                if (isInitialChoicePhase) {
                  if (isDesignatedStartingNode) {
                    dispatch(setInitialChoicePhaseCompleted());
                    // Proceed with navigation for starting node
                    dispatch(nodeSelected(node.id));
                    dispatch(visitNode(node.id));
                    dispatch(setViewMode('reading'));
                    dispatch(navigateToNode({
                      nodeId: node.id,
                      character: node.character,
                      temporalValue: node.temporalValue,
                      attractors: node.strangeAttractors,
                    }));
                  }
                  // If in initial choice phase but not a designated starting node, do nothing.
                } else {
                  // Normal click logic (outside initial choice phase)
                  if (onNodeClick) { // This path is typically for MiniConstellation
                    if (clickableNodeIds && !clickableNodeIds.includes(node.id)) {
                      return;
                    }
                    onNodeClick(node.id);
                  } else { // This path is for the main ConstellationView
                    if (selectedNodeId === null) { // If no node is selected, any node can be clicked
                      dispatch(nodeSelected(node.id));
                      dispatch(visitNode(node.id));
                      dispatch(setViewMode('reading'));
                      dispatch(navigateToNode({
                        nodeId: node.id,
                        character: node.character,
                        temporalValue: node.temporalValue,
                        attractors: node.strangeAttractors,
                      }));
                    } else { // If a node is already selected, only connected nodes can be clicked
                      const isConnectedToCurrentSelected = connections.some(
                        (c) =>
                          (c.start === selectedNodeId && c.end === node.id) ||
                          (c.start === node.id && c.end === selectedNodeId)
                      );
                      if (isConnectedToCurrentSelected) {
                        dispatch(nodeSelected(node.id));
                        dispatch(visitNode(node.id));
                        dispatch(setViewMode('reading'));
                        dispatch(navigateToNode({
                          nodeId: node.id,
                          character: node.character,
                          temporalValue: node.temporalValue,
                          attractors: node.strangeAttractors,
                        }));
                      }
                    }
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
              
              // Fix for stuck hover: Add pointer leave event
              onPointerLeave={(e) => {
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
      
      {/* Performance display removed */}
    </group>
  );
});