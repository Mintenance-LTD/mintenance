import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { NotificationAgent } from '../agents/NotificationAgent';

interface CreateNotificationParams {
  userId: string;
  type: string;
  title: string;
  message: string;
  actionUrl?: string;
  metadata?: Record<string, any>;
}

/**
 * Service for creating notifications with intelligent routing
 * Uses NotificationAgent to determine optimal send time
 */
export class NotificationService {
  /**
   * Create a notification (intelligent routing)
   * This should be used instead of direct database inserts
   */
  static async createNotification(params: CreateNotificationParams): Promise<string | null> {
    try {
      // Check if notification should be sent immediately or queued
      const sendDecision = await NotificationAgent.shouldSendImmediately(
        params.userId,
        params.type,
        { userId: params.userId }
      );

      if (sendDecision.immediate) {
        // Send immediately
        const { data, error } = await serverSupabase
          .from('notifications')
          .insert({
            user_id: params.userId,
            type: params.type,
            title: params.title,
            message: params.message,
            action_url: params.actionUrl,
            read: false,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (error) {
          logger.error('Error creating notification', {
            service: 'NotificationService',
            error: error.message,
            userId: params.userId,
          });
          return null;
        }

        // Track engagement opportunity (notification sent)
        // Engagement will be tracked when user opens/clicks
        return data.id;
      } else {
        // Queue for later
        const priority = this.getPriorityFromType(params.type);
        const scheduledFor = sendDecision.scheduledFor || new Date();

        const queueId = await NotificationAgent.queueNotification({
          userId: params.userId,
          notificationType: params.type,
          title: params.title,
          message: params.message,
          actionUrl: params.actionUrl,
          metadata: params.metadata,
          scheduledFor,
          priority,
        });

        logger.info('Notification queued', {
          service: 'NotificationService',
          userId: params.userId,
          type: params.type,
          scheduledFor: scheduledFor.toISOString(),
          reason: sendDecision.reason,
        });

        return queueId;
      }
    } catch (error) {
      logger.error('Error in createNotification', error, {
        service: 'NotificationService',
        userId: params.userId,
      });
      return null;
    }
  }

  /**
   * Track notification engagement (opened, clicked, dismissed)
   */
  static async trackEngagement(
    notificationId: string,
    userId: string,
    engagement: {
      opened?: boolean;
      clicked?: boolean;
      dismissed?: boolean;
    }
  ): Promise<void> {
    try {
      // Get notification type
      const { data: notification } = await serverSupabase
        .from('notifications')
        .select('type')
        .eq('id', notificationId)
        .single();

      if (!notification) {
        return;
      }

      // Track engagement via NotificationAgent
      await NotificationAgent.trackEngagement(notificationId, userId, notification.type, engagement);
    } catch (error) {
      logger.error('Error tracking notification engagement', error, {
        service: 'NotificationService',
        notificationId,
        userId,
      });
    }
  }

  /**
   * Get priority from notification type
   */
  private static getPriorityFromType(type: string): 'urgent' | 'high' | 'medium' | 'low' {
    return NotificationAgent.getNotificationPriority(type);
  }
}

