/**
 * SimpleTextRenderer Component
 * 
 * A lightweight, reliable alternative to the NarramorphRenderer
 * that prioritizes stability and content visibility over visual effects.
 * 
 * This component:
 * 1. Renders node content with minimal dependencies
 * 2. Uses pure React/DOM rendering without WebGL
 * 3. Maintains proper text display even when resources are constrained
 * 4. Provides graceful fallbacks and simplified transformations
 * 5. EMERGENCY FIX: Prevents and recovers from content corruption
 */

import { useEffect, useState, useRef } from 'react';
import { useNodeState } from '../../hooks/useNodeState';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../store/types';
import { recoverNodeContent, validateNodeContent } from '../../store/slices/nodesSlice';
import { isContentCorrupted, sanitizeDisplayContent } from '../../utils/contentSanitizer';
import '../../styles/NarramorphTransformations.css';
import '../../styles/SimpleTextRenderer.css';
import SimpleTransformationContainer from './SimpleTransformationContainer';

interface SimpleTextRendererProps {
  nodeId?: string;
  onRenderComplete?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

export default function SimpleTextRenderer({ nodeId, onRenderComplete, onVisibilityChange }: SimpleTextRendererProps) {
  const { node, transformedContent, appliedTransformations } = useNodeState(nodeId);
  const [processedContent, setProcessedContent] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [corruptionDetected, setCorruptionDetected] = useState(false);
  const [renderCount, setRenderCount] = useState(0);
  
  const contentRef = useRef<HTMLDivElement | null>(null);
  const callbacksCalledRef = useRef(false);
  const dispatch = useDispatch();
  const readingPath = useSelector((state: RootState) => state.reader.path);

  useEffect(() => {
    callbacksCalledRef.current = false;
  }, [node?.id]);

  useEffect(() => {
    if (node?.currentContent || node?.originalContent) {
      setIsLoading(true);
      setCorruptionDetected(false);
      
      try {
        const baseContent = node.originalContent || node.currentContent || '';
        
        if (isContentCorrupted(baseContent)) {
          setCorruptionDetected(true);
          if (node.originalContent && node.originalContent !== baseContent) {
            dispatch(recoverNodeContent(node.id));
            return;
          } else {
            setProcessedContent('⚠️ Content temporarily unavailable. Please refresh to restore.');
            setIsLoading(false);
            return;
          }
        }
        
        const content = transformedContent || baseContent;
        const finalContent = sanitizeDisplayContent(content);
        
        setProcessedContent(finalContent);
        dispatch(validateNodeContent(node.id));
        setRenderCount(prev => prev + 1);
        setIsLoading(false);
        setIsVisible(true);
        
        if (!callbacksCalledRef.current) {
          callbacksCalledRef.current = true;
          if (onRenderComplete) {
            setTimeout(onRenderComplete, 10);
          }
          if (onVisibilityChange) {
            onVisibilityChange(true);
          }
        }
      } catch (error) {
        console.error(`[SimpleTextRenderer] Error processing content:`, error);
        setCorruptionDetected(true);
        setProcessedContent('❌ Content processing error. Please refresh to restore.');
        setIsLoading(false);
      }
    }
  }, [node?.currentContent, node?.originalContent, node?.id, transformedContent, dispatch, onRenderComplete, onVisibilityChange]);

  if (!node || !node.currentContent) {
    return <div className="simple-renderer-loading">Loading narrative content...</div>;
  }

  return (
    <div
      className={`simple-renderer-container ${isVisible ? 'is-visible' : ''}`}
      data-node-id={node.id}
      data-render-count={renderCount}
      style={{
        display: 'block',
        visibility: 'visible',
        position: 'relative',
        minHeight: '200px'
      }}
    >
      <SimpleTransformationContainer
        transformations={appliedTransformations}
        nodeId={node.id}
      >
        {isLoading && (
          <div className="simple-renderer-loading" style={{ padding: '20px 0' }}>
            <div className="loading-spinner"></div>
            <p>Preparing narrative content...</p>
          </div>
        )}
        
        {corruptionDetected && (
          <div className="content-corruption-warning" style={{ 
            padding: '15px', 
            margin: '10px 0', 
            backgroundColor: '#fff3cd', 
            border: '1px solid #ffeeba', 
            borderRadius: '4px', 
            color: '#856404' 
          }}>
            <strong>⚠️ Content Recovery Mode</strong>
            <p>Content corruption detected. Attempting recovery...</p>
          </div>
        )}
        
        <div
          ref={contentRef}
          className="simple-renderer-content"
          data-transformations-count={appliedTransformations.length}
          data-corruption-detected={corruptionDetected}
          style={{
            display: 'block',
            visibility: 'visible',
            opacity: corruptionDetected ? 0.7 : 1
          }}
        >
          <div
            dangerouslySetInnerHTML={{ __html: processedContent }}
            className="content-inner"
          />
        </div>
      </SimpleTransformationContainer>
      
      {process.env.NODE_ENV === 'development' && (
        <div className="simple-renderer-debug">
          <div className="debug-info">
            <span>Node: {node.id}</span>
            <span>Transformations: {appliedTransformations.length}</span>
            <span>Renders: {renderCount}</span>
            <span>Path Length: {readingPath.sequence.length}</span>
            <span>Visibility: {isVisible ? 'Visible' : 'Hidden'}</span>
          </div>
        </div>
      )}
    </div>
  );
}
