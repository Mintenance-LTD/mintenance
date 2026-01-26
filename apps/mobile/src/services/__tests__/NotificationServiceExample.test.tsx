jest.mock('../NotificationService', () => ({
  NotificationService: {
    initialize: jest.fn(() => Promise.resolve('token')),
    savePushToken: jest.fn(() => Promise.resolve()),
    setupNotificationListeners: jest.fn(),
    cleanup: jest.fn(),
    setNavigationRef: jest.fn(),
    getUnreadCount: jest.fn(() => Promise.resolve(0)),
    markAllAsRead: jest.fn(() => Promise.resolve()),
    sendTestNotification: jest.fn(() => Promise.resolve()),
  },
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    },
  },
}));

jest.mock('expo-notifications', () => ({
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
}));

import {
  AppWithNotifications,
  RootNavigatorWithNotifications,
  HomeScreenWithBadgeUpdate,
} from '../NotificationServiceExample';

describe('NotificationServiceExample', () => {
  it('exports example components', () => {
    expect(AppWithNotifications).toBeDefined();
    expect(RootNavigatorWithNotifications).toBeDefined();
    expect(HomeScreenWithBadgeUpdate).toBeDefined();
  });
});
