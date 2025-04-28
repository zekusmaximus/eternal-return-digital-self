// src/components/NodeView/NodeView.tsx

import { useEffect, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentNodeId } from '../../store/slices/readerSlice';
import { setViewMode } from '../../store/slices/interfaceSlice';
import useNodeState from '../../hooks/useNodeState';
import MiniConstellation from './MiniConstellation';
import MarginaliaSidebar from './MarginaliaSidebar';
import { getContentPath, ContentMappingKeys } from '../../config/contentMapping'; // Import ContentMappingKeys here
import './NodeView.css';

// Type for content loading state
interface ContentState {
  loading: boolean;
  content: string;
  error: string | null;
}

// Text transformation functions
const transformText = (text: string, state: string) => {
  if (state === 'visited') {
    return text;
  } else if (state === 'revisited') {
    // Add emphasis to certain phrases
    return text.replace(
      /(memory|pattern|recursive|identity|consciousness|digital|evolution|perception|fragment|cycle|quantum)/gi,
      '<span class="emphasized">$1</span>'
    );
  } else if (state === 'complex') {
    // Add some fragmentation
    const emphasizedText = text.replace(
      /(memory|pattern|recursive|identity|consciousness|digital|evolution|perception|fragment|cycle|quantum)/gi,
      '<span class="emphasized">$1</span>'
    );
    
    return emphasizedText.replace(
      /\.(.*?)\./g,
      '.<span class="fragmented-text">$1</span>.'
    );
  } else if (state === 'fragmented') {
    // Add meta-comments
    const emphasizedText = text.replace(
      /(memory|pattern|recursive|identity|consciousness|digital|evolution|perception|fragment|cycle|quantum)/gi,
      '<span class="emphasized">$1</span>'
    );
    
    const fragmentedText = emphasizedText.replace(
      /\.(.*?)\./g,
      '.<span class="fragmented-text">$1</span>.'
    );
    
    return fragmentedText.replace(
      /\n\n/g,
      '\n\n<div class="meta-comment">[THE OBSERVER BECOMES PART OF THE PATTERN]</div>\n\n'
    );
  }
  return text;
};

const NodeView = () => {
  const dispatch = useDispatch();
  const currentNodeId = useSelector(selectCurrentNodeId);
  const { node, navigateTo, neighbors } = useNodeState(currentNodeId || undefined);
  
  // State for content loading
  const [contentState, setContentState] = useState<ContentState>({
    loading: true,
    content: '',
    error: null
  });
  
  // Load and transform content when node changes
  useEffect(() => {
    if (!node) return;
    
    const loadContent = async () => {
      setContentState(prev => ({ ...prev, loading: true }));
      
      try {
        // Use getContentPath to get the content path based on node ID
        const contentPath = getContentPath(node.id as ContentMappingKeys);
        
        if (!contentPath) {
          throw new Error(`No content path found for node ID: ${node.id}`);
        }
        
        const response = await fetch(contentPath);
        
        if (!response.ok) {
          throw new Error(`Failed to load content for ${node.id}: ${response.statusText}`);
        }
        
        const rawContent = await response.text();
        
        // Apply transformations based on node state
        const transformed = transformText(rawContent, node.currentState);
        
        setContentState({
          loading: false,
          content: transformed,
          error: null
        });
      } catch (error) {
        console.error('Error loading node content:', error);
        setContentState({
          loading: false,
          content: '',
          error: `Failed to load content for ${node.title}. Please try again.`
        });
      }
    };
    
    loadContent();
  }, [node]);
  
  // Handle return to constellation view
  const handleReturnToConstellation = () => {
    dispatch(setViewMode('constellation'));
  };
  
  // Handle navigation to a connected node
  const handleNavigateToNode = (nodeId: string) => {
    navigateTo(nodeId);
  };
  
  if (!node) {
    return (
      <div className="node-view-container">
        <div className="node-loading">
          <span>Loading...</span>
        </div>
      </div>
    );
  }
  
  // Get character-specific class for styling
  const characterClass = `${node.character.toLowerCase()}-theme`;
  
  // Get temporal position based on value
  const getTemporalClass = () => {
    if (node.temporalValue <= 3) return 'past-indicator';
    if (node.temporalValue <= 6) return 'present-indicator';
    return 'future-indicator';
  };
  
  // Render the node content with loading and error states
  const renderNodeContent = () => {
    if (contentState.loading) {
      return (
        <div className="node-loading">
          <span>Loading narrative fragment...</span>
        </div>
      );
    }
    
    if (contentState.error) {
      return (
        <div className="node-error">
          <p>{contentState.error}</p>
          <button onClick={() => navigateTo(node.id)} className="retry-button">
            Retry
          </button>
        </div>
      );
    }
    
    return (
      <div 
        className={`content-container ${node.currentState}`}
        dangerouslySetInnerHTML={{ __html: contentState.content }}
      />
    );
  };
  
  return (
    <div className={`node-view-container ${characterClass}`}>
      <div className={`temporal-indicator ${getTemporalClass()}`}></div>

      <div className="node-header">
        <h1>{node.title}</h1>
        <div className="node-metadata">
          <span className="node-character">{node.character}</span>
          <span className="node-state">{node.currentState}</span>
          <span className="node-visits">Visits: {node.visitCount}</span>
        </div>
      </div>
      
      <div className="node-content">
        {renderNodeContent()}
      </div>
      
      <div className="node-navigation">
        <button onClick={handleReturnToConstellation} className="navigation-button">
          Return to Constellation
        </button>
        
        <div className="connection-buttons">
          {neighbors.map(neighborId => (
            <button 
              key={neighborId}
              onClick={() => handleNavigateToNode(neighborId)}
              className="navigation-button connection-button"
            >
              Navigate to {neighborId}
            </button>
          ))}
        </div>
      </div>
      
      {/* Mini constellation for context */}
      <div className="mini-constellation">
        <MiniConstellation 
          currentNodeId={node.id} 
          onNodeSelect={handleNavigateToNode} 
        />
      </div>
      
      {/* Sidebar with marginalia */}
      <MarginaliaSidebar 
        nodeId={node.id}
        strangeAttractors={node.strangeAttractors}
      />
    </div>
  );
};

export default NodeView;