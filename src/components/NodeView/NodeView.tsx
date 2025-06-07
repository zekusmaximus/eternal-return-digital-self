// src/components/NodeView/NodeView.tsx

import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  selectSelectedNodeId,
  returnToConstellation,
  selectViewMode,
} from '../../store/slices/interfaceSlice';
import { loadNodeContent, selectNodeById, visitNode } from '../../store/slices/nodesSlice';
import { useAppDispatch } from '../../store/hooks';
import MiniConstellation from './MiniConstellation';
import MarginaliaSidebar from './MarginaliaSidebar';
import NarramorphRenderer from './NarramorphRenderer';
import './NodeView.css';
import { RootState } from '../../store';

const NodeView = () => {
  const dispatch = useAppDispatch();
  const selectedNodeId = useSelector(selectSelectedNodeId);
  const viewMode = useSelector(selectViewMode);
  const node = useSelector((state: RootState) => selectedNodeId ? selectNodeById(state, selectedNodeId) : null);
  
  // State to control transition between ReactMarkdown and NarramorphRenderer
  // Moved to top level before any conditional returns
  const [useNarramorph, setUseNarramorph] = useState(false);

  // Effect to load content if needed
  useEffect(() => {
    if (selectedNodeId && (!node?.content || !node?.currentContent)) {
      dispatch(loadNodeContent(selectedNodeId));
    }
  }, [selectedNodeId, node, dispatch]);
  
  // Separate effect to track node visits - only runs when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      dispatch(visitNode(selectedNodeId));
    }
  }, [selectedNodeId, dispatch]); // Removed node dependency to prevent infinite loop
  
  // Effect to enable Narramorph transformations after content is loaded
  // Moved to top level before any conditional returns
  useEffect(() => {
    if (node?.currentContent) {
      // Short delay to ensure content is loaded before applying transformations
      const timer = setTimeout(() => {
        setUseNarramorph(true);
      }, 100);
      
      return () => clearTimeout(timer);
    }
    return undefined; // Explicit return for when condition is false
  }, [node?.currentContent]);
  
  // Handle return to constellation view
  const handleReturnToConstellation = () => {
    dispatch(returnToConstellation());
  };

  if (viewMode !== 'reading' || !node) {
    return null;
  }

  const characterClass = `${node.character.toLowerCase()}-theme`;

  const getTemporalClass = () => {
    if (node.temporalValue <= 3) return 'past-indicator';
    if (node.temporalValue <= 6) return 'present-indicator';
    return 'future-indicator';
  };

  const renderNodeContent = () => {
    if (!node.currentContent) {
      return (
        <div className="node-loading">
          <span>Loading narrative fragment...</span>
        </div>
      );
    }

    // Use Narramorph renderer if enabled, otherwise use ReactMarkdown
    return (
      <div className={`content-container ${node.currentState}`}>
        {useNarramorph ? (
          <NarramorphRenderer nodeId={node.id} />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.currentContent}</ReactMarkdown>
        )}
      </div>
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
      </div>
      
      {/* Mini constellation for context */}
      <div className="mini-constellation">
        <MiniConstellation 
          currentNodeId={node.id}
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