import { describe, it, expect, vi, beforeEach } from 'vitest';
const state = vi.hoisted(() => ({
  sent: vi.fn(),
  filters: vi.fn(),
  claim: true,
  updates: [] as Record<string, unknown>[],
}));
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_name: string, fn: Function) => fn,
}));
vi.mock('@/lib/email-service', () => ({
  EmailService: { sendEmail: state.sent },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: async () => ({ data: 1, error: null }),
    from: (table: string) => {
      const q: any = {
        select: () => q,
        lt: () => q,
        eq: (...args: unknown[]) => {
          state.filters(...args);
          return q;
        },
        is: () => q,
        not: (...args: unknown[]) => {
          state.filters(...args);
          return q;
        },
        limit: async () => ({
          data: [{ id: 'task', admin_id: 'admin', dispute_id: 'dispute' }],
          error: null,
        }),
        update: (value: Record<string, unknown>) => {
          state.updates.push(value);
          return q;
        },
        maybeSingle: async () => ({
          data:
            table === 'profiles'
              ? { email: 'admin@example.test' }
              : state.claim
                ? { id: 'task' }
                : null,
          error: null,
        }),
        then: (resolve: Function) => resolve({ data: null, error: null }),
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/cron/admin-dispute-assignments/route';
describe('dispute assignment email delivery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.claim = true;
    state.updates = [];
    state.sent.mockResolvedValue(true);
  });
  it('sends a branded canonical admin link only after claiming an assigned open task', async () => {
    await (GET as Function)();
    expect(state.filters).toHaveBeenCalledWith('admin_id', 'is', null);
    expect(state.sent).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'admin@example.test',
        html: expect.stringContaining(
          'https://www.mintenance.co.uk/admin/disputes'
        ),
      })
    );
    expect(state.updates).toContainEqual({ email_status: 'sent' });
  });
  it('does not send a second email if another worker claimed the task', async () => {
    state.claim = false;
    await (GET as Function)();
    expect(state.sent).not.toHaveBeenCalled();
  });
  it('records failed email delivery for review rather than claiming it was sent', async () => {
    state.sent.mockResolvedValue(false);
    await (GET as Function)();
    expect(state.updates).toContainEqual({ email_status: 'needs_review' });
  });
});
