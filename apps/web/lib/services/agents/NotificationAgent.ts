import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { AgentLogger } from './AgentLogger';
import { AutomationPreferencesService } from './AutomationPreferencesService';
import type { AgentResult, AgentContext } from './types';

interface NotificationPriority {
  urgent: string[];
  high: string[];
  medium: string[];
  low: string[];
}

interface OptimalTiming {
  hour: number; // 0-23
  minute: number; // 0-59
  confidence: number; // 0-100
}

/**
 * Agent for intelligent notification management
 * - Learns from user engagement patterns
 * - Optimizes notification timing
 * - Routes notifications by priority
 * - Respects quiet hours
 * - Batches low-priority notifications
 */
export class NotificationAgent {
  // Define notification priorities
  private static readonly NOTIFICATION_PRIORITIES: NotificationPriority = {
    urgent: ['dispute', 'payment_issue', 'security_alert', 'account_suspended'],
    high: ['bid_accepted', 'job_assigned', 'payment_released', 'job_cancelled'],
    medium: ['bid_received', 'message_received', 'review_request', 'job_reminder'],
    low: ['weekly_summary', 'marketing', 'feature_update', 'system_notification'],
  };

  /**
   * Determine if a notification should be sent immediately or queued
   */
  static async shouldSendImmediately(
    userId: string,
    notificationType: string,
    context?: AgentContext
  ): Promise<{ immediate: boolean; scheduledFor?: Date; reason: string }> {
    try {
      // Check if notification learning is enabled
      const preferences = await AutomationPreferencesService.getPreferences(userId);
      if (!preferences?.notificationLearningEnabled) {
        // If learning is disabled, send immediately (default behavior)
        return { immediate: true, reason: 'Notification learning disabled' };
      }

      // Check priority - urgent notifications always send immediately
      const priority = this.getNotificationPriority(notificationType);
      if (priority === 'urgent') {
        return { immediate: true, reason: 'Urgent priority notification' };
      }

      // Check quiet hours
      const inQuietHours = await this.isInQuietHours(userId);
      if (inQuietHours && priority !== 'urgent' && priority !== 'high') {
        // Schedule for after quiet hours
        const scheduledFor = await this.getNextOptimalTime(userId, notificationType);
        return {
          immediate: false,
          scheduledFor,
          reason: 'In quiet hours, scheduled for optimal time',
        };
      }

      // For high priority, send immediately (even during quiet hours)
      if (priority === 'high') {
        return { immediate: true, reason: 'High priority notification' };
      }

      // For medium/low priority, check optimal timing
      const optimalTime = await this.getOptimalNotificationTime(userId, notificationType);
      const now = new Date();
      const optimalDate = new Date(now);
      optimalDate.setHours(optimalTime.hour, optimalTime.minute, 0, 0);

      // If optimal time is within next hour, schedule it
      if (optimalTime.confidence > 60 && optimalDate > now && optimalDate.getTime() - now.getTime() < 60 * 60 * 1000) {
        return {
          immediate: false,
          scheduledFor: optimalDate,
          reason: `Scheduled for optimal time (confidence: ${optimalTime.confidence}%)`,
        };
      }

      // For low priority, batch with other notifications
      if (priority === 'low') {
        const scheduledFor = await this.getBatchTime(userId);
        return {
          immediate: false,
          scheduledFor,
          reason: 'Low priority, batched with other notifications',
        };
      }

      // Default: send immediately for medium priority
      return { immediate: true, reason: 'Medium priority, sending immediately' };
    } catch (error) {
      logger.error('Error determining notification send time', error, {
        service: 'NotificationAgent',
        userId,
        notificationType,
      });
      // On error, default to sending immediately
      return { immediate: true, reason: 'Error occurred, defaulting to immediate' };
    }
  }

