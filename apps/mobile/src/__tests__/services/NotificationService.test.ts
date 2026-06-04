import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

// Import the REAL NotificationService (not mocked) - we want to test the actual implementation
import { NotificationService } from '../../services/NotificationService';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
  multiRemove: jest.fn(() => Promise.resolve()),
}));

// Mock Device to override jest-setup.js
jest.mock('expo-device', () => ({
  isDevice: true,
}));

// Mock Constants
jest.mock('expo-constants', () => ({
  default: {
    expoConfig: null,
    easConfig: null,
  },
}));

// Mock Supabase with simple pattern
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  },
}));

// Mock mobileApiClient (used by savePushToken, sendPushNotification, markAsRead, etc.)
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
  API_BASE_URL: 'http://localhost:3000',
}));

// Mock sentry
jest.mock('../../config/sentry', () => ({
  addBreadcrumb: jest.fn(),
}));

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

const { supabase } = require('../../config/supabase');
const { mobileApiClient } = require('../../utils/mobileApiClient');

// Mock fetch
global.fetch = jest.fn();

// Get mocked Notifications as mockNotifications
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset Device mock to true by default
    jest.mocked(Device).isDevice = true;

    // Set up default mocks
    mockNotifications.setNotificationHandler.mockImplementation(() => {});
    mockNotifications.setNotificationChannelAsync.mockResolvedValue();
  });

  describe('initialize', () => {
    it('should initialize push notifications successfully', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: 'ExponentPushToken[test-token]',
      } as any);

      const token = await NotificationService.initialize();

      // setNotificationHandler is called at module-load time, not from
      // inside initialize(); jest.clearAllMocks() in beforeEach clears
      // that import-time call, so we don't assert on it here.
      expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(token).toBe('ExponentPushToken[test-token]');
    });

    it('should request permissions if not already granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'undetermined',
      } as any);

      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      } as any);

      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: 'ExponentPushToken[test-token]',
      } as any);

      // 2026-04-19 (audit R5 deferred #5): default behaviour is to NOT
      // prompt on 'undetermined' so silent call-sites don't burn the
      // iOS one-shot dialog. Tests that exercise the actual prompt
      // path must opt in via { promptIfUndetermined: true } — that's
      // what the PushSoftAskModal CTA does at runtime.
      const token = await NotificationService.initialize({
        promptIfUndetermined: true,
      });

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(token).toBe('ExponentPushToken[test-token]');
    });

    it('should return null if permission is denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
      });

      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
        status: 'denied',
      });

      const token = await NotificationService.initialize();

      expect(token).toBeNull();
    });

    it('should return null on non-device platforms', async () => {
      // Ensure the service sees the updated device state
      jest.resetModules();
      const deviceModule = require('expo-device');
      deviceModule.isDevice = false;
      const {
        NotificationService: FreshService,
      } = require('../../services/NotificationService');

      const token = await FreshService.initialize();

      expect(token).toBeNull();
      // Should not call any notification methods when not on device
      expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('savePushToken', () => {
    // Tests against current implementation (2026-04-17+):
    // POST /api/user/push-token with { pushToken, platform }.
    it('should save push token via /api/user/push-token', async () => {
      mobileApiClient.post.mockResolvedValueOnce({ success: true });

      await NotificationService.savePushToken('user-1', 'test-token');

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/user/push-token',
        expect.objectContaining({
          pushToken: 'test-token',
        })
      );
    });
  });

  describe('sendPushNotification', () => {
    // Tests against current implementation (2026-04-24+):
    // forwards to POST /api/notifications/send server-side. The client
    // no longer touches another user's push token directly — that was
    // the 2026-04-21 security fix. The server handles relationship
    // authorization, token resolution, preferences, and Expo push.
    it('should post to /api/notifications/send with recipient payload', async () => {
      mobileApiClient.post.mockResolvedValueOnce({
        success: true,
        notificationId: 'notif-42',
      });

      await NotificationService.sendPushNotification(
        'user-1',
        'Test Notification',
        'This is a test message',
        { key: 'value' },
        'job_update'
      );

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/notifications/send',
        expect.objectContaining({
          recipientId: 'user-1',
          type: 'job_update',
          title: 'Test Notification',
          body: 'This is a test message',
          data: { key: 'value' },
        })
      );
      // Client must NEVER hit Expo directly (2026-04-21 security fix).
      expect(fetch).not.toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.anything()
      );
    });

    it('should no-op when userId is missing', async () => {
      await NotificationService.sendPushNotification('', 'Title', 'Body');

      expect(mobileApiClient.post).not.toHaveBeenCalled();
    });

    it('should swallow 403 responses (no business relationship)', async () => {
      mobileApiClient.post.mockRejectedValueOnce(
        new Error('Request failed with status 403: Forbidden')
      );

      // Must not re-throw — otherwise a single refused recipient would
      // break bulk fan-out from CallNotifier.notifyParticipants.
      await expect(
        NotificationService.sendPushNotification(
          'stranger-id',
          'Hello',
          'This should not deliver'
        )
      ).resolves.toBeUndefined();
    });

    it('should swallow non-403 errors without throwing', async () => {
      mobileApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        NotificationService.sendPushNotification('user-1', 'Title', 'Body')
      ).resolves.toBeUndefined();
    });
  });

  describe('sendBulkNotification', () => {
    it('should post once per recipient to /api/notifications/send', async () => {
      mobileApiClient.post.mockResolvedValue({
        success: true,
        notificationId: 'n-x',
      });

      await NotificationService.sendBulkNotification(
        ['user-1', 'user-2'],
        'Batch Notification',
        'This is a batch message',
        undefined,
        'system'
      );

      expect(mobileApiClient.post).toHaveBeenCalledTimes(2);
      expect(mobileApiClient.post).toHaveBeenNthCalledWith(
        1,
        '/api/notifications/send',
        expect.objectContaining({ recipientId: 'user-1', type: 'system' })
      );
      expect(mobileApiClient.post).toHaveBeenNthCalledWith(
        2,
        '/api/notifications/send',
        expect.objectContaining({ recipientId: 'user-2', type: 'system' })
      );
    });

    it('should short-circuit on empty user list', async () => {
      await NotificationService.sendBulkNotification(
        [],
        'No recipients',
        'Body'
      );

      expect(mobileApiClient.post).not.toHaveBeenCalled();
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a local notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce(
        'notification-id'
      );

      const trigger = { seconds: 3600 };
      const identifier = await NotificationService.scheduleLocalNotification(
        'Reminder',
        'Check your job progress',
        trigger,
        { type: 'reminder' }
      );

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Reminder',
          body: 'Check your job progress',
          data: { type: 'reminder' },
          sound: 'default',
        },
        trigger,
      });

      expect(identifier).toBe('notification-id');
    });

    it('should handle Date trigger', async () => {
      const futureDate = new Date(Date.now() + 3600000); // 1 hour from now

      mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce(
        'notification-id'
      );

      await NotificationService.scheduleLocalNotification(
        'Scheduled Reminder',
        'Scheduled message',
        futureDate
      );

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Scheduled Reminder',
          body: 'Scheduled message',
          data: undefined,
          sound: 'default',
        },
        trigger: futureDate,
      });
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications with pagination', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          user_id: 'user-1',
          title: 'Job Update',
          message: 'Your job has been accepted',
          type: 'job',
          action_url: '/jobs/job-1',
          read: false,
          created_at: '2024-01-01T10:00:00Z',
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        range: jest
          .fn()
          .mockResolvedValue({ data: mockNotifications, error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      const result = await NotificationService.getUserNotifications(
        'user-1',
        20,
        0
      );

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Job Update');
      expect(result[0].read).toBe(false);
    });
  });

  describe('markAsRead', () => {
    it('should mark a notification as read via mobileApiClient', async () => {
      mobileApiClient.post.mockResolvedValueOnce({});

      await NotificationService.markAsRead('notif-1');

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/notifications/notif-1/read'
      );
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread notification count', async () => {
      // Real code (2026-05-27 audit-80): supabase
      //   .from('notifications')
      //   .select('*', { count: 'exact', head: true })
      //   .eq('user_id', userId)
      //   .eq('read', false)
      //   .not('type', 'in', '(post_liked,...)')   <- terminal, resolves
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ count: 7, error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      const count = await NotificationService.getUnreadCount('user-1');

      expect(count).toBe(7);
    });

    it('should return 0 on error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({
          count: null,
          error: { message: 'Database error' },
        }),
      };
      supabase.from.mockReturnValue(mockChain);

      const count = await NotificationService.getUnreadCount('user-1');

      expect(count).toBe(0);
    });
  });

  describe('setBadgeCount', () => {
    it('should set app badge count', async () => {
      await NotificationService.setBadgeCount(5);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });
  });

  // Note: notifyJobUpdate, notifyNewMessage, notifyPaymentReceived convenience helpers
  // were removed during the refactor. sendPushNotification with a type param replaces them.

  describe('error handling', () => {
    it('should handle notification initialization errors', async () => {
      mockNotifications.getPermissionsAsync.mockRejectedValueOnce(
        new Error('Permission error')
      );

      const token = await NotificationService.initialize();

      expect(token).toBeNull();
    });

    it('should never throw for push service errors', async () => {
      // Post-2026-04-24 client-side sendPushNotification is a fire-and-
      // forget wrapper over mobileApiClient.post — any server error is
      // logged and swallowed so a single failed push does not abort
      // the caller's flow (e.g., CallNotifier.notifyParticipants).
      mobileApiClient.post.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        NotificationService.sendPushNotification('user-1', 'Test', 'Message')
      ).resolves.toBeUndefined();
    });
  });
});
