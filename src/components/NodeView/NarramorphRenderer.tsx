/**
 * NarramorphRenderer Component
 * 
 * Renders node content with Narramorph transformations applied.
 * This component handles the transformation application logic and visual transitions
 * for content transformations based on reader patterns.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useNodeState } from '../../hooks/useNodeState';
import { TextTransformation } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/types';
import '../../styles/NarramorphTransformations.css';

interface NarramorphRendererProps {
  nodeId?: string; // Optional - if not provided, uses current node
}

const NarramorphRenderer: React.FC<NarramorphRendererProps> = ({ nodeId }) => {
  const { 
    node, 
    transformedContent, 
    newlyTransformed,
    appliedTransformations 
  } = useNodeState(nodeId);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [renderKey, setRenderKey] = useState(0);
  
  // Track which transformations have been animated already
  const [animatedTransformations, setAnimatedTransformations] = useState<string[]>([]);
  
  // Get reading path from reader state
  const readingPath = useSelector((state: RootState) => state.reader.path);
  
  // When transformations occur, trigger animations
  useEffect(() => {
    if (newlyTransformed && contentRef.current) {
      // Force re-render to apply new transformations with animation
      setRenderKey(prev => prev + 1);
      
      // Get all elements with transformation classes
      const transformedElements = contentRef.current.querySelectorAll('.narramorph-transform-replace, .narramorph-transform-fragment, .narramorph-transform-expand, .narramorph-transform-emphasize, .narramorph-transform-metaComment');
      
      // Calculate which transformations are new
      const transformationKeys = appliedTransformations.map(
        (t: TextTransformation) => `${t.type}-${t.selector}`
      );
      const newTransformations = transformationKeys.filter(
        key => !animatedTransformations.includes(key)
      );
      
      // Apply animation class to new transformations
      transformedElements.forEach(element => {
        const type = element.getAttribute('data-transform-type');
        const text = element.textContent || '';
        
        appliedTransformations.forEach((t: TextTransformation) => {
          if (t.type === type && text.includes(t.selector || '') && 
              newTransformations.includes(`${t.type}-${t.selector}`)) {
            element.classList.add('narramorph-transform-new');
            
            // Remove animation class after animation completes
            setTimeout(() => {
              element.classList.remove('narramorph-transform-new');
            }, 2000);
          }
        });
      });
      
      // Update animated transformations list
      setAnimatedTransformations(transformationKeys);
    }
  }, [newlyTransformed, appliedTransformations, animatedTransformations]);
  
  // When node changes, reset animation state
  useEffect(() => {
    if (node?.id) {
      setAnimatedTransformations([]);
    }
  }, [node?.id]);
  
  // Show loading state if content isn't available
  if (!node || !transformedContent) {
    return <div className="narramorph-loading">Loading content...</div>;
  }
  
  // Render the transformed content
  return (
    <div className="narramorph-container" key={renderKey}>
      <div 
        ref={contentRef}
        className="narramorph-content"
        dangerouslySetInnerHTML={{ __html: transformedContent }}
      />
      
      {/* Optional debugging panel for tracking applied transformations */}
      {process.env.NODE_ENV === 'development' && (
        <div className="narramorph-debug">
          <h4>Applied Transformations</h4>
          <ul>
            {appliedTransformations.map((t: TextTransformation, idx: number) => (
              <li key={idx}>
                {t.type}: {t.selector?.substring(0, 20)}...
              </li>
            ))}
          </ul>
          <p>Path Length: {readingPath.sequence.length}</p>
          <p>Visit Count: {node.visitCount}</p>
        </div>
      )}
    </div>
  );
};

export default NarramorphRenderer;