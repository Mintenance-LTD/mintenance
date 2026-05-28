/**
 * NotificationPushSender — lifecycle-critical push plumbing.
 *
 * Audit P1.5 (2026-05-10): none of the push-token / push-send mobile
 * files had unit tests, yet they sit on the chronic `user_push_tokens = 0`
 * production P0 and the 2026-04-21 cross-user-push-phishing security fix.
 * These tests pin:
 *   - savePushToken posts the EXACT endpoint + payload the server zod
 *     schema expects (`/api/user/push-token`, `{ pushToken, platform }`),
 *     derives platform from Platform.OS, and rethrows on failure so the
 *     retry hook can react.
 *   - sendPushNotification routes through the server endpoint (never
 *     touches another user's token), no-ops on missing userId, and
 *     swallows a 403 ("no business relationship") as a warning, not a throw.
 *   - sendBulkNotification no-ops on an empty list and fans out per recipient.
 *   - initializePushNotifications honours promptIfUndetermined=false (never
 *     burns the iOS one-shot dialog) and the non-physical-device guard.
 */

const mockPost = jest.fn();
const mockGet = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../../utils/mobileApiClient', () => ({
  __esModule: true,
  mobileApiClient: {
    post: (...args: unknown[]) => mockPost(...args),
    get: (...args: unknown[]) => mockGet(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));

jest.mock('../../../config/sentry', () => ({
  __esModule: true,
  addBreadcrumb: jest.fn(),
  captureException: jest.fn(),
}));

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();
const mockGetDevicePushTokenAsync = jest.fn();
const mockSetNotificationChannelAsync = jest.fn();
jest.mock('expo-notifications', () => ({
  __esModule: true,
  getPermissionsAsync: (...a: unknown[]) => mockGetPermissionsAsync(...a),
  requestPermissionsAsync: (...a: unknown[]) =>
    mockRequestPermissionsAsync(...a),
  getExpoPushTokenAsync: (...a: unknown[]) => mockGetExpoPushTokenAsync(...a),
  getDevicePushTokenAsync: (...a: unknown[]) =>
    mockGetDevicePushTokenAsync(...a),
  setNotificationChannelAsync: (...a: unknown[]) =>
    mockSetNotificationChannelAsync(...a),
  AndroidImportance: { MAX: 'max', HIGH: 'high', DEFAULT: 'default' },
}));

jest.mock('expo-device', () => ({
  __esModule: true,
  isDevice: true,
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { extra: { eas: { projectId: 'test-project' } } } },
}));

import {
  savePushToken,
  sendPushNotification,
  sendBulkNotification,
  initializePushNotifications,
} from '../NotificationPushSender';

beforeEach(() => {
  jest.clearAllMocks();
  mockPost.mockResolvedValue({ success: true, notificationId: 'n1' });
  mockGetPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockRequestPermissionsAsync.mockResolvedValue({ status: 'granted' });
  mockGetExpoPushTokenAsync.mockResolvedValue({
    data: 'ExponentPushToken[abc]',
  });
});

describe('savePushToken', () => {
  it('POSTs the canonical endpoint + payload with platform from Platform.OS', async () => {
    await savePushToken('user-1', 'ExponentPushToken[abc]');

    expect(mockPost).toHaveBeenCalledWith('/api/user/push-token', {
      pushToken: 'ExponentPushToken[abc]',
      platform: 'ios', // RN mock defaults Platform.OS = 'ios'
    });
  });

  it('rethrows when the POST fails (so the retry hook can react)', async () => {
    mockPost.mockRejectedValueOnce(new Error('network 5xx'));
    await expect(savePushToken('user-1', 'tok')).rejects.toThrow('network 5xx');
  });
});

describe('sendPushNotification', () => {
  it('no-ops (no server call) when userId is missing', async () => {
    await sendPushNotification('', 'Title', 'Body');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('routes through the server send endpoint with the recipient id', async () => {
    await sendPushNotification('recipient-9', 'Hi', 'You have a new bid', {
      jobId: 'job-1',
    });

    expect(mockPost).toHaveBeenCalledWith('/api/notifications/send', {
      recipientId: 'recipient-9',
      type: 'system',
      title: 'Hi',
      body: 'You have a new bid',
      data: { jobId: 'job-1' },
    });
  });

  it('swallows a 403 (no business relationship) without throwing', async () => {
    mockPost.mockRejectedValueOnce(new Error('Request failed with status 403'));
    await expect(
      sendPushNotification('stranger', 'x', 'y')
    ).resolves.toBeUndefined();
  });

  it('swallows non-403 server errors without throwing', async () => {
    mockPost.mockRejectedValueOnce(new Error('500 boom'));
    await expect(
      sendPushNotification('recipient-9', 'x', 'y')
    ).resolves.toBeUndefined();
  });

  it('returns early when the recipient suppressed the push (no throw)', async () => {
    mockPost.mockResolvedValueOnce({ suppressed: true, notificationId: null });
    await expect(
      sendPushNotification('recipient-9', 'x', 'y')
    ).resolves.toBeUndefined();
    expect(mockPost).toHaveBeenCalledTimes(1);
  });
});

describe('sendBulkNotification', () => {
  it('no-ops on an empty recipient list', async () => {
    await sendBulkNotification([], 'Title', 'Body');
    expect(mockPost).not.toHaveBeenCalled();
  });

  it('dispatches once per recipient', async () => {
    await sendBulkNotification(['a', 'b', 'c'], 'Title', 'Body');
    expect(mockPost).toHaveBeenCalledTimes(3);
    expect(mockPost).toHaveBeenCalledWith(
      '/api/notifications/send',
      expect.objectContaining({ recipientId: 'a' })
    );
  });
});

describe('initializePushNotifications', () => {
  it('returns null on a non-physical device without requesting permission', async () => {
    const token = await initializePushNotifications(false);
    expect(token).toBeNull();
    expect(mockGetPermissionsAsync).not.toHaveBeenCalled();
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('never prompts the OS dialog when promptIfUndetermined is false', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    const token = await initializePushNotifications(true, {
      promptIfUndetermined: false,
    });
    expect(token).toBeNull();
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
  });

  it('prompts and returns the token when explicitly allowed and granted', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const token = await initializePushNotifications(true, {
      promptIfUndetermined: true,
    });
    expect(mockRequestPermissionsAsync).toHaveBeenCalledTimes(1);
    expect(token).toBe('ExponentPushToken[abc]');
  });

  it('returns the token without prompting when permission is already granted', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'granted' });
    const token = await initializePushNotifications(true);
    expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
    expect(token).toBe('ExponentPushToken[abc]');
  });

  it('returns null when the user denies at the OS prompt', async () => {
    mockGetPermissionsAsync.mockResolvedValueOnce({ status: 'undetermined' });
    mockRequestPermissionsAsync.mockResolvedValueOnce({ status: 'denied' });
    const token = await initializePushNotifications(true, {
      promptIfUndetermined: true,
    });
    expect(token).toBeNull();
  });
});
