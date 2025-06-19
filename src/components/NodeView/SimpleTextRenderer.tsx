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

import React, { useEffect, useState, useRef, memo } from 'react';
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

// Main renderer component
const SimpleTextRenderer: React.FC<SimpleTextRendererProps> = memo(({
  nodeId,
  onRenderComplete,
  onVisibilityChange
}) => {
  const {
    node,
    transformedContent: originalTransformedContent,
    appliedTransformations
  } = useNodeState(nodeId);
    const [processedContent, setProcessedContent] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [corruptionDetected, setCorruptionDetected] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  
  // Track rendering metrics
  const [renderCount, setRenderCount] = useState(0);
  
  // Get reading path from reader state
  const readingPath = useSelector((state: RootState) => state.reader.path);
    // Track if callbacks have been called to prevent infinite loops
  const callbacksCalledRef = useRef(false);
  const dispatch = useDispatch();
    // EMERGENCY CONTENT RECOVERY: Process transformations with corruption detection
  useEffect(() => {
    if (node?.currentContent || node?.originalContent) {
      console.log(`[SimpleTextRenderer] Processing content for node: ${node.id}, length: ${(node.originalContent || node.currentContent)?.length}`);
      setIsLoading(true);
      setCorruptionDetected(false);
      
      try {
        // EMERGENCY FIX: Use original content if available
        const baseContent = node.originalContent || node.currentContent || '';
        
        // Check for corruption in the content we're about to process
        if (isContentCorrupted(baseContent)) {
          console.error(`[SimpleTextRenderer] Content corruption detected for node ${node.id}:`, {
            contentLength: baseContent.length,
            contentPreview: baseContent.substring(0, 100)
          });
          
          setCorruptionDetected(true);
          
          // Try to recover from original content
          if (node.originalContent && node.originalContent !== baseContent) {
            console.log(`[SimpleTextRenderer] Attempting content recovery for node ${node.id}`);
            dispatch(recoverNodeContent(node.id));
            return; // Exit and let the recovery trigger a re-render
          } else {
            // Show fallback content
            setProcessedContent('⚠️ Content temporarily unavailable. Please refresh to restore.');
            setIsLoading(false);
            return;
          }
        }
        
        // Either use the transformed content from useNodeState or process it ourselves
        const content = originalTransformedContent || baseContent;
        
        // Apply final sanitization to remove any remaining corruption markers
        const finalContent = sanitizeDisplayContent(content);
        
        console.log(`[SimpleTextRenderer] Content processing complete for node ${node.id}:`, {
          originalLength: baseContent.length,
          transformedLength: content.length,
          finalLength: finalContent.length,
          appliedTransformations: appliedTransformations.length,
          usingOriginalContent: !!node.originalContent
        });
        
        setProcessedContent(finalContent);
        
        // Validate content integrity
        dispatch(validateNodeContent(node.id));
        
        // Increment render count for monitoring
        setRenderCount(prev => prev + 1);
        
        // Immediately mark as not loading and visible
        setIsLoading(false);
        setIsVisible(true);
        
        // Only call callbacks once per content change to prevent infinite loops
        if (!callbacksCalledRef.current) {
          callbacksCalledRef.current = true;
          
          // Signal render completion if callback provided
          if (onRenderComplete) {
            console.log(`[SimpleTextRenderer] Render complete for node: ${node.id}`);
            // Reduced delay to minimize possibility of content flickering
            setTimeout(onRenderComplete, 10);
          }
          
          // Ensure parent knows content is visible
          if (onVisibilityChange) {
            console.log(`[SimpleTextRenderer] Explicitly marking content as visible`);
            onVisibilityChange(true);
          }
        }
      } catch (error) {
        console.error(`[SimpleTextRenderer] Error processing content:`, error);
        setCorruptionDetected(true);
        setProcessedContent('❌ Content processing error. Please refresh to restore.');
        setIsLoading(false);
      }
    }  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.currentContent, node?.originalContent, node?.id, originalTransformedContent, dispatch]);

  // Reset callback flag when node changes
  useEffect(() => {
    callbacksCalledRef.current = false;
  }, [node?.id]);
  // Set up visibility observer with simplified reliable detection
  useEffect(() => {
    const currentContentRef = contentRef.current;
    const currentObserver = observerRef.current;
    if (!currentContentRef) return;
    
    console.log(`[DEBUG] Setting up IntersectionObserver for node: ${node?.id}, current visibility: ${isVisible}`);
    
    // Clean up previous observer
    if (currentObserver) {
      currentObserver.disconnect();
    }
    
    // Force visibility to true initially - BUGFIX
    if (!isVisible) {
      console.log(`[DEBUG] Forcing initial visibility to true for node: ${node?.id}`);
      setIsVisible(true);
      
      // Only notify parent component if callback provided and callbacks haven't been called
      if (onVisibilityChange && !callbacksCalledRef.current) {
        onVisibilityChange(true);
      }
    }
    
    // DISABLE INTERSECTION OBSERVER TO PREVENT INFINITE LOOPS
    // The intersection observer was causing render loops, so we'll just assume content is always visible
    console.log(`[DEBUG] Skipping IntersectionObserver setup to prevent infinite loops for node: ${node?.id}`);
    
    // Cleanup function
    return () => {
      console.log(`[DEBUG] Cleaning up IntersectionObserver for node: ${node?.id}`);
      if (currentObserver) {
        currentObserver.disconnect();
      }    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id, isVisible]); // Removed onVisibilityChange to prevent infinite loops
  // Set up MutationObserver to prevent style changes that would hide content
  useEffect(() => {
    const currentContentRef = contentRef.current;
    if (!currentContentRef) return;
    
    console.log(`[DEBUG] Setting up MutationObserver for node: ${node?.id}`);
    
    // Clean up previous observer
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
    }
    
    // Create mutation observer with reduced frequency to prevent infinite loops
    let mutationTimeout: number | null = null;
    
    mutationObserverRef.current = new MutationObserver((mutations) => {
      // Debounce mutations to prevent excessive calls
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      
      mutationTimeout = window.setTimeout(() => {
        mutations.forEach((mutation) => {
          if (mutation.type === 'attributes' &&
              (mutation.attributeName === 'style' ||
               mutation.attributeName === 'class' ||
               mutation.attributeName === 'display' ||
               mutation.attributeName === 'visibility' ||
               mutation.attributeName === 'opacity')) {
            
            const target = mutation.target as HTMLElement;
            const computedStyle = window.getComputedStyle(target);
            
            console.log(`[DEBUG] Style mutation detected on ${target.tagName}#${target.id}.${target.className}:`, {
              display: computedStyle.display,
              visibility: computedStyle.visibility,
              opacity: computedStyle.opacity
            });
            
            // If any change would hide the content, force it back to visible
            if (computedStyle.display === 'none' ||
                computedStyle.visibility === 'hidden' ||
                parseFloat(computedStyle.opacity) === 0) {
              
              console.warn(`[DEBUG] Preventing content from being hidden by style mutation`);
              
              // Force visibility
              target.style.display = target.style.display === 'none' ? 'block' : target.style.display;
              target.style.visibility = target.style.visibility === 'hidden' ? 'visible' : target.style.visibility;
              target.style.opacity = parseFloat(target.style.opacity) === 0 ? '1' : target.style.opacity;
              
              // Only notify parent if this is the main content element and callbacks haven't been called
              if (target === currentContentRef && onVisibilityChange && !callbacksCalledRef.current) {
                console.log(`[DEBUG] Notifying parent that content is still visible after mutation`);
                onVisibilityChange(true);
              }
            }
          }
        });
      }, 100); // Debounce mutations by 100ms
    });
    
    // Observe the content element and its children with reduced scope
    mutationObserverRef.current.observe(currentContentRef, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: false, // Reduce scope to prevent excessive mutations
      subtree: false,   // Don't observe subtree to reduce noise
    });
      // Cleanup function
    return () => {
      console.log(`[DEBUG] Cleaning up MutationObserver for node: ${node?.id}`);
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      mutationObserverRef.current?.disconnect();    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node?.id]); // Removed onVisibilityChange to prevent infinite loops
  
  // Render empty state if no content
  if (!node || !node.currentContent) {
    return <div className="simple-renderer-loading">Loading narrative content...</div>;
  }
  
  // Render with simpler container
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
    >      <SimpleTransformationContainer
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
        {/* Debug information */}
      {process.env.NODE_ENV === 'development' && (
        <div className="simple-renderer-debug">
          <div className="debug-info">
            <span>Node: {node.id}</span>
            <span>Transformations: {appliedTransformations.length}</span>
            <span>Renders: {renderCount}</span>
            <span>Path Length: {readingPath.sequence.length}</span>
            <span>Visibility: {isVisible ? 'Visible' : 'Hidden'}</span>
            <span>Journey Context: {node.journeyContext ? 'Active' : 'None'}</span>
            {node.journeyContext && (
              <>
                <span>Last Character: {node.journeyContext.lastVisitedCharacter || 'None'}</span>
                <span>Character Bleed: {
                  appliedTransformations.some(t => 
                    t.type === 'fragment' || t.type === 'emphasize' && t.intensity && t.intensity > 3
                  ) ? 'Yes' : 'No'
                }</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});

export default SimpleTextRenderer;
