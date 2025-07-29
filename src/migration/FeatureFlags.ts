/**
 * Feature flags for gradual migration to new architecture
 * Allows for safe rollout and rollback of new features
 */

export interface FeatureFlags {
  // Core architecture flags
  useNewTransformationPipeline: boolean;
  useSimplifiedStateManagement: boolean;
  useNewApplicationServices: boolean;
  
  // Component flags
  useSimplifiedNodeView: boolean;
  useNewContentRenderer: boolean;
  
  // Performance flags
  enableSimpleCache: boolean;
  disablePrematureOptimizations: boolean;
  
  // Debug flags
  enableMigrationLogging: boolean;
  enablePerformanceComparison: boolean;
}

// Default feature flags - conservative rollout
const defaultFlags: FeatureFlags = {
  // Start with core architecture disabled for safety
  useNewTransformationPipeline: false,
  useSimplifiedStateManagement: false,
  useNewApplicationServices: false,
  
  // Component flags - can be enabled per component
  useSimplifiedNodeView: false,
  useNewContentRenderer: false,
  
  // Performance flags - safe to enable
  enableSimpleCache: true,
  disablePrematureOptimizations: true,
  
  // Debug flags - enabled in development
  enableMigrationLogging: process.env.NODE_ENV === 'development',
  enablePerformanceComparison: process.env.NODE_ENV === 'development',
};

// Feature flag storage key
const FEATURE_FLAGS_KEY = 'eternal-return-feature-flags';

/**
 * Feature flag manager
 */
export class FeatureFlagManager {
  private flags: FeatureFlags;
  private listeners: Array<(flags: FeatureFlags) => void> = [];

  constructor() {
    this.flags = this.loadFlags();
  }

  /**
   * Load flags from localStorage or use defaults
   */
  private loadFlags(): FeatureFlags {
    try {
      const stored = localStorage.getItem(FEATURE_FLAGS_KEY);
      if (stored) {
        const parsedFlags = JSON.parse(stored);
        // Merge with defaults to ensure all flags are present
        return { ...defaultFlags, ...parsedFlags };
      }
    } catch (error) {
      console.warn('Failed to load feature flags from localStorage:', error);
    }
    return { ...defaultFlags };
  }

  /**
   * Save flags to localStorage
   */
  private saveFlags(): void {
    try {
      localStorage.setItem(FEATURE_FLAGS_KEY, JSON.stringify(this.flags));
    } catch (error) {
      console.warn('Failed to save feature flags to localStorage:', error);
    }
  }

  /**
   * Get current flags
   */
  getFlags(): FeatureFlags {
    return { ...this.flags };
  }

  /**
   * Check if a specific flag is enabled
   */
  isEnabled(flag: keyof FeatureFlags): boolean {
    return this.flags[flag];
  }

  /**
   * Update a single flag
   */
  setFlag(flag: keyof FeatureFlags, value: boolean): void {
    this.flags[flag] = value;
    this.saveFlags();
    this.notifyListeners();
    
    if (this.flags.enableMigrationLogging) {
      console.log(`[FeatureFlags] ${flag} set to ${value}`);
    }
  }

  /**
   * Update multiple flags at once
   */
  setFlags(updates: Partial<FeatureFlags>): void {
    Object.assign(this.flags, updates);
    this.saveFlags();
    this.notifyListeners();
    
    if (this.flags.enableMigrationLogging) {
      console.log('[FeatureFlags] Updated flags:', updates);
    }
  }

  /**
   * Reset all flags to defaults
   */
  resetToDefaults(): void {
    this.flags = { ...defaultFlags };
    this.saveFlags();
    this.notifyListeners();
    
    if (this.flags.enableMigrationLogging) {
      console.log('[FeatureFlags] Reset to defaults');
    }
  }

  /**
   * Enable progressive rollout - gradually enable new features
   */
  enableProgressiveRollout(): void {
    const rolloutSteps = [
      // Step 1: Enable performance improvements
      { enableSimpleCache: true, disablePrematureOptimizations: true },
      
      // Step 2: Enable new transformation pipeline
      { useNewTransformationPipeline: true },
      
      // Step 3: Enable simplified state management
      { useSimplifiedStateManagement: true },
      
      // Step 4: Enable application services
      { useNewApplicationServices: true },
      
      // Step 5: Enable new components
      { useSimplifiedNodeView: true, useNewContentRenderer: true },
    ];

    let currentStep = 0;
    const applyNextStep = () => {
      if (currentStep < rolloutSteps.length) {
        this.setFlags(rolloutSteps[currentStep]);
        currentStep++;
        
        if (this.flags.enableMigrationLogging) {
          console.log(`[FeatureFlags] Applied rollout step ${currentStep}/${rolloutSteps.length}`);
        }
        
        // Apply next step after 5 seconds
        setTimeout(applyNextStep, 5000);
      } else {
        if (this.flags.enableMigrationLogging) {
          console.log('[FeatureFlags] Progressive rollout complete');
        }
      }
    };

    applyNextStep();
  }

  /**
   * Subscribe to flag changes
   */
  subscribe(listener: (flags: FeatureFlags) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Notify all listeners of flag changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.getFlags());
      } catch (error) {
        console.error('Error in feature flag listener:', error);
      }
    });
  }

  /**
   * Get migration readiness score (0-100)
   */
  getMigrationReadiness(): number {
    const totalFlags = Object.keys(this.flags).length;
    const enabledFlags = Object.values(this.flags).filter(Boolean).length;
    return Math.round((enabledFlags / totalFlags) * 100);
  }
}

// Global feature flag manager instance
export const featureFlags = new FeatureFlagManager();

// Convenience function for checking flags
export const isFeatureEnabled = (flag: keyof FeatureFlags): boolean => {
  return featureFlags.isEnabled(flag);
};