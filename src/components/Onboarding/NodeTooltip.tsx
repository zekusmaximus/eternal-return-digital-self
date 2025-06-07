import React, { useState, useEffect } from 'react';
import './Onboarding.css';

interface NodeTooltipProps {
  text: string;
  position: { x: number; y: number } | null;
}

const NodeTooltip: React.FC<NodeTooltipProps> = ({ text, position }) => {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    if (position) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [position]);

  if (!visible || !position) return null;

  const tooltipStyle: React.CSSProperties = {
    left: position.x + 'px',
    top: (position.y - 40) + 'px', // Position above the node
    opacity: visible ? 1 : 0
  };

  return (
    <div className="node-tooltip" style={tooltipStyle}>
      {text}
    </div>
  );
};

export default NodeTooltip;