/**
 * Notification Service - Core notification management
 */
import { NotificationType, NotificationPreferences, NotificationSettings } from './types';
import { logger } from '@mintenance/shared';
// Types are now imported from ./types to avoid circular dependencies
export class NotificationService {
  private supabase: any;
  constructor(config: { supabase: any }) {
    this.supabase = config.supabase;
  }
  /**
   * Get user notification preferences
   */
  async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data } = await this.supabase
        .from('user_preferences')
        .select('notification_preferences')
        .eq('user_id', userId)
        .single();
      if (!data || !data.notification_preferences) {
        // Return defaults if not found
        return {
          email: true,
          sms: false,
          push: true,
          in_app: true
        };
      }
      return data.notification_preferences;
    } catch (error) {
      logger.error('Error getting user preferences:', error);
      // Return defaults on error
      return {
        email: true,
        sms: false,
        push: true,
        in_app: true
      };
    }
  }
  /**
   * Update user notification preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      // Get existing preferences
      const existing = await this.getUserPreferences(userId);
      const updated = { ...existing, ...preferences };
      // Update in database
      const { error } = await this.supabase
        .from('user_preferences')
        .upsert({
          user_id: userId,
          notification_preferences: updated,
          updated_at: new Date().toISOString()
        });
      if (error) throw error;
      return updated;
    } catch (error) {
      logger.error('Error updating user preferences:', error);
      throw new Error('Failed to update notification preferences');
    }
  }
  /**
   * Get user notification settings
   */
  async getUserSettings(userId: string): Promise<NotificationSettings> {
    try {
      const { data } = await this.supabase
        .from('user_settings')
        .select('notification_settings')
        .eq('user_id', userId)
        .single();
      return data?.notification_settings || {};
    } catch (error) {
      logger.error('Error getting user settings:', error);
      return {};
    }
  }
  /**
   * Check if we should send notification based on user settings
   */
  async shouldSendNotification(
    userId: string,
    type: NotificationType,
    channel: 'email' | 'sms' | 'push' | 'in_app'
  ): Promise<boolean> {
    try {
      // Check preferences
      const preferences = await this.getUserPreferences(userId);
      if (!preferences[channel]) {
        return false;
      }
      // Check settings
      const settings = await this.getUserSettings(userId);
      // Check quiet hours
      if (settings.quietHoursStart && settings.quietHoursEnd && channel !== 'in_app') {
        if (this.isInQuietHours(settings.quietHoursStart, settings.quietHoursEnd)) {
          return false;
        }
      }
      // Check category preferences
      if (settings.categories) {
        const category = this.getNotificationCategory(type);
        if (settings.categories[category] === false) {
          return false;
        }
      }
      // Check frequency settings for email
      if (channel === 'email' && settings.frequency !== 'instant') {
        // Queue for digest instead of sending immediately
        return false;
      }
      return true;
    } catch (error) {
      logger.error('Error checking notification settings:', error);
      return true; // Default to sending on error
    }
  }
  /**
   * Log notification sent
   */
  async logNotificationSent(params: {
    userId: string;
    type: NotificationType;
    channel: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }): Promise<void> {
    try {
      await this.supabase
        .from('notification_logs')
        .insert({
          user_id: params.userId,
          notification_type: params.type,
          channel: params.channel,
          success: params.success,
          message_id: params.messageId,
          error_message: params.error,
          sent_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error logging notification:', error);
    }
  }
  /**
   * Get notification statistics for a user
   */
  async getUserNotificationStats(userId: string, days: number = 30): Promise<any> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const { data } = await this.supabase
        .from('notification_logs')
        .select('channel, success, notification_type')
        .eq('user_id', userId)
        .gte('sent_at', startDate.toISOString());
      if (!data) return {};
      // Calculate statistics
      const stats: any = {
        total: data.length,
        byChannel: {},
        byType: {},
        successRate: 0
      };
      let successCount = 0;
      for (const log of data) {
        // By channel
        if (!stats.byChannel[log.channel]) {
          stats.byChannel[log.channel] = { sent: 0, success: 0 };
        }
        stats.byChannel[log.channel].sent++;
        if (log.success) {
          stats.byChannel[log.channel].success++;
          successCount++;
        }
        // By type
        if (!stats.byType[log.notification_type]) {
          stats.byType[log.notification_type] = 0;
        }
        stats.byType[log.notification_type]++;
      }
      stats.successRate = data.length > 0 ? (successCount / data.length) * 100 : 0;
      return stats;
    } catch (error) {
      logger.error('Error getting notification stats:', error);
      return {};
    }
  }
  /**
   * Get user's device tokens for push notifications
   */
  async getUserDeviceTokens(userId: string): Promise<string[]> {
    try {
      const { data } = await this.supabase
        .from('device_tokens')
        .select('token')
        .eq('user_id', userId)
        .eq('active', true);
      return data?.map((d: any) => d.token) || [];
    } catch (error) {
      logger.error('Error getting device tokens:', error);
      return [];
    }
  }
  /**
   * Register device token for push notifications
   */
  async registerDeviceToken(
    userId: string,
    token: string,
    platform: 'ios' | 'android' | 'web'
  ): Promise<void> {
    try {
      await this.supabase
        .from('device_tokens')
        .upsert({
          user_id: userId,
          token,
          platform,
          active: true,
          registered_at: new Date().toISOString()
        });
    } catch (error) {
      logger.error('Error registering device token:', error);
      throw new Error('Failed to register device token');
    }
  }
  /**
   * Unregister device token
   */
  async unregisterDeviceToken(token: string): Promise<void> {
    try {
      await this.supabase
        .from('device_tokens')
        .update({ active: false })
        .eq('token', token);
    } catch (error) {
      logger.error('Error unregistering device token:', error);
    }
  }
  // ============= Private Helper Methods =============
  private isInQuietHours(start: string, end: string): boolean {
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    // Handle overnight quiet hours (e.g., 22:00 to 08:00)
    if (start > end) {
      return currentTime >= start || currentTime < end;
    }
    // Handle same-day quiet hours (e.g., 00:00 to 06:00)
    return currentTime >= start && currentTime < end;
  }
  private getNotificationCategory(type: NotificationType): string {
    const categoryMap: Record<NotificationType, string> = {
      [NotificationType.JOB_CREATED]: 'jobs',
      [NotificationType.JOB_ASSIGNED]: 'jobs',
      [NotificationType.JOB_COMPLETED]: 'jobs',
      [NotificationType.BID_RECEIVED]: 'bids',
      [NotificationType.BID_ACCEPTED]: 'bids',
      [NotificationType.BID_REJECTED]: 'bids',
      [NotificationType.PAYMENT_RECEIVED]: 'payments',
      [NotificationType.PAYMENT_RELEASED]: 'payments',
      [NotificationType.MESSAGE_RECEIVED]: 'messages',
      [NotificationType.REVIEW_REQUESTED]: 'reviews',
      [NotificationType.REVIEW_RECEIVED]: 'reviews',
      [NotificationType.CONTRACT_SIGNED]: 'contracts',
      [NotificationType.MILESTONE_COMPLETED]: 'milestones',
      [NotificationType.SYSTEM_ANNOUNCEMENT]: 'system'
    };
    return categoryMap[type] || 'other';
  }
}