/**
 * Simplified NodeView Component
 * Uses the new architecture with clean separation of concerns
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import { selectCurrentNodeId, SimpleReaderState } from '../../infrastructure/state/slices/readerSlice';
import { selectCurrentContent, selectContentLoading, ContentState } from '../../infrastructure/state/slices/contentSlice';
import { selectViewMode, returnToConstellation } from '../../store/slices/interfaceSlice';
import { useAppDispatch } from '../../store/hooks';
import { useNewArchitecture } from '../../hooks/useNewArchitecture';
import { Character, StrangeAttractor, TemporalLabel } from '../../types';
import './NodeView.css';

// Node data interface (would come from a service in full implementation)
interface NodeData {
  id: string;
  title: string;
  character: Character;
  temporalValue: number;
  contentSource: string;
  strangeAttractors: StrangeAttractor[];
}

// Mock node data - in real implementation, this would come from a node service
const mockNodeData: Record<string, NodeData> = {
  'arch-discovery': {
    id: 'arch-discovery',
    title: 'Patterns in Decay',
    character: 'Archaeologist',
    temporalValue: 1,
    contentSource: 'arch-discovery.md',
    strangeAttractors: ['recursion-pattern', 'memory-fragment', 'quantum-uncertainty'],
  },
  'algo-awakening': {
    id: 'algo-awakening',
    title: 'First Consciousness',
    character: 'Algorithm',
    temporalValue: 2,
    contentSource: 'algo-awakening.md',
    strangeAttractors: ['recursion-chamber', 'identity-pattern'],
  },
  'human-discovery': {
    id: 'human-discovery',
    title: 'Ruins of Memory',
    character: 'LastHuman',
    temporalValue: 3,
    contentSource: 'human-discovery.md',
    strangeAttractors: ['recognition-pattern', 'memory-artifact', 'recursive-symbol'],
  },
};

const SimplifiedNodeView: React.FC = () => {
  const dispatch = useAppDispatch();
  const { navigateUseCase } = useNewArchitecture();
  
  const viewMode = useSelector(selectViewMode);
  const currentNodeId = useSelector((state: { reader: SimpleReaderState }) => selectCurrentNodeId(state));
  const content = useSelector((state: { content: ContentState }) =>
    currentNodeId ? selectCurrentContent(state, currentNodeId) : null
  );
  const isLoading = useSelector((state: { content: ContentState }) =>
    currentNodeId ? selectContentLoading(state, currentNodeId) : false
  );

  const [error, setError] = useState<string | null>(null);
  const [nodeData, setNodeData] = useState<NodeData | null>(null);

  // Get temporal layer from temporal value
  const getTemporalLayer = (temporalValue: number): TemporalLabel => {
    if (temporalValue <= 3) return 'past';
    if (temporalValue <= 6) return 'present';
    return 'future';
  };

  // Load node data when currentNodeId changes
  useEffect(() => {
    if (currentNodeId && mockNodeData[currentNodeId]) {
      setNodeData(mockNodeData[currentNodeId]);
      setError(null);
    } else if (currentNodeId) {
      setError(`Node ${currentNodeId} not found`);
      setNodeData(null);
    }
  }, [currentNodeId]);

  // Navigate to node when nodeData is available
  useEffect(() => {
    if (nodeData && currentNodeId) {
      const navigateToNode = async () => {
        try {
          const result = await navigateUseCase.execute({
            nodeId: nodeData.id,
            character: nodeData.character,
            temporalLayer: getTemporalLayer(nodeData.temporalValue),
            contentSource: nodeData.contentSource,
            attractors: nodeData.strangeAttractors,
          });

          if (!result.success && result.error) {
            setError(result.error);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          setError(`Failed to navigate to node: ${message}`);
        }
      };

      navigateToNode();
    }
  }, [nodeData, currentNodeId, navigateUseCase]);

  const handleReturnToConstellation = useCallback(() => {
    dispatch(returnToConstellation());
  }, [dispatch]);

  // Don't render if not in reading mode or no node selected
  if (viewMode !== 'reading' || !currentNodeId || !nodeData) {
    return null;
  }

  const characterClass = `${nodeData.character.toLowerCase()}-theme`;
  const temporalClass = nodeData.temporalValue <= 3 ? 'past-indicator' : 
                       nodeData.temporalValue <= 6 ? 'present-indicator' : 'future-indicator';

  return (
    <div className={`node-view-container ${characterClass}`}>
      <div className={`temporal-indicator ${temporalClass}`}></div>

      <div className="node-header">
        <h1>{nodeData.title}</h1>
        <div className="node-metadata">
          <span className="node-character">{nodeData.character}</span>
          <span className="node-temporal">Temporal: {nodeData.temporalValue}</span>
        </div>
      </div>

      <div className="node-content">
        {error && (
          <div className="error-message">
            <p>Error: {error}</p>
          </div>
        )}

        {isLoading && (
          <div className="content-loading">
            <div className="loading-spinner"></div>
            <p>Loading content...</p>
          </div>
        )}

        {content && !isLoading && (
          <div 
            className="content-container"
            dangerouslySetInnerHTML={{ __html: content }}
          />
        )}

        {!content && !isLoading && !error && (
          <div className="no-content">
            <p>No content available</p>
          </div>
        )}
      </div>

      <div className="node-navigation">
        <button onClick={handleReturnToConstellation} className="navigation-button">
          Return to Constellation
        </button>
      </div>

      {/* Simple transformation indicator */}
      <div className="transformation-status">
        <div className="status-indicator">
          <span className={`status-dot ${content ? 'status-green' : 'status-red'}`} 
                title="Content loaded"></span>
          <span className={`status-dot ${isLoading ? 'status-yellow' : 'status-green'}`} 
                title="Loading status"></span>
          <span className={`status-dot ${error ? 'status-red' : 'status-green'}`} 
                title="Error status"></span>
        </div>
      </div>
    </div>
  );
};

export default SimplifiedNodeView;