  /**
   * Track notification engagement for learning
   */
  static async trackEngagement(
    notificationId: string,
    userId: string,
    notificationType: string,
    engagement: {
      opened?: boolean;
      clicked?: boolean;
      dismissed?: boolean;
    }
  ): Promise<void> {
    try {
      const preferences = await AutomationPreferencesService.getPreferences(userId);
      if (!preferences?.notificationLearningEnabled) {
        return; // Don't track if learning is disabled
      }

      // Get notification details
      const { data: notification } = await serverSupabase
        .from('notifications')
        .select('created_at')
        .eq('id', notificationId)
        .single();

      if (!notification) {
        return;
      }

      const sentAt = new Date(notification.created_at);
      const now = new Date();
      const engagementDelay = engagement.opened || engagement.clicked
        ? Math.floor((now.getTime() - sentAt.getTime()) / 1000)
        : null;

      // Record engagement
      await serverSupabase.from('notification_engagement').insert({
        user_id: userId,
        notification_id: notificationId,
        notification_type: notificationType,
        opened: engagement.opened || false,
        clicked: engagement.clicked || false,
        dismissed: engagement.dismissed || false,
        opened_at: engagement.opened ? now.toISOString() : null,
        clicked_at: engagement.clicked ? now.toISOString() : null,
        dismissed_at: engagement.dismissed ? now.toISOString() : null,
        sent_at: sentAt.toISOString(),
        engagement_delay_seconds: engagementDelay,
      });

      // Update engagement statistics (async, don't wait)
      this.updateEngagementStatistics(userId, notificationType, engagement).catch((error) => {
        logger.error('Error updating engagement statistics', error, {
          service: 'NotificationAgent',
          userId,
        });
      });

      // Log decision
      await AgentLogger.logDecision({
        agentName: 'notification',
        decisionType: 'engagement_tracked',
        actionTaken: 'tracked_engagement',
        confidence: 100,
        reasoning: `Tracked ${notificationType} engagement: opened=${engagement.opened}, clicked=${engagement.clicked}`,
        userId,
        metadata: { notificationId, notificationType, engagement, engagementDelay },
      });
    } catch (error) {
      logger.error('Error tracking notification engagement', error, {
        service: 'NotificationAgent',
        notificationId,
        userId,
      });
    }
  }

