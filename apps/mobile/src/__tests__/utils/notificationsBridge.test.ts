import * as Notifications from 'expo-notifications';
import notificationsBridge from '../../utils/notificationsBridge';

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  setBadgeCountAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    DEFAULT: 3,
    HIGH: 4,
    LOW: 2,
    MAX: 5,
    MIN: 1,
    NONE: 0,
    UNSPECIFIED: -1000,
  },
}));

describe('notificationsBridge', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Bridge Methods', () => {
    it('should bridge setNotificationHandler', () => {
      const handler = {
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      };

      notificationsBridge.setNotificationHandler(handler);

      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(handler);
      expect(Notifications.setNotificationHandler).toHaveBeenCalledTimes(1);
    });

    it('should bridge getPermissionsAsync', async () => {
      const mockPermissions = {
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: true,
      };

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(mockPermissions);

      const result = await notificationsBridge.getPermissionsAsync();

      expect(Notifications.getPermissionsAsync).toHaveBeenCalled();
      expect(result).toEqual(mockPermissions);
    });

    it('should bridge requestPermissionsAsync', async () => {
      const mockPermissions = {
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: false,
      };

      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue(mockPermissions);

      const result = await notificationsBridge.requestPermissionsAsync();

      expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      expect(result).toEqual(mockPermissions);
    });

    it('should bridge getExpoPushTokenAsync', async () => {
      const mockToken = {
        data: 'ExponentPushToken[xxxxxxxxxxxxx]',
        type: 'expo',
      };

      (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue(mockToken);

      const result = await notificationsBridge.getExpoPushTokenAsync();

      expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalled();
      expect(result).toEqual(mockToken);
    });

    it('should bridge scheduleNotificationAsync', async () => {
      const notificationRequest = {
        content: {
          title: 'Test Notification',
          body: 'This is a test',
          data: { test: true },
        },
        trigger: {
          seconds: 10,
        },
      };

      const mockIdentifier = 'notification-123';
      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue(mockIdentifier);

      const result = await notificationsBridge.scheduleNotificationAsync(notificationRequest);

      expect(Notifications.scheduleNotificationAsync).toHaveBeenCalledWith(notificationRequest);
      expect(result).toEqual(mockIdentifier);
    });

    it('should bridge cancelScheduledNotificationAsync', async () => {
      const notificationId = 'notification-123';

      await notificationsBridge.cancelScheduledNotificationAsync(notificationId);

      expect(Notifications.cancelScheduledNotificationAsync).toHaveBeenCalledWith(notificationId);
    });

    it('should bridge addNotificationReceivedListener', () => {
      const listener = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      (Notifications.addNotificationReceivedListener as jest.Mock).mockReturnValue(mockSubscription);

      const result = notificationsBridge.addNotificationReceivedListener(listener);

      expect(Notifications.addNotificationReceivedListener).toHaveBeenCalledWith(listener);
      expect(result).toEqual(mockSubscription);
    });

    it('should bridge addNotificationResponseReceivedListener', () => {
      const listener = jest.fn();
      const mockSubscription = { remove: jest.fn() };

      (Notifications.addNotificationResponseReceivedListener as jest.Mock).mockReturnValue(
        mockSubscription
      );

      const result = notificationsBridge.addNotificationResponseReceivedListener(listener);

      expect(Notifications.addNotificationResponseReceivedListener).toHaveBeenCalledWith(listener);
      expect(result).toEqual(mockSubscription);
    });

    it('should bridge setBadgeCountAsync', async () => {
      const badgeCount = 5;

      await notificationsBridge.setBadgeCountAsync(badgeCount);

      expect((Notifications as any).setBadgeCountAsync).toHaveBeenCalledWith(badgeCount);
    });

    it('should bridge setNotificationChannelAsync', async () => {
      const channelId = 'default';
      const channelConfig = {
        name: 'Default',
        importance: 3,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      };

      await notificationsBridge.setNotificationChannelAsync(channelId, channelConfig);

      expect((Notifications as any).setNotificationChannelAsync).toHaveBeenCalledWith(
        channelId,
        channelConfig
      );
    });

    it('should expose AndroidImportance enum', () => {
      expect(notificationsBridge.AndroidImportance).toBeDefined();
      expect(notificationsBridge.AndroidImportance.DEFAULT).toBe(3);
      expect(notificationsBridge.AndroidImportance.HIGH).toBe(4);
      expect(notificationsBridge.AndroidImportance.LOW).toBe(2);
      expect(notificationsBridge.AndroidImportance.MAX).toBe(5);
      expect(notificationsBridge.AndroidImportance.MIN).toBe(1);
      expect(notificationsBridge.AndroidImportance.NONE).toBe(0);
      expect(notificationsBridge.AndroidImportance.UNSPECIFIED).toBe(-1000);
    });
  });

  describe('Method Signatures', () => {
    it('should have all expected methods', () => {
      const expectedMethods = [
        'setNotificationHandler',
        'getPermissionsAsync',
        'requestPermissionsAsync',
        'getExpoPushTokenAsync',
        'scheduleNotificationAsync',
        'cancelScheduledNotificationAsync',
        'addNotificationReceivedListener',
        'addNotificationResponseReceivedListener',
        'setBadgeCountAsync',
        'setNotificationChannelAsync',
      ];

      expectedMethods.forEach((method) => {
        expect(notificationsBridge).toHaveProperty(method);
        expect(typeof notificationsBridge[method]).toBe('function');
      });
    });

    it('should have AndroidImportance property', () => {
      expect(notificationsBridge).toHaveProperty('AndroidImportance');
      expect(typeof notificationsBridge.AndroidImportance).toBe('object');
    });
  });

  describe('Default Export', () => {
    it('should export notificationsBridge as default', () => {
      const { default: defaultExport } = require('../../utils/notificationsBridge');
      expect(defaultExport).toBe(notificationsBridge);
    });
  });

  describe('Error Handling', () => {
    it('should propagate errors from getPermissionsAsync', async () => {
      const error = new Error('Permission check failed');
      (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(error);

      await expect(notificationsBridge.getPermissionsAsync()).rejects.toThrow(
        'Permission check failed'
      );
    });

    it('should propagate errors from requestPermissionsAsync', async () => {
      const error = new Error('Permission request failed');
      (Notifications.requestPermissionsAsync as jest.Mock).mockRejectedValue(error);

      await expect(notificationsBridge.requestPermissionsAsync()).rejects.toThrow(
        'Permission request failed'
      );
    });

    it('should propagate errors from getExpoPushTokenAsync', async () => {
      const error = new Error('Token generation failed');
      (Notifications.getExpoPushTokenAsync as jest.Mock).mockRejectedValue(error);

      await expect(notificationsBridge.getExpoPushTokenAsync()).rejects.toThrow(
        'Token generation failed'
      );
    });

    it('should propagate errors from scheduleNotificationAsync', async () => {
      const error = new Error('Scheduling failed');
      (Notifications.scheduleNotificationAsync as jest.Mock).mockRejectedValue(error);

      await expect(
        notificationsBridge.scheduleNotificationAsync({
          content: { title: 'Test' },
          trigger: null,
        })
      ).rejects.toThrow('Scheduling failed');
    });

    it('should propagate errors from cancelScheduledNotificationAsync', async () => {
      const error = new Error('Cancellation failed');
      (Notifications.cancelScheduledNotificationAsync as jest.Mock).mockRejectedValue(error);

      await expect(
        notificationsBridge.cancelScheduledNotificationAsync('notification-123')
      ).rejects.toThrow('Cancellation failed');
    });

    it('should propagate errors from setBadgeCountAsync', async () => {
      const error = new Error('Badge update failed');
      ((Notifications as any).setBadgeCountAsync as jest.Mock).mockRejectedValue(error);

      await expect(notificationsBridge.setBadgeCountAsync(5)).rejects.toThrow(
        'Badge update failed'
      );
    });

    it('should propagate errors from setNotificationChannelAsync', async () => {
      const error = new Error('Channel creation failed');
      ((Notifications as any).setNotificationChannelAsync as jest.Mock).mockRejectedValue(error);

      await expect(
        notificationsBridge.setNotificationChannelAsync('default', { name: 'Default' })
      ).rejects.toThrow('Channel creation failed');
    });
  });

  describe('Function Binding', () => {
    it('should maintain proper this context for all methods', () => {
      // Test that methods are properly bound
      const { setNotificationHandler } = notificationsBridge;
      const handler = {
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      };

      setNotificationHandler(handler);

      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith(handler);
    });

    it('should allow destructured method calls', async () => {
      const { getPermissionsAsync, requestPermissionsAsync } = notificationsBridge;

      const mockPermissions = {
        status: 'granted',
        expires: 'never',
        granted: true,
        canAskAgain: true,
      };

      (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue(mockPermissions);
      (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue(mockPermissions);

      const getResult = await getPermissionsAsync();
      const requestResult = await requestPermissionsAsync();

      expect(getResult).toEqual(mockPermissions);
      expect(requestResult).toEqual(mockPermissions);
    });
  });

  describe('Type Safety', () => {
    it('should accept valid notification handler configuration', () => {
      const validHandler = {
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
        handleSuccess: jest.fn(),
        handleError: jest.fn(),
      };

      expect(() => {
        notificationsBridge.setNotificationHandler(validHandler);
      }).not.toThrow();
    });

    it('should accept valid notification content', async () => {
      const validContent = {
        content: {
          title: 'Title',
          subtitle: 'Subtitle',
          body: 'Body text',
          data: { custom: 'data' },
          sound: true,
          launchImageName: 'launch.png',
          badge: 1,
        },
        trigger: {
          seconds: 30,
          repeats: false,
        },
      };

      (Notifications.scheduleNotificationAsync as jest.Mock).mockResolvedValue('id-123');

      const result = await notificationsBridge.scheduleNotificationAsync(validContent);
      expect(result).toBe('id-123');
    });
  });
});