import { NotificationService } from '../../services/NotificationService';

jest.mock('../../config/sentry', () => ({
  addBreadcrumb: jest.fn(),
}));

jest.mock('../../config/supabase', () => ({
  supabase: { from: jest.fn() },
}));

jest.mock('../../utils/notificationsBridge', () => ({
  __esModule: true,
  default: {
    setNotificationHandler: jest.fn(),
    getPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })),
    getExpoPushTokenAsync: jest.fn(async () => ({ data: 'ExponentPushToken[test-token]' })),
    scheduleNotificationAsync: jest.fn(async () => 'id'),
    cancelScheduledNotificationAsync: jest.fn(async () => undefined),
    addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
    setBadgeCountAsync: jest.fn(async () => undefined),
    setNotificationChannelAsync: jest.fn(async () => undefined),
    AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
  },
}));

describe('NotificationService breadcrumbs', () => {
  const sentry = require('../../config/sentry');
  const { supabase } = require('../../config/supabase');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds breadcrumbs when sending to user', async () => {
    const mockChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { push_token: 't', notification_settings: {} }, error: null }),
    };
    const saveChain = { insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: null, error: null }) };
    (supabase.from as jest.Mock)
      .mockReturnValueOnce(mockChain)
      .mockReturnValueOnce(saveChain);

    global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ data: [{ status: 'ok' }] }) }) as any;

    await NotificationService.sendNotificationToUser('u1', 'Hello', 'Msg', 'system');

    expect(sentry.addBreadcrumb).toHaveBeenCalled();
  });
});

