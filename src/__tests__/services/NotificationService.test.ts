import { NotificationService } from '../../services/NotificationService';
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';

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

// Mock Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
  },
}));

// Get mocked modules
const mockNotifications = Notifications as jest.Mocked<typeof Notifications>;
const mockDeviceModule = Device as jest.Mocked<typeof Device>;

// Mock logger
jest.mock('../../utils/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock Supabase with simple pattern
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

const { supabase } = require('../../config/supabase');

// Mock fetch
global.fetch = jest.fn();

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
      jest.mocked(Device).isDevice = false;
      
      // Don't set up any mock return values since these methods shouldn't be called
      
      const token = await NotificationService.initialize();

      expect(token).toBeNull();
      // Should not call any notification methods when not on device
      expect(mockNotifications.getPermissionsAsync).not.toHaveBeenCalled();
      expect(mockNotifications.getExpoPushTokenAsync).not.toHaveBeenCalled();
    });
  });

  describe('savePushToken', () => {
    it('should save push token to user profile', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      await NotificationService.savePushToken('user-1', 'test-token');

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockChain.update).toHaveBeenCalledWith({
        push_token: 'test-token',
      });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'user-1');
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send push notification to user with valid token', async () => {
      const mockUser = {
        push_token: 'ExponentPushToken[user-token]',
        notification_settings: { jobUpdates: true },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      };
      
      const saveChain = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
      
      supabase.from
        .mockReturnValueOnce(mockChain)
        .mockReturnValueOnce(saveChain);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ status: 'ok', id: 'notification-id' }],
        }),
      });

      await NotificationService.sendNotificationToUser(
        'user-1',
        'Test Notification',
        'This is a test message',
        'job'
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

    it('should not send notification if user settings block it', async () => {
      const mockUser = {
        push_token: 'ExponentPushToken[user-token]',
        notification_settings: { jobUpdates: false },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: mockUser,
          error: null,
        }),
      };
      supabase.from.mockReturnValue(mockChain);

      await NotificationService.sendNotificationToUser(
        'user-1',
        'Test Notification',
        'This is a test message',
        'job'
      );

      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle invalid push token', async () => {
      const mockUser = {
        push_token: 'ExponentPushToken[invalid-token]',
        notification_settings: { jobUpdates: true },
      };

      const getUserChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      };
      
      const updateTokenChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      
      supabase.from
        .mockReturnValueOnce(getUserChain)
        .mockReturnValueOnce(updateTokenChain);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { status: 'error', details: { error: 'DeviceNotRegistered' } },
          ],
        }),
      });

      await NotificationService.sendNotificationToUser(
        'user-1',
        'Test Notification',
        'This is a test message',
        'job'
      );

      // Should attempt to remove invalid token
      expect(updateTokenChain.update).toHaveBeenCalledWith({
        push_token: null,
      });
    });
  });

  describe('sendNotificationToUsers', () => {
    it('should send batch notifications to multiple users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          push_token: 'token-1',
          notification_settings: { jobUpdates: true },
        },
        {
          id: 'user-2',
          push_token: 'token-2',
          notification_settings: { jobUpdates: true },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        not: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            { status: 'ok', id: 'notif-1' },
            { status: 'ok', id: 'notif-2' },
          ],
        }),
      });

      await NotificationService.sendNotificationToUsers(
        ['user-1', 'user-2'],
        'Batch Notification',
        'This is a batch message',
        'system'
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          body: expect.stringContaining('Batch Notification'),
        })
      );
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a local notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValueOnce(
        'notification-id'
      );

      const identifier = await NotificationService.scheduleLocalNotification(
        'Reminder',
        'Check your job progress',
        3600, // 1 hour
        { type: 'reminder' }
      );

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'Reminder',
          body: 'Check your job progress',
          data: { type: 'reminder' },
          sound: 'default',
        },
        trigger: { seconds: 3600 },
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

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      await NotificationService.markNotificationAsRead('notif-1');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(mockChain.update).toHaveBeenCalledWith({ read: true });
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return unread notification count', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((column: string, value: any) => {
          if (column === 'read') {
            return mockChain;
          }
          return {
            eq: jest.fn().mockResolvedValue({ count: 7, error: null }),
          };
        }),
      };
      supabase.from.mockReturnValue(mockChain);

      const count =
        await NotificationService.getUnreadNotificationCount('user-1');

      expect(count).toBe(7);
    });

    it('should return 0 on error', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn((column: string, value: any) => {
          if (column === 'read') {
            return mockChain;
          }
          return {
            eq: jest.fn().mockResolvedValue({
              count: null,
              error: { message: 'Database error' },
            }),
          };
        }),
      };
      supabase.from.mockReturnValue(mockChain);

      const count =
        await NotificationService.getUnreadNotificationCount('user-1');

      expect(count).toBe(0);
    });
  });

  describe('setBadgeCount', () => {
    it('should set app badge count', async () => {
      await NotificationService.setBadgeCount(5);

      expect(mockNotifications.setBadgeCountAsync).toHaveBeenCalledWith(5);
    });
  });

  describe('helper methods', () => {
    it('should provide quick notification methods', async () => {
      const mockUser = {
        push_token: 'token',
        notification_settings: {
          jobUpdates: true,
          payments: true,
          messages: true,
        },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ status: 'ok' }] }),
      });

      // Test job update notification
      await NotificationService.notifyJobUpdate(
        'contractor-1',
        'Kitchen Repair',
        'in_progress'
      );

      // Test new message notification
      await NotificationService.notifyNewMessage(
        'user-1',
        'John Contractor',
        'Kitchen Repair'
      );

      // Test payment notification
      await NotificationService.notifyPaymentReceived('contractor-1', 150.0);

      expect(fetch).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling', () => {
    it('should handle notification initialization errors', async () => {
      mockNotifications.getPermissionsAsync.mockRejectedValueOnce(
        new Error('Permission error')
      );

      const token = await NotificationService.initialize();

      expect(token).toBeNull();
    });

    it('should handle push service errors gracefully', async () => {
      const mockUser = {
        push_token: 'token',
        notification_settings: { jobUpdates: true },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      };
      supabase.from.mockReturnValue(mockChain);

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        NotificationService.sendNotificationToUser(
          'user-1',
          'Test',
          'Message',
          'job'
        )
      ).resolves.toBeUndefined();
    });
  });
});
