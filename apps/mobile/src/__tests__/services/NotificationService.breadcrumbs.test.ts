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

    (Notifications.setNotificationChannelAsync as jest.Mock).mockResolvedValue(
      undefined
    );
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

      // Opt in to the prompt path (PushSoftAskModal CTA flow) so the
      // 'permission denied' breadcrumb fires — silent default would
      // emit 'Push permission deferred' instead. See the matching
      // change in NotificationService.test.ts.
      const token = await NotificationService.initialize({
        promptIfUndetermined: true,
      });

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
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(
        error
      );

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
    // 2026-04-24: sendPushNotification now forwards to
    // POST /api/notifications/send (server-side Expo dispatch). The
    // breadcrumbs emitted by the client wrap the HTTP call, not the
    // Expo send — that happens on the server.
    beforeEach(() => {
      mobileApiClient.post.mockResolvedValue({
        success: true,
        notificationId: 'notif-42',
      });
    });

    it('should add breadcrumb when dispatch succeeds', async () => {
      await NotificationService.sendPushNotification(
        'user-123',
        'Test Title',
        'Test Body',
        { key: 'value' },
        'job_update'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push send dispatched',
        'notification',
        expect.objectContaining({
          recipientId: 'user-123',
          type: 'job_update',
          notificationId: 'notif-42',
          level: 'info',
        })
      );
    });

    it('should add breadcrumb when recipient has suppressed this type', async () => {
      mobileApiClient.post.mockResolvedValueOnce({
        success: true,
        notificationId: null,
        suppressed: true,
      });

      await NotificationService.sendPushNotification(
        'user-123',
        'Job Update',
        'Your job has been updated',
        {},
        'job_update'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push send suppressed by recipient preferences',
        'notification',
        expect.objectContaining({
          recipientId: 'user-123',
          type: 'job_update',
          level: 'info',
        })
      );
    });

    it('should add warning breadcrumb on 403 (no business relationship)', async () => {
      mobileApiClient.post.mockRejectedValueOnce(
        new Error('Request failed with status 403: Forbidden')
      );

      await NotificationService.sendPushNotification(
        'stranger-id',
        'Hello',
        'This should not deliver'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push send refused (403)',
        'notification',
        expect.objectContaining({
          recipientId: 'stranger-id',
          level: 'warning',
        })
      );
    });

    it('should add error breadcrumb when dispatch fails', async () => {
      mobileApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      await NotificationService.sendPushNotification(
        'user-123',
        'Title',
        'Body'
      );

      expect(mockAddBreadcrumb).toHaveBeenCalledWith(
        'Push send dispatch failed',
        'notification',
        expect.objectContaining({
          recipientId: 'user-123',
          error: 'Network error',
          level: 'error',
        })
      );
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

      const prefs =
        await NotificationService.getNotificationPreferences('user-123');

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
      // updateNotificationPreferences first reads current preferences,
      // then updates. The READ chain ends in .single() (returns data);
      // the UPDATE chain ends in .eq() (returns { error }). The earlier
      // mock conflated both by setting eq() to mockResolvedValue once,
      // breaking the read chain. Use mockReturnValueOnce for the read
      // and mockResolvedValueOnce for the update so the chain resolves
      // correctly per call.
      const readChain: Record<string, jest.Mock> = {
        select: jest.fn(),
        eq: jest.fn(),
        single: jest.fn().mockResolvedValue({
          data: { notification_preferences: {} },
          error: null,
        }),
      };
      readChain.select.mockReturnValue(readChain);
      readChain.eq.mockReturnValue(readChain);

      const updateChain: Record<string, jest.Mock> = {
        update: jest.fn(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      updateChain.update.mockReturnValue(updateChain);

      (supabase.from as jest.Mock)
        .mockReturnValueOnce(readChain)
        .mockReturnValueOnce(updateChain);

      const newPrefs = {
        jobUpdates: false,
        quietHoursEnabled: true,
      };

      await NotificationService.updateNotificationPreferences(
        'user-123',
        newPrefs
      );

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
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(
        undefined
      );

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
      (Notifications.setBadgeCountAsync as jest.Mock).mockResolvedValue(
        undefined
      );

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

      (
        Notifications.addNotificationReceivedListener as jest.Mock
      ).mockReturnValue(mockReceivedListener);
      (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mockReturnValue(mockResponseListener);

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
      (
        Notifications.addNotificationResponseReceivedListener as jest.Mock
      ).mockImplementation((handler) => {
        responseHandler = handler;
        return { remove: jest.fn() };
      });
      (
        Notifications.addNotificationReceivedListener as jest.Mock
      ).mockReturnValue({ remove: jest.fn() });

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
      (
        Notifications.cancelScheduledNotificationAsync as jest.Mock
      ).mockResolvedValue(undefined);

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
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(
        error
      );

      await expect(
        NotificationService.scheduleLocalNotification('Title', 'Body', {
          seconds: 30,
          repeats: false,
        })
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

      // Send notification — server-routed path (2026-04-24+).
      mobileApiClient.post.mockResolvedValueOnce({
        success: true,
        notificationId: 'notif-success',
      });

      await NotificationService.sendPushNotification(
        'user-123',
        'Test',
        'Message',
        {},
        'system'
      );

      const breadcrumbCalls = mockAddBreadcrumb.mock.calls;

      // Should have breadcrumbs for initialization, token save, and push dispatch
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
        'Push send dispatched',
        'notification',
        expect.objectContaining({ level: 'info' }),
      ]);
    });

    it('should create error breadcrumb trail on failure', async () => {
      // Initialize with failure (simulator)
      (NotificationService as any).deviceOverride = false;

      await NotificationService.initialize();

      // Server refuses — caller has no relationship with recipient.
      mobileApiClient.post.mockRejectedValueOnce(
        new Error('Request failed with status 403: Forbidden')
      );

      await NotificationService.sendPushNotification(
        'user-999',
        'Test',
        'Body'
      );

      const breadcrumbCalls = mockAddBreadcrumb.mock.calls;

      expect(breadcrumbCalls).toContainEqual([
        'Push notifications only work on physical devices',
        'notification',
        { level: 'warning' },
      ]);

      expect(breadcrumbCalls).toContainEqual([
        'Push send refused (403)',
        'notification',
        expect.objectContaining({ level: 'warning' }),
      ]);
    });
  });
});
