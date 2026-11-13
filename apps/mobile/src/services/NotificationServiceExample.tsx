/**
 * NotificationService Usage Examples
 *
 * This file demonstrates how to integrate the enhanced NotificationService
 * with background notification handling into your React Native app.
 */

import React, { useEffect, useCallback } from 'react';
import { NotificationService } from './NotificationService';
import type { NotificationData } from './notifications/types';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  useNavigationContainerRef,
  useFocusEffect,
} from '@react-navigation/native';

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
          const {
            data: { user },
          } = await supabase.auth.getUser();

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
      NotificationService.setNavigationRef(
        navigationRef.current as unknown as import('./notifications/types').NavigationRef
      );
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
          const {
            data: { user },
          } = await supabase.auth.getUser();

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


// ============================================================================
// EXAMPLE 5: Logout Handler
// ============================================================================

/**
 * Clean up notifications on logout
 */


// ============================================================================
// EXAMPLE 6: Sending Notifications (Backend/Admin)
// ============================================================================

/**
 * Example of sending notifications from your app (typically done on backend)
 */






// ============================================================================
// EXAMPLE 7: Scheduled Notifications
// ============================================================================

/**
 * Schedule a reminder notification
 */


/**
 * Cancel a scheduled notification
 */


// ============================================================================
// EXAMPLE 8: Notification Preferences
// ============================================================================

/**
 * Update user notification preferences
 */


// ============================================================================
// EXAMPLE 9: Testing Notifications in Development
// ============================================================================

/**
 * Send a test notification (for development/testing)
 */


/**
 * Test local notification (doesn't require backend)
 */

