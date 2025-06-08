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
}

interface PerformanceMetrics {
  renderTime: number;
  transformationsCount: number;
  visibilityChanges: number;
  deferredTransformations: number;
}



// Main NarramorphRenderer component with React.memo for better performance
const NarramorphRenderer: React.FC<NarramorphRendererProps> = memo(({ nodeId }) => {
  const {
    node,
    transformedContent,
    newlyTransformed,
    appliedTransformations
  } = useNodeState(nodeId);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [renderKey, setRenderKey] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  
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
  
  // Setup intersection observer for visibility detection
  useEffect(() => {
    if (!contentRef.current) return;
    
    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const isNowVisible = entries[0]?.isIntersecting ?? false;
        
        if (isVisible !== isNowVisible) {
          setIsVisible(isNowVisible);
          setMetrics(prev => ({
            ...prev,
            visibilityChanges: prev.visibilityChanges + 1
          }));
          
          // Inform the transformation service about visibility changes
          if (node?.id) {
            transformationService.setContentVisibility(
              node.id,
              isNowVisible,
              // Prioritize currently selected node
              node.id === nodeId ? 2 : 1
            );
          }
        }
      },
      {
        root: null, // viewport
        rootMargin: '100px', // load slightly before visible
        threshold: 0.1 // trigger when 10% visible
      }
    );
    
    // Start observing
    observerRef.current.observe(contentRef.current);
    
    // Cleanup
    return () => {
      observerRef.current?.disconnect();
    };
  }, [node?.id, nodeId, isVisible]);
  
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
  
  
  // Show loading state if content isn't available
  if (!node || !transformedContent) {
    return <div className="narramorph-loading">Loading content...</div>;
  }
  
  // Render the transformed content with animation container
  return (
    <div className="narramorph-container" key={renderKey}>
      <TransformationAnimationContainer
        transformations={prioritizedTransformations}
        isNewlyTransformed={newlyTransformed}
        nodeId={node.id}
      >
        <div
          ref={contentRef}
          className={`narramorph-content ${isVisible ? 'is-visible' : 'not-visible'}`}
          data-transformations-count={prioritizedTransformations.length}
          data-node-id={node.id}
          data-visit-count={node.visitCount}
        >
          {/* Render content directly without virtualization */}
          <div dangerouslySetInnerHTML={{ __html: transformedContent || '' }} />
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
          <p>Performance: {metrics.renderTime.toFixed(2)}ms for {metrics.transformationsCount} transformations</p>
          <p>Deferred: {metrics.deferredTransformations} transformations</p>
          <p>Visibility Changes: {metrics.visibilityChanges}</p>
        </div>
      )}
    </div>
  );
});

export default NarramorphRenderer;