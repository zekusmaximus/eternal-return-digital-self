/**
 * SimpleTransformationContainer Component
 * 
 * A lightweight, reliable container for text transformations.
 * This is a simplified version of TransformationAnimationContainer
 * that prioritizes stability and content visibility over complex effects.
 */

import React, { useState, useEffect } from 'react';
import { TextTransformation } from '../../types';

interface SimpleTransformationContainerProps {
  children: React.ReactNode;
  transformations: TextTransformation[];
  nodeId: string;
}

const SimpleTransformationContainer: React.FC<SimpleTransformationContainerProps> = ({
  children,
  transformations,
  nodeId
}) => {
  // Track previous transformation count to detect changes
  const [prevTransformationCount, setPrevTransformationCount] = useState(0);
  const [isNewlyTransformed, setIsNewlyTransformed] = useState(false);
  
  // When transformations change, update state to show indicators
  useEffect(() => {
    if (transformations.length !== prevTransformationCount) {
      // Detect if new transformations were added
      if (transformations.length > prevTransformationCount) {
        setIsNewlyTransformed(true);
        
        // Reset the newly transformed flag after animations would complete
        const timer = setTimeout(() => {
          setIsNewlyTransformed(false);
        }, 2000);
        
        return () => clearTimeout(timer);
      }
      
      // Update previous count
      setPrevTransformationCount(transformations.length);
    }
  }, [transformations.length, prevTransformationCount]);
  
  // Get a description of transformation activity for tooltip
  const getTransformationDescription = () => {
    if (transformations.length === 0) return '';
    
    const typeCount: Record<string, number> = {};
    transformations.forEach(t => {
      typeCount[t.type] = (typeCount[t.type] || 0) + 1;
    });
    
    // Generate a description based on the types of transformations
    const descriptions = [];
    
    if (typeCount['replace']) {
      descriptions.push(`${typeCount['replace']} replacements`);
    }
    
    if (typeCount['emphasize']) {
      descriptions.push(`${typeCount['emphasize']} emphasis`);
    }
    
    if (typeCount['expand']) {
      descriptions.push(`${typeCount['expand']} expansions`);
    }
    
    if (typeCount['fragment']) {
      descriptions.push(`${typeCount['fragment']} fragmentations`);
    }
    
    if (typeCount['metaComment']) {
      descriptions.push(`${typeCount['metaComment']} comments`);
    }
    
    return descriptions.join(', ');
  };
  
  return (
    <div 
      className={`simple-transformation-container ${isNewlyTransformed ? 'newly-transformed' : ''}`}
      data-transformation-count={transformations.length}
      data-node-id={nodeId}
    >
      {/* Visual indicator for active transformations - much simpler than the complex version */}
      {transformations.length > 0 && (
        <div 
          className={`transformation-indicator ${isNewlyTransformed ? 'active' : ''}`}
          title={getTransformationDescription()}
        >
          <span className="transformation-count">{transformations.length}</span>
          {isNewlyTransformed && transformations.length > prevTransformationCount && (
            <span className="transformation-change">
              +{transformations.length - prevTransformationCount}
            </span>
          )}
        </div>
      )}
      
      {/* Main content */}
      <div className="simple-transformation-content">
        {children}
      </div>
      
      {/* Optional overlay for transition effects */}
      {isNewlyTransformed && (
        <div 
          className="transformation-overlay"
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default SimpleTransformationContainer;