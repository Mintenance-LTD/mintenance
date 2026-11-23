import { WinBackService } from '@/lib/services/retention/WinBackService';
import { winBackRecipient } from '@/lib/services/retention/win-back-eligibility';
const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  account: vi.fn(),
  prefs: vi.fn(),
  quiet: vi.fn(),
  send: vi.fn(),
  notify: vi.fn(),
  logError: vi.fn(),
}));
vi.mock('@mintenance/shared', async (importOriginal) => {
  const shared = await importOriginal<typeof import('@mintenance/shared')>();
  return { ...shared, logger: { error: mocks.logError, info: vi.fn(), warn: vi.fn() } };
});
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: mocks.from,
    rpc: mocks.rpc,
    auth: { admin: { getUserById: mocks.account } },
  },
}));
vi.mock('@/lib/email-service', () => ({
  EmailService: { sendEmail: mocks.send },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: mocks.notify },
}));
vi.mock('@/lib/services/notifications/NotificationPreferenceResolver', () => ({
  loadPreferences: mocks.prefs,
  isTypeDisabled: (p: { disabled_types: string[] }, type: string) =>
    p.disabled_types.includes(type),
  nextQuietHoursEndUTC: mocks.quiet,
}));
let profile: Record<string, unknown>;
let emailPrefs: Record<string, unknown>;
let account: Record<string, unknown>;
beforeEach(() => {
  vi.clearAllMocks();
  profile = {
    created_at: '2025-01-01',
    deleted_at: null,
    notification_preferences: { marketingEmails: true },
  };
  emailPrefs = { marketing: true, unsubscribed_all: false };
  account = {
    email: 'verified@example.test',
    email_confirmed_at: '2025-01-01',
    last_sign_in_at: '2025-01-01',
  };
  mocks.from.mockImplementation((table) => {
    const query = {
      select: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      is: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      not: vi.fn().mockReturnThis(),
      contains: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [], error: null }),
      maybeSingle: vi.fn(async () => ({
        data: table === 'profiles' ? profile : emailPrefs,
        error: null,
      })),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({ data: null, error: null }).then(resolve),
    };
    return query;
  });
  mocks.account.mockImplementation(async () => ({
    data: { user: account },
    error: null,
  }));
  mocks.prefs.mockResolvedValue({ email_enabled: true, disabled_types: [] });
  mocks.quiet.mockReturnValue(null);
  mocks.rpc.mockResolvedValue({ data: true, error: null });
  mocks.notify.mockResolvedValue(null);
});
it('treats an empty opt-in list as a successful run without logging an error', async () => {
  await expect(WinBackService.sendWinBackCampaign()).resolves.toEqual({
    sent: 0,
    failed: 0,
  });
  expect(mocks.logError).not.toHaveBeenCalled();
  expect(mocks.send).not.toHaveBeenCalled();
});

it('reports a failed profile lookup to the cron handler', async () => {
  const query = mocks.from.getMockImplementation()!('profiles');
  query.limit.mockResolvedValueOnce({ data: null, error: { message: 'unavailable' } });
  mocks.from.mockReturnValueOnce(query);

  await expect(WinBackService.sendWinBackCampaign()).rejects.toThrow(
    'Win-back profile lookup unavailable'
  );
  expect(mocks.send).not.toHaveBeenCalled();
});

it.each([
  'unsubscribe',
  'marketing opt out',
  'recent sign in',
  'new account',
  'no consent',
  'disabled email',
  'quiet hours',
])('suppresses %s before any delivery claim', async (reason) => {
  if (reason === 'unsubscribe') emailPrefs.unsubscribed_all = true;
  if (reason === 'marketing opt out') emailPrefs.marketing = false;
  if (reason === 'recent sign in')
    account.last_sign_in_at = new Date().toISOString();
  if (reason === 'new account') profile.created_at = new Date().toISOString();
  if (reason === 'no consent') profile.notification_preferences = {};
  if (reason === 'disabled email')
    mocks.prefs.mockResolvedValue({ email_enabled: false });
  if (reason === 'quiet hours') mocks.quiet.mockReturnValue(new Date());
  expect(await winBackRecipient('user')).toBeNull();
  expect(mocks.rpc).not.toHaveBeenCalled();
});
it('uses the verified account recipient', async () =>
  expect(await winBackRecipient('user')).toBe('verified@example.test'));
it.each([false, true])(
  'counts provider acceptance %s independently of muted in-app delivery',
  async (success) => {
    const spy = vi.spyOn(WinBackService, 'getDormantUsers').mockResolvedValue([
      {
        id: 'user',
        email: 'profile@example.test',
        first_name: '<img>',
        role: 'homeowner',
      },
    ]);
    mocks.send.mockResolvedValue(success);
    expect(await WinBackService.sendWinBackCampaign()).toEqual({
      sent: success ? 1 : 0,
      failed: success ? 0 : 1,
    });
    expect(mocks.rpc.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.send.mock.invocationCallOrder[0]
    );
    expect(mocks.send).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'verified@example.test',
        html: expect.stringContaining('&lt;img&gt;'),
      })
    );
    spy.mockRestore();
  }
);
it('does not resend when another worker already claimed the delivery', async () => {
  const spy = vi.spyOn(WinBackService, 'getDormantUsers').mockResolvedValue([
    {
      id: 'user',
      email: 'unused@example.test',
      first_name: 'Test',
      role: 'contractor',
    },
  ]);
  mocks.rpc.mockResolvedValue({ data: false, error: null });
  expect(await WinBackService.sendWinBackCampaign()).toEqual({
    sent: 0,
    failed: 0,
  });
  expect(mocks.send).not.toHaveBeenCalled();
  spy.mockRestore();
});
it('does not count an accepted email as failed when optional in-app delivery throws', async () => {
  const spy = vi.spyOn(WinBackService, 'getDormantUsers').mockResolvedValue([
    {
      id: 'user',
      email: 'unused@example.test',
      first_name: 'Test',
      role: 'contractor',
    },
  ]);
  mocks.send.mockResolvedValue(true);
  mocks.notify.mockRejectedValueOnce(new Error('Notification unavailable'));
  expect(await WinBackService.sendWinBackCampaign()).toEqual({
    sent: 1,
    failed: 0,
  });
  spy.mockRestore();
});
