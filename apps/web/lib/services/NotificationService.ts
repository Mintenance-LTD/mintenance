/**
 * Notification Service for Web
 *
 * Handles in-app notifications and notification preferences
 */

export interface NotificationData {
  id: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  type: 'job_update' | 'bid_received' | 'meeting_scheduled' | 'payment_received' | 'message_received' | 'quote_sent' | 'system';
  priority: 'low' | 'normal' | 'high';
  userId: string;
  createdAt: string;
  read: boolean;
}

export interface NotificationPreferences {
  jobUpdates: boolean;
  bidNotifications: boolean;
  meetingReminders: boolean;
  paymentAlerts: boolean;
  messages: boolean;
  quotes: boolean;
  systemAnnouncements: boolean;
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM format
    end: string;   // HH:MM format
  };
}

export class NotificationService {
  /**
   * Get user notifications
   */
  static async getUserNotifications(userId: string, limit: number = 50): Promise<NotificationData[]> {
    try {
      const response = await fetch(`/api/notifications?userId=${userId}&limit=${limit}`);

      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      return data.notifications || [];
    } catch (error) {
      console.error('Failed to get user notifications', error);
      throw error;
    }
  }

  /**
   * Get unread notification count
   */
  static async getUnreadCount(userId: string): Promise<number> {
    try {
      const response = await fetch(`/api/notifications/unread-count?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch unread count');
      }

      const data = await response.json();
      return data.count || 0;
    } catch (error) {
      console.error('Failed to get unread count', error);
      return 0;
    }
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PUT',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Failed to mark notification as read', error);
      throw error;
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all as read');
      }
    } catch (error) {
      console.error('Failed to mark all as read', error);
      throw error;
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(notificationId: string): Promise<void> {
    try {
      const response = await fetch(`/api/notifications/${notificationId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }
    } catch (error) {
      console.error('Failed to delete notification', error);
      throw error;
    }
  }

  /**
   * Get notification preferences
   */
  static async getPreferences(userId: string): Promise<NotificationPreferences> {
    try {
      const response = await fetch(`/api/notifications/preferences?userId=${userId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch preferences');
      }

      const data = await response.json();
      return data.preferences || this.getDefaultPreferences();
    } catch (error) {
      console.error('Failed to get preferences', error);
      return this.getDefaultPreferences();
    }
  }

  /**
   * Update notification preferences
   */
  static async updatePreferences(
    userId: string,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      const response = await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, preferences }),
      });

      if (!response.ok) {
        throw new Error('Failed to update preferences');
      }
    } catch (error) {
      console.error('Failed to update preferences', error);
      throw error;
    }
  }

  /**
   * Get default notification preferences
   */
  private static getDefaultPreferences(): NotificationPreferences {
    return {
      jobUpdates: true,
      bidNotifications: true,
      meetingReminders: true,
      paymentAlerts: true,
      messages: true,
      quotes: true,
      systemAnnouncements: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00',
      },
    };
  }
}
