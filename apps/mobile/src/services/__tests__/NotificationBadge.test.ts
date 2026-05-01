/**
 * Push badge count tests.
 *
 * 2026-05-01 audit follow-up (Recommended automated audits #4): the
 * launcher badge count is the primary "you have unread notifications"
 * signal a user sees BEFORE opening the app. Audit 2026-04-30 found
 * the badge was only updated on certain in-app events (foreground
 * receive, tap), so reading notifications on web left the iPhone home-
 * screen badge stale until the next push arrived.
 *
 * The audit fix added:
 *   - Server-side push payloads now include `badge: <unread_count>`
 *     (NotificationPushDispatcher / ExpoPushService).
 *   - Mobile `NotificationService.refreshBadgeFromServer()` exposed
 *     as a public method called on cold start AND on AppState 'active'.
 *
 * These tests pin the expected behaviour so a regression in either
 * surface (silently swallowed errors, off-by-one count, missing setter
 * call) fails CI rather than only being caught by manual device QA.
 *
 * Cast pattern: inline `(X as jest.Mock).method(...)` — matches the
 * existing AuthService.test.ts. Standalone `const x = (Y as jest.Mock)`
 * declarations don't compile under this repo's babel-preset-expo
 * config (chained `as unknown as` casts trip the TS parser).
 */

// Mock all native + side-effect dependencies BEFORE importing the SUT
// so the static class methods don't blow up on import.
jest.mock('expo-notifications', () => ({
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('id-1')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
}));

jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
  },
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../config/sentry', () => ({
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

jest.mock('../notifications/NotificationCRUD', () => ({
  getUserNotifications: jest.fn(),
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  getUnreadCount: jest.fn(),
  saveNotification: jest.fn(),
}));

jest.mock('../notifications/NotificationPreferencesManager', () => ({
  getNotificationPreferences: jest.fn(),
  updateNotificationPreferences: jest.fn(),
}));

jest.mock('../notifications/NotificationDeepLink', () => ({
  handleNotificationResponse: jest.fn(),
  processLastNotificationResponse: jest.fn(),
}));

jest.mock('../notifications/NotificationQueue', () => ({
  queueNotification: jest.fn(),
  processNotificationQueue: jest.fn(),
  loadNotificationQueue: jest.fn(() => Promise.resolve()),
  processQueuedNotifications: jest.fn(() => Promise.resolve()),
  clearAll: jest.fn(() => Promise.resolve()),
}));

jest.mock('../notifications/NotificationPushSender', () => ({
  initializePushNotifications: jest.fn(() => Promise.resolve(null)),
  savePushToken: jest.fn(() => Promise.resolve()),
  sendPushNotification: jest.fn(() => Promise.resolve()),
  sendBulkNotification: jest.fn(() => Promise.resolve()),
}));

import * as Notifications from 'expo-notifications';
import { supabase } from '../../config/supabase';
import * as notificationCrud from '../notifications/NotificationCRUD';
import { logger } from '../../utils/logger';
import { NotificationService } from '../NotificationService';

describe('NotificationService — badge count', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('refreshBadgeFromServer', () => {
    it('clears the badge to 0 when no user is logged in', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: null },
      });

      await NotificationService.refreshBadgeFromServer();

      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledTimes(1);
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledWith(0);
      // Don't ask Supabase for unread when there's no user.
      expect(
        notificationCrud.getUnreadCount as jest.Mock
      ).not.toHaveBeenCalled();
    });

    it('sets the badge to the unread count for a logged-in user', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });
      (notificationCrud.getUnreadCount as jest.Mock).mockResolvedValue(7);

      await NotificationService.refreshBadgeFromServer();

      expect(notificationCrud.getUnreadCount as jest.Mock).toHaveBeenCalledWith(
        'user-1'
      );
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledWith(7);
    });

    it('sets the badge to 0 when the user has zero unread notifications', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });
      (notificationCrud.getUnreadCount as jest.Mock).mockResolvedValue(0);

      await NotificationService.refreshBadgeFromServer();

      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledWith(0);
    });

    it('does not throw if getUser rejects (transient network error)', async () => {
      (supabase.auth.getUser as jest.Mock).mockRejectedValue(
        new Error('network down')
      );

      await expect(
        NotificationService.refreshBadgeFromServer()
      ).resolves.toBeUndefined();
      // Failure path: error is logged, badge is not touched.
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh badge count',
        expect.any(Error)
      );
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).not.toHaveBeenCalled();
    });

    it('does not throw if getUnreadCount rejects (Supabase 5xx)', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });
      (notificationCrud.getUnreadCount as jest.Mock).mockRejectedValue(
        new Error('supabase 503')
      );

      await expect(
        NotificationService.refreshBadgeFromServer()
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh badge count',
        expect.any(Error)
      );
    });

    it('does not throw if setBadgeCountAsync itself rejects', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });
      (notificationCrud.getUnreadCount as jest.Mock).mockResolvedValue(3);
      (Notifications.setBadgeCountAsync as jest.Mock).mockRejectedValueOnce(
        new Error('OS rejected badge set')
      );

      await expect(
        NotificationService.refreshBadgeFromServer()
      ).resolves.toBeUndefined();
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to refresh badge count',
        expect.any(Error)
      );
    });
  });

  describe('setBadgeCount', () => {
    it('passes through to expo-notifications setBadgeCountAsync', async () => {
      await NotificationService.setBadgeCount(12);

      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledTimes(1);
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledWith(12);
    });

    it('accepts 0 (used by mark-all-read flow)', async () => {
      await NotificationService.setBadgeCount(0);

      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledWith(0);
    });
  });

  describe('clearBadge', () => {
    it('always sets the badge to 0', async () => {
      await NotificationService.clearBadge();

      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledTimes(1);
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenCalledWith(0);
    });
  });

  describe('integration with the mark-as-read flow', () => {
    // The mark-as-read pipeline (in-app inbox + web cross-device) drives
    // a badge refresh by calling refreshBadgeFromServer(). These tests
    // verify the refresh observes the post-read count, not the pre-read
    // count.
    it('reflects a decreased unread count after mark-as-read', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValue({
        data: { user: { id: 'user-1' } },
      });

      // First call: 5 unread.
      (notificationCrud.getUnreadCount as jest.Mock).mockResolvedValueOnce(5);
      await NotificationService.refreshBadgeFromServer();
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenLastCalledWith(5);

      // After mark-as-read: 4 unread.
      (notificationCrud.getUnreadCount as jest.Mock).mockResolvedValueOnce(4);
      await NotificationService.refreshBadgeFromServer();
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenLastCalledWith(4);

      // After mark-all-read: 0 unread.
      (notificationCrud.getUnreadCount as jest.Mock).mockResolvedValueOnce(0);
      await NotificationService.refreshBadgeFromServer();
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenLastCalledWith(0);
    });

    it('a logout (user goes from logged-in to null) clears the badge', async () => {
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: { id: 'user-1' } },
      });
      (notificationCrud.getUnreadCount as jest.Mock).mockResolvedValueOnce(3);
      await NotificationService.refreshBadgeFromServer();
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenLastCalledWith(3);

      // Simulate logout — getUser now returns null.
      (supabase.auth.getUser as jest.Mock).mockResolvedValueOnce({
        data: { user: null },
      });
      await NotificationService.refreshBadgeFromServer();
      expect(
        Notifications.setBadgeCountAsync as jest.Mock
      ).toHaveBeenLastCalledWith(0);
    });
  });
});
