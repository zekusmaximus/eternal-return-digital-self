// src/components/NodeView/NodeView.tsx

import { useEffect, useState, lazy, Suspense, useRef, useMemo, useCallback } from 'react';
import ErrorBoundary from '../common/ErrorBoundary';
import SimpleTextRenderer from './SimpleTextRenderer';
import { viewManager } from '../../services/ViewManager';
import { useSelector } from 'react-redux';
import {
  selectSelectedNodeId,
  returnToConstellation,
  selectViewMode,
} from '../../store/slices/interfaceSlice';
import { loadNodeContent, selectNodeById, visitNode, validateNodeContent, recoverNodeContent } from '../../store/slices/nodesSlice';
import { useAppDispatch } from '../../store/hooks';
import { addVisitedNode } from '../../store/slices/readerSlice';
import './NodeView.css';
import '../common/ErrorStyles.css'; // Import error and debug styles
import { RootState } from '../../store';
import { finalTextCleanup } from '../../utils/contentSanitizer';

// Define interface for the non-standard performance.memory API
interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

// Extend Performance interface
interface ExtendedPerformance extends Performance {
  memory?: MemoryInfo;
}

// Type guard for memory property
function hasMemory(performance: Performance): performance is ExtendedPerformance {
  return 'memory' in performance;
}

// Dynamically import heavy components with loading tracking
const ReactMarkdown = lazy(() => {
  console.log('[NodeView] Loading ReactMarkdown component');
  return import('react-markdown').then(module => {
    console.log('[NodeView] ReactMarkdown component loaded');
    return module;
  });
});

const MiniConstellation = lazy(() => import('./MiniConstellation'));
const MarginaliaSidebar = lazy(() => import('./MarginaliaSidebar'));

// Pre-load NarramorphRenderer to avoid race conditions with content loading
const NarramorphRendererPromise = import('./NarramorphRenderer');
const NarramorphRenderer = lazy(() => {
  console.log('[NodeView] Loading NarramorphRenderer component');
  return NarramorphRendererPromise.then(module => {
    console.log('[NodeView] NarramorphRenderer component loaded');
    return module;
  });
});

// Dynamically import remark plugin with loading tracking
const remarkGfmPromise = import('remark-gfm').then(module => {
  console.log('[NodeView] remark-gfm plugin loaded');
  return module.default;
});

// Loading components
const ContentLoading = () => (
  <div className="content-loading">
    <div className="loading-spinner"></div>
    <p>Loading content...</p>
  </div>
);

const SideComponentLoading = () => <div className="side-component-loading"></div>;

