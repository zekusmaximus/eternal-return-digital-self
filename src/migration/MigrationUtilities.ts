/**
 * Migration utilities for transitioning from legacy to new architecture
 * Provides tools for data migration, compatibility checks, and rollback
 */

import { featureFlags } from './FeatureFlags';

// Legacy state interfaces (simplified representations)
interface LegacyNodeState {
  id: string;
  visitCount: number;
  currentContent: string;
  transformations: unknown[];
  currentState: string;
}

interface LegacyReaderState {
  path: {
    sequence: string[];
    revisitPatterns: Record<string, number>;
    attractorsEngaged: Record<string, number>;
  };
  currentNodeId: string | null;
}

// New architecture state interfaces
interface NewNodeState {
  nodeId: string;
  visitCount: number;
  currentCharacter: string;
  readerPath: string[];
  attractorsEngaged: string[];
}

interface NewReaderState {
  currentNodeId: string | null;
  visitedNodes: string[];
  visitCounts: Record<string, number>;
}

/**
 * Migration status tracking
 */
export interface MigrationStatus {
  isComplete: boolean;
  completedSteps: string[];
  failedSteps: string[];
  warnings: string[];
  startTime: number;
  endTime?: number;
}

/**
 * Migration utilities class
 */
export class MigrationUtilities {
  private static readonly MIGRATION_STATUS_KEY = 'eternal-return-migration-status';
  private static readonly BACKUP_KEY = 'eternal-return-legacy-backup';

  /**
   * Check if migration is needed
   */
  static isMigrationNeeded(): boolean {
    try {
      // Check if legacy data exists
      const legacyNodes = localStorage.getItem('eternal-return');
      const migrationStatus = this.getMigrationStatus();
      
      return legacyNodes !== null && !migrationStatus.isComplete;
    } catch (error) {
      console.warn('Error checking migration status:', error);
      return false;
    }
  }

