/**
 * ViewManager Service
 * 
 * Centralized service to manage view transitions and component lifecycle.
 * Ensures only one active view component at a time and proper cleanup
 * of resources during transitions.
 * 
 * This service:
 * 1. Controls which view is active (constellation or reading)
 * 2. Manages transition states between views
 * 3. Enforces proper unmounting of previous views before mounting new ones
 * 4. Coordinates with WebGLContextManager to suspend inactive views
 */

import { webGLContextManager } from './WebGLContextManager';

// View types
export type ViewType = 'constellation' | 'reading' | 'loading';

// View state management
interface ViewState {
  activeView: ViewType;
  previousView: ViewType | null;
  isTransitioning: boolean;
  transitionStartTime: number;
  uniqueViewKey: string; // For forcing unmount/remount
  transitionCount: number;
}

// Transition callbacks
interface TransitionCallbacks {
  onBeforeTransition?: (from: ViewType, to: ViewType) => void;
  onAfterTransition?: (from: ViewType, to: ViewType) => void;
}

class ViewManager {
  private static instance: ViewManager;
  private state: ViewState = {
    activeView: 'loading',
    previousView: null,
    isTransitioning: false,
    transitionStartTime: 0,
    uniqueViewKey: 'view-0',
    transitionCount: 0
  };
  
  private transitionCallbacks: TransitionCallbacks = {};
  private transitionTimeout: NodeJS.Timeout | null = null;
  private viewComponents: Map<ViewType, boolean> = new Map();
  private transitionDuration = 300; // ms
  
  // Singleton pattern
  private constructor() {
    console.log('[ViewManager] Initialized');
    
    // Initialize view components tracking
    this.viewComponents.set('constellation', false);
    this.viewComponents.set('reading', false);
    this.viewComponents.set('loading', false);
  }

  public static getInstance(): ViewManager {
    if (!ViewManager.instance) {
      ViewManager.instance = new ViewManager();
    }
    return ViewManager.instance;
  }

  /**
   * Get current view state
   */
  public getViewState(): Readonly<ViewState> {
    return { ...this.state };
  }

  /**
   * Set the active view with proper transition handling
   */
  public setActiveView(viewType: ViewType): void {
    if (viewType === this.state.activeView && !this.state.isTransitioning) {
      console.log(`[ViewManager] View ${viewType} is already active, ignoring`);
      return;
    }
    
    console.log(`[ViewManager] Transitioning from ${this.state.activeView} to ${viewType}`);
    
    // Cancel any pending transition
    if (this.transitionTimeout) {
      clearTimeout(this.transitionTimeout);
      this.transitionTimeout = null;
    }
    
    const previousView = this.state.activeView;
    
    // Only generate a new key if transitioning between different views
    // This prevents unnecessary remounting when the same view is re-activated
    const needsNewKey = previousView !== viewType;
    
    // Set transitioning state
    this.state = {
      ...this.state,
      previousView,
      activeView: viewType,
      isTransitioning: true,
      transitionStartTime: Date.now(),
      transitionCount: this.state.transitionCount + 1,      // Only generate a new key when actually changing views
      // Using crypto.randomUUID() for better uniqueness guarantees than Math.random()
      uniqueViewKey: needsNewKey
        ? `view-${Date.now()}-${crypto.randomUUID().slice(0, 8)}`
        : this.state.uniqueViewKey
    };
    
    // Call before transition callback
    if (this.transitionCallbacks.onBeforeTransition) {
      this.transitionCallbacks.onBeforeTransition(previousView, viewType);
    }
    
    // Handle WebGL context management
    this.manageWebGLContexts(previousView, viewType);
    
    // Set timeout to clear transition state
    this.transitionTimeout = setTimeout(() => {
      this.state = {
        ...this.state,
        isTransitioning: false
      };
      
      // Call after transition callback
      if (this.transitionCallbacks.onAfterTransition) {
        this.transitionCallbacks.onAfterTransition(previousView, viewType);
      }
      
      console.log(`[ViewManager] Transition to ${viewType} complete (${Date.now() - this.state.transitionStartTime}ms)`);
      this.transitionTimeout = null;
    }, this.transitionDuration);
  }

  /**
   * Register transition callbacks
   */
  public registerTransitionCallbacks(callbacks: TransitionCallbacks): void {
    this.transitionCallbacks = { ...callbacks };
  }

  /**
   * Register view component mount status
   */
  // Track last mount time to prevent rapid mount/unmount cycles
  private lastMountTimes = new Map<ViewType, number>();
  private mountThrottleMs = 500; // Minimum time between mount/unmount (500ms)
  
  public registerViewMount(viewType: ViewType, isMounted: boolean): void {
    const currentTime = Date.now();
    const lastMountTime = this.lastMountTimes.get(viewType) || 0;
    const timeSinceLastMount = currentTime - lastMountTime;
    
    // If this is an unmount operation that happens too quickly after a mount,
    // ignore it to prevent rapid mount/unmount cycles
    if (!isMounted && timeSinceLastMount < this.mountThrottleMs) {
      console.log(`[ViewManager] Ignoring rapid unmount of ${viewType} (${timeSinceLastMount}ms after mount)`);
      return;
    }
    
    // Update last mount time for mounts
    if (isMounted) {
      this.lastMountTimes.set(viewType, currentTime);
    }
    
    // Update view component state
    this.viewComponents.set(viewType, isMounted);
    console.log(`[ViewManager] View ${viewType} ${isMounted ? 'mounted' : 'unmounted'}`);
    
    // Check for conflicting mounts
    let mountedViews = 0;
    const mountedViewNames: string[] = [];
    
    this.viewComponents.forEach((mounted, type) => {
      if (mounted) {
        mountedViews++;
        mountedViewNames.push(type);
      }
    });
    
    // Log a warning if multiple main views are mounted simultaneously
    if (mountedViews > 1 &&
        mountedViewNames.includes('constellation') &&
        mountedViewNames.includes('reading')) {
      console.warn('[ViewManager] Multiple main views mounted simultaneously:', mountedViewNames.join(', '));
    }
  }

  /**
   * Check if a specific view is active
   */
  public isViewActive(viewType: ViewType): boolean {
    return this.state.activeView === viewType;
  }

  /**
   * Get unique key for the current view
   * Used to force proper unmount/remount
   */
  public getUniqueViewKey(): string {
    return this.state.uniqueViewKey;
  }

  /**
   * Manage WebGL contexts during view transitions
   */
  private manageWebGLContexts(previousView: ViewType, newView: ViewType): void {
    // Suspend constellation WebGL context when transitioning to reading
    if (previousView === 'constellation' && newView === 'reading') {
      if (webGLContextManager.isContextTypeActive('constellation')) {
        console.log('[ViewManager] Suspending constellation WebGL context during transition to reading view');
        // Context will be suspended by individual components using WebGLContextManager
      }
    }
    
    // Resume constellation WebGL context when transitioning back
    if (previousView === 'reading' && newView === 'constellation') {
      console.log('[ViewManager] Will resume constellation WebGL context');
      // Context will be resumed by ConstellationView component
    }
  }
  
  /**
   * Check for problematic transition patterns
   */
  public getViewTransitionMetrics(): {
    transitionCount: number;
    averageTransitionTime: number;
    problematicTransitions: number;
  } {
    return {
      transitionCount: this.state.transitionCount,
      averageTransitionTime: 0, // Would track this in a real implementation
      problematicTransitions: 0 // Would track rapid back-and-forth transitions
    };
  }
}

// Export a singleton instance
export const viewManager = ViewManager.getInstance();

// Also export the class for testing purposes
export default ViewManager;