const NodeView = () => {
  const dispatch = useAppDispatch();
  const selectedNodeId = useSelector(selectSelectedNodeId);
  const viewMode = useSelector(selectViewMode);
  const node = useSelector((state: RootState) => selectedNodeId ? selectNodeById(state, selectedNodeId) : null);

  const uniqueViewKey = useMemo(() => viewManager.getUniqueViewKey(), []);

  const [useNarramorph, setUseNarramorph] = useState(false);
  const [useWebGLFallback, setUseWebGLFallback] = useState(false);
  const [forceSimpleRenderer, setForceSimpleRenderer] = useState(true);
  const webGLAvailable = true;

  const contentContainerRef = useRef<HTMLDivElement>(null);
  const renderCompleteCalledRef = useRef(false);
  const processedNodeRef = useRef<string | null>(null);
  const narramorphActivatedRef = useRef(false);
  const lastVisitedIdRef = useRef<string | null>(null);

  const [viewTransitionState, setViewTransitionState] = useState({
    transitionTime: Date.now(),
    lastViewMode: viewMode,
    transitionCount: 0,
    renderCount: 0
  });

  const [memoryStats, setMemoryStats] = useState({
    jsHeapSizeLimit: 0,
    totalJSHeapSize: 0,
    usedJSHeapSize: 0,
    timestamp: 0
  });

  const onVisibilityChange = useCallback((isVisible: boolean) => {
    console.log(`[NodeView] Content visibility changed to: ${isVisible ? 'visible' : 'hidden'}`);

    if (!isVisible && contentContainerRef.current) {
      console.warn('[NodeView] Forcing content visibility after hidden state detected');
      contentContainerRef.current.style.display = 'block';
      contentContainerRef.current.style.visibility = 'visible';
      contentContainerRef.current.style.opacity = '1';
      return;
    }
  }, []);

  const [contentDebug, setContentDebug] = useState({
    loadStarted: false,
    contentLoaded: false,
    renderStarted: false,
    narramorphActivated: false,
    visibilityIssue: false,
    errorOccurred: false
  });

  const onRenderComplete = useCallback(() => {
    if (renderCompleteCalledRef.current) {
      console.log('[NodeView] Skipping duplicate onRenderComplete call');
      return;
    }

    renderCompleteCalledRef.current = true;
    console.log('[NodeView] SimpleTextRenderer completed rendering');

    if (contentContainerRef.current) {
      console.log('[NodeView] Forcing container visibility after render complete');
      contentContainerRef.current.style.display = 'block';
      contentContainerRef.current.style.visibility = 'visible';
      contentContainerRef.current.style.opacity = '1';
    }

    setContentDebug(prev => ({ ...prev, visibilityIssue: false }));

    setTimeout(() => {
      if (contentContainerRef.current) {
        const isStillVisible =
          contentContainerRef.current.offsetParent !== null &&
          window.getComputedStyle(contentContainerRef.current).display !== 'none' &&
          window.getComputedStyle(contentContainerRef.current).visibility !== 'hidden';

        console.log(`[NodeView] Post-render visibility check: ${isStillVisible ? 'visible' : 'not visible'}`);

        if (!isStillVisible) {
          console.warn('[NodeView] Content became invisible after render - forcing visibility');
          contentContainerRef.current.style.display = 'block';
          contentContainerRef.current.style.visibility = 'visible';
          contentContainerRef.current.style.opacity = '1';
        }
      }
    }, 500);
  }, []);

  useEffect(() => {
    if (selectedNodeId !== processedNodeRef.current) {
      renderCompleteCalledRef.current = false;
      processedNodeRef.current = selectedNodeId;
      narramorphActivatedRef.current = false;
    }
  }, [selectedNodeId]);

  useEffect(() => {
    if (viewTransitionState.lastViewMode !== viewMode) {
      const now = Date.now();
      console.log(`[NodeView] View transition: ${viewTransitionState.lastViewMode} -> ${viewMode} at ${now}`);

      setViewTransitionState(prev => ({
        ...prev,
        lastViewMode: viewMode,
        transitionTime: now,
        transitionCount: prev.transitionCount + 1,
        renderCount: prev.renderCount + 1
      }));

      setContentDebug({
        loadStarted: false,
        contentLoaded: false,
        renderStarted: false,
        narramorphActivated: false,
        visibilityIssue: false,
        errorOccurred: false
      });

      if (hasMemory(performance) && performance.memory) {
        const memory = performance.memory;
        setMemoryStats({
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          totalJSHeapSize: memory.totalJSHeapSize,
          usedJSHeapSize: memory.usedJSHeapSize,
          timestamp: now
        });
      }
    } else {
      setViewTransitionState(prev => ({
        ...prev,
        renderCount: prev.renderCount + 1
      }));
    }
  }, [viewMode, viewTransitionState.lastViewMode]);

  useEffect(() => {
    const needsContent = selectedNodeId && !node?.content;
    if (needsContent) {
      console.log(`[NodeView] Loading content for node: ${selectedNodeId}`, {
        viewMode
      });
      setContentDebug(prev => ({ ...prev, loadStarted: true }));
      dispatch(loadNodeContent(selectedNodeId));
    }
  }, [selectedNodeId, dispatch, viewMode, node?.content]);
  const contentLength = node?.currentContent?.length || 0;

  // Create clean content for ReactMarkdown fallbacks
  const cleanCurrentContent = useMemo(() => {
    if (!node?.currentContent) return '';
    return finalTextCleanup(node.currentContent);
  }, [node?.currentContent]);

  const contentCorrupted = useMemo(() => {
    if (!node?.currentContent) return false;
    return (
      node.currentContent.includes('[object Object]') ||
      node.currentContent.includes('undefined') ||
      node.currentContent.length < 10
    );
  }, [node?.currentContent]);

  const contentPreview = useMemo(() => {
    return node?.currentContent?.substring(0, 50) || 'NO CONTENT';
  }, [node?.currentContent]);

  useEffect(() => {
    if (node?.id && processedNodeRef.current === selectedNodeId) {
      const hasCurrentContent = contentLength > 0;

      console.log(`[NodeView] Content processed for node: ${selectedNodeId}`, {
        hasContent: hasCurrentContent,
        visitCount: node.visitCount,
        contentLength,
        contentPreview,
        enhancedContentExists: !!node.enhancedContent,
        contentExists: !!node.content
      });

      setContentDebug(prev => ({ ...prev, contentLoaded: hasCurrentContent }));

      if (hasCurrentContent && contentCorrupted) {
        console.error(`[NodeView] Possible content corruption detected:`, {
          contentStart: contentPreview,
          contentLength
        });
      }
    }
  }, [
    selectedNodeId,
    node?.id,
    node?.visitCount,
    node?.content,
    node?.enhancedContent,
    contentLength,
    contentPreview,
    contentCorrupted
  ]);

  useEffect(() => {
    if (node?.id && contentLength > 0 && !narramorphActivatedRef.current) {
      console.log(`[NodeView] Preparing to activate Narramorph for node: ${node.id}`, {
        viewMode,
        hasContent: contentLength > 0
      });
      setContentDebug(prev => ({ ...prev, renderStarted: true }));

      narramorphActivatedRef.current = true;

      let componentLoaded = false;

      console.log('[NodeView] Preloading NarramorphRenderer component');
      NarramorphRendererPromise.then(() => {
        componentLoaded = true;
        console.log('[NodeView] NarramorphRenderer preload complete');

        if (node?.id) {
          console.log(`[NodeView] Activating Narramorph renderer for node: ${node.id} after preload`);

          setUseNarramorph(true);
          setContentDebug(prev => ({ ...prev, narramorphActivated: true }));

          if (contentContainerRef.current) {
            const preBoundingRect = contentContainerRef.current.getBoundingClientRect();
            console.log('[NodeView] Post-preload container dimensions:', {
              width: preBoundingRect.width,
              height: preBoundingRect.height,
              display: window.getComputedStyle(contentContainerRef.current).display,
              visibility: window.getComputedStyle(contentContainerRef.current).visibility
            });
          }
        }
      }).catch(err => {
        console.error('[NodeView] Error preloading NarramorphRenderer:', err);
        setForceSimpleRenderer(true);
      });

      const visibilityTimer = setTimeout(() => {
        if (contentContainerRef.current) {
          console.log('[NodeView] Force checking content visibility');
          const isVisible = contentContainerRef.current.offsetParent !== null;
          const boundingRect = contentContainerRef.current.getBoundingClientRect();
          const computedStyle = window.getComputedStyle(contentContainerRef.current);

          console.log('[NodeView] Content visibility check:', {
            isVisible,
            width: boundingRect.width,
            height: boundingRect.height,
            display: computedStyle.display,
            visibility: computedStyle.visibility,
            zIndex: computedStyle.zIndex,
            position: computedStyle.position,
            opacity: computedStyle.opacity,
            componentLoaded
          });

          if (!isVisible || boundingRect.width === 0 || boundingRect.height === 0) {
            console.warn('[NodeView] Content invisible after rendering - forcing simple renderer');
            setForceSimpleRenderer(true);
            setContentDebug(prev => ({ ...prev, visibilityIssue: true }));
          }
        }
      }, 1500);

      return () => clearTimeout(visibilityTimer);
    }
    return undefined;
  }, [contentLength, node?.id, viewMode]);

  useEffect(() => {
    if (!node?.id || node.id === lastVisitedIdRef.current) return;

    dispatch(visitNode(node.id));
    // Create a plain-text synopsis from current content (first 100 chars)
    // Use refs or stable values to avoid adding node.currentContent and node.title to dependencies
    const currentContent = node.currentContent ?? '';
    const title = node.title ?? '';

    const synopsis =
      currentContent
        .replace(/<[^>]*>/g, '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 100);

    dispatch(
      addVisitedNode({
        id: node.id,
        title,
        synopsis,
      }),
    );    // Update ref to prevent duplicate processing
    lastVisitedIdRef.current = node.id;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch, node?.id]);
  
  // EMERGENCY CONTENT RECOVERY: Validate content on each render and trigger recovery if needed
  useEffect(() => {
    if (node?.id && node?.currentContent) {
      // Validate content integrity
      dispatch(validateNodeContent(node.id));
      
      // If content is marked as corrupted, attempt recovery
      if (node.transformationState === 'corrupted' && node.originalContent) {
        console.warn(`[NodeView] Content corruption detected for node ${node.id}, initiating recovery`);
        dispatch(recoverNodeContent(node.id));
      }
    }
  }, [node?.id, node?.currentContent, node?.transformationState, node?.originalContent, dispatch]);
  
  // Handle WebGL context loss errors
  useEffect(() => {
    const handleWebGLContextLoss = (event: ErrorEvent) => {
      if (event.message &&
         (event.message.includes('WebGL context lost') ||
          event.message.includes('THREE.WebGLRenderer'))) {
        console.error('[NodeView] WebGL context loss detected!', {
          message: event.message,
          stack: event.error?.stack || 'No stack trace',
          viewMode,
          timeElapsed: Date.now() - viewTransitionState.transitionTime + 'ms',
          renderCount: viewTransitionState.renderCount
        });

        setUseWebGLFallback(true);
        setUseNarramorph(false);
        setContentDebug(prev => ({ ...prev, errorOccurred: true }));

        if (hasMemory(performance) && performance.memory) {
          const memory = performance.memory;
          setMemoryStats({
            jsHeapSizeLimit: memory.jsHeapSizeLimit,
            totalJSHeapSize: memory.totalJSHeapSize,
            usedJSHeapSize: memory.usedJSHeapSize,
            timestamp: Date.now()
          });

          console.log(`[NodeView] Memory usage at WebGL error:`, {
            usedHeap: Math.round(memory.usedJSHeapSize / (1024 * 1024)) + 'MB',
            totalHeap: Math.round(memory.totalJSHeapSize / (1024 * 1024)) + 'MB',
            limit: Math.round(memory.jsHeapSizeLimit / (1024 * 1024)) + 'MB'
          });
        }
      }
    };

    window.addEventListener('error', handleWebGLContextLoss);

    return () => {
      window.removeEventListener('error', handleWebGLContextLoss);
    };
  }, [viewMode, viewTransitionState.renderCount, viewTransitionState.transitionTime]);

  const handleReturnToConstellation = () => {
    dispatch(returnToConstellation());
  };

  if (viewMode !== 'reading' || !node) {
    return null;
  }

  const characterClass = `${node.character.toLowerCase()}-theme`;

  const getTemporalClass = () => {
    if (node.temporalValue <= 3) return 'past-indicator';
    if (node.temporalValue <= 6) return 'present-indicator';
    return 'future-indicator';
  };

  const renderNodeContent = () => {
    if (!node.currentContent) {
      return (
        <div className="node-loading">
          <span>Loading narrative fragment...</span>
        </div>
      );
    }

    // Add a wrapper with debug information
    return (
      <div
        ref={contentContainerRef}
        className={`content-container ${node.currentState}`}
        data-content-loaded="true"
        data-node-id={node.id}
        data-visit-count={node.visitCount}
        style={{ position: 'relative', visibility: 'visible', display: 'block' }}
      >
        {/* Determine the appropriate renderer to use based on conditions */}
        {forceSimpleRenderer || !webGLAvailable ? (
          // Use SimpleTextRenderer when either forced or WebGL isn't available
          <div
            className="simple-renderer-wrapper"
            style={{
              display: 'block',
              visibility: 'visible',
              position: 'relative',
              minHeight: '200px',
              opacity: 1,
              zIndex: 5
            }}
          >
            <SimpleTextRenderer
              key={`simple-${node.id}-${node.visitCount}`}
              nodeId={node.id}
              onRenderComplete={onRenderComplete}
              onVisibilityChange={onVisibilityChange}
            />
          </div>
        ) : (
          // Try advanced rendering if conditions allow
          <Suspense fallback={<ContentLoading />}>
            {useNarramorph && !useWebGLFallback ? (
              // Try to use Narramorph, but with error boundary and fallback
              <ErrorBoundary
                fallback={                  <div className="fallback-content" style={{ visibility: 'visible', display: 'block' }}>
                    <p className="error-notice">Advanced rendering unavailable - showing basic content</p>
                    <ReactMarkdown remarkPlugins={[() => remarkGfmPromise]}>{cleanCurrentContent}</ReactMarkdown>
                  </div>
                }
              >
                {/* Render placeholder div to reserve space during loading */}
                <div
                  style={{
                    minHeight: '200px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <NarramorphRenderer
                    key={`narramorph-${node.id}-${node.visitCount}`}
                    nodeId={node.id}
                    onVisibilityChange={(isVisible: boolean) => {
                      console.log(`[NodeView] Content visibility changed to: ${isVisible ? 'visible' : 'hidden'}`);
                      
                      // Use a ref to track visibility changes over time
                      const visibilityTimer = setTimeout(() => {
                        // Only update state if component is still mounted
                        if (contentContainerRef.current) {
                          setContentDebug(prev => ({ ...prev, visibilityIssue: !isVisible }));
                          
                          // Only force simple renderer if content remains invisible
                          if (!isVisible) {
                            setForceSimpleRenderer(true);
                          }
                        }
                      }, 1000); // Wait 1 second before applying changes
                      
                      return () => clearTimeout(visibilityTimer);
                    }}
                  />
                </div>
              </ErrorBoundary>
            ) : (
              // Fallback to basic rendering with ReactMarkdown
              <div style={{ visibility: 'visible', display: 'block', position: 'relative', minHeight: '100px' }}>
                <div className="content-loading" style={{ marginBottom: '10px' }}>
                  <div className="loading-spinner"></div>
                  <p>Preparing content...</p>
                </div>                <ReactMarkdown
                  key={`markdown-${node.id}-${node.visitCount}`}
                  remarkPlugins={[() => remarkGfmPromise]}
                >
                  {cleanCurrentContent}
                </ReactMarkdown>
              </div>
            )}
          </Suspense>
        )}
        
        {/* Enhanced debug indicator with transition tracking */}
        <div className="debug-indicator">
          <div className={`status-dot ${contentDebug.contentLoaded ? 'status-green' : 'status-red'}`} title="Content loaded"></div>
          <div className={`status-dot ${contentDebug.narramorphActivated ? 'status-green' : 'status-yellow'}`} title="Narramorph active"></div>
          <div className={`status-dot ${contentDebug.errorOccurred ? 'status-red' : 'status-green'}`} title="No errors"></div>
          <div className={`status-dot ${contentDebug.visibilityIssue ? 'status-red' : 'status-green'}`} title="Content visible"></div>
          <div className={`status-dot ${forceSimpleRenderer ? 'status-blue' : 'status-yellow'}`} title="Simple renderer"></div>
          <div className={`status-dot ${webGLAvailable ? 'status-green' : 'status-red'}`} title="WebGL available"></div>
          <div className="debug-metrics">
            <span title="View transition count">T:{viewTransitionState.transitionCount}</span>
            <span title="Render count">R:{viewTransitionState.renderCount}</span>
            {memoryStats.usedJSHeapSize > 0 && (
              <span title="Memory usage">
                M:{Math.round(memoryStats.usedJSHeapSize / (1024 * 1024))}MB
              </span>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div 
      key={uniqueViewKey}
      className={`node-view-container ${characterClass}`}
    >
      <div className={`temporal-indicator ${getTemporalClass()}`}></div>

      <div className="node-header">
        <h1>{node.title}</h1>
        <div className="node-metadata">
          <span className="node-character">{node.character}</span>
          <span className="node-state">{node.currentState}</span>
          <span className="node-visits">Visits: {node.visitCount}</span>
        </div>
      </div>
      
      <div
        className="node-content force-visible"
        style={{
          position: 'relative'
        }}
      >
        {renderNodeContent()}
      </div>
      
      <div className="node-navigation">
        <button onClick={handleReturnToConstellation} className="navigation-button">
          Return to Constellation
        </button>
      </div>
      
      {/* Mini constellation for context - fixed in bottom right corner */}
      <div style={{
        position: 'absolute',
        bottom: '20px',
        right: '20px',
        width: '300px',
        height: '300px',
        pointerEvents: 'auto'
      }}>
        <Suspense fallback={<SideComponentLoading />}>
          <MiniConstellation />
        </Suspense>
      </div>
      
      {/* Sidebar with marginalia */}
      <Suspense fallback={<SideComponentLoading />}>
        <MarginaliaSidebar
          nodeId={node.id}
          strangeAttractors={node.strangeAttractors}
        />
      </Suspense>
    </div>
  );
};

export default NodeView;
