import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  identity: vi.fn(),
  accepted: true,
  update: vi.fn(),
  filters: vi.fn(),
  notify: vi.fn(),
  current: null as null | { user_id: string; invitation_accepted_at: string },
  currentError: null as null | { code: string },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, { user: { id: 'actor', email: 'invited@example.invalid' } }),
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {
    createNotification: (...args: unknown[]) => m.notify(...args),
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    auth: {
      admin: { getUserById: (...args: unknown[]) => m.identity(...args) },
    },
    from: (table: string) => {
      let updated = false;
      let reread = false;
      const result = () => ({
        error: reread ? m.currentError : null,
        data: reread
          ? m.current
          : table === 'properties'
            ? { owner_id: 'owner' }
            : updated
              ? m.accepted
                ? { id: 'tenant' }
                : null
              : {
                  id: 'tenant',
                  property_id: 'property',
                  name: 'Synthetic',
                  email: 'invited@example.invalid',
                  user_id: null,
                  invitation_accepted_at: null,
                },
      });
      const q = {
        select: (columns: string) => {
          reread = columns === 'user_id, invitation_accepted_at';
          return q;
        },
        eq: (...args: unknown[]) => {
          m.filters(...args);
          return q;
        },
        is: (...args: unknown[]) => {
          m.filters(...args);
          return q;
        },
        update: (data: unknown) => {
          updated = true;
          m.update(data);
          return q;
        },
        maybeSingle: async () => result(),
        single: async () => result(),
      };
      return q;
    },
  },
}));
import { POST } from '@/app/api/tenant-invite/accept/route';
const req = () =>
  new NextRequest('http://localhost/api/tenant-invite/accept', {
    method: 'POST',
    body: JSON.stringify({ token: 'test-token' }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.accepted = true;
  m.current = null;
  m.currentError = null;
  m.notify.mockResolvedValue(undefined);
  m.identity.mockResolvedValue({
    data: {
      user: {
        email: 'invited@example.invalid',
        email_confirmed_at: '2026-09-22',
      },
    },
    error: null,
  });
});
it('rejects unverified identity even when session email matches', async () => {
  m.identity.mockResolvedValue({
    data: { user: { email: 'invited@example.invalid' } },
    error: null,
  });
  expect((await POST(req(), { params: Promise.resolve({}) })).status).toBe(403);
  expect(m.update).not.toHaveBeenCalled();
});
it('rejects authoritative email mismatch', async () => {
  m.identity.mockResolvedValue({
    data: {
      user: {
        email: 'different@example.invalid',
        email_confirmed_at: '2026-09-22',
      },
    },
    error: null,
  });
  expect((await POST(req(), { params: Promise.resolve({}) })).status).toBe(403);
});
it('requires an active, unclaimed record and detects a lost acceptance race', async () => {
  m.accepted = false;
  expect((await POST(req(), { params: Promise.resolve({}) })).status).toBe(409);
  expect(m.filters).toHaveBeenCalledWith('is_active', true);
  expect(m.filters).toHaveBeenCalledWith('user_id', null);
  expect(m.filters).toHaveBeenCalledWith('invitation_accepted_at', null);
  expect(m.notify).not.toHaveBeenCalled();
});
it('preserves acceptance success if owner notification fails', async () => {
  m.notify.mockRejectedValue(new Error('offline'));
  expect((await POST(req(), { params: Promise.resolve({}) })).status).toBe(200);
});
it('confirms a concurrent acceptance by the same verified user without notifying twice', async () => {
  m.accepted = false;
  m.current = { user_id: 'actor', invitation_accepted_at: '2026-09-22' };
  expect((await POST(req(), { params: Promise.resolve({}) })).status).toBe(200);
  expect(m.notify).not.toHaveBeenCalled();
});
it('does not confirm another user or an unavailable reconciliation read', async () => {
  m.accepted = false;
  m.current = { user_id: 'other', invitation_accepted_at: '2026-09-22' };
  expect((await POST(req(), { params: Promise.resolve({}) })).status).toBe(409);
  m.currentError = { code: 'unavailable' };
  expect((await POST(req(), { params: Promise.resolve({}) })).status).toBe(503);
});
it.each(['{', 'null', '[]'])(
  'rejects malformed invitation input: %s',
  async (body) => {
    const request = new NextRequest(
      'http://localhost/api/tenant-invite/accept',
      { method: 'POST', body }
    );
    expect((await POST(request, { params: Promise.resolve({}) })).status).toBe(
      400
    );
    expect(m.identity).not.toHaveBeenCalled();
  }
);
