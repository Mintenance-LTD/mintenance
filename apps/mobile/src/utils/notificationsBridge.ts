import * as Notifications from 'expo-notifications';

// Thin adapter over expo-notifications for easier mocking in tests
export const notificationsBridge = {
  setNotificationHandler: Notifications.setNotificationHandler,
  getPermissionsAsync: Notifications.getPermissionsAsync,
  requestPermissionsAsync: Notifications.requestPermissionsAsync,
  getExpoPushTokenAsync: Notifications.getExpoPushTokenAsync,
  scheduleNotificationAsync: Notifications.scheduleNotificationAsync,
  cancelScheduledNotificationAsync: Notifications.cancelScheduledNotificationAsync,
  addNotificationReceivedListener: Notifications.addNotificationReceivedListener,
  addNotificationResponseReceivedListener:
    Notifications.addNotificationResponseReceivedListener,
  setBadgeCountAsync: (Notifications as unknown).setBadgeCountAsync,
  setNotificationChannelAsync: (Notifications as unknown).setNotificationChannelAsync,
  AndroidImportance: (Notifications as unknown).AndroidImportance,
};

export default notificationsBridge;

