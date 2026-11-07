// @vitest-environment node
const state = vi.hoisted(() => ({
  tables: {} as Record<string, Record<string, unknown>[]>,
  failTable: '',
  send: vi.fn(),
  account: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', async () => {
  const { notificationDatabase } =
    await import('@/lib/services/notifications/__tests__/notificationDatabaseFixture');
  return {
    serverSupabase: {
      ...notificationDatabase(state),
      auth: { admin: { getUserById: state.account } },
    },
  };
});
vi.mock('@mintenance/shared', () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));
vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_APP_URL: 'https://mintenance.example' },
}));
vi.mock('@/lib/email-service', () => ({
  EmailService: { sendEmailWithOutcome: state.send },
}));
import { QuoteAmendmentEmailService } from '@/lib/services/notifications/QuoteAmendmentEmailService';
import {
  quoteAmendmentTemplate,
  type QuoteAmendmentEmailAction,
} from '@/lib/email-templates/quote-amendment';

const job = '00000000-0000-4000-8000-000000000004';
const outbox = () => state.tables.quote_amendment_email_outbox[0];
const due = () => {
  outbox().scheduled_for = new Date(Date.now() - 1).toISOString();
};
const run = () => QuoteAmendmentEmailService.process();
beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-07T12:00:00Z'));
  state.failTable = '';
  state.send.mockResolvedValue('sent');
  state.account.mockResolvedValue({
    data: {
      user: {
        email: 'verified@example.test',
        email_confirmed_at: '2026-01-01',
      },
    },
    error: null,
  });
  state.tables = {
    quote_amendments: [
      {
        id: 'amendment',
        job_id: job,
        version: 1,
        status: 'published',
        customer_id: 'payer',
        contractor_id: 'contractor',
      },
    ],
    jobs: [
      {
        id: job,
        homeowner_id: 'owner',
        payer_user_id: 'payer',
        contractor_id: 'contractor',
      },
    ],
    quote_amendment_email_outbox: [
      {
        amendment_id: 'amendment',
        version: 1,
        job_id: job,
        user_id: 'payer',
        action: 'publish',
        status: 'pending',
        attempts: 0,
        scheduled_for: '2026-11-07T11:00:00Z',
      },
    ],
    profiles: [
      { id: 'payer', email: 'untrusted@example.test', deleted_at: null },
    ],
    email_preferences: [],
    user_notification_preferences: [],
    notification_queue: [{ id: 'push-already-delivered', status: 'sent' }],
  };
});
afterEach(() => vi.useRealTimers());

