/**
 * NotificationService Usage Examples
 *
 * This file demonstrates how to integrate the enhanced NotificationService
 * with background notification handling into your React Native app.
 */

import React, { useEffect, useCallback } from 'react';
import { NotificationService } from './NotificationService';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import { useNavigationContainerRef } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import * as Notifications from 'expo-notifications';

// ============================================================================
// EXAMPLE 1: App.tsx Integration
// ============================================================================

/**
 * Add this to your App.tsx to initialize notifications on app start
 */
export function AppWithNotifications() {
  useEffect(() => {
    const initNotifications = async () => {
      try {
        logger.info('Initializing notification system');

        // Request permissions and get push token
        const token = await NotificationService.initialize();

        if (token) {
          logger.info('Push token obtained', { token });

          // Get authenticated user
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            // Save token to database
            await NotificationService.savePushToken(user.id, token);
            logger.info('Push token saved for user', { userId: user.id });
          } else {
            logger.warn('User not authenticated, token not saved');
          }
        } else {
          logger.warn('Failed to get push token');
        }

        // Set up notification listeners for all app states
        NotificationService.setupNotificationListeners();

        logger.info('Notification system initialized successfully');
      } catch (error) {
        logger.error('Failed to initialize notification system', error);
      }
    };

    initNotifications();

    // Cleanup on unmount
    return () => {
      logger.info('Cleaning up notification listeners');
      NotificationService.cleanup();
    };
  }, []);

  // Rest of your App component...
  return null; // Your app JSX
}

// ============================================================================
// EXAMPLE 2: RootNavigator Integration
// ============================================================================

/**
 * Add this to your RootNavigator to enable deep linking from notifications
 */
export function RootNavigatorWithNotifications() {
  const navigationRef = useNavigationContainerRef();

  useEffect(() => {
    // Set navigation reference once it's ready
    if (navigationRef?.current) {
      NotificationService.setNavigationRef(navigationRef.current as any);
      logger.info('Navigation reference set for notification deep linking');
    }
  }, [navigationRef]);

  // Your navigation structure...
  return null;
}

// ============================================================================
// EXAMPLE 3: Home Screen with Badge Count
// ============================================================================

/**
 * Update badge count when screen comes into focus
 */
export function HomeScreenWithBadgeUpdate() {
  const [unreadCount, setUnreadCount] = React.useState(0);

  // Update badge and count when screen focuses
  useFocusEffect(
    useCallback(() => {
      const updateBadge = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();

          if (user) {
            const count = await NotificationService.getUnreadCount(user.id);
            setUnreadCount(count);
            await Notifications.setBadgeCountAsync(count);
            logger.info('Badge count updated', { count });
          }
        } catch (error) {
          logger.error('Failed to update badge count', error);
        }
      };

      updateBadge();

      // Set up real-time subscription for notification changes
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notifications',
          },
          () => {
            // Refresh count when notifications table changes
            updateBadge();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }, [])
  );

  // Your screen JSX...
  return null;
}

// ============================================================================
// EXAMPLE 4: Notification List Screen
// ============================================================================

/**
 * Display list of notifications with mark as read functionality
 */
export function NotificationListScreen() {
  const [notifications, setNotifications] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        const notifs = await NotificationService.getUserNotifications(
          user.id,
          50, // limit
          0   // offset
        );
        setNotifications(notifs);
      }
    } catch (error) {
      logger.error('Failed to load notifications', error);
    } finally {
      setLoading(false);
    }
  };

  const handleNotificationPress = async (notificationId: string) => {
    try {
      // Mark as read
      await NotificationService.markAsRead(notificationId);

      // Update local state
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );

      // Navigation will happen automatically via deep link data
      logger.info('Notification marked as read', { notificationId });
    } catch (error) {
      logger.error('Failed to mark notification as read', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        await NotificationService.markAllAsRead(user.id);

        // Update local state
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));

        logger.info('All notifications marked as read');
      }
    } catch (error) {
      logger.error('Failed to mark all as read', error);
    }
  };

  // Your notification list JSX...
  return null;
}

// ============================================================================
// EXAMPLE 5: Logout Handler
// ============================================================================

/**
 * Clean up notifications on logout
 */
export function useLogoutWithNotificationCleanup() {
  const handleLogout = async () => {
    try {
      logger.info('Logging out...');

      // Clear all notifications and queue
      await NotificationService.clearAllNotifications();

      // Cleanup listeners
      NotificationService.cleanup();

      // Perform logout
      await supabase.auth.signOut();

      logger.info('Logout successful');
    } catch (error) {
      logger.error('Logout failed', error);
      throw error;
    }
  };

  return { handleLogout };
}

// ============================================================================
// EXAMPLE 6: Sending Notifications (Backend/Admin)
// ============================================================================

/**
 * Example of sending notifications from your app (typically done on backend)
 */
