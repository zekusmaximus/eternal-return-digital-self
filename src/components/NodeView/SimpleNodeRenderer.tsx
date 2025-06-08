// src/components/NodeView/SimpleNodeRenderer.tsx

import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SimpleTransformationContainer from './SimpleTransformationContainer';
import { useNodeState } from '../../hooks/useNodeState';

interface SimpleNodeRendererProps {
  nodeId: string;
  onRenderComplete?: () => void;
}

/**
 * A simplified node renderer that directly renders markdown content without complex transformations.
 * This serves as a reliable backup when the main renderer fails to display content.
 */
const SimpleNodeRenderer: React.FC<SimpleNodeRendererProps> = ({ nodeId, onRenderComplete }) => {
  // Use the nodeState hook to access transformations and content
  const {
    node,
    appliedTransformations
  } = useNodeState(nodeId);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const [renderCount, setRenderCount] = useState(0);
  
  // Log render timing for debugging the race condition
  useEffect(() => {
    console.time('SimpleNodeRenderer-render');
    
    if (node?.currentContent) {
      console.log('[SimpleNodeRenderer] Rendering content for node:', nodeId);
      
      // Force visibility with a small delay to ensure DOM is fully rendered
      const forceVisibilityTimer = setTimeout(() => {
        if (contentRef.current) {
          console.log('[SimpleNodeRenderer] Forcing content visibility');
          // Apply direct style overrides to ensure visibility
          contentRef.current.style.cssText = `
            visibility: visible !important;
            display: block !important;
            opacity: 1 !important;
            position: relative !important;
            z-index: 100 !important;
          `;
          
          if (onRenderComplete) {
            onRenderComplete();
          }
        }
        console.timeEnd('SimpleNodeRenderer-render');
      }, 50);
      
      return () => clearTimeout(forceVisibilityTimer);
    }
    
    return undefined;
  }, [node, nodeId, onRenderComplete]);

  // Force re-render every 500ms for the first few seconds to ensure content remains visible
  useEffect(() => {
    const maxRenders = 5; // Limit to 5 re-renders
    if (renderCount < maxRenders) {
      const timer = setTimeout(() => {
        setRenderCount(prev => prev + 1);
        console.log(`[SimpleNodeRenderer] Forced re-render ${renderCount + 1}/${maxRenders}`);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [renderCount]);

  if (!node || !node.currentContent) {
    return (
      <div className="simple-node-loading force-visible">
        Loading content...
      </div>
    );
  }

  return (
    <SimpleTransformationContainer
      nodeId={nodeId}
      transformations={appliedTransformations}
    >
      <div
        ref={contentRef}
        className="simple-node-content force-visible"
        data-node-id={nodeId}
        data-render-count={renderCount}
      >
        <div className="simple-node-status">
          <div className="simple-status-indicator">
            Simple Rendering Active
          </div>
        </div>
        
        <div className="simple-markdown-container force-visible">
          {/* Use key to force re-render on content change */}
          <div key={`content-${nodeId}-${renderCount}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {node.currentContent}
            </ReactMarkdown>
          </div>
        </div>
      </div>
    </SimpleTransformationContainer>
  );
};

export default SimpleNodeRenderer;