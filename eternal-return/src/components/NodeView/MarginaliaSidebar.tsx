import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { StrangeAttractor } from '../../types';
import { engageAttractor } from '../../store/slices/readerSlice';
import './NodeView.css';

interface MarginaliaSidebarProps {
  nodeId: string;
  strangeAttractors: StrangeAttractor[];
}

/**
 * Sidebar component that displays marginalia related to the current node,
 * including strange attractors, connections, and meta-narrative elements
 */
const MarginaliaSidebar: React.FC<MarginaliaSidebarProps> = ({ 
  nodeId, 
  strangeAttractors 
}) => {
  const dispatch = useDispatch();
  const [visible, setVisible] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);
  
  // Toggle sidebar visibility
  const toggleSidebar = () => {
    setVisible(!visible);
  };
  
  // Handle engagement with an attractor
  const handleAttractorClick = (attractor: StrangeAttractor) => {
    dispatch(engageAttractor(attractor));
    
    // Add a note based on the attractor
    // In a real implementation, this would be more sophisticated
    addNote(`Engaged with ${formatAttractorName(attractor)}`);
  };
  
  // Format attractor name for display
  const formatAttractorName = (attractor: StrangeAttractor): string => {
    return attractor
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };
  
  // Add a note to the marginalia
  const addNote = (note: string) => {
    setNotes(prev => [note, ...prev].slice(0, 10)); // Keep last 10 notes
  };
  
  // Initial sidebar content based on node
  useEffect(() => {
    if (nodeId) {
      // Add initial note based on node ID
      addNote(`Viewing node: ${nodeId}`);
    }
  }, [nodeId]);
  
  return (
    <div className={`marginalia-sidebar ${visible ? 'visible' : ''}`}>
      <div className="marginalia-toggle" onClick={toggleSidebar}>
        {visible ? '›' : '‹'}
      </div>
      
      <div className="marginalia-content">
        <h3 className="marginalia-header">Strange Attractors</h3>
        <div className="strange-attractors-list">
          {strangeAttractors.map(attractor => (
            <div 
              key={attractor}
              className="strange-attractor-item"
              onClick={() => handleAttractorClick(attractor)}
            >
              {formatAttractorName(attractor)}
            </div>
          ))}
        </div>
        
        <h3 className="marginalia-header">Reader Notes</h3>
        <div className="reader-notes">
          {notes.map((note, index) => (
            <div key={index} className="reader-note">
              {note}
              <div className="reader-note-timestamp">
                {new Date().toLocaleTimeString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarginaliaSidebar;