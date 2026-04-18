import { NotificationService } from '../../services/NotificationService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../config/supabase';
import { logger } from '../../utils/logger';
import { Platform } from 'react-native';
import * as sentry from '../../config/sentry';

// Mock dependencies
jest.mock('expo-notifications');
jest.mock('expo-device');
jest.mock('expo-constants');
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../config/supabase');
jest.mock('../../utils/logger');
jest.mock('../../config/sentry');
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_BASE_URL: 'http://localhost:3000',
}));

const { mobileApiClient } = require('../../utils/mobileApiClient');

jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.ios),
  },
}));

describe('NotificationService with Sentry Breadcrumbs', () => {
  const mockAddBreadcrumb = sentry.addBreadcrumb as jest.Mock;
  const mockLogger = logger as jest.Mocked<typeof logger>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Reset NotificationService state
    (NotificationService as any).expoPushToken = null;
    (NotificationService as any).navigationRef = null;
    (NotificationService as any).notificationQueue = [];
    (NotificationService as any).receivedListener = null;
    (NotificationService as any).responseListener = null;
    (NotificationService as any).isInitialized = false;
    (NotificationService as any).deviceOverride = null;

    // Setup default mocks
    Object.defineProperty(Device, 'isDevice', {
      value: true,
      configurable: true,
    });
    (Constants.expoConfig as any) = {
      extra: {
        eas: {
          projectId: 'test-project-id',
        },
      },
    };

    (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
      status: 'granted',
    });

    (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
      data: 'ExponentPushToken[test-token-123]',
    });

    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(undefined);
  });

  describe('Breadcrumb Tracking for Initialization', () => {
    it('should add breadcrumb when initialization succeeds', async () => {
      const token = await NotificationService.initialize();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification Service initialized',
        'notification',
        expect.objectContaining({
          token: 'ExponentPushToken[test-token-123]',
          level: 'info',
        })
      );
      expect(token).toBe('ExponentPushToken[test-token-123]');
    });

    it('should add error breadcrumb when initialization fails on simulator', async () => {
      (NotificationService as any).deviceOverride = false;

      const token = await NotificationService.initialize();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push notifications only work on physical devices',
        'notification',
        { level: 'warning' }
      );
      expect(token).toBeNull();
    });

    it('should add breadcrumb when permission is denied', async () => {
      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'denied',
      });

      const token = await NotificationService.initialize();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push notification permission denied',
        'notification',
        { level: 'warning' }
      );
      expect(token).toBeNull();
    });

    it('should add breadcrumb with Android channel creation', async () => {
      (Platform as any).OS = 'android';

      await NotificationService.initialize();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Android notification channels created',
        'notification',
        expect.objectContaining({
          channels: expect.arrayContaining([
            'default',
            'job-updates',
            'bid-notifications',
            'meeting-reminders',
          ]),
          level: 'info',
        })
      );

      // Reset Platform
      (Platform as any).OS = 'ios';
    });

    it('should add error breadcrumb on initialization exception', async () => {
      const error = new Error('Token generation failed');
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(error);

      const token = await NotificationService.initialize();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Failed to initialize push notifications',
        'notification',
        expect.objectContaining({
          error: error.message,
          level: 'error',
        })
      );
      expect(token).toBeNull();
    });
  });

  describe('Breadcrumb Tracking for Push Token Management', () => {
    it('should add breadcrumb when saving push token succeeds', async () => {
      mobileApiClient.post.mockResolvedValueOnce({});

      await NotificationService.savePushToken('user-123', 'token-abc');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push token saved',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          platform: 'ios',
          level: 'info',
        })
      );
    });

    it('should add error breadcrumb when saving push token fails', async () => {
      const apiError = new Error('Database error');
      mobileApiClient.post.mockRejectedValueOnce(apiError);

      await expect(
        NotificationService.savePushToken('user-123', 'token-abc')
      ).rejects.toThrow(apiError);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Failed to save push token',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          error: apiError.message,
          level: 'error',
        })
      );
    });
  });

  describe('Breadcrumb Tracking for Sending Notifications', () => {
    beforeEach(() => {
      // Mock fetch for push notification sending
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'ok' } }),
      });

      // mobileApiClient.get returns push token by default
      mobileApiClient.get.mockResolvedValue({
        push_token: 'ExponentPushToken[user-token]',
      });

      // getNotificationPreferences uses supabase.from('profiles')
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            notification_preferences: {
              pushEnabled: true,
              jobUpdates: true,
              newJobs: true,
            },
          },
          error: null,
        }),
      });

      // saveNotification uses mobileApiClient.post
      mobileApiClient.post.mockResolvedValue({});
    });

    it('should add breadcrumb when sending notification succeeds', async () => {
      await NotificationService.sendPushNotification(
        'user-123',
        'Test Title',
        'Test Body',
        { key: 'value' },
        'job_update'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push notification sent',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          type: 'job_update',
          title: 'Test Title',
          level: 'info',
        })
      );
    });

    it('should add breadcrumb when user has no push token', async () => {
      // mobileApiClient.get fails -> no token
      mobileApiClient.get.mockRejectedValueOnce(new Error('No token found'));

      await NotificationService.sendPushNotification(
        'user-123',
        'Test Title',
        'Test Body'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'No push token found for user',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          level: 'warning',
        })
      );
    });

    it('should add breadcrumb when notification is blocked by preferences', async () => {
      // Return preferences that block job_update
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            notification_preferences: {
              pushEnabled: true,
              jobUpdates: false,
            },
          },
          error: null,
        }),
      });

      await NotificationService.sendPushNotification(
        'user-123',
        'Job Update',
        'Your job has been updated',
        {},
        'job_update'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification blocked by user preferences',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          type: 'job_update',
          level: 'info',
        })
      );
    });

    it('should add error breadcrumb when push notification fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      await expect(
        NotificationService.sendPushNotification('user-123', 'Title', 'Body')
      ).rejects.toThrow('Push notification failed: 500');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Failed to send push notification',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          error: 'Push notification failed: 500',
          level: 'error',
        })
      );
    });

    it('should add breadcrumb on push notification timeout', async () => {
      jest.useFakeTimers();

      global.fetch = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 15000))
      );

      const promise = NotificationService.sendPushNotification(
        'user-123',
        'Title',
        'Body'
      );
      const expectation = expect(promise).rejects.toThrow(
        'Push notification request timed out'
      );

      await jest.advanceTimersByTimeAsync(10001); // Advance past the 10 second timeout
      await expectation;

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push notification timeout',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          level: 'error',
        })
      );

      jest.useRealTimers();
    });
  });

  describe('Breadcrumb Tracking for Notification Queue', () => {
    it('should add breadcrumb when queueing notification', async () => {
      const notification: Notifications.Notification = {
        request: {
          identifier: 'notif-123',
          content: {
            title: 'Queued Title',
            body: 'Queued Body',
            data: { type: 'job_update' },
          },
          trigger: null,
        },
        date: Date.now(),
      };

      await NotificationService.queueNotification(notification);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification queued',
        'notification',
        expect.objectContaining({
          id: 'notif-123',
          type: 'job_update',
          level: 'info',
        })
      );
    });

    it('should add breadcrumb when processing notification queue', async () => {
      // Setup queue in AsyncStorage
      const queuedNotifications = [
        {
          id: 'q1',
          notification: { request: { identifier: 'q1' } },
          receivedAt: new Date().toISOString(),
          processed: false,
        },
        {
          id: 'q2',
          notification: { request: { identifier: 'q2' } },
          receivedAt: new Date().toISOString(),
          processed: false,
        },
      ];

      (AsyncStorage.getItem as jest.Mock).mockResolvedValue(
        JSON.stringify(queuedNotifications)
      );

      await NotificationService.processNotificationQueue();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Processing notification queue',
        'notification',
        expect.objectContaining({
          queueSize: 2,
          unprocessedCount: 2,
          level: 'info',
        })
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification queue processed',
        'notification',
        expect.objectContaining({
          processedCount: expect.any(Number),
          level: 'info',
        })
      );
    });

    it('should add error breadcrumb when queue processing fails', async () => {
      const error = new Error('Queue processing error');
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(error);

      await NotificationService.processNotificationQueue();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Failed to process notification queue',
        'notification',
        expect.objectContaining({
          error: error.message,
          level: 'error',
        })
      );
    });
  });

  describe('Breadcrumb Tracking for Notification Preferences', () => {
    it('should add breadcrumb when fetching preferences succeeds', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            notification_preferences: {
              jobUpdates: true,
              newMessages: false,
            },
          },
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const prefs = await NotificationService.getNotificationPreferences('user-123');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Fetched notification preferences',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          level: 'debug',
        })
      );
    });

    it('should add breadcrumb when updating preferences', async () => {
      // updateNotificationPreferences first reads current preferences, then updates
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_preferences: {} },
          error: null,
        }),
        update: jest.fn().mockReturnThis(),
      };
      (supabase.from as jest.Mock).mockReturnValue(mockChain);
      // The update call resolves via .eq() which needs to resolve with { error: null }
      mockChain.eq.mockResolvedValue({ error: null });

      const newPrefs = {
        jobUpdates: false,
        quietHoursEnabled: true,
      };

      await NotificationService.updateNotificationPreferences('user-123', newPrefs);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Updated notification preferences',
        'notification',
        expect.objectContaining({
          userId: 'user-123',
          quietHoursEnabled: true,
          level: 'info',
        })
      );
    });
  });

  describe('Breadcrumb Tracking for Badge Management', () => {
    it('should add breadcrumb when updating badge count', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.setBadgeCount(5);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Badge count updated',
        'notification',
        expect.objectContaining({
          count: 5,
          level: 'debug',
        })
      );
    });

    it('should add breadcrumb when clearing badge', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.clearBadge();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Badge cleared',
        'notification',
        { level: 'debug' }
      );
    });
  });

  describe('Breadcrumb Tracking for Notification Listeners', () => {
    it('should add breadcrumb when registering listeners', () => {
      const mockNavigationRef = {
        navigate: jest.fn(),
        reset: jest.fn(),
        isReady: jest.fn().mockReturnValue(true),
      };

      const mockReceivedListener = { remove: jest.fn() };
      const mockResponseListener = { remove: jest.fn() };

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(
        mockReceivedListener
      );
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockResponseListener
      );

      NotificationService.registerListeners(mockNavigationRef);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification listeners registered',
        'notification',
        { level: 'info' }
      );
    });

    it('should add breadcrumb when handling notification response', async () => {
      const mockNavigationRef = {
        navigate: jest.fn(),
        reset: jest.fn(),
        isReady: jest.fn().mockReturnValue(true),
      };

      let responseHandler: any;
      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockImplementation(
        (handler) => {
          responseHandler = handler;
          return { remove: jest.fn() };
        }
      );
      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue({ remove: jest.fn() });

      // Mock markAsRead (uses mobileApiClient.post)
      mobileApiClient.post.mockResolvedValue({});

      NotificationService.registerListeners(mockNavigationRef);

      // Simulate notification response
      const response = {
        notification: {
          request: {
            identifier: 'test-notif',
            content: {
              title: 'Test',
              body: 'Body',
              data: {
                type: 'job_update',
                jobId: 'job-123',
                notificationId: 'notif-abc',
              },
            },
            trigger: null,
          },
          date: Date.now(),
        },
        actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
      };

      await responseHandler(response);

      // The deep link handler emits this breadcrumb after successful navigation
      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification response handled',
        'notification',
        expect.objectContaining({
          type: 'job_update',
          actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
          navigatedTo: expect.any(String),
          level: 'info',
        })
      );
    });

    it('should add breadcrumb when cleaning up listeners', () => {
      const mockReceivedListener = { remove: jest.fn() };
      const mockResponseListener = { remove: jest.fn() };

      (NotificationService as any).receivedListener = mockReceivedListener;
      (NotificationService as any).responseListener = mockResponseListener;

      NotificationService.cleanup();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification listeners cleaned up',
        'notification',
        { level: 'info' }
      );
    });
  });

  describe('Breadcrumb Tracking for Scheduled Notifications', () => {
    it('should add breadcrumb when scheduling notification', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(
        'scheduled-id-123'
      );

      const trigger = {
        seconds: 60,
        repeats: false,
      };

      const id = await NotificationService.scheduleLocalNotification(
        'Scheduled Title',
        'Scheduled Body',
        trigger,
        { custom: 'data' }
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification scheduled',
        'notification',
        expect.objectContaining({
          id: 'scheduled-id-123',
          title: 'Scheduled Title',
          level: 'info',
        })
      );
      expect(id).toBe('scheduled-id-123');
    });

    it('should add breadcrumb when canceling scheduled notification', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(
        undefined
      );

      await NotificationService.cancelScheduledNotification('scheduled-id-456');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification cancelled',
        'notification',
        expect.objectContaining({
          id: 'scheduled-id-456',
          level: 'info',
        })
      );
    });

    it('should throw when scheduling fails (no breadcrumb on error path)', async () => {
      const error = new Error('Scheduling failed');
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(error);

      await expect(
        NotificationService.scheduleLocalNotification(
          'Title',
          'Body',
          { seconds: 30, repeats: false }
        )
      ).rejects.toThrow(error);

      // The real code logs the error but does NOT emit a breadcrumb on the error path
      // (only logger.error is called in the catch block)
    });
  });

  describe('Integration Tests with Sentry', () => {
    it('should track complete notification flow with breadcrumbs', async () => {
      // Initialize
      await NotificationService.initialize();

      // Save token (uses mobileApiClient.post)
      mobileApiClient.post.mockResolvedValueOnce({});
      await NotificationService.savePushToken('user-123', 'token-123');

      // Send notification
      // mobileApiClient.get returns push token
      mobileApiClient.get.mockResolvedValueOnce({ push_token: 'token-123' });

      // getNotificationPreferences uses supabase.from('profiles')
      (supabase.from as jest.Mock).mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_preferences: { pushEnabled: true } },
          error: null,
        }),
      });

      // saveNotification uses mobileApiClient.post
      mobileApiClient.post.mockResolvedValueOnce({});

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'ok' } }),
      });

      await NotificationService.sendPushNotification(
        'user-123',
        'Test',
        'Message',
        {},
        'system'
      );

      // Verify breadcrumb trail (3-arg format: message, category, data-with-level)
      const breadcrumbCalls = mockAddBreadcrumb.mock.calls;

      // Should have breadcrumbs for initialization, token save, and notification send
      expect(breadcrumbCalls).toContainEqual([
        'Notification Service initialized',
        'notification',
        expect.objectContaining({ level: 'info' }),
      ]);

      expect(breadcrumbCalls).toContainEqual([
        'Push token saved',
        'notification',
        expect.objectContaining({ level: 'info' }),
      ]);

      expect(breadcrumbCalls).toContainEqual([
        'Push notification sent',
        'notification',
        expect.objectContaining({ level: 'info' }),
      ]);
    });

    it('should create error breadcrumb trail on failure', async () => {
      // Initialize with failure (simulator)
      (NotificationService as any).deviceOverride = false;

      await NotificationService.initialize();

      // Try to send notification — mobileApiClient.get fails -> no token
      mobileApiClient.get.mockRejectedValueOnce(new Error('No user found'));

      await NotificationService.sendPushNotification('user-999', 'Test', 'Body');

      // Verify error breadcrumb trail (3-arg format)
      const breadcrumbCalls = mockAddBreadcrumb.mock.calls;

      expect(breadcrumbCalls).toContainEqual([
        'Push notifications only work on physical devices',
        'notification',
        { level: 'warning' },
      ]);

      expect(breadcrumbCalls).toContainEqual([
        'No push token found for user',
        'notification',
        expect.objectContaining({ level: 'warning' }),
      ]);
    });
  });
});
