import { NotificationService } from '../../services/NotificationService';

// Mock Expo modules
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

// Mock Supabase with comprehensive chain support  
const createMockChain = (): any => ({
  eq: jest.fn(() => createMockChain()),
  order: jest.fn(() => createMockChain()),
  range: jest.fn(() => createMockChain()),
  single: jest.fn(() => createMockChain()),
  in: jest.fn(() => createMockChain()),
  not: jest.fn(() => createMockChain()),
  select: jest.fn(() => createMockChain()),
  update: jest.fn(() => createMockChain()),
  insert: jest.fn(() => createMockChain()),
});

const mockSupabase = {
  from: jest.fn(() => createMockChain()),
};

jest.mock('../../config/supabase', () => ({
  supabase: mockSupabase,
}));

// Mock fetch
global.fetch = jest.fn();

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDevice.isDevice = true;
  });

  describe('initialize', () => {
    it('should initialize push notifications successfully', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      });

      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: 'ExponentPushToken[test-token]',
      });

      const token = await NotificationService.initialize();

      expect(mockNotifications.setNotificationHandler).toHaveBeenCalled();
      expect(mockNotifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(token).toBe('ExponentPushToken[test-token]');
    });

    it('should request permissions if not already granted', async () => {
      mockNotifications.getPermissionsAsync.mockResolvedValueOnce({
        status: 'undetermined',
      });

      mockNotifications.requestPermissionsAsync.mockResolvedValueOnce({
        status: 'granted',
      });

      mockNotifications.getExpoPushTokenAsync.mockResolvedValueOnce({
        data: 'ExponentPushToken[test-token]',
      });

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
      mockDevice.isDevice = false;

      const token = await NotificationService.initialize();

      expect(token).toBeNull();
    });
  });

  describe('savePushToken', () => {
    it('should save push token to user profile', async () => {
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null,
      });

      await NotificationService.savePushToken('user-1', 'test-token');

      expect(mockSupabase.from).toHaveBeenCalledWith('users');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
        push_token: 'test-token',
      });
    });
  });

  describe('sendNotificationToUser', () => {
    it('should send push notification to user with valid token', async () => {
      const mockUser = {
        push_token: 'ExponentPushToken[user-token]',
        notification_settings: { jobUpdates: true },
      };

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

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

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

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

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [{ status: 'error', details: { error: 'DeviceNotRegistered' } }],
        }),
      });

      // Mock the token removal
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null,
      });

      await NotificationService.sendNotificationToUser(
        'user-1',
        'Test Notification',
        'This is a test message',
        'job'
      );

      // Should attempt to remove invalid token
      expect(mockSupabase.from().update).toHaveBeenCalledWith({
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

      mockSupabase.from().select().in().not.mockResolvedValueOnce({
        data: mockUsers,
        error: null,
      });

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

      mockSupabase.from().select().eq().order().range.mockResolvedValueOnce({
        data: mockNotifications,
        error: null,
      });

      const result = await NotificationService.getUserNotifications('user-1', 20, 0);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe('Job Update');
      expect(result[0].read).toBe(false);
    });
  });

  describe('markNotificationAsRead', () => {
    it('should mark a notification as read', async () => {
      mockSupabase.from().update().eq.mockResolvedValueOnce({
        error: null,
      });

      await NotificationService.markNotificationAsRead('notif-1');

      expect(mockSupabase.from).toHaveBeenCalledWith('notifications');
      expect(mockSupabase.from().update).toHaveBeenCalledWith({ read: true });
    });
  });

  describe('getUnreadNotificationCount', () => {
    it('should return unread notification count', async () => {
      mockSupabase.from().select().eq().eq.mockResolvedValueOnce({
        count: 7,
        error: null,
      });

      const count = await NotificationService.getUnreadNotificationCount('user-1');

      expect(count).toBe(7);
    });

    it('should return 0 on error', async () => {
      mockSupabase.from().select().eq().eq.mockResolvedValueOnce({
        count: null,
        error: { message: 'Database error' },
      });

      const count = await NotificationService.getUnreadNotificationCount('user-1');

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
        notification_settings: { jobUpdates: true, payments: true, messages: true },
      };

      mockSupabase.from().select().eq().single.mockResolvedValue({
        data: mockUser,
        error: null,
      });

      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({ data: [{ status: 'ok' }] }),
      });

      // Test job update notification
      await NotificationService.notifyJobUpdate('contractor-1', 'Kitchen Repair', 'in_progress');

      // Test new message notification
      await NotificationService.notifyNewMessage('user-1', 'John Contractor', 'Kitchen Repair');

      // Test payment notification
      await NotificationService.notifyPaymentReceived('contractor-1', 150.00);

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

      mockSupabase.from().select().eq().single.mockResolvedValueOnce({
        data: mockUser,
        error: null,
      });

      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      // Should not throw
      await expect(
        NotificationService.sendNotificationToUser('user-1', 'Test', 'Message', 'job')
      ).resolves.toBeUndefined();
    });
  });
});