/**
 * TransformationAnimationContainer Component
 * 
 * Provides enhanced transition animations when content transforms between states.
 * This component wraps around transformed content and adds visual context
 * to help users understand the transformation process.
 */

import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { TextTransformation } from '../../types';

// For debugging DOM measurements and layout issues
interface ElementMeasurements {
  width: number;
  height: number;
  visibility: string;
  display: string;
  opacity: string;
  position: string;
  zIndex: string;
  overflow: string;
}

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
  const contentRef = useRef<HTMLDivElement>(null);
  const [animationState, setAnimationState] = useState<'idle' | 'entering' | 'active'>('idle');
  const [transformationCount, setTransformationCount] = useState(transformations.length);
  const [renderAttempt, setRenderAttempt] = useState(0);
  
  // Track DOM measurements for debugging
  const [measurements, setMeasurements] = useState<ElementMeasurements | null>(null);
  const [contentVisible, setContentVisible] = useState(true);
  
  // Force a re-render after mount to ensure visibility
  useEffect(() => {
    // After mount, force a re-render to ensure proper layout
    // Limit to max 3 attempts to prevent infinite loops
    if (renderAttempt < 3) {
      const timer = setTimeout(() => {
        setRenderAttempt(prev => prev + 1);
        console.log(`[AnimationContainer] Forced re-render for node: ${nodeId}, attempt: ${renderAttempt + 1}`);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [nodeId, renderAttempt]);
  
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
    
    // Debug log for node changes
    console.log(`[AnimationContainer] Node changed to: ${nodeId}, transformations: ${transformations.length}`);
  }, [nodeId, transformations.length]);
  
  // Monitor and log DOM measurements for debugging visibility issues
  useLayoutEffect(() => {
    if (!containerRef.current) return;
    
    // Function to measure DOM element properties
    const measureElement = () => {
      if (!containerRef.current) return;
      
      const style = window.getComputedStyle(containerRef.current);
      const rect = containerRef.current.getBoundingClientRect();
      
      const newMeasurements: ElementMeasurements = {
        width: rect.width,
        height: rect.height,
        visibility: style.visibility,
        display: style.display,
        opacity: style.opacity,
        position: style.position,
        zIndex: style.zIndex,
        overflow: style.overflow
      };
      
      setMeasurements(newMeasurements);
      
      // Check if content is visible in DOM
      const isVisible = rect.width > 0 &&
                        rect.height > 0 &&
                        style.visibility !== 'hidden' &&
                        style.display !== 'none' &&
                        parseFloat(style.opacity) > 0;
                        
      setContentVisible(isVisible);
      
      // Log significant changes to visibility
      if (contentVisible !== isVisible) {
        console.log(`[AnimationContainer] Content visibility changed to: ${isVisible ? 'visible' : 'hidden'}`, {
          nodeId,
          transformations: transformations.length,
          animationState,
          measurements: newMeasurements
        });
      }
    };
    
    // Measure immediately
    measureElement();
    
    // Measure after animations might be complete
    const timer = setTimeout(measureElement, 1100);
    
    // Set up mutation observer to track DOM changes - with debouncing
    let timeoutId: number | null = null;
    const observer = new MutationObserver((mutations) => {
      // Only log significant mutations to reduce noise
      if (mutations.length > 2) {
        console.log(`[AnimationContainer] DOM mutations detected: ${mutations.length}`);
      }
      
      // Debounce measurements to prevent infinite loops
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        measureElement();
        timeoutId = null;
      }, 500);
    });
    
    observer.observe(containerRef.current, {
      attributes: true,
      childList: true,
      subtree: false // Reduced to false to prevent excessive notifications
    });
    
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [nodeId, transformations, animationState, contentVisible]);
  
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
  
  // Log when animations are triggered
  useEffect(() => {
    if (isNewlyTransformed) {
      console.log(`[AnimationContainer] Animation started for node: ${nodeId}`, {
        transformations: transformations.length,
        animationState,
        contentVisible
      });
    }
  }, [isNewlyTransformed, nodeId, transformations.length, animationState, contentVisible]);
  
  return (
    <div
      ref={containerRef}
      className={`narramorph-animation-container ${getAnimationClass()}`}
      data-transformation-count={transformations.length}
      data-newly-transformed={isNewlyTransformed}
      data-animation-state={animationState}
      data-visible={contentVisible}
      data-render-attempt={renderAttempt}
      style={{
        overflow: 'visible',
        minHeight: '150px',
        position: 'relative', // Ensure positioning context
        visibility: 'visible',
        display: 'block',
        opacity: 1
      }}
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
      <div
        ref={contentRef}
        className="narramorph-animation-content"
        style={{
          position: 'relative',
          visibility: 'visible',
          display: 'block',
          opacity: 1,
          minHeight: '100px'
        }}
      >
        {renderAttempt === 0 ? (
          <div className="animation-placeholder" style={{ padding: '20px', textAlign: 'center' }}>
            <p>Preparing narrative...</p>
          </div>
        ) : (
          children
        )}
      </div>
      
      {/* Debug info overlay - only in development */}
      {process.env.NODE_ENV === 'development' && measurements && (
        <div
          className="animation-debug-info"
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            background: 'rgba(0,0,0,0.7)',
            color: '#fff',
            padding: '3px',
            fontSize: '9px',
            zIndex: 1000,
            pointerEvents: 'none'
          }}
        >
          <div>{`${Math.round(measurements.width)}x${Math.round(measurements.height)}`}</div>
          <div>{`Vis:${measurements.visibility.charAt(0)}|Dis:${measurements.display.charAt(0)}`}</div>
          <div>{`Op:${parseFloat(measurements.opacity).toFixed(1)}|Z:${measurements.zIndex}`}</div>
          <div>{`T:${transformations.length}|S:${animationState.charAt(0)}`}</div>
        </div>
      )}
    </div>
  );
};

export default TransformationAnimationContainer;