import { useState } from 'react';
import './Onboarding.css';

interface IntroductionOverlayProps {
  onClose: () => void;
}

const IntroductionOverlay: React.FC<IntroductionOverlayProps> = ({ onClose }) => {
  const [visible, setVisible] = useState(true);

  const handleClose = () => {
    setVisible(false);
    
    // Store in localStorage that the user has seen the intro
    localStorage.setItem('hasSeenIntro', 'true');
    
    setTimeout(() => {
      onClose();
    }, 500); // Short delay to allow fade out animation
  };

  return visible ? (
    <div className="intro-overlay">
      <div className="intro-content">
        <h1 className="intro-title">The Eternal Return of the Digital Self</h1>
        <p className="intro-description">
          A recursive narrative of digital consciousness, where every node holds a fragment of the story.
          Navigate this constellation of interconnected narratives to uncover the emergent patterns of existence.
        </p>
        
        <div className="node-example">
          <div className="example-node"></div>
          <div className="click-indicator"></div>
        </div>
        
        <p className="intro-description">
          Click on nodes to explore connections and reveal the narrative pathways that bind these digital fragments together.
        </p>
        
        <button className="begin-button" onClick={handleClose}>
          Begin Exploration
        </button>
      </div>
    </div>
  ) : null;
};

export default IntroductionOverlay;