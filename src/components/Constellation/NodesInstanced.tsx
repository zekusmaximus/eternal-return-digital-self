 import { useDispatch, useSelector } from 'react-redux';
import {
  nodeHovered,
  nodeUnhovered,
  selectHoveredNodeId,
  selectSelectedNodeId,
  nodeSelected,
  setViewMode,
  // Removed incorrect import
} from '../../store/slices/interfaceSlice';
import { navigateToNode } from '../../store/slices/readerSlice';
import { visitNode } from '../../store/slices/nodesSlice';
import { AppDispatch } from '../../store';
import { ConstellationNode, NodePositions } from '../../types';
import { forwardRef, useMemo, useRef } from 'react';
import { Color, InstancedMesh, ShaderMaterial } from 'three';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import type { ThreeEvent } from '@react-three/fiber';
import { Text } from '@react-three/drei';


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
  positionSynchronizer: {
    updatePositions: (time: number, isMinimap?: boolean) => { [key: string]: [number, number, number] };
    getCurrentPositions: () => { [key: string]: [number, number, number] };
  };
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


export const NodesInstanced = forwardRef<InstancedMesh, NodesInstancedProps>((props, ref) => {
  const {
    nodes,
    nodePositions,
    connections,
    overrideSelectedNodeId,
    onNodeClick,
    clickableNodeIds,
    isInitialChoicePhase,
    positionSynchronizer,
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
  
  
  // Update shader time uniform and apply noise movement with optimized LOD
  // Frame counter for throttling updates
  const frameCount = useRef(0);
  const lastUpdatePositionsTime = useRef(0);
  const lastUpdateMaterialsTime = useRef(0);
  
  // Enhanced optimization: Using variable update rates based on priority
  useFrame((state): void => {
    const time = state.clock.elapsedTime;
    frameCount.current += 1;
    
    // Get synchronized positions from the position synchronizer
    const currentPositions = positionSynchronizer.updatePositions(time, props.isMinimap);
      
    // All nodes are always visible, no need for validation
    
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
    
    // SYNC FIX: Ensure we update positions on the same frames as ConnectionsBatched
    // This is critical for keeping nodes and connections aligned
    const timeSinceLastPositionUpdate = time - lastUpdatePositionsTime.current;
    // CRITICAL SYNC FIX: Use same update interval as ConnectionsBatched
    const UPDATE_INTERVAL = 0.15; // 150ms in seconds
    const shouldUpdatePositions = timeSinceLastPositionUpdate >= UPDATE_INTERVAL;
    
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
        
        // Always update all nodes
        const shouldUpdate = true;
        const isImportantNode = node.id === selectedNodeId ||
                               node.id === hoveredNodeId ||
                               connectedNodeIds.has(node.id);
        
        // Always show the node
        nodeMesh.visible = true;
        
        // Show force field only for important nodes
        const forceMesh = forceFieldMeshRefs.current[i];
        if (forceMesh) {
          forceMesh.visible = isImportantNode;
        }
          
        if (shouldUpdate) {
          // CRITICAL FIX: Use synchronized positions from the position synchronizer
          const syncedPos = currentPositions[node.id];
          
          if (syncedPos) {
            // Use the synchronized position directly - NO additional noise calculation
            nodeMesh.position.set(syncedPos[0], syncedPos[1], syncedPos[2]);
          } else {
            // Fallback to original position if synchronized position is not available
            console.warn(`NodesInstanced: Missing synchronized position for node ${node.id}`);
            nodeMesh.position.set(origPos[0], origPos[1], origPos[2]);
          }
          
          // Update force field position only if it exists and node is important
          const forceMesh = forceFieldMeshRefs.current[i];
          if (forceMesh && isImportantNode) {
            forceMesh.visible = true;
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
          <group
            key={node.id}
            position={[0, 0, 0]} // CRITICAL FIX: Group stays at origin, mesh handles all positioning
            userData={{ nodeId: node.id }} // Add nodeId to userData for connection positioning
          >
            {isDesignatedStartingNode && isInitialChoicePhase && !props.isMinimap && labelText && (
              <Text
                position={[0, 1.6, 0]} // Position above the larger node sphere
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
                <sphereGeometry args={[1.4, 16, 16]} />
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
              onClick={(e: ThreeEvent<MouseEvent>) => {
                if (e.stopPropagation) e.stopPropagation();

                // Emit custom event to hide tooltip when a node is clicked
                const nodeUnhoverEvent = new CustomEvent('node-unhover');
                window.dispatchEvent(nodeUnhoverEvent);

                if (isInitialChoicePhase) {
                  if (isDesignatedStartingNode) {
                    // Dispatch actions in sequence with proper error handling
                    try {
                      dispatch(nodeSelected(node.id));
                      dispatch(visitNode(node.id));
                      dispatch(setViewMode('reading'));
                      dispatch(navigateToNode({
                        nodeId: node.id,
                        character: node.character,
                        temporalValue: node.temporalValue,
                        attractors: node.strangeAttractors,
                      }));
                    } catch (error) {
                      console.error('Navigation error:', error);
                    }
                  }
                  return; // Exit early if in initial choice phase
                }
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
              }}
              onPointerOver={(e: ThreeEvent<PointerEvent>) => {
                if (e.stopPropagation) e.stopPropagation();
                if (node.id !== hoveredNodeId) {
                  dispatch(nodeHovered(node.id));
                  
                  // Determine if this node is clickable using the same logic as onClick
                  let isClickable = false;
                  
                  if (isInitialChoicePhase) {
                    // In initial choice phase, only designated starting nodes are clickable
                    isClickable = isDesignatedStartingNode;
                  } else {
                    // Normal click logic (outside initial choice phase)
                    if (onNodeClick) { // This path is typically for MiniConstellation
                      isClickable = !clickableNodeIds || clickableNodeIds.includes(node.id);
                    } else { // This path is for the main ConstellationView
                      if (selectedNodeId === null) { // If no node is selected, any node can be clicked
                        isClickable = true;
                      } else { // If a node is already selected, only connected nodes can be clicked
                        const isConnectedToCurrentSelected = connections.some(
                          (c) =>
                            (c.start === selectedNodeId && c.end === node.id) ||
                            (c.start === node.id && c.end === selectedNodeId)
                        );
                        isClickable = isConnectedToCurrentSelected;
                      }
                    }
                  }
                  
                  // Emit custom event for tooltip positioning
                  // Just use client coordinates from the event directly
                  const nodeHoverEvent = new CustomEvent('node-hover', {
                    detail: {
                      position: {
                        x: e.clientX,
                        y: e.clientY - 40 // Position tooltip 40px above cursor
                      },
                      nodeId: node.id,
                      isClickable: isClickable
                    }
                  });
                  window.dispatchEvent(nodeHoverEvent);
                }
              }}
              onPointerOut={(e: ThreeEvent<PointerEvent>) => {
                if (e.stopPropagation) e.stopPropagation();
                dispatch(nodeUnhovered());
                
                // Emit custom event for tooltip hiding
                const nodeUnhoverEvent = new CustomEvent('node-unhover');
                window.dispatchEvent(nodeUnhoverEvent);
              }}
              
              // Fix for stuck hover: Add pointer leave event
              onPointerLeave={(e: ThreeEvent<PointerEvent>) => {
                if (e.stopPropagation) e.stopPropagation();
                dispatch(nodeUnhovered());
                
                // Emit custom event for tooltip hiding
                const nodeUnhoverEvent = new CustomEvent('node-unhover');
                window.dispatchEvent(nodeUnhoverEvent);
              }}
            >
              {/* Use lower poly geometry for distant nodes */}
              {/* Performance optimization: Use lower poly geometry for distant nodes */}
              {!isSelected && !isHovered ? (
                <octahedronGeometry args={[1.0, 0]} /> // Lower poly for distant nodes - doubled size
              ) : (
                <sphereGeometry args={[1.0, 8, 8]} /> // Higher detail for selected/hovered - doubled size
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