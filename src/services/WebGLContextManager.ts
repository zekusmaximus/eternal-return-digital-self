/**
 * WebGLContextManager Service
 * 
 * Centralized service to manage WebGL contexts across the application.
 * Prevents resource contention between multiple WebGL contexts by
 * enforcing a single active WebGL context at a time.
 * 
 * This service:
 * 1. Tracks all WebGL context creations and disposals
 * 2. Enforces proper resource cleanup during component unmounts
 * 3. Provides diagnostic information about WebGL resource usage
 * 4. Implements recovery strategies for context loss events
 */

import { MutableRefObject } from 'react';
import * as THREE from 'three';

// Types for WebGL context tracking
type ContextType = 'constellation' | 'narramorph' | 'minimap' | 'other';

interface WebGLContextInfo {
  id: string;
  type: ContextType;
  gl: THREE.WebGLRenderer;
  active: boolean;
  createdAt: number;
  memoryUsage?: {
    geometries: number;
    textures: number;
  };
  priority: number; // Higher number means higher priority
  suspend: () => void; // Function to suspend rendering
  resume: () => void; // Function to resume rendering
}

class WebGLContextManager {
  private static instance: WebGLContextManager;
  private contexts: Map<string, WebGLContextInfo> = new Map();
  private activeContextId: string | null = null;
  private contextCounter = 0;
  private contextLossEvents = 0;
  private maxAllowedContexts = 2; // Limit concurrent WebGL contexts
  private diagnosticsEnabled = true;
  private memoryCheckInterval: NodeJS.Timeout | null = null;

  // Singleton pattern
  private constructor() {
    this.startMemoryMonitoring();
    console.log('[WebGLContextManager] Initialized');
  }

  public static getInstance(): WebGLContextManager {
    if (!WebGLContextManager.instance) {
      WebGLContextManager.instance = new WebGLContextManager();
    }
    return WebGLContextManager.instance;
  }

  /**
   * Register a new WebGL context with the manager
   */
  public registerContext(
    renderer: THREE.WebGLRenderer,
    type: ContextType,
    priority: number = 1,
    suspendFn: () => void = () => {},
    resumeFn: () => void = () => {}
  ): string {
    const contextId = `webgl-context-${++this.contextCounter}-${type}-${Date.now()}`;
    
    console.log(`[WebGLContextManager] Registering new ${type} WebGL context: ${contextId}`);
    
    // Store context information
    this.contexts.set(contextId, {
      id: contextId,
      type,
      gl: renderer,
      active: true,
      createdAt: Date.now(),
      priority,
      suspend: suspendFn,
      resume: resumeFn,
      memoryUsage: {
        geometries: 0,
        textures: 0
      }
    });
    
    // Manage active contexts - if we have too many, suspend lowest priority ones
    this.enforceContextLimits();
    
    // Update memory usage for the new context
    this.updateContextMemoryUsage(contextId);
    
    // Add context loss detection
    const canvas = renderer.domElement;
    canvas.addEventListener('webglcontextlost', (event) => {
      this.handleContextLoss(contextId, event);
    });
    
    canvas.addEventListener('webglcontextrestored', () => {
      this.handleContextRestoration(contextId);
    });
    
    return contextId;
  }

  /**
   * Notify the manager that a context is being disposed
   */
  public disposeContext(contextId: string): boolean {
    const context = this.contexts.get(contextId);
    if (!context) {
      console.warn(`[WebGLContextManager] Attempted to dispose unknown context: ${contextId}`);
      return false;
    }
    
    console.log(`[WebGLContextManager] Disposing ${context.type} WebGL context: ${contextId}`);
    
    try {
      // Force proper THREE.js cleanup
      context.gl.dispose();
      
      // Remove from tracking
      this.contexts.delete(contextId);
      
      // If this was the active context, clear it
      if (this.activeContextId === contextId) {
        this.activeContextId = null;
      }
      
      // Re-evaluate which contexts should be active
      this.enforceContextLimits();
      
      return true;
    } catch (error) {
      console.error(`[WebGLContextManager] Error disposing context ${contextId}:`, error);
      return false;
    }
  }

