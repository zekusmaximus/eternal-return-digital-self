/**
 * TransformationAnimationContainer Component
 * 
 * Provides enhanced transition animations when content transforms between states.
 * This component wraps around transformed content and adds visual context
 * to help users understand the transformation process.
 */

import React, { useEffect, useRef, useState } from 'react';
import { TextTransformation } from '../../types';

interface TransformationAnimationContainerProps {
  children: React.ReactNode;
  transformations: TextTransformation[];
  isNewlyTransformed: boolean;
  nodeId: string;
}

const TransformationAnimationContainer: React.FC<TransformationAnimationContainerProps> = ({
  children,
  transformations,
  isNewlyTransformed,
  nodeId
}): React.ReactElement => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'entering' | 'active'>('idle');
  const [transformationCount, setTransformationCount] = useState(transformations.length);
  
  // When transformations change, update the animation state
  useEffect(() => {
    if (isNewlyTransformed) {
      setAnimationState('entering');
      
      // After the animation completes, set to active state
      const timer = setTimeout(() => {
        setAnimationState('active');
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isNewlyTransformed, transformations]);
  
  // When node changes or transformation count changes, reset animation state
  useEffect(() => {
    setAnimationState('idle');
    setTransformationCount(transformations.length);
  }, [nodeId, transformations.length]);
  
  // Determine which animation effect to apply based on transformation types
  const getAnimationClass = () => {
    if (animationState === 'idle') return '';
    
    const hasReplacements = transformations.some(t => t.type === 'replace');
    const hasEmphasis = transformations.some(t => t.type === 'emphasize');
    const hasExpansions = transformations.some(t => t.type === 'expand');
    
    if (animationState === 'entering') {
      if (hasReplacements) return 'narramorph-container-replace-active';
      if (hasEmphasis) return 'narramorph-container-emphasis-active';
      if (hasExpansions) return 'narramorph-container-expand-active';
      return 'narramorph-container-transform-active';
    }
    
    return 'narramorph-container-active';
  };
  
  // Get a description of transformation activity
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
  
  // Check if number of transformations has changed
  const hasChangedTransformations = transformations.length !== transformationCount;
  
  return (
    <div 
      ref={containerRef} 
      className={`narramorph-animation-container ${getAnimationClass()}`}
      data-transformation-count={transformations.length}
      data-newly-transformed={isNewlyTransformed}
    >
      {/* Visual indicator for active transformations */}
      {transformations.length > 0 && (
        <div 
          className={`narramorph-transformation-indicator ${isNewlyTransformed ? 'active' : ''}`}
          title={getTransformationDescription()}
        >
          <span className="transformation-count">{transformations.length}</span>
          {hasChangedTransformations && (
            <span className="transformation-change-indicator">
              {transformations.length > transformationCount ? '+' : ''}
              {transformations.length - transformationCount}
            </span>
          )}
        </div>
      )}
      
      {/* Main content with transformations */}
      <div className="narramorph-animation-content">
        {children}
      </div>
    </div>
  );
};

export default TransformationAnimationContainer;