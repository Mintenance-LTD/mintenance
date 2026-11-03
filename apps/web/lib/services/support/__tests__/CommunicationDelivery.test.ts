import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  results: [] as unknown[],
  updates: [] as Record<string, unknown>[],
  prefs: vi.fn(),
  notify: vi.fn(),
  fetch: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q: Record<string, unknown> = {};
      for (const name of [
        'select',
        'eq',
        'lt',
        'not',
        'is',
        'order',
        'limit',
        'maybeSingle',
      ])
        q[name] = () => q;
      q.update = (v: Record<string, unknown>) => {
        mocks.updates.push(v);
        return q;
      };
      q.then = (resolve: (v: unknown) => void) =>
        resolve(mocks.results.shift());
      return q;
    },
  },
}));
vi.mock('@/lib/env', () => ({
  env: {
    BREVO_API_KEY: 'test-key',
    EMAIL_FROM: 'noreply@mintenance.co.uk',
    EMAIL_FROM_NAME: 'Mintenance',
  },
}));
vi.mock('@/lib/services/notifications/NotificationPreferenceResolver', () => ({
  loadPreferences: mocks.prefs,
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: mocks.notify },
}));
import {
  drainCustomerCommunications,
  reconcileCustomerEmails,
} from '../CommunicationDelivery';
const row = {
  id: 'delivery-1',
  event_key: 'campaign:test',
  recipient_id: 'user',
  recipient_email: 'customer@example.test',
  channel: 'email',
  subject: 'Update',
  body: '<script>unsafe()</script>',
  attempts: 0,
  action_url: '/support',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.results = [];
  mocks.updates = [];
  mocks.prefs.mockResolvedValue({ email_enabled: true });
  vi.stubGlobal('fetch', mocks.fetch);
});
afterEach(() => vi.unstubAllGlobals());
function queued() {
  mocks.results.push(
    { error: null },
    { data: [row], error: null },
    { data: { id: row.id }, error: null },
    { error: null }
  );
}
describe('customer communication delivery', () => {
  it('escapes HTML and records provider acceptance without claiming delivery', async () => {
    queued();
    mocks.fetch.mockResolvedValue(Response.json({ messageId: 'provider-1' }));
    await drainCustomerCommunications();
    const body = JSON.parse(mocks.fetch.mock.calls[0][1].body);
    expect(body.htmlContent).toContain('&lt;script&gt;');
    expect(body.replyTo.email).toBe('admin@mintenance.co.uk');
    expect(mocks.updates.at(-1)).toMatchObject({
      status: 'accepted',
      provider_id: 'provider-1',
    });
  });
  it('holds ambiguous provider errors for review', async () => {
    queued();
    mocks.fetch.mockRejectedValue(new Error('timeout'));
    await drainCustomerCommunications();
    expect(mocks.updates.at(-1)).toMatchObject({
      status: 'needs_review',
      provider_id: null,
    });
  });
  it('marks an explicit rejection as failed', async () => {
    queued();
    mocks.fetch.mockResolvedValue(new Response('', { status: 400 }));
    await drainCustomerCommunications();
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'failed' });
  });
  it('does not blindly retry a provider 500', async () => {
    queued();
    mocks.fetch.mockResolvedValue(new Response('', { status: 500 }));
    await drainCustomerCommunications();
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'needs_review' });
  });
  it('does not send after another worker claimed the message', async () => {
    mocks.results.push(
      { error: null },
      { data: [row], error: null },
      { data: null, error: null }
    );
    await drainCustomerCommunications();
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
  it('honours announcement preferences', async () => {
    queued();
    mocks.prefs.mockResolvedValue({ email_enabled: false });
    await drainCustomerCommunications();
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.updates.at(-1)?.last_error).toContain('Suppressed');
  });
  it('only records delivery for the exact message and recipient', async () => {
    mocks.results.push(
      { data: [{ ...row, provider_id: 'provider-1' }], error: null },
      { error: null }
    );
    mocks.fetch.mockResolvedValue(
      Response.json({
        events: [
          {
            event: 'delivered',
            messageId: 'different',
            email: row.recipient_email,
          },
        ],
      })
    );
    await reconcileCustomerEmails();
    expect(mocks.updates.at(-1)).not.toHaveProperty('status');
  });
  it('reconciles a matching delivered event', async () => {
    mocks.results.push(
      { data: [{ ...row, provider_id: 'provider-1' }], error: null },
      { error: null }
    );
    mocks.fetch.mockResolvedValue(
      Response.json({
        events: [
          {
            event: 'delivered',
            messageId: 'provider-1',
            email: row.recipient_email,
          },
        ],
      })
    );
    await reconcileCustomerEmails();
    expect(mocks.updates.at(-1)).toMatchObject({ status: 'delivered' });
  });
});
