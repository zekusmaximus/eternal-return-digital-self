/**
 * Enhanced Strange Attractor Display Component
 * 
 * Provides rich visual feedback for the enhanced strange attractor system,
 * showing evolution stages, revelation status, cross-node influences,
 * and dynamic progression indicators.
 */

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from '../../store/hooks';
import { engageAttractor, selectCurrentNodeId } from '../../store/slices/readerSlice';
import { selectAllNodes } from '../../store/slices/nodesSlice';
import { enhancedStrangeAttractorSystem, AttractorEvolutionStage } from '../../services/EnhancedStrangeAttractorSystem';
import { triumvirateSystem } from '../../services/TriumvirateSystem';
import { StrangeAttractor, NodeState } from '../../types';
import { ReaderState } from '../../store/slices/readerSlice';
import './EnhancedAttractorDisplay.css';

interface EnhancedAttractorDisplayProps {
  /** Array of attractors associated with the current node */
  nodeAttractors: StrangeAttractor[];
  /** Display mode - compact for sidebar, full for dedicated view */
  displayMode?: 'compact' | 'full';
  /** Whether to show global attractor state or just node-specific */
  showGlobalState?: boolean;
}

/**
 * Enhanced Strange Attractor Display Component
 */
const EnhancedAttractorDisplay: React.FC<EnhancedAttractorDisplayProps> = ({
  nodeAttractors,
  displayMode = 'compact',
  showGlobalState = false
}) => {
  const dispatch = useAppDispatch();
  const currentNodeId = useSelector(selectCurrentNodeId);
  const allNodes = useSelector(selectAllNodes);
  const readerState = useSelector((state: { reader: ReaderState }) => state.reader);

  // Calculate enhanced attractor state
  const { attractorState, triumvirateState } = useMemo(() => {
    if (!currentNodeId || !allNodes || !readerState) {
      return { attractorState: null, triumvirateState: null };
    }

    // Convert array of nodes to Record<string, NodeState>
    const nodesRecord: Record<string, NodeState> = {};
    allNodes.forEach(node => {
      nodesRecord[node.id] = node;
    });

    const triumvirate = triumvirateSystem.calculateTriumvirateState(readerState, nodesRecord);
    const attractors = enhancedStrangeAttractorSystem.calculateEnhancedAttractorState(
      readerState,
      nodesRecord,
      triumvirate
    );

    return { attractorState: attractors, triumvirateState: triumvirate };
  }, [currentNodeId, allNodes, readerState]);

  // Handle attractor engagement
  const handleAttractorClick = (attractor: StrangeAttractor) => {
    dispatch(engageAttractor(attractor));
  };

  // Get evolution stage display properties
  const getEvolutionStageProps = (stage: AttractorEvolutionStage) => {
    switch (stage) {
      case 'dormant':
        return { className: 'evolution-dormant', symbol: '○', label: 'Dormant' };
      case 'emerging':
        return { className: 'evolution-emerging', symbol: '◔', label: 'Emerging' };
      case 'active':
        return { className: 'evolution-active', symbol: '◑', label: 'Active' };
      case 'dominant':
        return { className: 'evolution-dominant', symbol: '◕', label: 'Dominant' };
      case 'transcendent':
        return { className: 'evolution-transcendent', symbol: '●', label: 'Transcendent' };
      default:
        return { className: 'evolution-unknown', symbol: '?', label: 'Unknown' };
    }
  };

  // Format attractor name for display
  const formatAttractorName = (attractor: StrangeAttractor): string => {
    return attractor
      .replace(/-/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get resonance intensity class
  const getResonanceClass = (resonance: number): string => {
    if (resonance >= 0.8) return 'resonance-very-high';
    if (resonance >= 0.6) return 'resonance-high';
    if (resonance >= 0.4) return 'resonance-medium';
    if (resonance >= 0.2) return 'resonance-low';
    return 'resonance-very-low';
  };

  // Get influence strength class
  const getInfluenceClass = (influence: number): string => {
    if (influence >= 0.7) return 'influence-strong';
    if (influence >= 0.4) return 'influence-moderate';
    if (influence >= 0.1) return 'influence-weak';
    return 'influence-minimal';
  };

  if (!attractorState) {
    return (
      <div className="enhanced-attractor-display loading">
        <div className="loading-indicator">
          <span className="loading-symbol">◐</span>
          <span className="loading-text">Calculating attractor resonance...</span>
        </div>
      </div>
    );
  }

  const attractorsToShow = showGlobalState 
    ? Object.keys(attractorState.revealableAttractors) as StrangeAttractor[]
    : nodeAttractors;

  return (
    <div className={`enhanced-attractor-display ${displayMode}`}>
      {/* Global State Header (if showing global state) */}
      {showGlobalState && (
        <div className="global-state-header">
          <div className="global-metrics">
            <div className="metric">
              <span className="metric-label">Global Resonance</span>
              <div className={`metric-bar ${getResonanceClass(attractorState.globalResonance)}`}>
                <div 
                  className="metric-fill" 
                  style={{ width: `${attractorState.globalResonance * 100}%` }}
                />
              </div>
              <span className="metric-value">{Math.round(attractorState.globalResonance * 100)}%</span>
            </div>
            <div className="metric">
              <span className="metric-label">Evolution Momentum</span>
              <div className={`metric-bar ${getResonanceClass(attractorState.evolutionMomentum)}`}>
                <div 
                  className="metric-fill" 
                  style={{ width: `${attractorState.evolutionMomentum * 100}%` }}
                />
              </div>
              <span className="metric-value">{Math.round(attractorState.evolutionMomentum * 100)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Attractor List */}
      <div className="attractors-list">
        {attractorsToShow.map(attractor => {
          const attractorData = attractorState.revealableAttractors[attractor];
          if (!attractorData) return null;

          const evolutionProps = getEvolutionStageProps(attractorData.evolutionStage);
          const isNodeAttractor = nodeAttractors.includes(attractor);
          const resonanceClass = getResonanceClass(attractorData.resonanceStrength);
          // Note: crossNodeInfluence is not available in RevealableAttractor, using resonanceStrength as fallback
          const influenceClass = getInfluenceClass(attractorData.resonanceStrength);

          return (
            <div
              key={attractor}
              className={`attractor-item ${evolutionProps.className} ${resonanceClass} ${
                isNodeAttractor ? 'node-attractor' : 'global-attractor'
              } ${attractorData.isRevealed ? 'revealed' : 'hidden'}`}
              onClick={() => attractorData.isRevealed && handleAttractorClick(attractor)}
              role="button"
              tabIndex={attractorData.isRevealed ? 0 : -1}
              aria-label={`${formatAttractorName(attractor)} - ${evolutionProps.label} stage`}
            >
              {/* Evolution Stage Indicator */}
              <div className="evolution-indicator">
                <span className="evolution-symbol" title={evolutionProps.label}>
                  {evolutionProps.symbol}
                </span>
              </div>

              {/* Attractor Content */}
              <div className="attractor-content">
                <div className="attractor-name">
                  {attractorData.isRevealed ? formatAttractorName(attractor) : '???'}
                </div>
                
                {displayMode === 'full' && attractorData.isRevealed && (
                  <div className="attractor-details">
                    <div className="detail-row">
                      <span className="detail-label">Resonance:</span>
                      <div className={`detail-bar ${resonanceClass}`}>
                        <div 
                          className="detail-fill" 
                          style={{ width: `${attractorData.resonanceStrength * 100}%` }}
                        />
                      </div>
                      <span className="detail-value">
                        {Math.round(attractorData.resonanceStrength * 100)}%
                      </span>
                    </div>
                    
                    <div className="detail-row">
                      <span className="detail-label">Influence:</span>
                      <div className={`detail-bar ${influenceClass}`}>
                        <div
                          className="detail-fill"
                          style={{ width: `${attractorData.influenceRadius * 10}%` }}
                        />
                      </div>
                      <span className="detail-value">
                        {attractorData.influenceRadius}
                      </span>
                    </div>

                    {attractorData.revelationConditions && (
                      <div className="revelation-conditions">
                        <span className="conditions-label">Revelation:</span>
                        <div className="conditions-list">
                          {Object.entries(attractorData.revelationConditions).map(([condition, met]) => (
                            <span 
                              key={condition}
                              className={`condition ${met ? 'met' : 'unmet'}`}
                              title={condition}
                            >
                              {met ? '✓' : '○'}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Engagement Indicator */}
              {isNodeAttractor && (
                <div className="engagement-indicator" title="Node Attractor">
                  <span className="engagement-symbol">⚡</span>
                </div>
              )}

              {/* Revelation Status */}
              {!attractorData.isRevealed && (
                <div className="revelation-status" title="Not yet revealed">
                  <span className="revelation-symbol">🔒</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Active Influences (full mode only) */}
      {displayMode === 'full' && attractorState.activeInfluences.length > 0 && (
        <div className="active-influences">
          <h4 className="influences-header">Active Influences</h4>
          <div className="influences-list">
            {attractorState.activeInfluences.slice(0, 5).map((influence, index) => (
              <div key={index} className={`influence-item ${influence.influenceType}`}>
                <div className="influence-content">
                  <span className="influence-text">
                    {formatAttractorName(influence.attractor)} → {influence.targetNodeId}
                  </span>
                  <span className="influence-type">({influence.influenceType.replace('_', ' ')})</span>
                </div>
                <div className="influence-strength">
                  <div
                    className="strength-bar"
                    style={{ width: `${influence.influenceStrength * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross-System Resonance (full mode only) */}
      {displayMode === 'full' && triumvirateState && (
        <div className="cross-system-resonance">
          <h4 className="resonance-header">Cross-System Resonance</h4>
          <div className="resonance-metrics">
            <div className="resonance-item">
              <span className="resonance-label">Triumvirate Convergence</span>
              <div className={`resonance-bar ${getResonanceClass(triumvirateState.convergenceLevel)}`}>
                <div 
                  className="resonance-fill" 
                  style={{ width: `${triumvirateState.convergenceLevel * 100}%` }}
                />
              </div>
              <span className="resonance-value">
                {Math.round(triumvirateState.convergenceLevel * 100)}%
              </span>
            </div>
            
            <div className="resonance-item">
              <span className="resonance-label">Narrative Tension</span>
              <div className={`resonance-bar ${getResonanceClass(triumvirateState.narrativeTension)}`}>
                <div 
                  className="resonance-fill" 
                  style={{ width: `${triumvirateState.narrativeTension * 100}%` }}
                />
              </div>
              <span className="resonance-value">
                {Math.round(triumvirateState.narrativeTension * 100)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedAttractorDisplay;