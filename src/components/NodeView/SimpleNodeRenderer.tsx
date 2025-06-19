// src/components/NodeView/SimpleNodeRenderer.tsx

import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import SimpleTransformationContainer from './SimpleTransformationContainer';
import { useNodeState } from '../../hooks/useNodeState';
import { finalTextCleanup } from '../../utils/contentSanitizer';

interface SimpleNodeRendererProps {
  nodeId: string;
  onRenderComplete?: () => void;
}

// Constants
const VISIBILITY_DELAY = 50;
const RERENDER_INTERVAL = 500;
const MAX_RERENDERS = 5;

const FORCED_VISIBILITY_STYLES = `
  visibility: visible !important;
  display: block !important;
  opacity: 1 !important;
  position: relative !important;
  z-index: 100 !important;
`;

// External component definitions to reduce cognitive complexity
const LoadingComponent: React.FC = () => (
  <div className="simple-node-loading force-visible">
    Loading content...
  </div>
);

const StatusIndicator: React.FC = () => (
  <div className="simple-node-status">
    <div className="simple-status-indicator">
      Simple Rendering Active
    </div>
  </div>
);

interface MarkdownContentProps {
  nodeId: string;
  content: string;
  renderCount: number;
}

const MarkdownContent: React.FC<MarkdownContentProps> = ({ nodeId, content, renderCount }) => (
  <div className="simple-markdown-container force-visible">
    <div key={`content-${nodeId}-${renderCount}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {content}
      </ReactMarkdown>
    </div>
  </div>
);

// Custom hook for visibility management
const useVisibilityManager = (
  contentRef: React.RefObject<HTMLDivElement | null>, 
  nodeId: string, 
  hasContent: boolean,
  onRenderComplete?: () => void
) => {
  const forceContentVisibility = useCallback(() => {
    if (!contentRef.current) return;
    
    console.log('[SimpleNodeRenderer] Forcing content visibility');
    contentRef.current.style.cssText = FORCED_VISIBILITY_STYLES;
    
    onRenderComplete?.();
    console.timeEnd('SimpleNodeRenderer-render');
  }, [contentRef, onRenderComplete]);

  useEffect(() => {
    if (!hasContent) return;
    
    console.time('SimpleNodeRenderer-render');
    console.log('[SimpleNodeRenderer] Rendering content for node:', nodeId);
    
    const timer = setTimeout(forceContentVisibility, VISIBILITY_DELAY);
    return () => clearTimeout(timer);
  }, [hasContent, nodeId, forceContentVisibility]);
};

// Custom hook for re-render management
const useReRenderManager = (renderCount: number, setRenderCount: React.Dispatch<React.SetStateAction<number>>) => {
  const scheduleReRender = useCallback(() => {
    setRenderCount(prev => prev + 1);
    console.log(`[SimpleNodeRenderer] Forced re-render ${renderCount + 1}/${MAX_RERENDERS}`);
  }, [renderCount, setRenderCount]);

  useEffect(() => {
    if (renderCount >= MAX_RERENDERS) return;
    
    const timer = setTimeout(scheduleReRender, RERENDER_INTERVAL);
    return () => clearTimeout(timer);
  }, [renderCount, scheduleReRender]);
};

/**
 * A simplified node renderer that directly renders markdown content without complex transformations.
 * This serves as a reliable backup when the main renderer fails to display content.
 */
const SimpleNodeRenderer: React.FC<SimpleNodeRendererProps> = ({ nodeId, onRenderComplete }) => {
  const { node, appliedTransformations } = useNodeState(nodeId);
  const contentRef = useRef<HTMLDivElement>(null);
  const [renderCount, setRenderCount] = useState(0);
  
  const hasContent = Boolean(node?.currentContent);
  
  // Clean content with technical markers removed
  const cleanContent = useMemo(() => {
    if (!node?.currentContent) return '';
    return finalTextCleanup(node.currentContent);
  }, [node?.currentContent]);
  
  useVisibilityManager(contentRef, nodeId, hasContent, onRenderComplete);
  useReRenderManager(renderCount, setRenderCount);

  if (!hasContent) {
    return <LoadingComponent />;
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
        <StatusIndicator />        <MarkdownContent 
          nodeId={nodeId} 
          content={cleanContent} 
          renderCount={renderCount} 
        />
      </div>
    </SimpleTransformationContainer>
  );
};

export default SimpleNodeRenderer;