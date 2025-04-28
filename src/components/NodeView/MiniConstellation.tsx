import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/types';
import { selectAllConnections } from '../../store/slices/nodesSlice';

interface MiniConstellationProps {
  currentNodeId: string;
  onNodeSelect: (nodeId: string) => void;
}

/**
 * A miniature version of the constellation view
 * Displayed in the corner of the node view for context and navigation
 */
const MiniConstellation: React.FC<MiniConstellationProps> = ({ 
  currentNodeId, 
  onNodeSelect 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  
  // Get all nodes from Redux store
  const nodes = useSelector((state: RootState) => 
    Object.values(state.nodes.data)
  ) as Array<{ id: string; temporalValue: number; character: string; currentState: string }>;
  
  // Get all connections
  const connections = useSelector(selectAllConnections);
  
  // Get dimensions
  const width = 200;
  const height = 200;
  const centerX = width / 2;
  
  // Calculate node positions based on temporal value and character
  // This is a simplified 2D positioning
  const getNodePosition = (temporalValue: number, character: string) => {
    // Calculate y position based on temporal value (1-9)
    // Lower values are positioned higher (past at top, future at bottom)
    const yPosition = 40 + (temporalValue * 15);
    
    // Calculate x position based on character
    let xOffset = 0;
    switch (character) {
      case 'Archaeologist':
        xOffset = -50;
        break;
      case 'Algorithm':
        xOffset = 0;
        break;
      case 'LastHuman':
        xOffset = 50;
        break;
    }
    
    return {
      x: centerX + xOffset,
      y: yPosition
    };
  };
  
  // Get color based on character
  const getNodeColor = (character: string): string => {
    switch (character) {
      case 'Archaeologist':
        return 'var(--archaeologist-primary)';
      case 'Algorithm':
        return 'var(--algorithm-primary)';
      case 'LastHuman':
        return 'var(--lasthuman-primary)';
      default:
        return '#cccccc';
    }
  };
  
  return (
    <svg 
      ref={svgRef} 
      width={width} 
      height={height} 
      className="mini-constellation-svg"
    >
      {/* Background */}
      <rect 
        x={0} 
        y={0} 
        width={width} 
        height={height} 
        fill="rgba(0,0,0,0.3)" 
      />
      
      {/* Draw connections between nodes */}
      {connections.map(connection => {
        const sourceNode = nodes.find(node => node.id === connection.source);
        const targetNode = nodes.find(node => node.id === connection.target);
        
        if (!sourceNode || !targetNode) return null;
        
        const sourcePos = getNodePosition(sourceNode.temporalValue, sourceNode.character);
        const targetPos = getNodePosition(targetNode.temporalValue, targetNode.character);
        
        // Highlight connections from current node
        const isActive = 
          connection.source === currentNodeId || 
          connection.target === currentNodeId;
        
        return (
          <line
            key={`${connection.source}-${connection.target}`}
            x1={sourcePos.x}
            y1={sourcePos.y}
            x2={targetPos.x}
            y2={targetPos.y}
            stroke={isActive ? 'var(--node-primary)' : '#333'}
            strokeWidth={isActive ? 1.5 : 0.5}
            opacity={isActive ? 0.8 : 0.4}
          />
        );
      })}
      
      {/* Draw nodes */}
      {nodes.map(node => {
        const position = getNodePosition(node.temporalValue, node.character);
        const isCurrentNode = node.id === currentNodeId;
        const nodeSize = isCurrentNode ? 10 : 6;
        
        return (
          <g
            key={node.id}
            transform={`translate(${position.x}, ${position.y})`}
            onClick={() => onNodeSelect(node.id)}
            className={`mini-node ${node.currentState} ${isCurrentNode ? 'current' : ''}`}
            style={{ cursor: 'pointer' }}
          >
            <circle
              r={nodeSize}
              fill={getNodeColor(node.character)}
              opacity={node.currentState === 'unvisited' ? 0.4 : 0.8}
              stroke={isCurrentNode ? 'white' : 'none'}
              strokeWidth={isCurrentNode ? 2 : 0}
            />
          </g>
        );
      })}
      
      {/* Legend */}
      <g transform="translate(10, 170)" className="mini-constellation-legend">
        <text 
          x="0" 
          y="0" 
          fill="white" 
          fontSize="8"
          opacity="0.7"
        >
          Current Node
        </text>
        <circle 
          cx="60" 
          cy="-3" 
          r="3" 
          fill="white" 
          stroke="white"
          strokeWidth="1"
        />
      </g>
    </svg>
  );
};

export default MiniConstellation;