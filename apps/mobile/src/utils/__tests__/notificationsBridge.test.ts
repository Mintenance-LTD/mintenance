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
  AndroidImportance: { DEFAULT: 'default' },
}));

import notificationsBridge from '../notificationsBridge';

describe('notificationsBridge', () => {
  it('exposes notification helpers', () => {
    expect(notificationsBridge).toBeDefined();
    expect(typeof notificationsBridge.getPermissionsAsync).toBe('function');
    expect(typeof notificationsBridge.scheduleNotificationAsync).toBe('function');
  });
});
