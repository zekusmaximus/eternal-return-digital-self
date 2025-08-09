import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as THREE from 'three';

interface WebGLContextInfo {
  renderer: THREE.WebGLRenderer;
  type: string;
}

interface WebGLContextType {
  registerContext: (renderer: THREE.WebGLRenderer, type: string) => string;
  disposeContext: (contextId: string) => void;
}

const WebGLContext = createContext<WebGLContextType | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export const useWebGLContext = () => {
  const context = useContext(WebGLContext);
  if (!context) {
    throw new Error('useWebGLContext must be used within a WebGLContextProvider');
  }
  return context;
};

export const WebGLContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [contexts, setContexts] = useState<Map<string, WebGLContextInfo>>(new Map());

  const registerContext = useCallback((renderer: THREE.WebGLRenderer, type: string): string => {
    const contextId = `webgl-context-${type}-${Date.now()}`;
    console.log(`[WebGLContextProvider] Registering new context: ${contextId}`);
    setContexts(prev => {
      const newContexts = new Map(prev);
      newContexts.set(contextId, { renderer, type });
      return newContexts;
    });
    return contextId;
  }, []);

  const disposeContext = useCallback((contextId: string) => {
    console.log(`[WebGLContextProvider] Disposing context: ${contextId}`);
    setContexts(prev => {
      const newContexts = new Map(prev);
      const contextInfo = newContexts.get(contextId);
      if (contextInfo) {
        try {
          contextInfo.renderer.dispose();
        } catch (error) {
            console.error(`[WebGLContextProvider] Error disposing context ${contextId}:`, error);
        }
        newContexts.delete(contextId);
      }
      return newContexts;
    });
  }, []);

  useEffect(() => {
    // Cleanup all contexts on provider unmount
    return () => {
      console.log('[WebGLContextProvider] Disposing all contexts on unmount');
      contexts.forEach((contextInfo, contextId) => {
        try {
          contextInfo.renderer.dispose();
        } catch (error) {
            console.error(`[WebGLContextProvider] Error disposing context ${contextId}:`, error);
        }
      });
    };
  }, [contexts]);

  const value = {
    registerContext,
    disposeContext,
  };

  return (
    <WebGLContext.Provider value={value}>
      {children}
    </WebGLContext.Provider>
  );
};
