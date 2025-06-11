/**
 * NarramorphRenderer Component
 *
 * Renders node content with Narramorph transformations applied.
 * This component handles the transformation application logic and visual transitions
 * for content transformations based on reader patterns.
 *
 * Performance optimized with:
 * - Lazy loading for content that's not in viewport
 * - Memoized transformations
 * - Prioritized transformation application
 * - Intersection Observer for viewport detection
 */

import React, { useEffect, useState, useRef, useMemo, memo } from 'react';
import { useNodeState } from '../../hooks/useNodeState';
import { TextTransformation } from '../../types';
import { useSelector } from 'react-redux';
import { RootState } from '../../store/types';
import TransformationAnimationContainer from './TransformationAnimationContainer';
import '../../styles/NarramorphTransformations.css';
import { transformationService } from '../../services/TransformationService';
// Note: Install these packages if needed
// import { FixedSizeList as List } from 'react-window';
// import AutoSizer from 'react-virtualized-auto-sizer';

interface NarramorphRendererProps {
  nodeId?: string; // Optional - if not provided, uses current node
  onVisibilityChange?: (isVisible: boolean) => void; // Callback for visibility changes
}

interface PerformanceMetrics {
  renderTime: number;
  transformationsCount: number;
  visibilityChanges: number;
  deferredTransformations: number;
}