export async function sendJobUpdateNotification(
  homeownerId: string,
  jobId: string,
  jobTitle: string,
  contractorName: string
) {
  try {
    await NotificationService.sendPushNotification(
      homeownerId,
      'Job Update',
      `${contractorName} updated your job: ${jobTitle}`,
      {
        jobId,
        contractorName,
      },
      'job_update'
    );

    logger.info('Job update notification sent', { homeownerId, jobId });
  } catch (error) {
    logger.error('Failed to send job update notification', error);
  }
}

export async function sendBidReceivedNotification(
  homeownerId: string,
  jobId: string,
  contractorName: string,
  bidAmount: number
) {
  try {
    await NotificationService.sendPushNotification(
      homeownerId,
      'New Bid Received',
      `${contractorName} submitted a bid of £${bidAmount}`,
      {
        jobId,
        contractorId: 'contractor-id', // Include contractor ID
        bidAmount,
      },
      'bid_received'
    );

    logger.info('Bid notification sent', { homeownerId, jobId });
  } catch (error) {
    logger.error('Failed to send bid notification', error);
  }
}

export async function sendMessageNotification(
  recipientId: string,
  conversationId: string,
  senderName: string,
  messagePreview: string
) {
  try {
    await NotificationService.sendPushNotification(
      recipientId,
      `New message from ${senderName}`,
      messagePreview,
      {
        conversationId,
        senderId: 'sender-id', // Include sender ID
        senderName,
      },
      'message_received'
    );

    logger.info('Message notification sent', { recipientId, conversationId });
  } catch (error) {
    logger.error('Failed to send message notification', error);
  }
}

// ============================================================================
// EXAMPLE 7: Scheduled Notifications
// ============================================================================

/**
 * Schedule a reminder notification
 */
export async function scheduleMeetingReminder(
  meetingId: string,
  meetingTitle: string,
  meetingTime: Date
) {
  try {
    // Schedule notification 30 minutes before meeting
    const reminderTime = new Date(meetingTime.getTime() - 30 * 60 * 1000);

    const notificationId = await NotificationService.scheduleNotification(
      'Meeting Reminder',
      `Your meeting "${meetingTitle}" starts in 30 minutes`,
      {
        date: reminderTime,
      },
      {
        type: 'meeting_scheduled',
        meetingId,
      }
    );

    logger.info('Meeting reminder scheduled', {
      notificationId,
      meetingId,
      reminderTime,
    });

    return notificationId;
  } catch (error) {
    logger.error('Failed to schedule meeting reminder', error);
    throw error;
  }
}

/**
 * Cancel a scheduled notification
 */
export async function cancelScheduledReminder(notificationId: string) {
  try {
    await NotificationService.cancelNotification(notificationId);
    logger.info('Scheduled notification cancelled', { notificationId });
  } catch (error) {
    logger.error('Failed to cancel notification', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 8: Notification Preferences
// ============================================================================

/**
 * Update user notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  preferences: {
    jobUpdates?: boolean;
    bidNotifications?: boolean;
    messages?: boolean;
    quietHoursEnabled?: boolean;
    quietHoursStart?: string;
    quietHoursEnd?: string;
  }
) {
  try {
    const currentPrefs = await NotificationService.getNotificationPreferences(
      userId
    );

    const updatedPrefs = {
      ...currentPrefs,
      jobUpdates: preferences.jobUpdates ?? currentPrefs.jobUpdates,
      bidNotifications:
        preferences.bidNotifications ?? currentPrefs.bidNotifications,
      messages: preferences.messages ?? currentPrefs.messages,
      quietHours: {
        enabled:
          preferences.quietHoursEnabled ?? currentPrefs.quietHours.enabled,
        start:
          preferences.quietHoursStart ?? currentPrefs.quietHours.start,
        end: preferences.quietHoursEnd ?? currentPrefs.quietHours.end,
      },
    };

    await NotificationService.updateNotificationPreferences(
      userId,
      updatedPrefs
    );

    logger.info('Notification preferences updated', { userId });
  } catch (error) {
    logger.error('Failed to update notification preferences', error);
    throw error;
  }
}

// ============================================================================
// EXAMPLE 9: Testing Notifications in Development
// ============================================================================

/**
 * Send a test notification (for development/testing)
 */
export async function sendTestNotification() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (user) {
      await NotificationService.sendPushNotification(
        user.id,
        'Test Notification',
        'This is a test notification to verify the system is working',
        {
          jobId: 'test-job-123',
          test: true,
        },
        'job_update'
      );

      logger.info('Test notification sent');
    }
  } catch (error) {
    logger.error('Failed to send test notification', error);
  }
}

/**
 * Test local notification (doesn't require backend)
 */
export async function sendTestLocalNotification() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Local Test Notification',
        body: 'This is a local test notification',
        data: {
          type: 'system',
          test: true,
        },
      },
      trigger: null, // Send immediately
    });

    logger.info('Local test notification sent');
  } catch (error) {
    logger.error('Failed to send local test notification', error);
  }
}
