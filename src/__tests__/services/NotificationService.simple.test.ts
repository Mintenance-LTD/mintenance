import { NotificationService } from '../../services/NotificationService';

// Mock only external dependencies - Expo Notifications
const mockNotifications = {
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setBadgeCountAsync: jest.fn(),
};

const mockDevice = {
  isDevice: true,
};

jest.mock('expo-notifications', () => mockNotifications);
jest.mock('expo-device', () => mockDevice);

// Simple Supabase mock
jest.mock('../../config/supabase', () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: { error: jest.fn(), info: jest.fn() },
}));

// Mock fetch for push notifications
global.fetch = jest.fn();

const { supabase } = require('../../config/supabase');

describe('NotificationService - Simple Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('initialize', () => {
    it('should initialize push notifications successfully', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });
      
      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'expo-push-token-123',
      });

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const token = await NotificationService.initialize('user-1');

      expect(mockNotifications.getPermissionsAsync).toHaveBeenCalled();
      expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(token).toBe('expo-push-token-123');
    });

    it('should request permissions if not already granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'undetermined',
      });
      
      mockNotifications.requestPermissionsAsync.mockResolvedValue({
        status: 'granted',
      });

      mockNotifications.getExpoPushTokenAsync.mockResolvedValue({
        data: 'expo-push-token-456',
      });

      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const token = await NotificationService.initialize('user-1');

      expect(mockNotifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(token).toBe('expo-push-token-456');
    });

    it('should return null if permission is denied', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValue({
        status: 'denied',
      });

      const token = await NotificationService.initialize('user-1');

      expect(token).toBeNull();
    });

    it('should return null on non-device platforms', async () => {
      mockDevice.isDevice = false;

      const token = await NotificationService.initialize('user-1');

      expect(token).toBeNull();

      // Reset for other tests
      mockDevice.isDevice = true;
    });
  });

  describe('savePushToken', () => {
    it('should save push token to user profile', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      await NotificationService.savePushToken('user-1', 'expo-token-123');

      expect(supabase.from).toHaveBeenCalledWith('users');
      expect(mockChain.update).toHaveBeenCalledWith({
        push_token: 'expo-token-123',
      });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'user-1');
    });

    it('should handle save errors', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockRejectedValue(new Error('Save failed')),
      };

      supabase.from.mockReturnValue(mockChain);

      await expect(
        NotificationService.savePushToken('user-1', 'token')
      ).rejects.toThrow('Save failed');
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send push notification to user with valid token', async () => {
      const mockUser = {
        id: 'user-1',
        push_token: 'expo-token-123',
        notification_preferences: { push_enabled: true },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { status: 'ok' } }),
      });

      const result = await NotificationService.sendNotificationToUser(
        'user-1',
        'Test Notification',
        'This is a test'
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
      expect(result).toBe(true);
    });

    it('should not send notification if user settings block it', async () => {
      const mockUser = {
        id: 'user-1',
        push_token: 'expo-token-123',
        notification_preferences: { push_enabled: false },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await NotificationService.sendNotificationToUser(
        'user-1',
        'Test Notification',
        'This is a test'
      );

      expect(fetch).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should handle invalid push token', async () => {
      const mockUser = {
        id: 'user-1',
        push_token: null,
        notification_preferences: { push_enabled: true },
      };

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockUser, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await NotificationService.sendNotificationToUser(
        'user-1',
        'Test Notification',
        'This is a test'
      );

      expect(result).toBe(false);
    });
  });

  describe('sendNotificationToUsers', () => {
    it('should send batch notifications to multiple users', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          push_token: 'token-1',
          notification_preferences: { push_enabled: true },
        },
        {
          id: 'user-2',
          push_token: 'token-2',
          notification_preferences: { push_enabled: true },
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockResolvedValue({ data: mockUsers, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ status: 'ok' }, { status: 'ok' }] }),
      });

      const result = await NotificationService.sendNotificationToUsers(
        ['user-1', 'user-2'],
        'Batch Notification',
        'This is a batch test'
      );

      expect(fetch).toHaveBeenCalledWith(
        'https://exp.host/--/api/v2/push/send',
        expect.objectContaining({
          body: expect.stringContaining('Batch Notification'),
        })
      );
      expect(result).toHaveLength(2);
    });
  });

  describe('scheduleLocalNotification', () => {
    it('should schedule a local notification', async () => {
      mockNotifications.scheduleNotificationAsync.mockResolvedValue('notification-id-123');

      const id = await NotificationService.scheduleLocalNotification(
        'Scheduled Notification',
        'This is scheduled',
        new Date(Date.now() + 3600000) // 1 hour from now
      );

      expect(mockNotifications.scheduleNotificationAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          content: expect.objectContaining({
            title: 'Scheduled Notification',
            body: 'This is scheduled',
          }),
        })
      );
      expect(id).toBe('notification-id-123');
    });

    it('should handle scheduling errors', async () => {
      mockNotifications.scheduleNotificationAsync.mockRejectedValue(
        new Error('Schedule failed')
      );

      await expect(
        NotificationService.scheduleLocalNotification(
          'Test',
          'Body',
          new Date(Date.now() + 3600000)
        )
      ).rejects.toThrow('Schedule failed');
    });
  });

  describe('getUnreadNotifications', () => {
    it('should fetch unread notifications for user', async () => {
      const mockNotifications = [
        {
          id: 'notif-1',
          user_id: 'user-1',
          title: 'New Job',
          body: 'You have a new job request',
          read: false,
          created_at: '2024-01-01T00:00:00Z',
        },
      ];

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue({ data: mockNotifications, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const result = await NotificationService.getUnreadNotifications('user-1');

      expect(supabase.from).toHaveBeenCalledWith('notifications');
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('New Job');
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark notification as read', async () => {
      const mockChain = {
        update: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      await NotificationService.markNotificationAsRead('notif-1');

      expect(mockChain.update).toHaveBeenCalledWith({ read: true });
      expect(mockChain.eq).toHaveBeenCalledWith('id', 'notif-1');
    });
  });

  describe('getNotificationCount', () => {
    it('should return unread notification count for user', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ count: 5, error: null }),
      };

      supabase.from.mockReturnValue(mockChain);

      const count = await NotificationService.getNotificationCount('user-1');

      expect(count).toBe(5);
    });

    it('should handle errors gracefully and return 0', async () => {
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockRejectedValue(new Error('Database error')),
      };

      supabase.from.mockReturnValue(mockChain);

      const count = await NotificationService.getNotificationCount('user-1');

      expect(count).toBe(0);
    });
  });
});