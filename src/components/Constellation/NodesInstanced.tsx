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
import { forwardRef, useMemo, useRef, useState } from 'react';
import { Color, InstancedMesh, ShaderMaterial } from 'three';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
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
 triumvirateActive: boolean;
 triumvirateNodes: string[];
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

// Helper functions to reduce cognitive complexity

// Check if a node is a designated starting node
const isDesignatedStartingNode = (node: ConstellationNode): boolean => {
  return node.contentSource === 'arch-discovery.md' ||
         node.contentSource === 'algo-awakening.md' ||
         node.contentSource === 'human-discovery.md';
};

// Get label text for designated starting nodes
const getStartingNodeLabel = (node: ConstellationNode): string => {
  if (node.contentSource === 'arch-discovery.md') return 'The Archaeologist';
  if (node.contentSource === 'algo-awakening.md') return 'The Algorithm';
  if (node.contentSource === 'human-discovery.md') return 'The Last Human';
  return '';
};

// Get triumvirate text for nodes
const getTriumvirateText = (nodeId: string): string => {
  if (nodeId === 'arch-discovery') return 'Discovery';
  if (nodeId === 'algo-awakening') return 'Awakening';
  if (nodeId === 'human-discovery') return 'Choice';
  return '';
};

// Determine if a node is clickable based on current state
const isNodeClickable = (
  node: ConstellationNode,
  isDesignatedStarting: boolean,
  triumvirateActive: boolean,
  triumvirateNodeSet: Set<string>,
  isInitialChoicePhase: boolean,
  connections: { start: string; end: string }[],
  onNodeClick?: (nodeId: string) => void,
  clickableNodeIds?: string[],
  selectedNodeId?: string | null
): boolean => {
  if (triumvirateActive) {
    return triumvirateNodeSet.has(node.id);
  }
  
  if (isInitialChoicePhase) {
    return isDesignatedStarting;
  }
  
  if (onNodeClick) {
    return !clickableNodeIds || clickableNodeIds.includes(node.id);
  }
  
  if (selectedNodeId === null) {
    return true;
  }
  
  return connections.some(
    (c) => (c.start === selectedNodeId && c.end === node.id) ||
           (c.start === node.id && c.end === selectedNodeId)
  );
};

// Handle node navigation actions
const handleNodeNavigation = (
  dispatch: AppDispatch,
  node: ConstellationNode
): void => {
  dispatch(nodeSelected(node.id));
  dispatch(visitNode(node.id));
  dispatch(setViewMode('reading'));
  dispatch(navigateToNode({
    nodeId: node.id,
    character: node.character,
    temporalValue: node.temporalValue,
    attractors: node.strangeAttractors,
  }));
};

// Update node scaling with pulsing effect
const updateNodeScaling = (
  nodeMesh: THREE.Mesh,
  isPulsingNode: boolean,
  time: number,
  isMinimap?: boolean
): void => {
  if (isPulsingNode) {
    const pulseSpeed = 3;
    const pulseAmount = 0.15;
    const baseScale = 1.0;
    const targetScale = baseScale + Math.sin(time * pulseSpeed) * pulseAmount;
    nodeMesh.scale.set(targetScale, targetScale, targetScale);
  } else {
    const baseScale = isMinimap ? 0.5 : 1.0;
    if (nodeMesh.scale.x !== baseScale || nodeMesh.scale.y !== baseScale || nodeMesh.scale.z !== baseScale) {
      nodeMesh.scale.set(baseScale, baseScale, baseScale);
    }
  }
};

// Update material time uniforms
const updateMaterialUniforms = (
  materials: ShaderMaterial[],
  time: number
): void => {
  materials.forEach(material => {
    if (material?.uniforms?.time) {
      material.uniforms.time.value = time;
    }
  });
};

// Update text billboard behavior
const updateTextBillboards = (
  textRefs: THREE.Object3D[],
  camera: THREE.Camera
): void => {
  textRefs.forEach(text => {
    if (text && text.visible) {
      text.lookAt(camera.position);
    }
  });
};

// Helper function to handle node hover events
const handleNodeHover = (
  nodeId: string,
  isClickable: boolean,
  clientX: number,
  clientY: number
): void => {
  const nodeHoverEvent = new CustomEvent('node-hover', {
    detail: {
      position: {
        x: clientX,
        y: clientY - 40
      },
      nodeId,
      isClickable
    }
  });
  window.dispatchEvent(nodeHoverEvent);
};

