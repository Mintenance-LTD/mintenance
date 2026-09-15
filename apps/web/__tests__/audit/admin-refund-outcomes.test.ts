import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  refund: vi.fn(),
  updates: [] as Array<Record<string, unknown>>,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (request: NextRequest, context: unknown) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, { user: { id: 'admin' }, params: { id: 'escrow' } }),
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: vi.fn(),
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { refunds: { create: state.refund } },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: vi.fn() },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        single: async () => ({
          data: {
            id: 'escrow',
            status: 'held',
            amount: 100,
            payment_intent_id: 'pi_synthetic',
            metadata: {},
            jobs: {
              id: 'job',
              homeowner_id: 'payer',
              contractor_id: 'contractor',
              status: 'disputed',
            },
          },
          error: null,
        }),
        maybeSingle: async () => ({ data: { id: 'escrow' }, error: null }),
        update: (values: Record<string, unknown>) => {
          state.updates.push(values);
          return query;
        },
        insert: () => query,
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return query;
    },
  },
}));
import { POST } from '@/app/api/admin/refunds/[id]/route';

describe('Admin refund authoritative outcomes', () => {
  beforeEach(() => {
    state.updates = [];
    state.refund.mockReset();
  });
  const send = () =>
    POST(
      new NextRequest('http://localhost/api/admin/refunds/escrow', {
        method: 'POST',
        body: JSON.stringify({
          action: 'refund',
          reason: 'Synthetic dispute resolution',
        }),
      }),
      { params: Promise.resolve({ id: 'escrow' }) }
    );

  it.each(['pending', 'requires_action', 'failed', 'canceled'])(
    'does not finalize an unconfirmed %s refund',
    async (status) => {
      state.refund.mockResolvedValue({ id: 're_synthetic', status });
      await send().catch(() => undefined);
      expect(state.refund).toHaveBeenCalledTimes(1);
      expect(
        state.updates.filter((value) => value.status === 'refunded')
      ).toEqual([]);
    }
  );

  it('keeps the payment unavailable when provider success may have preceded a timeout', async () => {
    state.refund.mockRejectedValue(
      new Error('Connection lost after provider accepted refund')
    );
    await send().catch(() => undefined);
    expect(state.updates[0]).toMatchObject({ status: 'release_pending' });
    expect(state.updates.filter((value) => value.status === 'held')).toEqual(
      []
    );
  });
});