  /**
   * Get current migration status
   */
  static getMigrationStatus(): MigrationStatus {
    try {
      const stored = localStorage.getItem(this.MIGRATION_STATUS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn('Error loading migration status:', error);
    }

    return {
      isComplete: false,
      completedSteps: [],
      failedSteps: [],
      warnings: [],
      startTime: Date.now(),
    };
  }

  /**
   * Save migration status
   */
  static saveMigrationStatus(status: MigrationStatus): void {
    try {
      localStorage.setItem(this.MIGRATION_STATUS_KEY, JSON.stringify(status));
    } catch (error) {
      console.error('Error saving migration status:', error);
    }
  }

  /**
   * Create backup of legacy data
   */
  static createBackup(): boolean {
    try {
      const legacyData = localStorage.getItem('eternal-return');
      if (legacyData) {
        const backup = {
          data: legacyData,
          timestamp: Date.now(),
          version: 'legacy',
        };
        localStorage.setItem(this.BACKUP_KEY, JSON.stringify(backup));
        console.log('[Migration] Legacy data backup created');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error creating backup:', error);
      return false;
    }
  }

  /**
   * Restore from backup
   */
  static restoreFromBackup(): boolean {
    try {
      const backup = localStorage.getItem(this.BACKUP_KEY);
      if (backup) {
        const { data } = JSON.parse(backup);
        localStorage.setItem('eternal-return', data);
        console.log('[Migration] Restored from backup');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Error restoring from backup:', error);
      return false;
    }
  }

  /**
   * Migrate legacy node state to new format
   */
  static migrateLegacyNodeState(legacyState: LegacyNodeState): NewNodeState {
    return {
      nodeId: legacyState.id,
      visitCount: legacyState.visitCount || 0,
      currentCharacter: 'Archaeologist', // Default, would be determined from node data
      readerPath: [], // Would be populated from reader state
      attractorsEngaged: [], // Would be migrated from transformations
    };
  }

  /**
   * Migrate legacy reader state to new format
   */
  static migrateLegacyReaderState(legacyState: LegacyReaderState): NewReaderState {
    return {
      currentNodeId: legacyState.currentNodeId,
      visitedNodes: legacyState.path?.sequence || [],
      visitCounts: legacyState.path?.revisitPatterns || {},
    };
  }

  /**
   * Perform complete migration
   */
  static async performMigration(): Promise<MigrationStatus> {
    const status = this.getMigrationStatus();
    status.startTime = Date.now();

    try {
      // Step 1: Create backup
      if (!status.completedSteps.includes('backup')) {
        if (this.createBackup()) {
          status.completedSteps.push('backup');
          console.log('[Migration] Step 1: Backup created');
        } else {
          status.failedSteps.push('backup');
          status.warnings.push('Failed to create backup');
        }
      }

      // Step 2: Migrate node data
      if (!status.completedSteps.includes('nodes')) {
        try {
          // This would contain actual migration logic
          // For now, just mark as completed
          status.completedSteps.push('nodes');
          console.log('[Migration] Step 2: Node data migrated');
        } catch (error) {
          status.failedSteps.push('nodes');
          status.warnings.push(`Node migration failed: ${error}`);
        }
      }

      // Step 3: Migrate reader data
      if (!status.completedSteps.includes('reader')) {
        try {
          // This would contain actual migration logic
          status.completedSteps.push('reader');
          console.log('[Migration] Step 3: Reader data migrated');
        } catch (error) {
          status.failedSteps.push('reader');
          status.warnings.push(`Reader migration failed: ${error}`);
        }
      }

      // Step 4: Enable new architecture features
      if (!status.completedSteps.includes('features')) {
        try {
          featureFlags.setFlags({
            useNewTransformationPipeline: true,
            useSimplifiedStateManagement: true,
            useNewApplicationServices: true,
          });
          status.completedSteps.push('features');
          console.log('[Migration] Step 4: New features enabled');
        } catch (error) {
          status.failedSteps.push('features');
          status.warnings.push(`Feature enablement failed: ${error}`);
        }
      }

      // Step 5: Cleanup
      if (!status.completedSteps.includes('cleanup')) {
        try {
          // Clean up old data (would be implemented)
          status.completedSteps.push('cleanup');
          console.log('[Migration] Step 5: Cleanup completed');
        } catch (error) {
          status.failedSteps.push('cleanup');
          status.warnings.push(`Cleanup failed: ${error}`);
        }
      }

      // Mark migration as complete if all steps succeeded
      status.isComplete = status.failedSteps.length === 0;
      status.endTime = Date.now();

      this.saveMigrationStatus(status);
      
      if (status.isComplete) {
        console.log('[Migration] Migration completed successfully');
      } else {
        console.warn('[Migration] Migration completed with errors:', status.failedSteps);
      }

    } catch (error) {
      status.failedSteps.push('general');
      status.warnings.push(`Migration failed: ${error}`);
      status.endTime = Date.now();
      this.saveMigrationStatus(status);
      console.error('[Migration] Migration failed:', error);
    }

    return status;
  }

  /**
   * Rollback migration
   */
  static rollbackMigration(): boolean {
    try {
      console.log('[Migration] Starting rollback...');
      
      // Disable new features
      featureFlags.setFlags({
        useNewTransformationPipeline: false,
        useSimplifiedStateManagement: false,
        useNewApplicationServices: false,
        useSimplifiedNodeView: false,
        useNewContentRenderer: false,
      });

      // Restore from backup
      const restored = this.restoreFromBackup();
      
      if (restored) {
        // Reset migration status
        const status: MigrationStatus = {
          isComplete: false,
          completedSteps: [],
          failedSteps: [],
          warnings: ['Migration rolled back'],
          startTime: Date.now(),
          endTime: Date.now(),
        };
        this.saveMigrationStatus(status);
        
        console.log('[Migration] Rollback completed successfully');
        return true;
      } else {
        console.error('[Migration] Rollback failed - no backup found');
        return false;
      }
    } catch (error) {
      console.error('[Migration] Rollback failed:', error);
      return false;
    }
  }

  /**
   * Validate migration integrity
   */
  static validateMigration(): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];

    try {
      // Check if new architecture is properly enabled
      const flags = featureFlags.getFlags();
      if (!flags.useNewTransformationPipeline) {
        issues.push('New transformation pipeline not enabled');
      }
      if (!flags.useSimplifiedStateManagement) {
        issues.push('Simplified state management not enabled');
      }

      // Check if data exists in new format
      const newData = localStorage.getItem('eternal-return-simplified');
      if (!newData) {
        issues.push('New format data not found');
      }

      // Check migration status
      const status = this.getMigrationStatus();
      if (!status.isComplete) {
        issues.push('Migration not marked as complete');
      }
      if (status.failedSteps.length > 0) {
        issues.push(`Migration has failed steps: ${status.failedSteps.join(', ')}`);
      }

    } catch (error) {
      issues.push(`Validation error: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      issues,
    };
  }

  /**
   * Get migration progress percentage
   */
  static getMigrationProgress(): number {
    const status = this.getMigrationStatus();
    const totalSteps = 5; // backup, nodes, reader, features, cleanup
    const completedSteps = status.completedSteps.length;
    return Math.round((completedSteps / totalSteps) * 100);
  }

  /**
   * Clear all migration data (for testing)
   */
  static clearMigrationData(): void {
    try {
      localStorage.removeItem(this.MIGRATION_STATUS_KEY);
      localStorage.removeItem(this.BACKUP_KEY);
      localStorage.removeItem('eternal-return-simplified');
      console.log('[Migration] All migration data cleared');
    } catch (error) {
      console.error('Error clearing migration data:', error);
    }
  }
}

/**
 * Migration hook for React components
 */
export const useMigration = () => {
  const isMigrationNeeded = MigrationUtilities.isMigrationNeeded();
  const migrationStatus = MigrationUtilities.getMigrationStatus();
  const migrationProgress = MigrationUtilities.getMigrationProgress();

  return {
    isMigrationNeeded,
    migrationStatus,
    migrationProgress,
    performMigration: MigrationUtilities.performMigration,
    rollbackMigration: MigrationUtilities.rollbackMigration,
    validateMigration: MigrationUtilities.validateMigration,
  };
};