// Helper function to handle node unhover events
const handleNodeUnhover = (): void => {
  const nodeUnhoverEvent = new CustomEvent('node-unhover');
  window.dispatchEvent(nodeUnhoverEvent);
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
    triumvirateActive,
    triumvirateNodes,
  } = props;
  const dispatch = useDispatch<AppDispatch>();
  const { camera } = useThree();
  
  const hoveredNodeId = useSelector(selectHoveredNodeId);
  const reduxSelectedNodeId = useSelector(selectSelectedNodeId);
  const selectedNodeId = overrideSelectedNodeId ?? reduxSelectedNodeId;

  const triumvirateNodeSet = useMemo(() => new Set(triumvirateNodes), [triumvirateNodes]);
  const triumvirateColorMap = useMemo(() => ({
    'arch-discovery': new Color('#66ff66'), // Green
    'algo-awakening': new Color('#6666ff'), // Blue
    'human-discovery': new Color('#ff6666'), // Red
  }), []);  const connectedNodeIds = useMemo(() => {
    if (isInitialChoicePhase || triumvirateActive) return triumvirateNodeSet;
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    connections.forEach((c) => {
      if (c.start === selectedNodeId) connected.add(c.end);
      if (c.end === selectedNodeId) connected.add(c.start);
    });
    return connected;
  }, [selectedNodeId, connections, triumvirateActive, triumvirateNodeSet, isInitialChoicePhase]);

  // State to track current node positions for positioning groups
  const [groupPositions, setGroupPositions] = useState<{[key: string]: [number, number, number]}>({});

  // Create refs for accessing objects in the scene
  const materialRefs = useRef<ShaderMaterial[]>([]);
  const forceFieldMaterialRefs = useRef<ShaderMaterial[]>([]);
  const nodeMeshRefs = useRef<THREE.Object3D[]>([]);
  const forceFieldMeshRefs = useRef<THREE.Object3D[]>([]);
  const labelTextRefs = useRef<THREE.Object3D[]>([]);
  const triumvirateTextRefs = useRef<THREE.Object3D[]>([]);
  
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
    // Separate function to handle material updates
  const handleMaterialUpdates = (time: number): void => {
    const shouldUpdateMaterials = time - lastUpdateMaterialsTime.current > 0.05; // 50ms
    if (!shouldUpdateMaterials) return;

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
    
    updateMaterialUniforms(importantMaterials, time);
    
    // Update force field materials only for selected/hovered nodes
    const importantForceFields = forceFieldMaterialRefs.current.filter((_, i) => {
      const node = nodes[i];
      return node && (node.id === selectedNodeId || node.id === hoveredNodeId);
    });
    
    updateMaterialUniforms(importantForceFields, time);
  };
  // Separate function to handle node position and scale updates
  const handleNodeUpdates = (time: number): void => {
    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];
      const nodeMesh = nodeMeshRefs.current[i] as THREE.Mesh;
      
      if (!nodeMesh || !originalPositions.current[node.id]) {
        continue;
      }

      // Determine if this node should pulse
      const shouldPulse = isInitialChoicePhase && 
                         !props.isMinimap && 
                         isDesignatedStartingNode(node);

      updateNodeScaling(nodeMesh, shouldPulse, time, props.isMinimap);
      
      const isImportantNode = node.id === selectedNodeId ||
                             node.id === hoveredNodeId ||
                             connectedNodeIds.has(node.id);
      
      // Always show the node
      nodeMesh.visible = true;
      nodeMesh.position.set(0, 0, 0);
      
      // Show force field only for important nodes
      const forceMesh = forceFieldMeshRefs.current[i];
      if (forceMesh) {
        forceMesh.visible = isImportantNode;
        if (isImportantNode) {
          forceMesh.position.set(0, 0, 0);
        }
      }
    }
  };

  // Enhanced optimization: Using variable update rates based on priority
  useFrame((state): void => {
    const time = state.clock.elapsedTime;
    frameCount.current += 1;
    
    // Get synchronized positions from the position synchronizer
    const currentPositions = positionSynchronizer.updatePositions(time, props.isMinimap);
    
    handleMaterialUpdates(time);
    
    // SYNC FIX: Ensure we update positions on the same frames as ConnectionsBatched
    // This is critical for keeping nodes and connections aligned
    const timeSinceLastPositionUpdate = time - lastUpdatePositionsTime.current;
    // CRITICAL SYNC FIX: Use same update interval as ConnectionsBatched
    const UPDATE_INTERVAL = 0.15; // 150ms in seconds
    const shouldUpdatePositions = timeSinceLastPositionUpdate >= UPDATE_INTERVAL;
      if (shouldUpdatePositions) {
      lastUpdatePositionsTime.current = time;
      
      handleNodeUpdates(time);
      
      // Update text billboard behavior - make text always face camera      updateTextBillboards(labelTextRefs.current, camera);
      updateTextBillboards(triumvirateTextRefs.current, camera);
      
      // Update group positions for next render
      setGroupPositions({ ...currentPositions });
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
        const isHovered = hoveredNodeId === node.id;        const isDesignatedStarting = isDesignatedStartingNode(node);
        const labelText = isInitialChoicePhase ? getStartingNodeLabel(node) : '';
        const triumvirateText = triumvirateActive && triumvirateNodes.includes(node.id) ? getTriumvirateText(node.id) : '';
          // Calculate node color using helper function
        const nodeColor = calculateNodeColor(
          node,
          isSelected,
          isConnected,
          isHovered,
          isInitialChoicePhase,
          triumvirateActive,
          triumvirateNodeSet,
          triumvirateColorMap
        );// The main node group's position is determined by synchronized positions,
        // and individual elements within this group (like the sphere and text) will be positioned relatively.
        const groupPosition = groupPositions[node.id] || originalPositions.current[node.id] || [0, 0, 0];
        
        return (
          <group
            key={node.id}
            position={groupPosition} // Position group at the node's current position
            userData={{ nodeId: node.id }} // Add nodeId to userData for connection positioning
          >
            {/* Text label for node - only for designated starting nodes in initial choice phase */}
            {isDesignatedStarting && isInitialChoicePhase && !triumvirateActive && !props.isMinimap && labelText && (
              <Text
                ref={(text) => {
                  if (text) {
                    labelTextRefs.current[index] = text;
                  }
                }}
                position={[0, 2.2, 0]} // Position higher above the node sphere
                fontSize={0.4} // Larger font size for better visibility
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.03}
                outlineColor="#000000"
                material-depthTest={false} // Ensures text is visible
                material-transparent={true}
                fontWeight="bold"
              >
                {labelText}
              </Text>
            )}

            {/* Triumvirate text labels */}
            {triumvirateActive && !props.isMinimap && triumvirateText && (
              <Text
                ref={(text) => {
                  if (text) {
                    triumvirateTextRefs.current[index] = text;
                  }
                }}
                position={[0, 2.2, 0]} // Position above the node sphere (relative to the group)
                fontSize={0.6} // Larger font size for better visibility
                color="white"
                anchorX="center"
                anchorY="middle"
                outlineWidth={0.05}
                outlineColor="#000000"
                material-depthTest={false} // Ensures text is visible
                material-transparent={true}
                fontWeight="bold"
              >
                {triumvirateText}
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
              position={[0, 0, 0]}              onClick={createNodeClickHandler(
                node,
                isDesignatedStarting,
                isInitialChoicePhase,
                dispatch,
                onNodeClick,
                clickableNodeIds,
                selectedNodeId,
                connections
              )}              onPointerOver={createNodeHoverHandler(
                node,
                isDesignatedStarting,
                props.isMinimap || false,
                triumvirateActive,
                triumvirateNodeSet,
                isInitialChoicePhase,
                dispatch,
                hoveredNodeId,
                onNodeClick,
                clickableNodeIds,
                selectedNodeId,
                connections
              )}              onPointerOut={(e: ThreeEvent<PointerEvent>) => {
                if (props.isMinimap) return;
                if (e.stopPropagation) e.stopPropagation();
                dispatch(nodeUnhovered());
                handleNodeUnhover();
              }}
              onPointerLeave={(e: ThreeEvent<PointerEvent>) => {
                if (props.isMinimap) return;
                if (e.stopPropagation) e.stopPropagation();
                dispatch(nodeUnhovered());
                handleNodeUnhover();
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
                transparent={true}
                depthWrite={false}
              />
            </mesh>
          </group>
        );
      })}
      
      {/* Performance display removed */}
    </group>
  );
});

