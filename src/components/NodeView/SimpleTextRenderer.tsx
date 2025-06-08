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
 */

import React, { useEffect, useState, useRef, memo } from 'react';
import { useNodeState } from '../../hooks/useNodeState';
import { TextTransformation } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/types';
import '../../styles/NarramorphTransformations.css';
import '../../styles/SimpleTextRenderer.css';
import SimpleTransformationContainer from './SimpleTransformationContainer';

interface SimpleTextRendererProps {
  nodeId?: string;
  onRenderComplete?: () => void;
  onVisibilityChange?: (isVisible: boolean) => void;
}

// Text processor without WebGL dependencies
const processTextTransformations = (
  content: string,
  transformations: TextTransformation[]
): string => {
  if (!content || !transformations.length) return content;
  
  let processedContent = content;
  
  // Sort transformations by priority to apply highest priority first
  const sortedTransformations = [...transformations].sort((a, b) => {
    const priorityMap: Record<string, number> = {
      'high': 3,
      'medium': 2,
      'low': 1
    };
    
    const aPriority = priorityMap[a.priority || 'medium'] || 2;
    const bPriority = priorityMap[b.priority || 'medium'] || 2;
    
    return bPriority - aPriority;
  });
  
  // Apply transformations using HTML and CSS instead of WebGL effects
  for (const transformation of sortedTransformations) {
    const { type, selector, replacement, emphasis } = transformation;
    
    if (!selector) continue;
    
    try {
      switch (type) {
        case 'replace': {
          if (replacement) {
            // Simple text replacement with span markers
            const spanClass = `text-transformation text-replaced`;
            const replacementHtml = `<span class="${spanClass}" data-transform-type="replace">${replacement}</span>`;
            processedContent = processedContent.replace(
              new RegExp(selector, 'g'),
              replacementHtml
            );
          }
          break;
        }
          
        case 'emphasize': {
          // Add emphasis with appropriate class
          const emphasisClass = emphasis || 'color';
          const emphasisHtml = `<span class="text-transformation text-emphasis text-emphasis-${emphasisClass}" data-transform-type="emphasize" data-emphasis="${emphasisClass}">${selector}</span>`;
          processedContent = processedContent.replace(
            new RegExp(selector, 'g'),
            emphasisHtml
          );
          break;
        }
          
        case 'expand': {
          // Add expansion with appropriate class
          const expandHtml = `<span class="text-transformation text-expanded" data-transform-type="expand">${selector}</span>`;
          processedContent = processedContent.replace(
            new RegExp(selector, 'g'),
            expandHtml
          );
          break;
        }
          
        case 'fragment': {
          // Add fragmentation with appropriate class
          const fragmentHtml = `<span class="text-transformation text-fragmented" data-transform-type="fragment">${selector}</span>`;
          processedContent = processedContent.replace(
            new RegExp(selector, 'g'),
            fragmentHtml
          );
          break;
        }
          
        case 'metaComment': {
          // Add meta comment with appropriate class
          const commentHtml = `<span class="text-transformation text-commented" data-transform-type="metaComment">${selector}</span>`;
          processedContent = processedContent.replace(
            new RegExp(selector, 'g'),
            commentHtml
          );
          break;
        }
      }
    } catch (error) {
      console.error(`[SimpleTextRenderer] Error applying transformation ${type}:`, error);
    }
  }
  
  return processedContent;
};

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
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const mutationObserverRef = useRef<MutationObserver | null>(null);
  
  // Track rendering metrics
  const [renderCount, setRenderCount] = useState(0);
  
  // Get reading path from reader state
  const readingPath = useSelector((state: RootState) => state.reader.path);
  
  // Process transformations in a simpler way
  useEffect(() => {
    if (node?.currentContent) {
      console.log(`[SimpleTextRenderer] Processing content for node: ${node.id}, length: ${node.currentContent.length}`);
      setIsLoading(true);
      
      // Either use the transformed content from useNodeState or process it ourselves
      const content = originalTransformedContent || node.currentContent;
      
      // BUGFIX: Process content immediately without animation frame
      try {
        console.log(`[SimpleTextRenderer] Starting content processing synchronously`);
        // Apply transformations using simple DOM manipulations instead of WebGL
        const processed = processTextTransformations(content, appliedTransformations);
        setProcessedContent(processed);
        
        // Increment render count for monitoring
        setRenderCount(prev => prev + 1);
        
        // Immediately mark as not loading and visible
        setIsLoading(false);
        setIsVisible(true);
        
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
        
        // BUGFIX: Set up additional verification checks to ensure content stays visible
        const verifyVisibilityIntervals = [100, 500, 1000];
        verifyVisibilityIntervals.forEach(interval => {
          setTimeout(() => {
            if (contentRef.current) {
              console.log(`[SimpleTextRenderer] Visibility verification check at ${interval}ms`);
              
              if (!contentRef.current.isConnected) {
                console.warn(`[SimpleTextRenderer] Content DOM node not connected at ${interval}ms`);
              }
              
              // Force visibility regardless of current state
              if (contentRef.current.style) {
                contentRef.current.style.display = 'block';
                contentRef.current.style.visibility = 'visible';
                contentRef.current.style.opacity = '1';
              }
              
              // Reaffirm visibility to parent
              if (onVisibilityChange) {
                onVisibilityChange(true);
              }
            }
          }, interval);
        });
      } catch (error) {
        console.error(`[SimpleTextRenderer] Error processing content:`, error);
        // Still mark as not loading in case of error
        setIsLoading(false);
      }
    }
  }, [node?.currentContent, node?.id, originalTransformedContent, appliedTransformations, onRenderComplete, onVisibilityChange]);
  
  // Set up visibility observer with simplified reliable detection
  useEffect(() => {
    if (!contentRef.current) return;
    
    console.log(`[DEBUG] Setting up IntersectionObserver for node: ${node?.id}, current visibility: ${isVisible}`);
    
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // Force visibility to true initially - BUGFIX
    if (!isVisible) {
      console.log(`[DEBUG] Forcing initial visibility to true for node: ${node?.id}`);
      setIsVisible(true);
      
      // Notify parent component if callback provided
      if (onVisibilityChange) {
        onVisibilityChange(true);
      }
    }
    
    // Create new observer with simplified reliable settings
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        
        const isNowVisible = entry.isIntersecting;
        
        console.log(`[DEBUG] Intersection detection for node ${node?.id}: ${isNowVisible ? 'visible' : 'not visible'}, intersectionRatio: ${entry.intersectionRatio.toFixed(2)}`);
        
        // BUGFIX: Delay visibility changes to prevent flicker and
        // only update if visibility changed to false (keep content visible)
        if (isVisible && !isNowVisible) {
          // Add delay before marking as invisible to prevent flicker
          console.log(`[DEBUG] Content might be invisible - delaying state change to verify...`);
          
          // Never mark as invisible if it's already been visible
          // This prevents disappearing content once it's been shown
          /*
          setTimeout(() => {
            // Re-check if still connected and invisible
            if (contentRef.current && !contentRef.current.isConnected) {
              console.log(`[DEBUG] Content confirmed invisible after delay - updating state`);
              setIsVisible(false);
              
              if (onVisibilityChange) {
                onVisibilityChange(false);
              }
            }
          }, 250);
          */
        } else if (!isVisible && isNowVisible) {
          // Immediately mark as visible
          console.log(`[DEBUG] Content is now visible - updating state immediately`);
          setIsVisible(true);
          
          if (onVisibilityChange) {
            onVisibilityChange(true);
          }
        }
      },
      {
        root: null, // Use viewport
        rootMargin: '0px', // No margin needed for reliability
        threshold: 0.01 // Even 1% visibility is enough to consider it visible - more lenient
      }
    );
    
    // Start observing
    observerRef.current.observe(contentRef.current);
    
    // Cleanup function
    return () => {
      console.log(`[DEBUG] Cleaning up IntersectionObserver for node: ${node?.id}`);
      observerRef.current?.disconnect();
    };
  }, [isVisible, onVisibilityChange, node?.id]);
  
  // Set up MutationObserver to prevent style changes that would hide content
  useEffect(() => {
    if (!contentRef.current) return;
    
    console.log(`[DEBUG] Setting up MutationObserver for node: ${node?.id}`);
    
    // Clean up previous observer
    if (mutationObserverRef.current) {
      mutationObserverRef.current.disconnect();
    }
    
    // Create mutation observer to detect and prevent style changes that would hide content
    mutationObserverRef.current = new MutationObserver((mutations) => {
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
              computedStyle.opacity === '0') {
            
            console.warn(`[DEBUG] Preventing content from being hidden by style mutation`);
            
            // Force visibility
            target.style.display = target.style.display === 'none' ? 'block' : target.style.display;
            target.style.visibility = target.style.visibility === 'hidden' ? 'visible' : target.style.visibility;
            target.style.opacity = target.style.opacity === '0' ? '1' : target.style.opacity;
            
            // Notify parent if this is the main content element
            if (target === contentRef.current && onVisibilityChange) {
              console.log(`[DEBUG] Notifying parent that content is still visible after mutation`);
              onVisibilityChange(true);
            }
          }
        }
      });
    });
    
    // Observe the content element and its children
    mutationObserverRef.current.observe(contentRef.current, {
      attributes: true,
      attributeFilter: ['style', 'class'],
      childList: true,
      subtree: true,
    });
    
    // Also observe the parent elements up to 3 levels
    let parent = contentRef.current.parentElement;
    for (let i = 0; i < 3 && parent; i++) {
      mutationObserverRef.current.observe(parent, {
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
      parent = parent.parentElement;
    }
    
    // Cleanup function
    return () => {
      console.log(`[DEBUG] Cleaning up MutationObserver for node: ${node?.id}`);
      mutationObserverRef.current?.disconnect();
    };
  }, [node?.id, onVisibilityChange]);
  
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
        
        <div
          ref={contentRef}
          className="simple-renderer-content"
          data-transformations-count={appliedTransformations.length}
          style={{
            display: 'block',
            visibility: 'visible',
            opacity: 1
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
          </div>
        </div>
      )}
    </div>
  );
});

export default SimpleTextRenderer;