  /**
   * Suspend a WebGL context to free resources
   */
  public suspendContext(contextId: string): boolean {
    const context = this.contexts.get(contextId);
    if (!context) return false;
    
    if (context.active) {
      console.log(`[WebGLContextManager] Suspending ${context.type} WebGL context: ${contextId}`);
      context.active = false;
      context.suspend();
      
      // Set renderer properties to minimize resource usage while suspended
      context.gl.setPixelRatio(0.5); // Lower resolution
      context.gl.setSize(1, 1, false); // Minimal size
      
      // Signal the WebGL system to prioritize other contexts
      try {
        const glContext = context.gl.getContext();
        if (glContext && 'UNPACK_COLORSPACE_CONVERSION_WEBGL' in glContext) {
          // This is a hint to the browser that this context is less important
          glContext.hint(glContext.GENERATE_MIPMAP_HINT, glContext.FASTEST);
        }
      } catch {
        // Ignore context access errors
      }
      
      return true;
    }
    return false;
  }

  /**
   * Resume a previously suspended WebGL context
   */
  public resumeContext(contextId: string): boolean {
    const context = this.contexts.get(contextId);
    if (!context) return false;
    
    if (!context.active) {
      console.log(`[WebGLContextManager] Resuming ${context.type} WebGL context: ${contextId}`);
      context.active = true;
      context.resume();
      
      // Make this the active context
      this.activeContextId = contextId;
      
      // May need to suspend other contexts to stay within limits
      this.enforceContextLimits();
      
      return true;
    }
    return false;
  }

  /**
   * Check if a specific context type is currently active
   */
  public isContextTypeActive(type: ContextType): boolean {
    for (const [, context] of this.contexts.entries()) {
      if (context.type === type && context.active) {
        return true;
      }
    }
    return false;
  }

  /**
   * Handle WebGL context loss events
   */
  private handleContextLoss(contextId: string, event: Event): void {
    const context = this.contexts.get(contextId);
    if (!context) return;
    
    this.contextLossEvents++;
    console.error(`[WebGLContextManager] WebGL context loss detected for ${context.type} context: ${contextId}`);
    console.error(`[WebGLContextManager] Total context loss events: ${this.contextLossEvents}`);
    
    // Prevent default behavior which attempts automatic recovery
    event.preventDefault();
    
    // Mark context as inactive
    context.active = false;
    
    // Attempt to free other contexts to help recovery
    this.emergencyResourceRecovery();
    
    // Dispatch application-wide event for context loss
    window.dispatchEvent(new CustomEvent('webgl-context-loss', { 
      detail: { contextId, type: context.type } 
    }));
  }

  /**
   * Handle WebGL context restoration events
   */
  private handleContextRestoration(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (!context) return;
    
    console.log(`[WebGLContextManager] WebGL context restored for ${context.type} context: ${contextId}`);
    
    // Mark context as active again
    context.active = true;
    
    // Dispatch application-wide event for context restoration
    window.dispatchEvent(new CustomEvent('webgl-context-restored', { 
      detail: { contextId, type: context.type } 
    }));
  }

  /**
   * Enforce limits on the number of concurrent active WebGL contexts
   */
  private enforceContextLimits(): void {
    // Count active contexts
    const activeContexts = Array.from(this.contexts.values())
      .filter(ctx => ctx.active)
      .sort((a, b) => b.priority - a.priority); // Sort by priority (highest first)
    
    if (activeContexts.length > this.maxAllowedContexts) {
      console.log(`[WebGLContextManager] Too many active contexts (${activeContexts.length}/${this.maxAllowedContexts}), suspending lower priority contexts`);
      
      // Suspend lowest priority contexts
      for (let i = this.maxAllowedContexts; i < activeContexts.length; i++) {
        this.suspendContext(activeContexts[i].id);
      }
    }
  }

  /**
   * Emergency recovery procedure for WebGL context loss
   */
  private emergencyResourceRecovery(): void {
    console.log('[WebGLContextManager] Performing emergency resource recovery');
    
    // Force garbage collection hint
    if (window.gc) {
      try {
        window.gc();
      } catch {
        // Ignore if gc is not available
      }
    }
    
    // Suspend all but the highest priority context
    const contexts = Array.from(this.contexts.values())
      .sort((a, b) => b.priority - a.priority);
    
    if (contexts.length > 0) {
      // Keep only the highest priority context active
      for (let i = 1; i < contexts.length; i++) {
        this.suspendContext(contexts[i].id);
      }
    }
  }

  /**
   * Start periodic memory monitoring for all contexts
   */
  private startMemoryMonitoring(): void {
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
    }
    
