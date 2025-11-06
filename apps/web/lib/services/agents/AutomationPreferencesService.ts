import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';

export interface AutomationPreferences {
  userId: string;
  autoAcceptBids: boolean;
  autoRescheduleWeather: boolean;
  autoCompleteJobs: boolean;
  autoApplyRiskPreventions: boolean;
  learningEnabled: boolean;
  notificationLearningEnabled?: boolean;
  quietHoursStart?: string; // Time in HH:MM format
  quietHoursEnd?: string; // Time in HH:MM format
  updatedAt?: string;
}

/**
 * Service for managing user automation preferences
 */
export class AutomationPreferencesService {
  /**
   * Get automation preferences for a user
   */
  static async getPreferences(userId: string): Promise<AutomationPreferences | null> {
    try {
      const { data, error } = await serverSupabase
        .from('automation_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // If no preferences exist, return default preferences
        if (error.code === 'PGRST116') {
          return this.getDefaultPreferences(userId);
        }

        logger.error('Failed to get automation preferences', {
          service: 'AutomationPreferencesService',
          error: error.message,
          userId,
        });
        return null;
      }

      return {
        userId: data.user_id,
        autoAcceptBids: data.auto_accept_bids || false,
        autoRescheduleWeather: data.auto_reschedule_weather ?? true,
        autoCompleteJobs: data.auto_complete_jobs || false,
        autoApplyRiskPreventions: data.auto_apply_risk_preventions ?? true,
        learningEnabled: data.learning_enabled ?? true,
        notificationLearningEnabled: data.notification_learning_enabled ?? true,
        quietHoursStart: data.quiet_hours_start || undefined,
        quietHoursEnd: data.quiet_hours_end || undefined,
        updatedAt: data.updated_at,
      };
    } catch (error) {
      logger.error('Error getting automation preferences', error, {
        service: 'AutomationPreferencesService',
        userId,
      });
      return null;
    }
  }

  /**
   * Update automation preferences for a user
   */
  static async updatePreferences(
    userId: string,
    preferences: Partial<AutomationPreferences>
  ): Promise<boolean> {
    try {
      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (preferences.autoAcceptBids !== undefined) {
        updateData.auto_accept_bids = preferences.autoAcceptBids;
      }
      if (preferences.autoRescheduleWeather !== undefined) {
        updateData.auto_reschedule_weather = preferences.autoRescheduleWeather;
      }
      if (preferences.autoCompleteJobs !== undefined) {
        updateData.auto_complete_jobs = preferences.autoCompleteJobs;
      }
      if (preferences.autoApplyRiskPreventions !== undefined) {
        updateData.auto_apply_risk_preventions = preferences.autoApplyRiskPreventions;
      }
      if (preferences.learningEnabled !== undefined) {
        updateData.learning_enabled = preferences.learningEnabled;
      }
      if (preferences.notificationLearningEnabled !== undefined) {
        updateData.notification_learning_enabled = preferences.notificationLearningEnabled;
      }
      if (preferences.quietHoursStart !== undefined) {
        updateData.quiet_hours_start = preferences.quietHoursStart || null;
      }
      if (preferences.quietHoursEnd !== undefined) {
        updateData.quiet_hours_end = preferences.quietHoursEnd || null;
      }

      // Try to update first
      const { error: updateError } = await serverSupabase
        .from('automation_preferences')
        .update(updateData)
        .eq('user_id', userId);

      // If no record exists, create one
      if (updateError && updateError.code === 'PGRST116') {
        const defaultPrefs = this.getDefaultPreferences(userId);
        const { error: insertError } = await serverSupabase
          .from('automation_preferences')
          .insert({
            user_id: userId,
            auto_accept_bids: preferences.autoAcceptBids ?? defaultPrefs.autoAcceptBids,
            auto_reschedule_weather:
              preferences.autoRescheduleWeather ?? defaultPrefs.autoRescheduleWeather,
            auto_complete_jobs: preferences.autoCompleteJobs ?? defaultPrefs.autoCompleteJobs,
            auto_apply_risk_preventions:
              preferences.autoApplyRiskPreventions ?? defaultPrefs.autoApplyRiskPreventions,
            learning_enabled: preferences.learningEnabled ?? defaultPrefs.learningEnabled,
            updated_at: new Date().toISOString(),
          });

        if (insertError) {
          logger.error('Failed to create automation preferences', {
            service: 'AutomationPreferencesService',
            error: insertError.message,
            userId,
          });
          return false;
        }

        return true;
      }

      if (updateError) {
        logger.error('Failed to update automation preferences', {
          service: 'AutomationPreferencesService',
          error: updateError.message,
          userId,
        });
        return false;
      }

      return true;
    } catch (error) {
      logger.error('Error updating automation preferences', error, {
        service: 'AutomationPreferencesService',
        userId,
      });
      return false;
    }
  }

  /**
   * Get default preferences (safe defaults - most automations off)
   */
  private static getDefaultPreferences(userId: string): AutomationPreferences {
    return {
      userId,
      autoAcceptBids: false,
      autoRescheduleWeather: true,
      autoCompleteJobs: false,
      autoApplyRiskPreventions: true,
      learningEnabled: true,
      notificationLearningEnabled: true,
      quietHoursStart: undefined,
      quietHoursEnd: undefined,
    };
  }

  /**
   * Check if a specific automation is enabled for a user
   */
  static async isEnabled(userId: string, automationType: keyof AutomationPreferences): Promise<boolean> {
    const preferences = await this.getPreferences(userId);
    if (!preferences) {
      return false;
    }

    return preferences[automationType] === true;
  }
}