it('leases once across competing workers, sends to the current verified payer and leaves push untouched', async () => {
  await Promise.all([run(), run()]);
  await run();
  expect(state.send).toHaveBeenCalledTimes(1);
  expect(state.account).toHaveBeenCalledWith('payer');
  expect(state.send).toHaveBeenCalledWith(
    expect.objectContaining({
      to: 'verified@example.test',
      timeoutMs: 8000,
      text: expect.stringContaining(`/jobs/${job}/amendments`),
    })
  );
  expect(outbox()).toMatchObject({
    status: 'sent',
    attempts: 1,
    sent_at: expect.any(String),
  });
  expect(state.tables.notification_queue).toEqual([
    { id: 'push-already-delivered', status: 'sent' },
  ]);
});
it.each([
  ['approve', 'approved', 'contractor'],
  ['reject', 'rejected', 'contractor'],
  ['withdraw', 'withdrawn', 'payer'],
  ['apply', 'applied', 'payer'],
])(
  'delivers %s to the correct participant',
  async (action, status, recipient) => {
    Object.assign(outbox(), { action, user_id: recipient });
    state.tables.quote_amendments[0].status = status;
    state.tables.profiles = [{ id: recipient, deleted_at: null }];
    await run();
    expect(state.account).toHaveBeenCalledWith(recipient);
    expect(outbox().status).toBe('sent');
  }
);
it.each(['version', 'payer', 'contractor', 'missing'])(
  'cancels stale %s before resolving email',
  async (change) => {
    if (change === 'version') state.tables.quote_amendments[0].version = 2;
    if (change === 'payer') state.tables.jobs[0].payer_user_id = 'someone-else';
    if (change === 'contractor')
      state.tables.jobs[0].contractor_id = 'someone-else';
    if (change === 'missing') state.tables.quote_amendments = [];
    await run();
    expect(outbox().status).toBe('cancelled');
    expect(state.account).not.toHaveBeenCalled();
    expect(state.send).not.toHaveBeenCalled();
  }
);
it.each(['email', 'type', 'unsubscribe', 'category'])(
  'honours %s opt-out',
  async (setting) => {
    if (setting === 'email' || setting === 'type')
      state.tables.user_notification_preferences = [
        {
          user_id: 'payer',
          email_enabled: setting !== 'email',
          disabled_types: setting === 'type' ? ['quote_amendment_update'] : [],
        },
      ];
    if (setting === 'unsubscribe')
      state.tables.email_preferences = [
        { user_id: 'payer', unsubscribed_all: true },
      ];
    if (setting === 'category')
      state.tables.email_preferences = [
        { user_id: 'payer', bid_notifications: false },
      ];
    await run();
    expect(outbox().status).toBe('cancelled');
    expect(state.send).not.toHaveBeenCalled();
  }
);
it('email remains independent of disabled push and inbox channels', async () => {
  state.tables.user_notification_preferences = [
    {
      user_id: 'payer',
      email_enabled: true,
      push_enabled: false,
      in_app_enabled: false,
    },
  ];
  await run();
  expect(outbox().status).toBe('sent');
});
it('defers quiet hours without consuming an attempt', async () => {
  state.tables.user_notification_preferences = [
    {
      user_id: 'payer',
      email_enabled: true,
      quiet_hours_start: '11:00',
      quiet_hours_end: '13:00',
      timezone: 'UTC',
    },
  ];
  await run();
  expect(outbox()).toMatchObject({
    status: 'pending',
    attempts: 0,
    scheduled_for: '2026-11-07T13:00:00.000Z',
  });
  expect(state.send).not.toHaveBeenCalled();
});
it.each(['unverified', 'deleted', 'banned', 'missing-profile'])(
  'suppresses %s recipient',
  async (kind) => {
    if (kind === 'unverified')
      state.account.mockResolvedValue({
        data: { user: { email: 'unverified@example.test' } },
      });
    if (kind === 'banned')
      state.account.mockResolvedValue({
        data: {
          user: {
            email: 'banned@example.test',
            email_confirmed_at: '2026-01-01',
            banned_until: '2027-01-01',
          },
        },
      });
    if (kind === 'deleted') state.tables.profiles[0].deleted_at = '2026-11-07';
    if (kind === 'missing-profile') state.tables.profiles = [];
    await run();
    expect(outbox().status).toBe('cancelled');
    expect(state.send).not.toHaveBeenCalled();
  }
);
it.each([
  'quote_amendments',
  'jobs',
  'profiles',
  'user_notification_preferences',
  'email_preferences',
])('fails closed and safely recovers %s read errors', async (table) => {
  state.failTable = table;
  expect((await run()).emailErrors).toBe(1);
  expect(state.send).not.toHaveBeenCalled();
  expect(outbox()).toMatchObject({ status: 'pending', attempts: 1 });
  state.failTable = '';
  due();
  await run();
  expect(outbox().status).toBe('sent');
});
it('retries auth lookup errors without sending to the profile email', async () => {
  state.account.mockResolvedValue({ data: null, error: new Error('offline') });
  await run();
  expect(outbox()).toMatchObject({ status: 'pending', attempts: 1 });
  expect(state.send).not.toHaveBeenCalled();
});
it('bounds safe provider retries and never resends a terminal failure', async () => {
  state.send.mockResolvedValue('retryable');
  for (let i = 0; i < 6; i++) {
    due();
    await run();
  }
  expect(outbox()).toMatchObject({ status: 'failed', attempts: 6 });
  due();
  await run();
  expect(state.send).toHaveBeenCalledTimes(6);
});
it('rechecks preferences when retrying a refused send', async () => {
  state.send.mockResolvedValueOnce('retryable');
  await run();
  state.tables.email_preferences = [
    { user_id: 'payer', unsubscribed_all: true },
  ];
  due();
  await run();
  expect(outbox().status).toBe('cancelled');
  expect(state.send).toHaveBeenCalledTimes(1);
});
it.each(['unknown', 'failed'])(
  'does not auto-resend a provider %s outcome',
  async (outcome) => {
    state.send.mockResolvedValue(outcome);
    const result = await run();
    expect(outbox().status).toBe(
      outcome === 'unknown' ? 'needs_review' : 'failed'
    );
    expect(
      result[outcome === 'unknown' ? 'emailNeedsReview' : 'emailErrors']
    ).toBe(1);
    due();
    await run();
    expect(state.send).toHaveBeenCalledTimes(1);
  }
);
it('recovers an expired sending lease to review, never a duplicate send', async () => {
  outbox().status = 'sending';
  expect((await run()).emailNeedsReview).toBe(1);
  expect(outbox().status).toBe('needs_review');
  expect(state.send).not.toHaveBeenCalled();
});
it('requires a durable sending checkpoint before the provider call', async () => {
  state.account.mockImplementation(async () => {
    state.failTable = 'quote_amendment_email_outbox';
    return {
      data: {
        user: {
          email: 'verified@example.test',
          email_confirmed_at: '2026-01-01',
        },
      },
    };
  });
  await run();
  expect(state.send).not.toHaveBeenCalled();
});
it('a failed acknowledgement after acceptance is reviewed without resending', async () => {
  state.send.mockImplementation(async () => {
    state.failTable = 'quote_amendment_email_outbox';
    return 'sent';
  });
  expect((await run()).emailErrors).toBe(1);
  expect(outbox().status).toBe('sending');
  state.failTable = '';
  due();
  expect((await run()).emailNeedsReview).toBe(1);
  expect(state.send).toHaveBeenCalledTimes(1);
});
it('reports queue read failure', async () => {
  state.failTable = 'quote_amendment_email_outbox';
  expect((await run()).emailErrors).toBe(1);
  expect(state.send).not.toHaveBeenCalled();
});
it.each([
  'publish',
  'approve',
  'reject',
  'withdraw',
  'apply',
] as QuoteAmendmentEmailAction[])(
  'renders %s with safe review links and no approval action',
  (action) => {
    const template = quoteAmendmentTemplate(action, job, job);
    expect(template.html).toContain(
      `https://mintenance.example/jobs/${job}/amendments`
    );
    expect(template.text).toContain('does not approve or apply');
    expect(template.html).toContain('category=bid_notifications');
    expect(template.text).not.toMatch(
      /PRIVATE NOTE|untrusted@example|£|\?action=/
    );
  }
);
it('rejects injected job paths and actions', () => {
  expect(() => quoteAmendmentTemplate('publish', '../../evil')).toThrow();
  expect(() =>
    quoteAmendmentTemplate('constructor' as QuoteAmendmentEmailAction, job)
  ).toThrow();
  expect(
    quoteAmendmentTemplate('publish', job, '"><img>shoot')
  ).not.toHaveProperty('unsubscribe');
  expect(
    quoteAmendmentTemplate('publish', job, '"><img>shoot').html
  ).not.toContain('<img>shoot');
});
