import { BaseService, ServiceConfig } from '../base';
import { User } from '@mintenance/types';
import { logger } from '@mintenance/shared';

export type NotificationType =
  | 'job_posted'
  | 'bid_received'
  | 'bid_accepted'
  | 'bid_rejected'
  | 'payment_received'
  | 'payment_sent'
  | 'message_received'
  | 'job_completed'
  | 'job_cancelled'
  | 'review_received'
  | 'account_update';

export type NotificationChannel = 'push' | 'email' | 'sms' | 'in_app';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels: NotificationChannel[];
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationPreferences {
  userId: string;
  push: boolean;
  email: boolean;
  sms: boolean;
  inApp: boolean;
  jobUpdates: boolean;
  bidUpdates: boolean;
  paymentUpdates: boolean;
  messageUpdates: boolean;
}

export interface SendNotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  data?: Record<string, any>;
  channels?: NotificationChannel[];
}

export class NotificationService extends BaseService {
  /**
   * Send a notification to a user
   */
  async send(params: SendNotificationParams): Promise<Notification> {
    try {
      // Get user preferences if channels not specified
      const channels = params.channels || await this.getEnabledChannels(params.userId);

      // Store notification in database
      const { data: notification, error } = await this.supabase
        .from('notifications')
        .insert({
          user_id: params.userId,
          type: params.type,
          title: params.title,
          message: params.message,
          data: params.data,
          channels,
          read: false,
          created_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      // Send through each channel
      const sendPromises = channels.map(channel =>
        this.sendToChannel(channel, params.userId, params.title, params.message, params.data)
      );

      await Promise.allSettled(sendPromises);

      return this.fromDatabase<Notification>(notification);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send bulk notifications
   */
  async sendBulk(
    userIds: string[],
    type: NotificationType,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    try {
      const promises = userIds.map(userId =>
        this.send({ userId, type, title, message, data })
      );

      await Promise.allSettled(promises);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get notifications for a user
   */
  async getNotifications(
    userId: string,
    params?: {
      limit?: number;
      offset?: number;
      unreadOnly?: boolean;
      types?: NotificationType[];
    }
  ): Promise<Notification[]> {
    try {
      let query = this.supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (params?.unreadOnly) {
        query = query.eq('read', false);
      }

      if (params?.types && params.types.length > 0) {
        query = query.in('type', params.types);
      }

      if (params?.limit) {
        query = query.limit(params.limit);
      }

      if (params?.offset) {
        query = query.range(params.offset, params.offset + (params.limit || 10) - 1);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(n => this.fromDatabase<Notification>(n));
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark notification as read
   */
  async markAsRead(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Mark all notifications as read for a user
   */
  async markAllAsRead(userId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .update({
          read: true,
          read_at: new Date().toISOString(),
        })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Delete a notification
   */
  async deleteNotification(notificationId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get notification preferences for a user
   */
  async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        // Return defaults if no preferences found
        return {
          userId,
          push: true,
          email: true,
          sms: false,
          inApp: true,
          jobUpdates: true,
          bidUpdates: true,
          paymentUpdates: true,
          messageUpdates: true,
        };
      }

      return this.fromDatabase<NotificationPreferences>(data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Update notification preferences
   */
  async updatePreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<NotificationPreferences> {
    try {
      const { data, error } = await this.supabase
        .from('notification_preferences')
        .upsert({
          user_id: userId,
          ...this.toDatabase(preferences),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      return this.fromDatabase<NotificationPreferences>(data);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Get unread notification count
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const { count, error } = await this.supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (error) throw error;

      return count || 0;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Helper: Get enabled notification channels for a user
   */
  private async getEnabledChannels(userId: string): Promise<NotificationChannel[]> {
    const prefs = await this.getPreferences(userId);
    const channels: NotificationChannel[] = [];

    if (prefs.push) channels.push('push');
    if (prefs.email) channels.push('email');
    if (prefs.sms) channels.push('sms');
    if (prefs.inApp) channels.push('in_app');

    // Always include in-app as fallback
    if (channels.length === 0) {
      channels.push('in_app');
    }

    return channels;
  }

  /**
   * Helper: Send notification through specific channel
   * This is a placeholder - actual implementation depends on platform
   */
  private async sendToChannel(
    channel: NotificationChannel,
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<void> {
    // This will be overridden in platform-specific implementations
    logger.info('Sending %s notification to %s: %s', [object Object], { service: 'general' });
  }
}