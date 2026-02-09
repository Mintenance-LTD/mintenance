/**
 * Feature Flag Service for API Route Migration
 *
 * Simple feature flag implementation for gradual rollout of new API controllers
 */
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logger } from '@mintenance/shared';
export interface FeatureFlag {
  name: string;
  enabled: boolean;
  rolloutPercentage?: number;
  userWhitelist?: string[];
  userBlacklist?: string[];
  environments?: string[];
}
/**
 * Check if a feature flag is enabled for a specific user
 */
export async function isFeatureFlagEnabled(
  flagName: string,
  userId?: string | null,
  options: {
    rolloutPercentage?: number;
    forceEnable?: boolean;
    forceDisable?: boolean;
  } = {}
): Promise<boolean> {
  // Force flags for testing
  if (options.forceEnable) return true;
  if (options.forceDisable) return false;
  // Environment-based flags
  const env = process.env.NODE_ENV;
  // Always enable in development for testing
  if (env === 'development' && process.env.ENABLE_NEW_CONTROLLERS === 'true') {
    return true;
  }
  // Check database for flag configuration (optional)
  try {
    const supabase = await createServerSupabaseClient();
    const { data: flag } = await supabase
      .from('feature_flags')
      .select('*')
      .eq('name', flagName)
      .single();
    if (flag) {
      // Check if globally disabled
      if (!flag.enabled) return false;
      // Check user whitelist
      if (flag.user_whitelist && userId) {
        if (flag.user_whitelist.includes(userId)) return true;
      }
      // Check user blacklist
      if (flag.user_blacklist && userId) {
        if (flag.user_blacklist.includes(userId)) return false;
      }
      // Check rollout percentage
      if (flag.rollout_percentage !== undefined) {
        return isUserInRollout(userId, flag.rollout_percentage);
      }
      return flag.enabled;
    }
  } catch (error) {
    logger.error('Error checking feature flag:', error);
  }
  // Fallback to options or environment variable
  const rolloutPercentage = options.rolloutPercentage ??
    parseInt(process.env[`FF_${flagName.toUpperCase().replace(/-/g, '_')}_ROLLOUT`] || '0');
  if (rolloutPercentage > 0) {
    return isUserInRollout(userId, rolloutPercentage);
  }
  // Default to disabled
  return false;
}
/**
 * Determine if a user is within the rollout percentage
 */
function isUserInRollout(userId: string | null | undefined, percentage: number): boolean {
  if (!userId) {
    // For anonymous users, use random selection
    return Math.random() * 100 < percentage;
  }
  // Use consistent hashing for logged-in users
  // This ensures the same user always gets the same result
  const hash = hashUserId(userId);
  return (hash % 100) < percentage;
}
/**
 * Simple hash function for consistent user bucketing
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}
/**
 * Specific feature flags for controller migration
 */
export const ControllerFlags = {
  // Phase 1 Controllers (100% rollout achieved)
  JOBS: 'new-jobs-controller',
  PAYMENTS: 'new-payments-controller',
  WEBHOOKS: 'new-webhooks-controller',
  NOTIFICATIONS: 'new-notifications-controller',
  MESSAGING: 'new-messaging-controller',
  ANALYTICS: 'new-analytics-controller',
  BIDS: 'new-bids-controller',
  CONTRACTS: 'new-contracts-controller',
  AI_SEARCH: 'new-ai-search-controller',
  FEATURE_FLAGS: 'new-feature-flags-controller',
  ML_MONITORING: 'new-ml-monitoring-controller',
  // Phase 2 Controllers (new)
  USER_PROFILE: 'new-user-profile-controller',
  USER_SETTINGS: 'new-user-settings-controller',
  USER_AVATAR: 'new-user-avatar-controller',
} as const;
/**
 * Check if new controller should be used for a specific module
 */
export async function useNewController(
  module: keyof typeof ControllerFlags,
  userId?: string | null
): Promise<boolean> {
  const flagName = ControllerFlags[module];
  // Rollout percentages
  const rolloutPercentages: Record<string, number> = {
    // Phase 1 Controllers (100% achieved in production)
    [ControllerFlags.JOBS]: 100,
    [ControllerFlags.ANALYTICS]: 100,
    [ControllerFlags.FEATURE_FLAGS]: 100,
    [ControllerFlags.NOTIFICATIONS]: 100,
    [ControllerFlags.MESSAGING]: 100,
    [ControllerFlags.AI_SEARCH]: 100,
    [ControllerFlags.BIDS]: 100,
    [ControllerFlags.PAYMENTS]: 100,
    [ControllerFlags.WEBHOOKS]: 100,
    [ControllerFlags.CONTRACTS]: 100,
    [ControllerFlags.ML_MONITORING]: 100,
    // Phase 2 Controllers (starting at 0% for testing)
    [ControllerFlags.USER_PROFILE]: 5,
    [ControllerFlags.USER_SETTINGS]: 5,
    [ControllerFlags.USER_AVATAR]: 5,
  };
  return isFeatureFlagEnabled(flagName, userId, {
    rolloutPercentage: rolloutPercentages[flagName] || 0
  });
}
/**
 * Log controller usage for monitoring
 */
export async function logControllerUsage(
  module: string,
  isNew: boolean,
  userId?: string | null,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.from('controller_usage_logs').insert({
      module,
      is_new_controller: isNew,
      user_id: userId,
      metadata,
      logged_at: new Date().toISOString()
    });
  } catch (error) {
    // Don't fail the request if logging fails
    logger.error('Failed to log controller usage:', error);
  }
}
/**
 * Emergency kill switch to disable all new controllers
 * Checks for EMERGENCY_KILL_SWITCH environment variable
 */
export function isEmergencyKillSwitchActive(): boolean {
  return process.env.EMERGENCY_KILL_SWITCH === 'true' || 
         process.env.DISABLE_ALL_NEW_CONTROLLERS === 'true';
}
/**
 * Middleware to check feature flags for API routes
 */
interface FeatureFlagRequest {
  userId?: string;
  user?: { id?: string };
  url?: string;
  method?: string;
}

export async function withFeatureFlag(
  flagName: string,
  newHandler: (request: FeatureFlagRequest) => unknown,
  oldHandler: (request: FeatureFlagRequest) => unknown,
  request: FeatureFlagRequest
) {
  // Emergency kill switch
  if (isEmergencyKillSwitchActive()) {
    return oldHandler(request);
  }
  // Get user ID from request (implementation depends on auth setup)
  const userId = request.userId || request.user?.id || null;
  // Check if new controller should be used
  const useNew = await isFeatureFlagEnabled(flagName, userId);
  // Log usage for monitoring
  await logControllerUsage(flagName, useNew, userId, {
    url: request.url,
    method: request.method
  });
  // Use appropriate handler
  return useNew ? newHandler(request) : oldHandler(request);
}