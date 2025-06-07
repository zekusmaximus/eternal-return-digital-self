import { useState, useEffect } from 'react';
import IntroductionOverlay from './IntroductionOverlay';
import NodeTooltip from './NodeTooltip';
import HelpIcon from './HelpIcon';
import './Onboarding.css';

// Custom event types
interface NodeHoverEvent extends Event {
  detail: {
    position: { x: number; y: number };
    nodeId: string;
  };
}

const Onboarding: React.FC = () => {
  const [showIntro, setShowIntro] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState<{ x: number; y: number } | null>(null);
  // Check if user has seen the intro before
  useEffect(() => {
    const hasSeenIntro = localStorage.getItem('hasSeenIntro') === 'true';
    setShowIntro(!hasSeenIntro);
    
    // Add a class to the document for initial node pulse animation
    if (!hasSeenIntro) {
      document.body.classList.add('first-visit');
      
      // Remove the class after animation completes
      const timer = setTimeout(() => {
        document.body.classList.remove('first-visit');
      }, 8000); // Animation runs 3 times at 2s each plus some buffer
      
      return () => clearTimeout(timer);
    }
  }, []);

  // Handle tooltip positioning based on custom events
  useEffect(() => {
    const handleNodeHover = (e: Event) => {
      const customEvent = e as NodeHoverEvent;
      if (customEvent.detail && customEvent.detail.position) {
        setTooltipPosition(customEvent.detail.position);
      }
    };

    const handleNodeUnhover = () => {
      setTooltipPosition(null);
    };

    // Add event listeners for custom node hover events
    window.addEventListener('node-hover', handleNodeHover);
    window.addEventListener('node-unhover', handleNodeUnhover);

    return () => {
      window.removeEventListener('node-hover', handleNodeHover);
      window.removeEventListener('node-unhover', handleNodeUnhover);
    };
  }, []);

  const handleCloseIntro = () => {
    setShowIntro(false);
  };

  const handleResetIntro = () => {
    setShowIntro(true);
  };

  return (
    <>
      {showIntro && <IntroductionOverlay onClose={handleCloseIntro} />}
      <NodeTooltip 
        text="Click to explore this node" 
        position={tooltipPosition} 
      />
      <HelpIcon onResetIntro={handleResetIntro} />
    </>
  );
};

export default Onboarding;