// Main NarramorphRenderer component with React.memo for better performance
const NarramorphRenderer: React.FC<NarramorphRendererProps> = memo(({ nodeId, onVisibilityChange }) => {
  const {
    node,
    transformedContent,
    newlyTransformed,
    appliedTransformations
  } = useNodeState(nodeId);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastLogTimestamp = useRef<number | null>(null);
  // Enhanced throttling: track both timestamp and count of visibility changes
  const lastVisibilityChangeRef = useRef<number>(Date.now());
  const visibilityChangeCountRef = useRef<number>(0);
  // Store previous visibility state for validation
  const previousVisibilityRef = useRef<boolean>(true);
  const [renderKey, setRenderKey] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const [webGLError, setWebGLError] = useState<Error | null>(null);
  
  // Performance metrics
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    transformationsCount: 0,
    visibilityChanges: 0,
    deferredTransformations: 0
  });
  
  // Track which transformations have been animated already
  const [animatedTransformations, setAnimatedTransformations] = useState<string[]>([]);
  
  // Get reading path from reader state
  const readingPath = useSelector((state: RootState) => state.reader.path);
  
  // Effect to monitor for WebGL context loss errors
  useEffect(() => {
    const handleWebGLError = (event: ErrorEvent) => {
      // Check if this is a WebGL context loss error
      if (event.message &&
         (event.message.includes('WebGL context lost') ||
          event.message.includes('THREE.WebGLRenderer'))) {
        console.error('[NarramorphRenderer] WebGL context loss detected!', event.message);
        setWebGLError(new Error(event.message));
      }
    };
    
    window.addEventListener('error', handleWebGLError);
    
    return () => {
      window.removeEventListener('error', handleWebGLError);
    };
  }, [isVisible, onVisibilityChange]);

  // Setup intersection observer for visibility detection with guaranteed initial visibility
  useEffect(() => {
    if (!contentRef.current) {
      return;
    }
    
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    // Set initial visibility only when node changes
    if (!observerRef.current) {
      setIsVisible(true);
      if (onVisibilityChange) {
        onVisibilityChange(true);
      }
    }
    
    // Create observer with enhanced debouncing to prevent too many updates
    let visibilityTimeout: number | null = null;
    let validationTimeout: number | null = null;
    let isComponentMounted = true;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Early exit if component is unmounted
        if (!isComponentMounted || !contentRef.current) {
          return;
        }
        
        const isNowVisible = entries[0]?.isIntersecting ?? true;
        const now = Date.now();
        
        // Store previous visibility for validation
        previousVisibilityRef.current = isVisible;
        
        // Enhanced throttling with multiple validation checks
        // 1. Visibility must have truly changed
        // 2. Sufficient time must have passed since last change (3 seconds minimum)
        // 3. Cannot have more than 3 visibility changes in 15 seconds
        const timeSinceLastChange = now - lastVisibilityChangeRef.current;
        const tooManyChanges = visibilityChangeCountRef.current > 3 && timeSinceLastChange < 15000;
        
        if (isVisible !== isNowVisible &&
            contentRef.current &&
            timeSinceLastChange > 3000 && // Increased from 2s to 3s
            !tooManyChanges &&
            isComponentMounted) {
            
          // Cancel any pending visibility updates
          if (visibilityTimeout) {
            window.clearTimeout(visibilityTimeout);
          }
          if (validationTimeout) {
            window.clearTimeout(validationTimeout);
          }
          
          // Log potential visibility change
          console.log(`[NarramorphRenderer] Potential visibility change detected: ${isVisible} -> ${isNowVisible}`);
          
          // Use a longer debounce time to prevent rapid cycling (increased to 1200ms)
          visibilityTimeout = window.setTimeout(() => {
            // Double-check that visibility truly changed and element still exists
            if (isVisible !== isNowVisible &&
                contentRef.current &&
                previousVisibilityRef.current === isVisible &&
                isComponentMounted) {
                
              // Schedule final validation check after a short delay
              validationTimeout = window.setTimeout(() => {
                // Final verification that visibility state is consistent
                if (!isComponentMounted) return;
                
                const finalCheck = entries[0]?.isIntersecting ?? true;
                if (finalCheck === isNowVisible) {
                  // Update timestamp and count
                  lastVisibilityChangeRef.current = Date.now();
                  visibilityChangeCountRef.current += 1;
                  
                  // Update state only after multiple validations
                  if (isComponentMounted) {
                    setIsVisible(isNowVisible);
                  }
                  
                  // Reset change counter after 15 seconds of stability
                  setTimeout(() => {
                    if (isComponentMounted) {
                      visibilityChangeCountRef.current = 0;
                    }
                  }, 15000);
                  
                  // Call the visibility change callback if provided
                  if (onVisibilityChange && isComponentMounted) {
                    console.log("[NarramorphRenderer] Calling onVisibilityChange:", isNowVisible, "Previous:", isVisible);
                    onVisibilityChange(isNowVisible);
                  }
                } else {
                  console.log("[NarramorphRenderer] Visibility state inconsistent - ignoring change");
                }
                validationTimeout = null;
              }, 500); // Increased validation delay
            }
            
            if (isComponentMounted) {
              setMetrics(prev => ({
                ...prev,
                visibilityChanges: prev.visibilityChanges + 1
              }));
              
              // Inform the transformation service about visibility changes
              // But only after validation checks pass
              if (node?.id) {
                transformationService.setContentVisibility(
                  node.id,
                  isNowVisible,
                  node.id === nodeId ? 2 : 1
                );
              }
              
              // Force a re-render when becoming visible again
              // But only when state is stable
              if (isNowVisible) {
                setRenderKey(prev => prev + 1);
              }
            }
            
            visibilityTimeout = null;
          }, 1200); // Increased debounce time to prevent cascading updates
        }
      },
      {
        root: null,
        rootMargin: '500px',
        threshold: 0.01
      }
    );
    
    // Start observing
    if (contentRef.current && isComponentMounted) {
      observerRef.current.observe(contentRef.current);
    }
    
    // Enhanced cleanup
    return () => {
      isComponentMounted = false;
      
      if (visibilityTimeout) {
        window.clearTimeout(visibilityTimeout);
        visibilityTimeout = null;
      }
      if (validationTimeout) {
        window.clearTimeout(validationTimeout);
        validationTimeout = null;
      }
      
      if (observerRef.current) {
        try {
          observerRef.current.disconnect();
          console.log('[NarramorphRenderer] Intersection observer disconnected cleanly');
        } catch (error) {
          console.warn('[NarramorphRenderer] Error disconnecting observer:', error);
        }
        observerRef.current = null;
      }
    };
  }, [node?.id, nodeId, isVisible, onVisibilityChange]); // Added isVisible and onVisibilityChange to deps
  
  // Prioritize transformations based on visibility and importance
  const prioritizedTransformations = useMemo(() => {
    if (!appliedTransformations.length) return [];
    
    // If content is visible, apply all transformations
    if (isVisible) {
      return appliedTransformations;
    }
    
    // If not visible, only apply high priority transformations
    const highPriorityTransformations = appliedTransformations.filter(t =>
      t.priority === 'high' || t.applyImmediately === true
    );
    
    setMetrics(prev => ({
      ...prev,
      deferredTransformations: appliedTransformations.length - highPriorityTransformations.length
    }));
    
    return highPriorityTransformations;
  }, [appliedTransformations, isVisible]);
  
  // When transformations occur, trigger animations with sequenced timing
  // Optimized version with debounced and batched updates
  useEffect(() => {
    if (!newlyTransformed || !contentRef.current || !isVisible) {
      return; // Skip if not visible or no new transformations
    }
    
    const startTime = performance.now();
    
    // Force re-render to apply new transformations with animation
    setRenderKey(prev => prev + 1);
    
    // Use requestAnimationFrame to sync with browser rendering cycle
    requestAnimationFrame(() => {
      // Get all elements with transformation classes - use a more efficient selector
      const transformedElements = contentRef.current?.querySelectorAll('[data-transform-type]');
      if (!transformedElements || transformedElements.length === 0) return;
      
      // Calculate which transformations are new
      const transformationKeys = appliedTransformations.map(
        (t: TextTransformation) => `${t.type}-${t.selector}`
      );
      const newTransformations = transformationKeys.filter(
        key => !animatedTransformations.includes(key)
      );
      
      if (newTransformations.length === 0) return;
      
      // Get transformation groups for staggered animations
      const transformGroups: Record<string, Element[]> = {
        'replace': [],
        'fragment': [],
        'expand': [],
        'emphasize': [],
        'metaComment': []
      };
      
      // Group elements by transformation type
      transformedElements.forEach(element => {
        const type = element.getAttribute('data-transform-type');
        if (type && type in transformGroups) {
          transformGroups[type].push(element);
        }
      });
      
      // Apply animation class to new transformations with staggered timing
      // Optimize by using a single setTimeout callback for each batch
      const applyAnimationsWithStagger = (elements: Element[], staggerDelay: number = 50) => {
        const batches: Element[][] = [];
        const batchSize = 5; // Process 5 elements per batch for better performance
        
        // Create batches
        for (let i = 0; i < elements.length; i += batchSize) {
          batches.push(Array.from(elements).slice(i, i + batchSize));
        }
        
        // Process batches with staggered timing
        batches.forEach((batch, batchIndex) => {
          setTimeout(() => {
            batch.forEach(element => {
              const type = element.getAttribute('data-transform-type');
              const text = element.textContent || '';
              
              // Only animate elements that match new transformations
              const matchingTransformation = appliedTransformations.find(t =>
                t.type === type &&
                text.includes(t.selector || '') &&
                newTransformations.includes(`${t.type}-${t.selector}`)
              );
              
              if (matchingTransformation) {
                // Add all classes at once for better performance
                element.classList.add('narramorph-transform-new');
                
                // Add appropriate effect class based on transformation type
                switch(type) {
                  case 'replace':
                    element.classList.add('narramorph-replaced');
                    break;
                  case 'fragment':
                    element.classList.add('narramorph-fragmented');
                    break;
                  case 'expand':
                    element.classList.add('narramorph-expanded');
                    break;
                  case 'emphasize':
                    element.classList.add(`narramorph-emphasis-${matchingTransformation.emphasis || 'color'}`);
                    break;
                  case 'metaComment':
                    element.classList.add('narramorph-commented');
                    break;
                }
                
                // Schedule class removal in one batch
                setTimeout(() => {
                  element.classList.remove('narramorph-transform-new');
                }, 2000);
              }
            });
          }, batchIndex * staggerDelay * batchSize);
        });
      };
      
      // Apply animations with staggered timing for each group
      Object.values(transformGroups).forEach(group => {
        applyAnimationsWithStagger(group);
      });
      
      // Update animated transformations list
      setAnimatedTransformations(transformationKeys);
      
      // Update performance metrics
      const endTime = performance.now();
      setMetrics(prev => ({
        ...prev,
        renderTime: endTime - startTime,
        transformationsCount: appliedTransformations.length
      }));
    });
  }, [newlyTransformed, appliedTransformations, animatedTransformations, isVisible]);
  
  // When node changes, reset animation state and update visibility tracking
  useEffect(() => {
    if (node?.id) {
      setAnimatedTransformations([]);
      
      // Reset metrics for new node
      setMetrics({
        renderTime: 0,
        transformationsCount: 0,
        visibilityChanges: 0,
        deferredTransformations: 0
      });
    }
  }, [node?.id]);
  
  
  // Show error state if WebGL context was lost
  if (webGLError) {
    console.error('[NarramorphRenderer] Rendering in error state due to WebGL issue');
    return (
      <div className="narramorph-error">
        <p>Advanced rendering unavailable</p>
        <div dangerouslySetInnerHTML={{ __html: node?.currentContent || 'Content unavailable' }} />
      </div>
    );
  }
  
  // Show loading state if content isn't available
  if (!node || !transformedContent) {
    // No longer logging this repeatedly
    return <div className="narramorph-loading">Loading content...</div>;
  }
  
  // Render the transformed content with animation container and enhanced visibility tracking
  // Only log in development mode
  if (process.env.NODE_ENV === 'development') {
    // Limit logging frequency with a timestamp check
    const now = Date.now();
    if (!lastLogTimestamp.current || now - lastLogTimestamp.current > 5000) {
      console.log(`[NarramorphRenderer] Rendering content for node: ${node.id}, visible: ${isVisible}`);
      lastLogTimestamp.current = now;
    }
  }
  return (
    <div
      className={`narramorph-container ${isVisible ? 'is-visible' : 'is-hidden'}`}
      key={renderKey}
      data-node-id={node.id}
      data-visibility={isVisible ? 'visible' : 'hidden'}
      style={{
        display: 'block',
        visibility: 'visible',
        position: 'relative',
        minHeight: '200px'
      }}
    >
      <TransformationAnimationContainer
        transformations={prioritizedTransformations}
        isNewlyTransformed={newlyTransformed}
        nodeId={node.id}
      >
        <div
          ref={contentRef}
          className={`narramorph-content ${isVisible ? 'is-visible' : 'is-hidden'}`}
          data-transformations-count={prioritizedTransformations.length}
          data-node-id={node.id}
          data-visit-count={node.visitCount}
          style={{
            display: 'block',
            visibility: 'visible',
            position: 'relative'
          }}
        >
          {/* Show loading indicator before content is ready */}
          {!transformedContent && (
            <div className="narramorph-loading-indicator" style={{margin: '20px 0'}}>
              <div className="loading-spinner"></div>
              <p>Preparing narrative transformations...</p>
            </div>
          )}
          
          {/* Render content directly without virtualization */}
          {transformedContent && (
            <div
              dangerouslySetInnerHTML={{ __html: transformedContent }}
              style={{
                opacity: isVisible ? 1 : 0.99, // Force visibility while maintaining transitions
                transition: 'opacity 0.3s ease-in'
              }}
            />
          )}
        </div>
      </TransformationAnimationContainer>
        {/* Optional debugging panel for tracking applied transformations */}
      {process.env.NODE_ENV === 'development' && (
        <div className="narramorph-debug">
          <h4>Applied Transformations {isVisible ? '(Visible)' : '(Hidden)'}</h4>
          <ul>
            {prioritizedTransformations.map((t: TextTransformation, idx: number) => (
              <li key={idx}>
                {t.type}: {t.selector?.substring(0, 20)}... {t.priority && `(${t.priority})`}
              </li>
            ))}
          </ul>
          <p>Path Length: {readingPath.sequence.length}</p>
          <p>Visit Count: {node.visitCount}</p>
          <p>Journey Context: {node.journeyContext ? 'Active' : 'None'}</p>
          {node.journeyContext && (
            <div>
              <p>Last Character: {node.journeyContext.lastVisitedCharacter || 'None'}</p>
              <p>Recursive Awareness: {(node.journeyContext.recursiveAwareness * 100).toFixed(1)}%</p>
              <p>Temporal Displacement: {node.journeyContext.temporalDisplacement ? 'Yes' : 'No'}</p>
            </div>
          )}
          <p>Performance: {metrics.renderTime.toFixed(2)}ms for {metrics.transformationsCount} transformations</p>
          <p>Deferred: {metrics.deferredTransformations} transformations</p>
          <p>Visibility Changes: {metrics.visibilityChanges}</p>
          <p>Character Bleed Detected: {
            prioritizedTransformations.some(t => 
              t.type === 'fragment' || t.type === 'emphasize' && t.intensity && t.intensity > 3
            ) ? 'Yes' : 'No'
          }</p>
        </div>
      )}
    </div>
  );
});

export default NarramorphRenderer;