  /**
   * Learn optimal notification timing from engagement patterns
   */
  static async learnOptimalTiming(userId: string): Promise<AgentResult> {
    try {
      const preferences = await AutomationPreferencesService.getPreferences(userId);
      if (!preferences?.notificationLearningEnabled) {
        return { success: true, message: 'Notification learning disabled for user' };
      }

      // Get engagement data from last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data: engagements, error } = await serverSupabase
        .from('notification_engagement')
        .select('notification_type, opened, clicked, sent_at, engagement_delay_seconds')
        .eq('user_id', userId)
        .gte('sent_at', thirtyDaysAgo.toISOString());

      if (error || !engagements || engagements.length === 0) {
        return { success: true, message: 'Insufficient engagement data for learning' };
      }

      // Group by notification type
      const typeGroups: Record<string, typeof engagements> = {};
      for (const engagement of engagements) {
        if (!typeGroups[engagement.notification_type]) {
          typeGroups[engagement.notification_type] = [];
        }
        typeGroups[engagement.notification_type].push(engagement);
      }

      // Calculate optimal times for each type
      const preferredTimes: Record<string, OptimalTiming> = {};
      const engagementRates: Record<string, number> = {};

      for (const [type, typeEngagements] of Object.entries(typeGroups)) {
        // Calculate engagement rate
        const opened = typeEngagements.filter((e) => e.opened).length;
        const clicked = typeEngagements.filter((e) => e.clicked).length;
        engagementRates[type] = (opened / typeEngagements.length) * 100;

        // Find best engagement times (hours when most notifications were opened/clicked)
        const hourEngagements: Record<number, number> = {};
        for (const engagement of typeEngagements.filter((e) => e.opened || e.clicked)) {
          const sentAt = new Date(engagement.sent_at);
          const hour = sentAt.getHours();
          hourEngagements[hour] = (hourEngagements[hour] || 0) + 1;
        }

        // Find hour with most engagements
        let bestHour = 9; // Default to 9 AM
        let maxEngagements = 0;
        for (const [hour, count] of Object.entries(hourEngagements)) {
          if (count > maxEngagements) {
            maxEngagements = count;
            bestHour = parseInt(hour, 10);
          }
        }

        // Calculate confidence based on data points
        const confidence = Math.min(100, (typeEngagements.length / 10) * 100);

        preferredTimes[type] = {
          hour: bestHour,
          minute: 0,
          confidence: Math.round(confidence),
        };
      }

      // Update notification preferences
      await serverSupabase
        .from('notification_preferences')
        .upsert(
          {
            user_id: userId,
            preferred_notification_times: preferredTimes,
            engagement_rate_by_type: engagementRates,
            avg_open_rate: Object.values(engagementRates).reduce((a, b) => a + b, 0) / Object.values(engagementRates).length || 0,
            total_notifications_sent: engagements.length,
            total_notifications_opened: engagements.filter((e) => e.opened).length,
            total_notifications_clicked: engagements.filter((e) => e.clicked).length,
            last_analyzed_at: new Date().toISOString(),
            learning_confidence: Math.min(
              100,
              (engagements.length / 50) * 100
            ), // Confidence increases with more data
            data_points_count: engagements.length,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      await AgentLogger.logDecision({
        agentName: 'notification',
        decisionType: 'timing_learned',
        actionTaken: 'updated_preferences',
        confidence: Math.min(100, (engagements.length / 50) * 100),
        reasoning: `Learned optimal timing for ${Object.keys(typeGroups).length} notification types from ${engagements.length} engagements`,
        userId,
        metadata: { preferredTimes, engagementRates },
      });

      return {
        success: true,
        message: 'Optimal notification timing learned',
        metadata: { preferredTimes, engagementRates },
      };
    } catch (error) {
      logger.error('Error learning optimal notification timing', error, {
        service: 'NotificationAgent',
        userId,
      });
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  /**
   * Get optimal notification time for a user and type
   */
  private static async getOptimalNotificationTime(
    userId: string,
    notificationType: string
  ): Promise<OptimalTiming> {
    try {
      const { data: preferences } = await serverSupabase
        .from('notification_preferences')
        .select('preferred_notification_times')
        .eq('user_id', userId)
        .single();

      if (preferences?.preferred_notification_times) {
        const preferredTimes = preferences.preferred_notification_times as Record<string, OptimalTiming>;
        if (preferredTimes[notificationType]) {
          return preferredTimes[notificationType];
        }
        // Fallback to general preference if available
        if (preferredTimes['*']) {
          return preferredTimes['*'];
        }
      }

      // Default: 9 AM
      return { hour: 9, minute: 0, confidence: 0 };
    } catch (error) {
      logger.error('Error getting optimal notification time', error, {
        service: 'NotificationAgent',
        userId,
        notificationType,
      });
      return { hour: 9, minute: 0, confidence: 0 };
    }
  }

  /**
   * Check if current time is in quiet hours
   */
  private static async isInQuietHours(userId: string): Promise<boolean> {
    try {
      const preferences = await AutomationPreferencesService.getPreferences(userId);
      if (!preferences?.quietHoursStart || !preferences?.quietHoursEnd) {
        return false; // No quiet hours set
      }

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

      const [startHour, startMinute] = preferences.quietHoursStart.split(':').map(Number);
      const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
      const startTime = startHour * 60 + startMinute;
      const endTime = endHour * 60 + endMinute;

      // Handle quiet hours that span midnight
      if (startTime > endTime) {
        return currentTime >= startTime || currentTime <= endTime;
      }

      return currentTime >= startTime && currentTime <= endTime;
    } catch (error) {
      logger.error('Error checking quiet hours', error, {
        service: 'NotificationAgent',
        userId,
      });
      return false;
    }
  }

  /**
   * Get next optimal time (after quiet hours)
   */
  private static async getNextOptimalTime(
    userId: string,
    notificationType: string
  ): Promise<Date> {
    const preferences = await AutomationPreferencesService.getPreferences(userId);
    const now = new Date();
    const nextTime = new Date(now);

    if (preferences?.quietHoursEnd) {
      const [endHour, endMinute] = preferences.quietHoursEnd.split(':').map(Number);
      nextTime.setHours(endHour, endMinute, 0, 0);

      // If quiet hours end is in the past today, schedule for tomorrow
      if (nextTime <= now) {
        nextTime.setDate(nextTime.getDate() + 1);
      }
    } else {
      // Default: schedule for next morning (9 AM)
      nextTime.setHours(9, 0, 0, 0);
      if (nextTime <= now) {
        nextTime.setDate(nextTime.getDate() + 1);
      }
    }

    return nextTime;
  }

  /**
   * Get batch time for low-priority notifications (daily digest)
   */
  private static async getBatchTime(userId: string): Promise<Date> {
    // For now, batch low-priority notifications to be sent once per day at 9 AM
    // In the future, this could be personalized based on user preferences
    const now = new Date();
    const batchTime = new Date(now);
    batchTime.setHours(9, 0, 0, 0);

    // If it's already past 9 AM today, schedule for tomorrow
    if (batchTime <= now) {
      batchTime.setDate(batchTime.getDate() + 1);
    }

    return batchTime;
  }

  /**
   * Get notification priority
   */
  static getNotificationPriority(notificationType: string): 'urgent' | 'high' | 'medium' | 'low' {
    if (this.NOTIFICATION_PRIORITIES.urgent.includes(notificationType)) {
      return 'urgent';
    }
    if (this.NOTIFICATION_PRIORITIES.high.includes(notificationType)) {
      return 'high';
    }
    if (this.NOTIFICATION_PRIORITIES.low.includes(notificationType)) {
      return 'low';
    }
    return 'medium'; // Default
  }

  /**
   * Update engagement statistics
   */
  private static async updateEngagementStatistics(
    userId: string,
    notificationType: string,
    engagement: {
      opened?: boolean;
      clicked?: boolean;
      dismissed?: boolean;
    }
  ): Promise<void> {
    try {
      const { data: current } = await serverSupabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (!current) {
        // Create initial preferences
        await serverSupabase.from('notification_preferences').insert({
          user_id: userId,
          total_notifications_sent: 1,
          total_notifications_opened: engagement.opened ? 1 : 0,
          total_notifications_clicked: engagement.clicked ? 1 : 0,
          avg_open_rate: engagement.opened ? 100 : 0,
          avg_click_rate: engagement.clicked ? 100 : 0,
          data_points_count: 1,
          updated_at: new Date().toISOString(),
        });
        return;
      }

      // Update statistics
      const totalSent = (current.total_notifications_sent || 0) + 1;
      const totalOpened = (current.total_notifications_opened || 0) + (engagement.opened ? 1 : 0);
      const totalClicked = (current.total_notifications_clicked || 0) + (engagement.clicked ? 1 : 0);

      const engagementRateByType = (current.engagement_rate_by_type as Record<string, number>) || {};
      // Update rate for this notification type (simplified - could be more sophisticated)
      const currentRate = engagementRateByType[notificationType] || 0;
      const newCount = (currentRate / 100) * (totalSent - 1) + (engagement.opened ? 100 : 0);
      engagementRateByType[notificationType] = newCount / totalSent;

      await serverSupabase
        .from('notification_preferences')
        .update({
          total_notifications_sent: totalSent,
          total_notifications_opened: totalOpened,
          total_notifications_clicked: totalClicked,
          avg_open_rate: (totalOpened / totalSent) * 100,
          avg_click_rate: (totalClicked / totalSent) * 100,
          engagement_rate_by_type: engagementRateByType,
          data_points_count: totalSent,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);
    } catch (error) {
      logger.error('Error updating engagement statistics', error, {
        service: 'NotificationAgent',
        userId,
      });
    }
  }

  /**
   * Queue a notification for later sending
   */
  static async queueNotification(params: {
    userId: string;
    notificationType: string;
    title: string;
    message: string;
    actionUrl?: string;
    metadata?: Record<string, any>;
    scheduledFor: Date;
    priority: 'urgent' | 'high' | 'medium' | 'low';
  }): Promise<string | null> {
    try {
      const { data, error } = await serverSupabase
        .from('notification_queue')
        .insert({
          user_id: params.userId,
          notification_type: params.notificationType,
          priority: params.priority,
          title: params.title,
          message: params.message,
          action_url: params.actionUrl,
          metadata: params.metadata || {},
          scheduled_for: params.scheduledFor.toISOString(),
          status: 'pending',
        })
        .select('id')
        .single();

      if (error) {
        logger.error('Error queueing notification', {
          service: 'NotificationAgent',
          error: error.message,
          userId: params.userId,
        });
        return null;
      }

      return data.id;
    } catch (error) {
      logger.error('Error queueing notification', error, {
        service: 'NotificationAgent',
        userId: params.userId,
      });
      return null;
    }
  }
}

