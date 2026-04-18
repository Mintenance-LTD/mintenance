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

      expect(mockNotifications.setNotificationHandler).toHaveBeenCalled();
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

      const token = await NotificationService.initialize();

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
      const { NotificationService: FreshService } = require('../../services/NotificationService');

      const token = await FreshService.initialize();

      expect(token).toBeNull();
      // Should not call any notification methods when not on device
      expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('savePushToken', () => {
    it('should save push token via mobileApiClient', async () => {
      mobileApiClient.post.mockResolvedValueOnce({});

      await NotificationService.savePushToken('user-1', 'test-token');

      expect(mobileApiClient.post).toHaveBeenCalledWith(
        '/api/notifications',
        expect.objectContaining({
          action: 'save_push_token',
          user_id: 'user-1',
          push_token: 'test-token',
        })
      );
    });
  });

  describe('sendPushNotification', () => {
    it('should send push notification to user with valid token', async () => {
      // mobileApiClient.get returns the push token
      mobileApiClient.get.mockResolvedValueOnce({
        push_token: 'ExponentPushToken[user-token]',
      });

      // getNotificationPreferences uses supabase.from('profiles')
      const prefsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_preferences: { pushEnabled: true, jobUpdates: true } },
          error: null,
        }),
      };
      supabase.from.mockReturnValueOnce(prefsChain);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ status: 'ok', id: 'notification-id' }],
        }),
      });

      // saveNotification uses mobileApiClient.post
      mobileApiClient.post.mockResolvedValueOnce({});

      await NotificationService.sendPushNotification(
        'user-1',
        'Test Notification',
        'This is a test message',
        { key: 'value' },
        'job_update'
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining('Test Notification'),
        })
      );
    });

    it('should not send notification if user has no push token', async () => {
      // mobileApiClient.get throws (no token found)
      mobileApiClient.get.mockRejectedValueOnce(new Error('No token'));

      await NotificationService.sendPushNotification(
        'user-1',
        'Test Notification',
        'This is a test message'
      );

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should not send notification if blocked by preferences', async () => {
      mobileApiClient.get.mockResolvedValueOnce({
        push_token: 'ExponentPushToken[user-token]',
      });

      // Return preferences that block job_update
      const prefsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_preferences: { pushEnabled: false } },
          error: null,
        }),
      };
      supabase.from.mockReturnValueOnce(prefsChain);

      await NotificationService.sendPushNotification(
        'user-1',
        'Test Notification',
        'This is a test message',
        {},
        'job_update'
      );

      expect(fetch).not.toHaveBeenCalled();
    });
  });

  describe('sendBulkNotification', () => {
    it('should send notifications to multiple users via sendPushNotification', async () => {
      // Each call to sendPushNotification calls mobileApiClient.get for the token
      mobileApiClient.get
        .mockResolvedValueOnce({ push_token: 'token-1' })
        .mockResolvedValueOnce({ push_token: 'token-2' });

      // Each call fetches preferences from supabase
      const prefsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_preferences: { pushEnabled: true } },
          error: null,
        }),
      };
      supabase.from.mockReturnValue(prefsChain);

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ status: 'ok' }] }),
      });

      // saveNotification calls mobileApiClient.post
      mobileApiClient.post.mockResolvedValue({});

      await NotificationService.sendBulkNotification(
        ['user-1', 'user-2'],
        'Batch Notification',
        'This is a batch message',
        undefined,
        'system'
      );

      // sendBulkNotification delegates to sendPushNotification for each user
      expect(mobileApiClient.get).toHaveBeenCalledTimes(2);
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
        range: jest.fn().mockResolvedValue({ data: mockNotifications, error: null }),
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
      // Real code: supabase.from('notifications').select('*', { count: 'exact', head: true }).eq('user_id', userId).eq('read', false)
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      // The final .eq('read', false) resolves the chain
      let eqCallCount = 0;
      mockChain.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          // Second .eq() call returns the final result
          return Promise.resolve({ count: 7, error: null });
        }
        return mockChain;
      });
      supabase.from.mockReturnValue(mockChain);

      const count = await NotificationService.getUnreadCount('user-1');

      expect(count).toBe(7);
    });

    it('should return 0 on error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
      };
      let eqCallCount = 0;
      mockChain.eq.mockImplementation(() => {
        eqCallCount++;
        if (eqCallCount >= 2) {
          return Promise.resolve({
            count: null,
            error: { message: 'Database error' },
          });
        }
        return mockChain;
      });
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

    it('should handle push service errors by throwing', async () => {
      // mobileApiClient.get returns a valid token
      mobileApiClient.get.mockResolvedValueOnce({
        push_token: 'token',
      });

      // Preferences allow notification
      const prefsChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { notification_preferences: { pushEnabled: true } },
          error: null,
        }),
      };
      supabase.from.mockReturnValueOnce(prefsChain);

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // The real code re-throws fetch errors from sendToExpo
      await expect(
        NotificationService.sendPushNotification(
          'user-1',
          'Test',
          'Message'
        )
      ).rejects.toThrow('Network error');
    });
  });
});