// Helper function to calculate node color based on state
const calculateNodeColor = (
  node: ConstellationNode,
  isSelected: boolean,
  isConnected: boolean,
  isHovered: boolean,
  isInitialChoicePhase: boolean,
  triumvirateActive: boolean,
  triumvirateNodeSet: Set<string>,
  triumvirateColorMap: { [key: string]: Color }
): Color => {
  const nodeColor = getNodeColor(node.character).clone();
  
  if (isInitialChoicePhase) {
    if (triumvirateNodeSet.has(node.id)) {
      const color = triumvirateColorMap[node.id as keyof typeof triumvirateColorMap];
      if (color) {
        nodeColor.set(color);
      }
    } else {
      nodeColor.multiplyScalar(0.2); // Dim non-triumvirate nodes
    }
  } else if (triumvirateActive) {
    if (!triumvirateNodeSet.has(node.id)) {
      nodeColor.multiplyScalar(0.2); // Dim non-triumvirate nodes
    }
  } else if (isSelected) {
    nodeColor.multiplyScalar(1.5); // Lighter shade
  } else if (isConnected) {
    nodeColor.multiplyScalar(0.5); // Darker shade
  } else if (isHovered) {
    nodeColor.multiplyScalar(1.2); // Slightly lighter for hover
  }
  
  return nodeColor;
};

