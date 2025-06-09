import { useEffect, lazy, Suspense, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useAppDispatch } from './store/hooks'; // Ensure './store/hooks' exists or correct the path
import { viewManager } from './services/ViewManager';
import { webGLContextManager } from './services/WebGLContextManager';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { store, persistor } from './store';
import { initializeNodes } from './store/slices/nodesSlice';
import { selectViewMode } from './store/slices/interfaceSlice';
import './App.css';

// Interface to track view transitions for debugging
interface ViewTransition {
  from: string;
  to: string;
  timestamp: number;
}

// Memory API types
interface MemoryInfo {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
}

// Extended Performance interface to include non-standard memory property
interface ExtendedPerformance extends Performance {
  memory?: MemoryInfo;
}

// Type guard for checking if performance has memory property
function hasMemory(performance: Performance): performance is ExtendedPerformance {
  return 'memory' in performance;
}

// Interface for performance tracking
interface PerformanceRecord {
  timestamp: number;
  fps: number;
  memory?: MemoryInfo;
}

// Dynamically import main view components
const ConstellationView = lazy(() => import('./components/Constellation/ConstellationView'));
const NodeView = lazy(() => import('./components/NodeView/NodeView'));
const Onboarding = lazy(() => import('./components/Onboarding/Onboarding'));

// Loading component for Suspense fallback
const LoadingView = () => (
  <div className="loading-container">
    <div className="loading-spinner"></div>
    <p>Loading view...</p>
  </div>
);

