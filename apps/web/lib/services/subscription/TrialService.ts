import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface TrialStatus {
  daysRemaining: number;
  isTrialActive: boolean;
  trialStartedAt: Date | null;
  trialEndsAt: Date | null;
  requiresSubscription: boolean;
}

export interface TrialWarning {
  daysRemaining: number;
  level: 'info' | 'warning' | 'urgent';
  message: string;
}

/**
 * Service for managing contractor trial periods
 */
export class TrialService {
  /**
   * Initialize trial period for a new contractor
   */
  static async initializeTrial(contractorId: string): Promise<boolean> {
    try {
      // Call database function to initialize trial
      const { data, error } = await serverSupabase.rpc('initialize_trial_period', {
        p_contractor_id: contractorId,
      });

      if (error) {
        logger.error('Failed to initialize trial period', {
          service: 'TrialService',
          contractorId,
          error: error.message,
        });
        return false;
      }

      logger.info('Trial period initialized', {
        service: 'TrialService',
        contractorId,
      });

      return data === true;
    } catch (err) {
      logger.error('Error initializing trial period', {
        service: 'TrialService',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  }

  /**
   * Get trial status for a contractor
   */
  static async getTrialStatus(contractorId: string): Promise<TrialStatus | null> {
    try {
      const { data, error } = await serverSupabase.rpc('check_trial_status', {
        p_contractor_id: contractorId,
      });

      if (error) {
        logger.error('Failed to get trial status', {
          service: 'TrialService',
          contractorId,
          error: error.message,
        });
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      const result = data[0];
      return {
        daysRemaining: result.days_remaining ?? 0,
        isTrialActive: result.is_trial_active ?? false,
        trialStartedAt: result.trial_started_at ? new Date(result.trial_started_at) : null,
        trialEndsAt: result.trial_ends_at ? new Date(result.trial_ends_at) : null,
        requiresSubscription: result.requires_subscription ?? true,
      };
    } catch (err) {
      logger.error('Error getting trial status', {
        service: 'TrialService',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

  /**
   * Check if contractor requires subscription
   */
  static async requiresSubscription(contractorId: string): Promise<boolean> {
    try {
      const { data, error } = await serverSupabase.rpc('require_subscription', {
        p_contractor_id: contractorId,
      });

      if (error) {
        logger.error('Failed to check subscription requirement', {
          service: 'TrialService',
          contractorId,
          error: error.message,
        });
        // Default to requiring subscription if check fails
        return true;
      }

      return data === true;
    } catch (err) {
      logger.error('Error checking subscription requirement', {
        service: 'TrialService',
        contractorId,
        error: err instanceof Error ? err.message : String(err),
      });
      return true;
    }
  }

  /**
   * Get trial expiration warnings
   */
  static getTrialWarnings(daysRemaining: number): TrialWarning | null {
    if (daysRemaining <= 0) {
      return {
        daysRemaining: 0,
        level: 'urgent',
        message: 'Your trial has expired. Please subscribe to continue using the platform.',
      };
    }

    if (daysRemaining <= 1) {
      return {
        daysRemaining,
        level: 'urgent',
        message: `Your trial expires in ${daysRemaining} day. Please subscribe to avoid service interruption.`,
      };
    }

    if (daysRemaining <= 3) {
      return {
        daysRemaining,
        level: 'warning',
        message: `Your trial expires in ${daysRemaining} days. Subscribe now to continue.`,
      };
    }

    if (daysRemaining <= 7) {
      return {
        daysRemaining,
        level: 'info',
        message: `Your trial expires in ${daysRemaining} days. Consider subscribing to continue.`,
      };
    }

    return null;
  }

  /**
   * Check if trial is expiring soon (within specified days)
   */
  static isTrialExpiringSoon(daysRemaining: number, thresholdDays: number = 7): boolean {
    return daysRemaining > 0 && daysRemaining <= thresholdDays;
  }

  /**
   * Get days until trial expiration
   */
  static getDaysUntilExpiration(trialEndsAt: Date | null): number {
    if (!trialEndsAt) {
      return 0;
    }

    const now = new Date();
    const diffMs = trialEndsAt.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Check if contractor should see upgrade prompt
   */
  static shouldShowUpgradePrompt(daysRemaining: number): boolean {
    // Show upgrade prompt when 7 days or less remaining
    return daysRemaining <= 7;
  }
}

