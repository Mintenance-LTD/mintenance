/**
 * Feature Flags System
 * Centralized feature flag management for A/B testing and gradual rollouts
 * 
 * Usage:
 * ```typescript
 * import { isFeatureEnabled } from '@/lib/feature-flags';
 * 
 * if (await isFeatureEnabled('new-dashboard', userId)) {
 *   return <NewDashboard />;
 * }
 * return <OldDashboard />;
 * ```
 */

import { serverSupabase } from '@/lib/api/supabaseServer';

// ==========================================================
// FEATURE FLAG DEFINITIONS
// ==========================================================

export type FeatureFlagName =
  | 'new-dashboard-2025'
  | 'enhanced-messaging'
  | 'real-time-notifications'
  | 'advanced-analytics';

interface FeatureFlagConfig {
  name: FeatureFlagName;
  description: string;
  defaultEnabled: boolean;
  rolloutPercentage?: number; // 0-100, for gradual rollouts
  enabledForUsers?: string[]; // Specific user IDs
  enabledForRoles?: string[]; // Specific roles
}

const FEATURE_FLAGS: Record<FeatureFlagName, FeatureFlagConfig> = {
  'new-dashboard-2025': {
    name: 'new-dashboard-2025',
    description: 'Enable 2025 dashboard design (A/B testing)',
    defaultEnabled: false,
    rolloutPercentage: 50, // 50% of users
    enabledForRoles: ['contractor', 'homeowner'],
  },
  'enhanced-messaging': {
    name: 'enhanced-messaging',
    description: 'Enable enhanced messaging features',
    defaultEnabled: true,
  },
  'real-time-notifications': {
    name: 'real-time-notifications',
    description: 'Enable real-time notification system',
    defaultEnabled: false,
    rolloutPercentage: 25,
  },
  'advanced-analytics': {
    name: 'advanced-analytics',
    description: 'Enable advanced analytics dashboard',
    defaultEnabled: false,
    enabledForRoles: ['admin'],
  },
};

// ==========================================================
// FEATURE FLAG LOGIC
// ==========================================================

/**
 * Check if a feature flag is enabled for a user
 * 
 * Priority order:
 * 1. Database override (feature_flags table)
 * 2. User-specific enablement
 * 3. Role-based enablement
 * 4. Rollout percentage (consistent hash)
 * 5. Default enabled state
 */
export async function isFeatureEnabled(
  flagName: FeatureFlagName,
  userId?: string,
  userRole?: string
): Promise<boolean> {
  const config = FEATURE_FLAGS[flagName];
  
  if (!config) {
    console.warn(`[FeatureFlags] Unknown feature flag: ${flagName}`);
    return false;
  }

  // Step 1: Check database override (if table exists)
  if (userId) {
    try {
      const { data: override } = await serverSupabase
        .from('feature_flags')
        .select('enabled')
        .eq('flag_name', flagName)
        .eq('user_id', userId)
        .maybeSingle();

      if (override !== null) {
        return override.enabled;
      }
    } catch (error) {
      // Table might not exist yet, continue with other checks
      console.debug(`[FeatureFlags] Could not check database override: ${error}`);
    }
  }

  // Step 2: Check user-specific enablement
  if (config.enabledForUsers && userId) {
    if (config.enabledForUsers.includes(userId)) {
      return true;
    }
  }

  // Step 3: Check role-based enablement
  if (config.enabledForRoles && userRole) {
    if (config.enabledForRoles.includes(userRole)) {
      return true;
    }
  }

  // Step 4: Check rollout percentage (consistent hash)
  if (config.rolloutPercentage !== undefined && userId) {
    const hash = hashUserId(userId);
    const percentage = (hash % 100) + 1; // 1-100
    if (percentage <= config.rolloutPercentage) {
      return true;
    }
  }

  // Step 5: Default enabled state
  return config.defaultEnabled;
}

/**
 * Get all enabled feature flags for a user
 */
export async function getEnabledFeatures(
  userId?: string,
  userRole?: string
): Promise<FeatureFlagName[]> {
  const enabled: FeatureFlagName[] = [];

  for (const flagName of Object.keys(FEATURE_FLAGS) as FeatureFlagName[]) {
    if (await isFeatureEnabled(flagName, userId, userRole)) {
      enabled.push(flagName);
    }
  }

  return enabled;
}

/**
 * Hash user ID to a consistent number (1-100)
 * Ensures same user always gets same result for rollout percentage
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Get feature flag configuration (for admin/debugging)
 */
export function getFeatureFlagConfig(flagName: FeatureFlagName): FeatureFlagConfig | undefined {
  return FEATURE_FLAGS[flagName];
}

/**
 * Get all feature flag configurations
 */
export function getAllFeatureFlags(): Record<FeatureFlagName, FeatureFlagConfig> {
  return FEATURE_FLAGS;
}

// ==========================================================
// CLIENT-SIDE HOOK (for client components)
// ==========================================================

/**
 * Note: Client-side hook is available at @/hooks/useFeatureFlag
 * This file is server-side only
 */

