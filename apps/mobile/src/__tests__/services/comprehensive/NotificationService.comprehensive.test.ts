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


jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    ...jest.requireActual('../../services/NotificationService').NotificationService,
    initialize: jest.fn(),
    cleanup: jest.fn(),
  }
}));

import { NotificationService } from '../../services/NotificationService';
import * as Notifications from 'expo-notifications';

jest.mock('expo-notifications');

describe('NotificationService - Comprehensive Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Push Notifications', () => {
    it('should request notification permissions', async () => {
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
        status: 'granted',
        expires: 'never',
        granted: true,
      });

      const result = await NotificationService.requestPermissions();

      expect(result.granted).toBe(true);
      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
    });

    it('should send local notification', async () => {
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('notif_123');

      const notificationId = await NotificationService.sendLocalNotification({
        title: 'New Bid',
        body: 'You have a new bid on your job',
        data: { jobId: 'job_123' },
      });

      expect(notificationId).toBe('notif_123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: {
          title: 'New Bid',
          body: 'You have a new bid on your job',
          data: { jobId: 'job_123' },
        },
        trigger: null,
      });
    });

    it('should schedule notification', async () => {
      const scheduledTime = new Date(Date.now() + 3600000); // 1 hour from now

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('scheduled_123');

      const notificationId = await NotificationService.scheduleNotification({
        title: 'Reminder',
        body: 'Your job starts in 1 hour',
        trigger: scheduledTime,
      });

      expect(notificationId).toBe('scheduled_123');
      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith({
        content: expect.any(Object),
        trigger: scheduledTime,
      });
    });

    it('should cancel scheduled notification', async () => {
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockResolvedValue(undefined);

      await NotificationService.cancelNotification('notif_123');

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith('notif_123');
    });
  });

  describe('In-App Notifications', () => {
    it('should get unread notifications count', async () => {
      const mockNotifications = [
        { id: '1', read: false },
        { id: '2', read: false },
        { id: '3', read: true },
      ];

      (NotificationService.getNotifications as jest.Mock).mockResolvedValue(mockNotifications);

      const count = await NotificationService.getUnreadCount('user_123');

      expect(count).toBe(2);
    });

    it('should mark notification as read', async () => {
      (NotificationService.markAsRead as jest.Mock).mockResolvedValue({ success: true });

      await NotificationService.markAsRead('notif_123');

      expect(NotificationService.markAsRead).toHaveBeenCalledWith('notif_123');
    });

    it('should mark all notifications as read', async () => {
      (NotificationService.markAllAsRead as jest.Mock).mockResolvedValue({ success: true });

      await NotificationService.markAllAsRead('user_123');

      expect(NotificationService.markAllAsRead).toHaveBeenCalledWith('user_123');
    });
  });

  describe('Notification Settings', () => {
    it('should update notification preferences', async () => {
      const preferences = {
        push_enabled: true,
        email_enabled: false,
        sms_enabled: false,
        bid_notifications: true,
        message_notifications: true,
      };

      (NotificationService.updateSettings as jest.Mock).mockResolvedValue(preferences);

      const result = await NotificationService.updateSettings('user_123', preferences);

      expect(result).toEqual(preferences);
    });

    it('should get notification settings', async () => {
      const mockSettings = {
        push_enabled: true,
        email_enabled: true,
        quiet_hours: { start: '22:00', end: '08:00' },
      };

      (NotificationService.getSettings as jest.Mock).mockResolvedValue(mockSettings);

      const settings = await NotificationService.getSettings('user_123');

      expect(settings.quiet_hours).toBeDefined();
    });
  });
});