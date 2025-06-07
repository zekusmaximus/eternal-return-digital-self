import { useState } from 'react';
import './Onboarding.css';

interface HelpIconProps {
  onResetIntro: () => void;
}

const HelpIcon: React.FC<HelpIconProps> = ({ onResetIntro }) => {
  const [showModal, setShowModal] = useState(false);

  const toggleModal = () => {
    setShowModal(!showModal);
  };

  const handleResetIntro = () => {
    localStorage.removeItem('hasSeenIntro');
    onResetIntro();
    setShowModal(false);
  };

  return (
    <>
      <div className="help-icon-container">
        <div className="help-icon" onClick={toggleModal}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm0-4h-2V7h2v8z" />
          </svg>
        </div>
      </div>

      {showModal && (
        <div className="help-modal">
          <div className="help-modal-content">
            <button className="help-modal-close" onClick={toggleModal}>×</button>
            <h2 className="help-modal-title">Navigation Guide</h2>
            
            <div className="help-instructions">
              <h3>Exploring the Constellation</h3>
              <p>
                Each node in the constellation represents a fragment of the narrative. 
                Click on a node to read its content and discover connections to other nodes.
              </p>
            </div>
            
            <div className="help-instructions">
              <h3>Navigation Controls</h3>
              <p>
                • Click and drag to rotate the constellation<br />
                • Scroll to zoom in and out<br />
                • Click connected nodes to navigate between narrative fragments
              </p>
            </div>
            
            <div className="help-instructions">
              <h3>Reading Experience</h3>
              <p>
                The story unfolds differently depending on your path through the constellation. 
                Revisit nodes to discover new patterns and connections.
              </p>
            </div>
            
            <button className="reset-intro-button" onClick={handleResetIntro}>
              Show Introduction Again
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default HelpIcon;