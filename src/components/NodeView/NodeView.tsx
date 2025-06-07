// src/components/NodeView/NodeView.tsx

import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  selectSelectedNodeId,
  returnToConstellation,
  selectViewMode,
} from '../../store/slices/interfaceSlice';
import { loadNodeContent, selectNodeById } from '../../store/slices/nodesSlice';
import { useAppDispatch } from '../../store/hooks';
import MiniConstellation from './MiniConstellation';
import MarginaliaSidebar from './MarginaliaSidebar';
import './NodeView.css';
import { RootState } from '../../store';

const NodeView = () => {
  const dispatch = useAppDispatch();
  const selectedNodeId = useSelector(selectSelectedNodeId);
  const viewMode = useSelector(selectViewMode);
  const node = useSelector((state: RootState) => selectedNodeId ? selectNodeById(state, selectedNodeId) : null);

  useEffect(() => {
    if (selectedNodeId && (!node?.content || !node?.currentContent)) {
      dispatch(loadNodeContent(selectedNodeId));
    }
  }, [selectedNodeId, node, dispatch]);
  
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

    return (
      <div className={`content-container ${node.currentState}`}>
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{node.currentContent}</ReactMarkdown>
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