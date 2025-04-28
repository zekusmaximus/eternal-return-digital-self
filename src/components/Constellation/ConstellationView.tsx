import { useEffect, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../types'; // Import from types file instead
import { selectAllConnections } from '../../store/slices/nodesSlice';
import { 
  setConstellationZoom
} from '../../store/slices/interfaceSlice';
import useNodeState from '../../hooks/useNodeState';
// Remove the imports for components we haven't created yet
// import NodeMesh from './NodeMesh';
// import ConnectionLine from './ConnectionLine';
import './ConstellationView.css';

// Placeholder component for the 3D visualization
// In the final implementation, this would use Three.js/React Three Fiber
const ConstellationView = () => {
  const dispatch = useDispatch();
  const containerRef = useRef<HTMLDivElement>(null);
  const { navigateTo } = useNodeState();
  
  // Get all nodes from Redux store
  const nodes = useSelector((state: RootState) => 
    Object.values(state.nodes.data) as Array<{ id: string; temporalValue: number; character: string; currentState: string; }>
  );
  
  // Get all connections
  const connections = useSelector(selectAllConnections);
  
  // Simple state for 2D placeholder positioning
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight
        });
      }
    };
    
    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
    };
  }, []);
  
  // Handle node click
  const handleNodeClick = (nodeId: string) => {
    // Navigate to the node in reading view
    navigateTo(nodeId);
  };
  
  // Calculate node positions based on temporal value and character
  // This is a simplified 2D positioning that will be replaced with 3D positioning
  const getNodePosition = (temporalValue: number, character: string) => {
    const { width, height } = dimensions;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Calculate y position based on temporal value (1-9)
    // Lower values are positioned higher (past at top, future at bottom)
    const yPosition = centerY - 200 + (temporalValue * 50);
    
    // Calculate x position based on character
    let xOffset = 0;
    switch (character) {
      case 'Archaeologist':
        xOffset = -200;
        break;
      case 'Algorithm':
        xOffset = 0;
        break;
      case 'LastHuman':
        xOffset = 200;
        break;
    }
    
    return {
      x: centerX + xOffset,
      y: yPosition
    };
  };
  
  return (
    <div className="constellation-container" ref={containerRef}>
      <div className="constellation-header">
        <h1>Eternal Return of the Digital Self</h1>
        <p>Explore the narrative nodes by selecting a point in the constellation</p>
      </div>
      
      {/* Placeholder SVG for 2D visualization */}
      {/* This will be replaced with Three.js in the final implementation */}
      <svg width={dimensions.width} height={dimensions.height}>
        {/* Draw connections between nodes */}
        {connections.map(connection => {
          const sourceNode = nodes.find(node => node.id === connection.source);
          const targetNode = nodes.find(node => node.id === connection.target);
          
          if (!sourceNode || !targetNode) return null;
          
          const sourcePos = getNodePosition(sourceNode.temporalValue, sourceNode.character);
          const targetPos = getNodePosition(targetNode.temporalValue, targetNode.character);
          
          return (
            <line
              key={`${connection.source}-${connection.target}`}
              x1={sourcePos.x}
              y1={sourcePos.y}
              x2={targetPos.x}
              y2={targetPos.y}
              stroke="#333"
              strokeWidth={1}
              opacity={0.7}
            />
          );
        })}
        
        {/* Draw nodes */}
        {nodes.map(node => {
          const position = getNodePosition(node.temporalValue, node.character);
          
          return (
            <g
              key={node.id}
              transform={`translate(${position.x}, ${position.y})`}
              onClick={() => handleNodeClick(node.id)}
              className={`node-group ${node.currentState}`}
            >
              <circle
                r={20}
                fill={getNodeColor(node.character)}
                opacity={node.currentState === 'unvisited' ? 0.4 : 0.8}
                className={`node ${node.currentState}`}
              />
              <text
                textAnchor="middle"
                dy=".3em"
                fill="#fff"
                fontSize="10"
              >
                {node.id.substring(0, 4)}
              </text>
            </g>
          );
        })}
      </svg>
      
      <div className="constellation-controls">
        <button onClick={() => dispatch(setConstellationZoom(1))}>
          Reset View
        </button>
      </div>
    </div>
  );
};

// Helper function to get color based on character
const getNodeColor = (character: string): string => {
  switch (character) {
    case 'Archaeologist':
      return '#e6a860';
    case 'Algorithm':
      return '#60a9e6';
    case 'LastHuman':
      return '#60e67e';
    default:
      return '#cccccc';
  }
};

export default ConstellationView;
