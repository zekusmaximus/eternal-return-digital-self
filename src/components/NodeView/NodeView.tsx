// src/components/NodeView/NodeView.tsx

import { useEffect, useState, lazy, Suspense, useRef, useMemo } from 'react';
import ErrorBoundary from '../common/ErrorBoundary';
import SimpleTextRenderer from './SimpleTextRenderer';
import { viewManager } from '../../services/ViewManager';
import { webGLContextManager } from '../../services/WebGLContextManager';
import { useSelector } from 'react-redux';
import {
  selectSelectedNodeId,
  returnToConstellation,
  selectViewMode,
} from '../../store/slices/interfaceSlice';
import { loadNodeContent, selectNodeById, visitNode } from '../../store/slices/nodesSlice';
import { useAppDispatch } from '../../store/hooks';
import './NodeView.css';
import '../common/ErrorStyles.css'; // Import error and debug styles
import { RootState } from '../../store';

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

// Force simple rendering flag - set to false to allow automatic decision based on system capabilities
// Set to true to always use the simplified direct renderer
const FORCE_SIMPLE_RENDERING = false;

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

  // Get unique view key from ViewManager to force proper unmount/remount
  const uniqueViewKey = useMemo(() => viewManager.getUniqueViewKey(), []);

  // Reference for MiniConstellation
  const miniConstellationRef = useRef<HTMLDivElement>(null);

  // State to control transition between ReactMarkdown and NarramorphRenderer
  // Moved to top level before any conditional returns
  const [useNarramorph, setUseNarramorph] = useState(false);
  
  // Add fallback state for handling WebGL context loss
  const [useWebGLFallback, setUseWebGLFallback] = useState(false);
  
  // Track if simple renderer has been forced
  const [forceSimpleRenderer, setForceSimpleRenderer] = useState(FORCE_SIMPLE_RENDERING);
  
  // Track if WebGL is available for this view (determined by context manager)
  const [webGLAvailable, setWebGLAvailable] = useState(true);
  
  // Reference to content container for visibility debugging
  const contentContainerRef = useRef<HTMLDivElement>(null);
  
  // Debug state to track content status
  const [contentDebug, setContentDebug] = useState({
    loadStarted: false,
    contentLoaded: false,
    renderStarted: false,
    narramorphActivated: false,
    visibilityIssue: false,
    errorOccurred: false
  });
  
  // Register with ViewManager
  useEffect(() => {
    if (viewMode === 'reading') {
      viewManager.registerViewMount('reading', true);
      
      // Check WebGL availability for this view
      const webGLSupport = webGLContextManager.checkWebGLSupport();
      setWebGLAvailable(!webGLSupport.isLowEndDevice);
      
      console.log(`[NodeView] Mounted reading view, WebGL available: ${webGLAvailable}`);
    }
    
    return () => {
      if (viewMode === 'reading') {
        viewManager.registerViewMount('reading', false);
        console.log('[NodeView] Unmounted reading view');
      }
    };
  }, [viewMode, webGLAvailable]);

  // Set up timing markers to debug when content disappears
  useEffect(() => {
    if (selectedNodeId) {
      console.time(`node-${selectedNodeId}-visibility`);
    }
    return () => {
      if (selectedNodeId) {
        console.timeEnd(`node-${selectedNodeId}-visibility`);
      }
    };
  }, [selectedNodeId]);
  
  // Create a state to track view transitions
  const [viewTransitionState, setViewTransitionState] = useState({
    transitionTime: 0,
    lastViewMode: viewMode,
    transitionCount: 0,
    renderCount: 0
  });
  
  // Track memory usage
  const [memoryStats, setMemoryStats] = useState({
    jsHeapSizeLimit: 0,
    totalJSHeapSize: 0,
    usedJSHeapSize: 0,
    timestamp: 0
  });
  
  // Effect to track view transitions
  useEffect(() => {
    if (viewTransitionState.lastViewMode !== viewMode) {
      const now = Date.now();
      console.log(`[NodeView] View transition: ${viewTransitionState.lastViewMode} -> ${viewMode} at ${now}`);
      
      setViewTransitionState(prev => ({
        ...prev,
        lastViewMode: viewMode,
        transitionTime: now,
        transitionCount: prev.transitionCount + 1
      }));
      
      // Reset content debug state on transition
      setContentDebug(prev => ({
        ...prev,
        loadStarted: false,
        contentLoaded: false,
        renderStarted: false,
        narramorphActivated: false,
        visibilityIssue: false,
        errorOccurred: false
      }));
      
      // Collect memory stats on transition
      if (hasMemory(performance) && performance.memory) {
        const memory = performance.memory;
        setMemoryStats({
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
          totalJSHeapSize: memory.totalJSHeapSize,
          usedJSHeapSize: memory.usedJSHeapSize,
          timestamp: now
        });
        
        console.log(`[NodeView] Memory usage at transition:`, {
          usedHeap: Math.round(memory.usedJSHeapSize / (1024 * 1024)) + 'MB',
          totalHeap: Math.round(memory.totalJSHeapSize / (1024 * 1024)) + 'MB',
          limit: Math.round(memory.jsHeapSizeLimit / (1024 * 1024)) + 'MB'
        });
      }
    }
    
    // Increment render count on each render
    setViewTransitionState(prev => ({
      ...prev,
      renderCount: prev.renderCount + 1
    }));
  }, [viewMode, viewTransitionState.lastViewMode]);
  
  // Effect to load content if needed
  useEffect(() => {
    if (selectedNodeId && (!node?.content || !node?.currentContent)) {
      console.log(`[NodeView] Loading content for node: ${selectedNodeId}`, {
        viewMode,
        transitionCount: viewTransitionState.transitionCount,
        timeElapsed: Date.now() - viewTransitionState.transitionTime + 'ms'
      });
      setContentDebug(prev => ({ ...prev, loadStarted: true }));
      dispatch(loadNodeContent(selectedNodeId));
    }
    
    // Debug when content is loaded
    if (node?.currentContent) {
      console.log(`[NodeView] Content loaded for node: ${selectedNodeId}`, {
        contentLength: node.currentContent.length,
        visitCount: node.visitCount,
        timeElapsed: Date.now() - viewTransitionState.transitionTime + 'ms'
      });
      setContentDebug(prev => ({ ...prev, contentLoaded: true }));
      
      // Check for content corruption
      if (node.currentContent.includes('[object Object]') ||
          node.currentContent.includes('undefined') ||
          node.currentContent.length < 10) {
        console.error(`[NodeView] Possible content corruption detected:`, {
          contentStart: node.currentContent.substring(0, 100),
          contentLength: node.currentContent.length
        });
      }
    }
  }, [selectedNodeId, node, dispatch, viewMode, viewTransitionState.transitionCount, viewTransitionState.transitionTime]);
  
  // Separate effect to track node visits - only runs when selectedNodeId changes
  useEffect(() => {
    if (selectedNodeId) {
      dispatch(visitNode(selectedNodeId));
    }
  }, [selectedNodeId, dispatch]); // Removed node dependency to prevent infinite loop
  
  // Preload components and enable Narramorph transformations after content is loaded
  useEffect(() => {
    if (node?.currentContent) {
      console.log(`[NodeView] Preparing to activate Narramorph for node: ${node.id}`, {
        viewMode,
        timeElapsed: Date.now() - viewTransitionState.transitionTime + 'ms',
        contentLength: node.currentContent.length
      });
      setContentDebug(prev => ({ ...prev, renderStarted: true }));
      
      // First ensure NarramorphRenderer is loaded before enabling it
      // This prevents the race condition between component loading and state changes
      let componentLoaded = false;
      
      // Start preloading the component immediately
      console.log('[NodeView] Preloading NarramorphRenderer component');
      NarramorphRendererPromise.then(() => {
        componentLoaded = true;
        console.log('[NodeView] NarramorphRenderer preload complete');
        
        // Only proceed if we still have the same node content (prevent stale closure issues)
        if (node?.id) {
          console.log(`[NodeView] Activating Narramorph renderer for node: ${node.id} after preload`);
          
          // Now it's safe to enable the component
          setUseNarramorph(true);
          setContentDebug(prev => ({ ...prev, narramorphActivated: true }));
          
          // Check DOM state after enabling
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
        // Force simple renderer on error
        setForceSimpleRenderer(true);
      });
      
      // Set up visibility check that runs after components should be loaded and rendered
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
          
          // If content isn't visible or has zero dimensions
          if (!isVisible || boundingRect.width === 0 || boundingRect.height === 0) {
            console.warn('[NodeView] Content invisible after rendering - forcing simple renderer');
            setForceSimpleRenderer(true);
            setContentDebug(prev => ({ ...prev, visibilityIssue: true }));
          }
        }
      }, 1500); // Increased timeout to allow more time for loading
      
      return () => clearTimeout(visibilityTimer);
    }
    return undefined; // Explicit return for when condition is false
  }, [node?.currentContent, node?.id, viewMode, viewTransitionState.transitionTime]);
  
  // Handle WebGL context loss errors
  useEffect(() => {
    const handleWebGLContextLoss = (event: ErrorEvent) => {
      // Check if this is a WebGL context loss error
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
        
        // Set fallback mode to use ReactMarkdown instead
        setUseWebGLFallback(true);
        setUseNarramorph(false);
        setContentDebug(prev => ({ ...prev, errorOccurred: true }));
        
        // Collect memory stats on error
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
    
    // Listen for error events that might indicate WebGL issues
    window.addEventListener('error', handleWebGLContextLoss);
    
    return () => {
      window.removeEventListener('error', handleWebGLContextLoss);
    };
  }, [viewMode, viewTransitionState.renderCount, viewTransitionState.transitionTime]);
  
  // Handle return to constellation view
  const handleReturnToConstellation = () => {
    dispatch(returnToConstellation());
  };

  // Removed MiniConstellation dragging handlers

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
              onRenderComplete={() => {
                console.log('[NodeView] SimpleTextRenderer completed rendering');
                
                // BUGFIX: Ensure content remains visible after render
                if (contentContainerRef.current) {
                  console.log('[NodeView] Forcing container visibility after render complete');
                  contentContainerRef.current.style.display = 'block';
                  contentContainerRef.current.style.visibility = 'visible';
                  contentContainerRef.current.style.opacity = '1';
                }
                
                setContentDebug(prev => ({ ...prev, visibilityIssue: false }));
                
                // BUGFIX: Set a verification check after render
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
              }}
              onVisibilityChange={(isVisible: boolean) => {
                console.log(`[NodeView] Content visibility changed to: ${isVisible ? 'visible' : 'hidden'}`);
                
                // BUGFIX: If visibility changes to hidden, force it back to visible
                if (!isVisible && contentContainerRef.current) {
                  console.warn('[NodeView] Forcing content visibility after hidden state detected');
                  contentContainerRef.current.style.display = 'block';
                  contentContainerRef.current.style.visibility = 'visible';
                  contentContainerRef.current.style.opacity = '1';
                  
                  // Don't update debug state to indicate an issue
                  return;
                }
                
                setContentDebug(prev => ({ ...prev, visibilityIssue: !isVisible }));
              }}
            />
          </div>
        ) : (
          // Try advanced rendering if conditions allow
          <Suspense fallback={<ContentLoading />}>
            {useNarramorph && !useWebGLFallback ? (
              // Try to use Narramorph, but with error boundary and fallback
              <ErrorBoundary
                fallback={
                  <div className="fallback-content" style={{ visibility: 'visible', display: 'block' }}>
                    <p className="error-notice">Advanced rendering unavailable - showing basic content</p>
                    <ReactMarkdown remarkPlugins={[() => remarkGfmPromise]}>{node.currentContent}</ReactMarkdown>
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
                </div>
                <ReactMarkdown
                  key={`markdown-${node.id}-${node.visitCount}`}
                  remarkPlugins={[() => remarkGfmPromise]}
                >
                  {node.currentContent}
                </ReactMarkdown>
              </div>
            )}
          </Suspense>
        )}
        
        {/* Enhanced debug indicator with transition tracking */}
        {(
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
        )}
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
      <div
        ref={miniConstellationRef}
        className="mini-constellation"
      >
        <Suspense fallback={<SideComponentLoading />}>
          <MiniConstellation
            currentNodeId={node.id}
          />
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