import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const state = vi.hoisted(() => ({
  actor: 'contractor',
  kind: 'withdraw',
  completed: false,
  rpc: vi.fn(),
  recover: vi.fn(),
  from: vi.fn(),
}));
const reason = 'The appointment cannot proceed';
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (request: NextRequest, context: unknown) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, { user: { id: state.actor }, params: { id: 'job' } }),
}));
vi.mock('@/lib/services/payment/RefundService', async (importOriginal) => ({
  ...(await importOriginal<
    typeof import('@/lib/services/payment/RefundService')
  >()),
  recoverRefund: state.recover,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: state.rpc, from: state.from },
}));
import { POST as withdraw } from '@/app/api/jobs/[id]/contractor-withdraw/route';
import { POST as terminate } from '@/app/api/jobs/[id]/terminate-contractor/route';
const operation = () => ({
  id: 'exit',
  job_id: 'job',
  actor_id: state.actor,
  kind: state.kind,
  reason,
  state: state.completed ? 'completed' : 'reserved',
});
const refund = {
  id: 'refund',
  escrow_id: 'escrow',
  job_exit_id: 'exit',
  actor_id: 'original-payer',
  gross_minor: 10000,
  cash_minor: 9000,
  credit_minor: 1000,
  payment_intent_id: 'pi_synthetic',
  state: 'reserved',
  provider_refund_id: null,
  created_at: new Date().toISOString(),
  stripe_parameters: {},
};

describe.each([
  {
    name: 'withdrawal',
    route: withdraw,
    actor: 'contractor',
    kind: 'withdraw',
  },
  { name: 'termination', route: terminate, actor: 'owner', kind: 'terminate' },
])('$name durable refund', ({ route, actor, kind }) => {
  beforeEach(() => {
    state.actor = actor;
    state.kind = kind;
    state.completed = false;
    state.rpc
      .mockReset()
      .mockImplementation(async () => ({ data: [operation()], error: null }));
    state.recover.mockReset();
    state.from.mockReset().mockImplementation((table: string) => {
      let count = false;
      const q = {
        select: (_fields: string, options?: { head?: boolean }) => {
          count = !!options?.head;
          return q;
        },
        eq: () => q,
        in: () => q,
        limit: () => q,
        single: async () => ({ data: operation(), error: null }),
        then: (resolve: (value: unknown) => unknown) =>
          Promise.resolve(
            count
              ? { count: 1, error: null }
              : {
                  data: table === 'escrow_refund_operations' ? [refund] : null,
                  error: null,
                }
          ).then(resolve),
      };
      return q;
    });
  });
  function request(key: string | null = 'stable-exit-key') {
    return route(
      new NextRequest('http://localhost/api/jobs/job/exit', {
        method: 'POST',
        headers: key
          ? { 'Idempotency-Key': key, 'Content-Type': 'application/json' }
          : {},
        body: JSON.stringify({ reason }),
      }),
      { params: Promise.resolve({ id: 'job' }) }
    );
  }
  it('returns success only after the durable exit reports completed', async () => {
    state.recover.mockImplementation(async () => {
      state.completed = true;
      return { ...refund, state: 'succeeded' };
    });
    const response = await request();
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      success: true,
      status: 'completed',
      escrowRefunded: true,
    });
    expect(state.rpc).toHaveBeenCalledWith(
      'reserve_job_exit',
      expect.objectContaining({
        p_actor_id: actor,
        p_job_id: 'job',
        p_kind: kind,
        p_reason: reason,
        p_request_key: expect.stringMatching(/^[a-f0-9]{64}$/),
      })
    );
    expect(state.recover).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_id: 'original-payer',
        credit_minor: 1000,
      }),
      expect.any(Number)
    );
    expect(
      state.from.mock.calls.every(([table]) =>
        ['escrow_refund_operations', 'job_exit_operations'].includes(table)
      )
    ).toBe(true);
  });
  it.each(['pending', 'requires_action', 'failed', 'canceled'])(
    'does not report successful exit for refund status %s',
    async (status) => {
      state.recover.mockResolvedValue({ ...refund, state: status });
      const response = await request();
      expect(response.status).toBe(
        ['failed', 'canceled'].includes(status) ? 409 : 202
      );
      expect(await response.json()).toMatchObject({
        success: false,
        operationId: 'exit',
      });
    }
  );
  it('keeps provider uncertainty pending', async () => {
    state.recover.mockRejectedValue(new Error('synthetic timeout'));
    const response = await request();
    expect(response.status).toBe(202);
    expect(await response.json()).toMatchObject({
      success: false,
      status: 'processing',
    });
  });
  it('rejects a request without a stable retry identity before reserving', async () => {
    await expect(request(null)).rejects.toMatchObject({ statusCode: 400 });
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it('honours database ownership denial before refund recovery', async () => {
    state.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
    await expect(request()).rejects.toMatchObject({ statusCode: 403 });
    expect(state.recover).not.toHaveBeenCalled();
  });
  it('recovers an already completed exit without another provider request', async () => {
    state.completed = true;
    expect((await request()).status).toBe(200);
    expect(state.recover).not.toHaveBeenCalled();
  });
});