    this.memoryCheckInterval = setInterval(() => {
      if (!this.diagnosticsEnabled) return;
      
      for (const [id] of this.contexts.entries()) {
        this.updateContextMemoryUsage(id);
      }
      
      // Log total memory usage across all contexts
      const totalMemory = {
        geometries: 0,
        textures: 0,
        contexts: this.contexts.size,
        active: Array.from(this.contexts.values()).filter(c => c.active).length
      };
      
      for (const context of this.contexts.values()) {
        if (context.memoryUsage) {
          totalMemory.geometries += context.memoryUsage.geometries;
          totalMemory.textures += context.memoryUsage.textures;
        }
      }
      
      if (totalMemory.contexts > 0) {
        console.log('[WebGLContextManager] Memory usage:', totalMemory);
      }
    }, 10000); // Check every 10 seconds
  }

  /**
   * Update memory usage information for a specific context
   */
  private updateContextMemoryUsage(contextId: string): void {
    const context = this.contexts.get(contextId);
    if (!context) return;
    
    try {
      const gl = context.gl;
      if (gl && gl.info) {
        context.memoryUsage = {
          geometries: gl.info.memory.geometries,
          textures: gl.info.memory.textures
        };
      }
    } catch {
      // Ignore errors accessing gl.info
    }
  }

  /**
   * Get the currently highest priority active context
   */
  public getActiveContext(): WebGLContextInfo | null {
    const activeContexts = Array.from(this.contexts.values())
      .filter(ctx => ctx.active)
      .sort((a, b) => b.priority - a.priority);
    
    return activeContexts.length > 0 ? activeContexts[0] : null;
  }

  /**
   * Cleanup all WebGL contexts - call this when application unloads
   */
  public disposeAllContexts(): void {
    console.log(`[WebGLContextManager] Disposing all WebGL contexts (${this.contexts.size})`);
    
    for (const [id, context] of this.contexts.entries()) {
      try {
        context.gl.dispose();
      } catch (e) {
        console.error(`[WebGLContextManager] Error disposing context ${id}:`, e);
      }
    }
    
    this.contexts.clear();
    this.activeContextId = null;
    
    if (this.memoryCheckInterval) {
      clearInterval(this.memoryCheckInterval);
      this.memoryCheckInterval = null;
    }
  }

  /**
   * Get renderer from a component ref - utility function
   */
  public getRendererFromRef(rendererRef: MutableRefObject<THREE.WebGLRenderer | null>): THREE.WebGLRenderer | null {
    return rendererRef.current;
  }

  /**
   * Check if WebGL is available and what level of support exists
   */
  public checkWebGLSupport(): { 
    webgl: boolean; 
    webgl2: boolean; 
    extensions: string[]; 
    maxTextures: number;
    vendor?: string;
    renderer?: string;
    isLowEndDevice: boolean;
  } {
    const result = {
      webgl: false,
      webgl2: false,
      extensions: [] as string[],
      maxTextures: 0,
      vendor: undefined as string | undefined,
      renderer: undefined as string | undefined,
      isLowEndDevice: false
    };
    
    try {
      // Check WebGL 1 support
      const canvas = document.createElement('canvas');
      const gl1 = canvas.getContext('webgl');
      result.webgl = !!gl1;
      
      if (gl1) {
        // Get extensions
        const extensions = gl1.getSupportedExtensions();
        result.extensions = extensions || [];
        
        // Check max textures
        result.maxTextures = gl1.getParameter(gl1.MAX_TEXTURE_IMAGE_UNITS);
        
        // Try to get GPU info
        const debugInfo = gl1.getExtension('WEBGL_debug_renderer_info');
        if (debugInfo) {
          result.vendor = gl1.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
          result.renderer = gl1.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          
          // Check if this is likely a low-end device
          const rendererString = result.renderer?.toLowerCase() || '';
          result.isLowEndDevice = 
            rendererString.includes('intel') || 
            rendererString.includes('hd graphics') ||
            rendererString.includes('mobile') ||
            !result.extensions.includes('OES_texture_float');
        }
      }
      
      // Check WebGL 2 support
      const gl2 = canvas.getContext('webgl2');
      result.webgl2 = !!gl2;
      
      canvas.remove();
    } catch (e) {
      console.error('[WebGLContextManager] Error checking WebGL support:', e);
    }
    
    return result;
  }
}

// Export a singleton instance
export const webGLContextManager = WebGLContextManager.getInstance();

// Also export the class for testing purposes
export default WebGLContextManager;