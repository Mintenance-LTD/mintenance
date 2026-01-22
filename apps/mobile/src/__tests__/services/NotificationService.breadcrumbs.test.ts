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
        'info',
        expect.objectContaining({
          token: 'ExponentPushToken[test-token-123]',
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
        'warning'
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
        'warning'
      );
      expect(token).toBeNull();
    });

    it('should add breadcrumb with Android channel creation', async () => {
      (Platform as any).OS = 'android';

      await NotificationService.initialize();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Android notification channels created',
        'notification',
        'info',
        expect.objectContaining({
          channels: expect.arrayContaining([
            'default',
            'job-updates',
            'bid-notifications',
            'meeting-reminders',
          ]),
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
        'error',
        expect.objectContaining({
          error: error.message,
        })
      );
      expect(token).toBeNull();
    });
  });

  describe('Breadcrumb Tracking for Push Token Management', () => {
    it('should add breadcrumb when saving push token succeeds', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      await NotificationService.savePushToken('user-123', 'token-abc');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push token saved',
        'notification',
        'info',
        expect.objectContaining({
          userId: 'user-123',
          platform: 'ios',
        })
      );
    });

    it('should add error breadcrumb when saving push token fails', async () => {
      const dbError = new Error('Database error');
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: dbError }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      await expect(
        NotificationService.savePushToken('user-123', 'token-abc')
      ).rejects.toThrow(dbError);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Failed to save push token',
        'notification',
        'error',
        expect.objectContaining({
          userId: 'user-123',
          error: dbError.message,
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

      // Mock database operations
      const mockFrom = jest.fn();
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { push_token: 'ExponentPushToken[user-token]' },
          error: null,
        }),
      });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            notification_settings: {
              jobUpdates: true,
              systemAnnouncements: true,
            },
          },
          error: null,
        }),
      });
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'notification-123' },
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;
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
        'info',
        expect.objectContaining({
          userId: 'user-123',
          type: 'job_update',
          title: 'Test Title',
        })
      );
    });

    it('should add breadcrumb when user has no push token', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('No token found'),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      await NotificationService.sendPushNotification(
        'user-123',
        'Test Title',
        'Test Body'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'No push token found for user',
        'notification',
        'warning',
        expect.objectContaining({
          userId: 'user-123',
        })
      );
    });

    it('should add breadcrumb when notification is blocked by preferences', async () => {
      const mockFrom = jest.fn();
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { push_token: 'token' },
          error: null,
        }),
      });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: {
            notification_settings: {
              jobUpdates: false,
            },
          },
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

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
        'info',
        expect.objectContaining({
          userId: 'user-123',
          type: 'job_update',
        })
      );
    });

    it('should add error breadcrumb when push notification fails', async () => {
      global.fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 500,
      });

      const mockFrom = jest.fn();
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { push_token: 'token' },
          error: null,
        }),
      });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_settings: {} },
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      await expect(
        NotificationService.sendPushNotification('user-123', 'Title', 'Body')
      ).rejects.toThrow('Push notification failed: 500');

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Failed to send push notification',
        'notification',
        'error',
        expect.objectContaining({
          userId: 'user-123',
          error: 'Push notification failed: 500',
        })
      );
    });

    it('should add breadcrumb on push notification timeout', async () => {
      global.fetch = jest.fn().mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 15000))
      );

      const mockFrom = jest.fn();
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { push_token: 'token' },
          error: null,
        }),
      });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_settings: {} },
          error: null,
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      jest.useFakeTimers();

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
        'error',
        expect.objectContaining({
          userId: 'user-123',
          timeout: 10000,
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
        'info',
        expect.objectContaining({
          id: 'notif-123',
          type: 'job_update',
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
        'info',
        expect.objectContaining({
          queueSize: 2,
          unprocessedCount: 2,
        })
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification queue processed',
        'notification',
        'info',
        expect.objectContaining({
          processedCount: expect.any(Number),
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
        'error',
        expect.objectContaining({
          error: error.message,
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
            notification_settings: {
              jobUpdates: true,
              messages: false,
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
        'debug',
        expect.objectContaining({
          userId: 'user-123',
          preferences: expect.objectContaining({
            jobUpdates: true,
            messages: false,
          }),
        })
      );
    });

    it('should add breadcrumb when updating preferences', async () => {
      const mockFrom = jest.fn().mockReturnValue({
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      });
      (supabase.from as jest.Mock) = mockFrom;

      const newPrefs = {
        jobUpdates: false,
        bidNotifications: true,
        meetingReminders: true,
        paymentAlerts: true,
        messages: true,
        quotes: true,
        systemAnnouncements: false,
        quietHours: {
          enabled: true,
          start: '22:00',
          end: '08:00',
        },
      };

      await NotificationService.updateNotificationPreferences('user-123', newPrefs);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Updated notification preferences',
        'notification',
        'info',
        expect.objectContaining({
          userId: 'user-123',
          quietHoursEnabled: true,
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
        'debug',
        expect.objectContaining({
          count: 5,
        })
      );
    });

    it('should add breadcrumb when clearing badge', async () => {
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.clearBadge();

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Badge cleared',
        'notification',
        'debug'
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
        'info'
      );
    });

    it('should add breadcrumb when handling notification response', () => {
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

      NotificationService.registerListeners(mockNavigationRef);

      // Simulate notification response
      const response: Notifications.NotificationResponse = {
        notification: {
          request: {
            identifier: 'test-notif',
            content: {
              title: 'Test',
              body: 'Body',
              data: {
                type: 'job_update',
                jobId: 'job-123',
              },
            },
            trigger: null,
          },
          date: Date.now(),
        },
        actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
      };

      responseHandler(response);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Notification response handled',
        'notification',
        'info',
        expect.objectContaining({
          type: 'job_update',
          actionIdentifier: Notifications.DEFAULT_ACTION_IDENTIFIER,
          navigatedTo: expect.any(String),
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
        'info'
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
        'Local notification scheduled',
        'notification',
        'info',
        expect.objectContaining({
          id: 'scheduled-id-123',
          title: 'Scheduled Title',
          triggerSeconds: 60,
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
        'Scheduled notification cancelled',
        'notification',
        'info',
        expect.objectContaining({
          id: 'scheduled-id-456',
        })
      );
    });

    it('should add error breadcrumb when scheduling fails', async () => {
      const error = new Error('Scheduling failed');
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(error);

      await expect(
        NotificationService.scheduleLocalNotification(
          'Title',
          'Body',
          { seconds: 30, repeats: false }
        )
      ).rejects.toThrow(error);

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Failed to schedule notification',
        'notification',
        'error',
        expect.objectContaining({
          error: error.message,
        })
      );
    });
  });

  describe('Integration Tests with Sentry', () => {
    it('should track complete notification flow with breadcrumbs', async () => {
      // Initialize
      await NotificationService.initialize();

      // Save token
      const mockFrom = jest.fn().mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: null }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      await NotificationService.savePushToken('user-123', 'token-123');

      // Send notification
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { push_token: 'token-123' },
          error: null,
        }),
      });
      mockFrom.mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_settings: {} },
          error: null,
        }),
      });
      mockFrom.mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'notif-123' },
          error: null,
        }),
      });

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

      // Verify breadcrumb trail
      const breadcrumbCalls = mockAddBreadcrumb.mock.calls;

      // Should have breadcrumbs for initialization, token save, and notification send
      expect(breadcrumbCalls).toContainEqual([
        'Notification Service initialized',
        'notification',
        'info',
        expect.any(Object),
      ]);

      expect(breadcrumbCalls).toContainEqual([
        'Push token saved',
        'notification',
        'info',
        expect.any(Object),
      ]);

      expect(breadcrumbCalls).toContainEqual([
        'Push notification sent',
        'notification',
        'info',
        expect.any(Object),
      ]);
    });

    it('should create error breadcrumb trail on failure', async () => {
      // Initialize with failure
      (NotificationService as any).deviceOverride = false;

      await NotificationService.initialize();

      // Try to send notification (should fail early)
      const mockFrom = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: new Error('No user found'),
        }),
      });
      (supabase.from as jest.Mock) = mockFrom;

      await NotificationService.sendPushNotification('user-999', 'Test', 'Body');

      // Verify error breadcrumb trail
      const breadcrumbCalls = mockAddBreadcrumb.mock.calls;

      expect(breadcrumbCalls).toContainEqual([
        'Push notifications only work on physical devices',
        'notification',
        'warning',
      ]);

      expect(breadcrumbCalls).toContainEqual([
        'No push token found for user',
        'notification',
        'warning',
        expect.any(Object),
      ]);
    });
  });
});
