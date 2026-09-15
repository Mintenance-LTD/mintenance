import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  actor: 'contractor',
  refund: vi.fn(),
  writes: [] as Array<{ table: string; values: Record<string, unknown> }>,
  job: {
    id: 'job',
    status: 'assigned',
    contractor_id: 'contractor',
    homeowner_id: 'owner',
    title: 'Repair',
  },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (request: NextRequest, context: unknown) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, { user: { id: state.actor }, params: { id: 'job' } }),
}));
vi.mock('@/lib/security/ownership-validators', () => ({
  requireJobOwnership: async () => state.job,
}));
vi.mock('@/lib/validation/validator', () => ({
  validateRequest: async () => ({
    data: { reason: 'The appointment cannot proceed' },
  }),
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { refunds: { create: state.refund } },
}));
vi.mock('@/lib/services/notifications/NotificationHelper', () => ({
  notifyJobStatusChange: vi.fn(),
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: vi.fn() },
}));
vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: () => 'withdraw-key',
  checkIdempotency: async () => ({
    isDuplicate: false,
    ownership: { userId: state.actor, claimToken: 'claim' },
  }),
  storeIdempotencyResult: vi.fn(),
  releaseIdempotencyClaim: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        limit: () => query,
        single: async () => ({ data: state.job, error: null }),
        maybeSingle: async () => ({
          data: {
            id: 'escrow',
            status: 'held',
            amount: 100,
            payment_intent_id: 'pi_synthetic',
            metadata: {},
          },
          error: null,
        }),
        update: (values: Record<string, unknown>) => {
          state.writes.push({ table, values });
          return query;
        },
        then: (resolve: (result: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(resolve),
      };
      return query;
    },
  },
}));
import { POST as withdraw } from '@/app/api/jobs/[id]/contractor-withdraw/route';
import { POST as terminate } from '@/app/api/jobs/[id]/terminate-contractor/route';

describe.each([
  { name: 'withdrawal', route: withdraw, actor: 'contractor' },
  { name: 'termination', route: terminate, actor: 'owner' },
])('$name unresolved refund', ({ route, actor }) => {
  beforeEach(() => {
    state.actor = actor;
    state.writes = [];
    state.refund.mockReset();
  });
  it('retains the confirmed successful refund path', async () => {
    state.refund.mockResolvedValue({ id: 're_synthetic', status: 'succeeded' });
    const response = await route(
      new NextRequest('http://localhost/api/jobs/job/exit', { method: 'POST' }),
      { params: Promise.resolve({ id: 'job' }) }
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      escrowRefunded: true,
    });
    expect(state.writes).toContainEqual({
      table: 'jobs',
      values: expect.objectContaining({
        status: 'posted',
        contractor_id: null,
      }),
    });
  });
  it.each(['pending', 'requires_action', 'failed', 'canceled'])(
    'does not mark funds refunded or reopen the job for provider status %s',
    async (status) => {
      state.refund.mockResolvedValue({ id: 're_synthetic', status });
      await expect(
        route(
          new NextRequest('http://localhost/api/jobs/job/exit', {
            method: 'POST',
          }),
          { params: Promise.resolve({ id: 'job' }) }
        )
      ).rejects.toMatchObject({ statusCode: 400 });
      expect(state.refund).toHaveBeenCalledTimes(1);
      expect(
        state.writes.filter(
          ({ table, values }) =>
            (table === 'escrow_transactions' && values.status === 'refunded') ||
            (table === 'jobs' && values.status === 'posted')
        )
      ).toEqual([]);
    }
  );
});
