/**
 * Migration Layer Exports
 * Feature flags and migration utilities for safe architecture transition
 */

// Feature flags
export * from './FeatureFlags';
export { featureFlags, isFeatureEnabled } from './FeatureFlags';

// Migration utilities
export * from './MigrationUtilities';
export { MigrationUtilities, useMigration } from './MigrationUtilities';