// Inner App component that uses Redux hooks
function AppContent() {
  const dispatch = useAppDispatch();
  const viewMode = useSelector(selectViewMode);
  
  // State to track view transitions for debugging
  const [viewTransitions, setViewTransitions] = useState<ViewTransition[]>([]);
  const prevViewModeRef = useRef<string>(viewMode);
  
  // Performance monitoring
  const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
  const performanceMonitorRef = useRef<number | null>(null);
  const latestRecordsRef = useRef<PerformanceRecord[]>([]);
  
  // Keep the ref updated with the latest state value
  useEffect(() => {
    latestRecordsRef.current = performanceRecords;
  }, [performanceRecords]);
  
  // Monitor performance metrics - with performance tracking throttle
  useEffect(() => {
    // Start performance monitoring
    if (!performanceMonitorRef.current) {
      console.log('[App] Starting performance monitoring');
      
      // Use a throttled update approach to prevent infinite loops
      let lastUpdateTime = 0;
      const THROTTLE_MS = 5000; // Increased to 5 seconds to reduce overhead
      
      const monitorPerformance = () => {
        const now = performance.now();
        
        // Only update state if enough time has passed
        if (now - lastUpdateTime > THROTTLE_MS) {
          lastUpdateTime = now;
          
          // Calculate FPS based on frame timing using the ref instead of state
          const records = latestRecordsRef.current;
          const fps = 1000 / (now - (records[records.length - 1]?.timestamp || now - 1000));
          
          // Get memory info if available
          let memoryInfo = undefined;
          if (hasMemory(performance) && performance.memory) {
            memoryInfo = {
              jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
              totalJSHeapSize: performance.memory.totalJSHeapSize,
              usedJSHeapSize: performance.memory.usedJSHeapSize
            };
          }
          
          // Record performance data
          setPerformanceRecords(prev => {
            const newRecords = [...prev, {
              timestamp: now,
              fps: Math.min(60, fps), // Cap at 60 FPS for readable data
              memory: memoryInfo
            }];
            
            // Keep only last 10 records instead of 100
            if (newRecords.length > 10) {
              return newRecords.slice(-10);
            }
            return newRecords;
          });
        }
        
        // Request next frame
        performanceMonitorRef.current = requestAnimationFrame(monitorPerformance);
      };
      
      // Start monitoring
      performanceMonitorRef.current = requestAnimationFrame(monitorPerformance);
    }
    
    // Clean up on unmount
    return () => {
      if (performanceMonitorRef.current) {
        cancelAnimationFrame(performanceMonitorRef.current);
        performanceMonitorRef.current = null;
      }
    };
  }, []); // No need for performanceRecords dependency now that we use the ref
  
  // Track view mode changes using ViewManager
  useEffect(() => {
    if (prevViewModeRef.current !== viewMode) {
      // Update ViewManager with the new view state
      viewManager.setActiveView(viewMode as 'constellation' | 'reading');
      
      // Log the transition
      console.log(`[App] View transition: ${prevViewModeRef.current} -> ${viewMode}`);
      
      // Record the transition for debugging
      setViewTransitions(prev => {
        const newTransitions = [...prev, {
          from: prevViewModeRef.current,
          to: viewMode,
          timestamp: Date.now()
        }];

        // Log performance data at transition using the ref for latest data
        const records = latestRecordsRef.current;
        if (records.length > 0) {
          const latestRecord = records[records.length - 1];
          console.log('[App] Performance at transition:', {
            fps: latestRecord.fps.toFixed(1),
            memory: latestRecord.memory ? {
              used: (latestRecord.memory.usedJSHeapSize / (1024 * 1024)).toFixed(1) + 'MB',
              total: (latestRecord.memory.totalJSHeapSize / (1024 * 1024)).toFixed(1) + 'MB'
            } : 'unavailable',
            transitions: newTransitions.length
          });
        }
        return newTransitions;
      });
      
      // Update previous value
      prevViewModeRef.current = viewMode;
    }
  }, [viewMode]); // Only re-run when viewMode changes
  
  // Initialize nodes on mount
  useEffect(() => {
    console.log('[App] Initializing application');
    dispatch(initializeNodes());
  }, [dispatch]);
  
  // Listen for WebGL context loss at app level
  useEffect(() => {
    // Traditional error event handling
    const handleWebGLContextLoss = (event: ErrorEvent) => {
      if (event.message &&
          (event.message.includes('WebGL context lost') ||
           event.message.includes('THREE.WebGLRenderer'))) {
        console.error('[App] WebGL context loss detected at app level!', {
          message: event.message,
          viewMode: viewMode,
          transitions: viewTransitions.length,
          timestamp: Date.now()
        });
      }
    };
    
    // Custom event handling for centralized WebGLContextManager events
    const handleWebGLContextLossEvent = (event: CustomEvent) => {
      const { contextId, type } = event.detail;
      console.error('[App] WebGL context loss event received from WebGLContextManager', {
        contextId,
        type,
        viewMode: viewMode,
        timestamp: Date.now()
      });
      
      // Force a check on WebGL availability
      const webGLSupport = webGLContextManager.checkWebGLSupport();
      if (webGLSupport.isLowEndDevice) {
        console.warn('[App] Device seems to be low-end, may need to disable visual effects');
      }
    };
    
    window.addEventListener('error', handleWebGLContextLoss);
    window.addEventListener('webgl-context-loss', handleWebGLContextLossEvent as EventListener);
    
    // Register transition callbacks with ViewManager
    viewManager.registerTransitionCallbacks({
      onBeforeTransition: (from, to) => {
        console.log(`[App] ViewManager transition started: ${from} → ${to}`);
      },
      onAfterTransition: (from, to) => {
        console.log(`[App] ViewManager transition completed: ${from} → ${to}`);
      }
    });
    
    // Set up cleanup for application shutdown
    return () => {
      window.removeEventListener('error', handleWebGLContextLoss);
      window.removeEventListener('webgl-context-loss', handleWebGLContextLossEvent as EventListener);
      
      // The disposeAllContexts call has been removed from here to prevent race conditions.
      // The WebGLContextManager's own beforeunload handler is sufficient for final cleanup.
      console.log('[App] Unmounting');
    };
  }, [viewMode, viewTransitions.length]); // Re-register listeners if viewMode or transitions change to ensure handlers have fresh data.
  
  return (
    <div className="app-container">
      <header className="app-header">
        <h1 className="app-title">The Eternal Return of the Digital Self</h1>
      </header>
      <div className="stars-container">
        <div className="stars"></div>
        <div className="stars2"></div>
        <div className="stars3"></div>
      </div>
      
      {/* Use ViewManager's unique keys to force complete unmount/remount of components */}
      <Suspense fallback={<LoadingView />}>
        {viewMode === 'constellation' ? (
          <ConstellationView key={`constellation-${viewManager.getUniqueViewKey()}`} />
        ) : (
          <NodeView key={`node-${viewManager.getUniqueViewKey()}`} />
        )}
      </Suspense>
      <Suspense fallback={<div></div>}>
        <Onboarding />
      </Suspense>
      
      {/* Debug overlay - only visible in development */}
      {process.env.NODE_ENV === 'development' && performanceRecords.length > 0 && (
        <div className="app-debug-overlay">
          <div className="performance-stats">
            <span>FPS: {performanceRecords[performanceRecords.length - 1].fps.toFixed(1)}</span>
            <span>View: {viewMode}</span>
            <span>Transitions: {viewTransitions.length}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Main App component with Redux providers
function App() {
  return (
    <Provider store={store}>
      <PersistGate loading={<div>Loading...</div>} persistor={persistor}>
        <AppContent />
      </PersistGate>
    </Provider>
  );
}

export default App;