// Helper function to create onClick handler
const createNodeClickHandler = (
  node: ConstellationNode,
  isDesignatedStarting: boolean,
  isInitialChoicePhase: boolean,
  dispatch: AppDispatch,
  onNodeClick?: (nodeId: string) => void,
  clickableNodeIds?: string[],
  selectedNodeId?: string | null,
  connections?: { start: string; end: string }[]
) => (e: ThreeEvent<MouseEvent>) => {
  if (e.stopPropagation) e.stopPropagation();

  // Emit custom event to hide tooltip when a node is clicked
  handleNodeUnhover();

  if (isInitialChoicePhase) {
    if (isDesignatedStarting) {
      try {
        handleNodeNavigation(dispatch, node);
      } catch (error) {
        console.error('Navigation error:', error);
      }
    }
    return;
  }
  
  // Normal click logic (outside initial choice phase)
  if (onNodeClick) {
    if (clickableNodeIds && !clickableNodeIds.includes(node.id)) {
      return;
    }
    onNodeClick(node.id);
  } else {
    if (selectedNodeId === null) {
      handleNodeNavigation(dispatch, node);
    } else if (connections) {
      const isConnectedToCurrentSelected = connections.some(
        (c) =>
          (c.start === selectedNodeId && c.end === node.id) ||
          (c.start === node.id && c.end === selectedNodeId)
      );
      if (isConnectedToCurrentSelected) {
        handleNodeNavigation(dispatch, node);
      }
    }
  }
};

// Helper function to create onPointerOver handler
const createNodeHoverHandler = (
  node: ConstellationNode,
  isDesignatedStarting: boolean,
  isMinimap: boolean,
  triumvirateActive: boolean,
  triumvirateNodeSet: Set<string>,
  isInitialChoicePhase: boolean,
  dispatch: AppDispatch,
  hoveredNodeId?: string | null,
  onNodeClick?: (nodeId: string) => void,
  clickableNodeIds?: string[],  selectedNodeId?: string | null,
  connections?: { start: string; end: string }[]
) => (e: ThreeEvent<PointerEvent>) => {
  if (isMinimap) return;
  if (e.stopPropagation) e.stopPropagation();
  
  if (node.id !== hoveredNodeId) {
    dispatch(nodeHovered(node.id));
    
    const isClickable = isNodeClickable(
      node,
      isDesignatedStarting,
      triumvirateActive,
      triumvirateNodeSet,
      isInitialChoicePhase,
      connections || [],
      onNodeClick,
      clickableNodeIds,
      selectedNodeId
    );
    
    handleNodeHover(node.id, isClickable, e.clientX, e.clientY);
  }
};