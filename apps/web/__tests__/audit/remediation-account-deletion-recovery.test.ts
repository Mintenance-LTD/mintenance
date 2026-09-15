import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  deleteUser: vi.fn(),
  getUserById: vi.fn(),
  retrieve: vi.fn(),
  cancel: vi.fn(),
  statuses: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: mocks.rpc,
    auth: {
      admin: { deleteUser: mocks.deleteUser, getUserById: mocks.getUserById },
    },
    from: () => ({ select: () => ({ eq: mocks.statuses }) }),
  },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { subscriptions: { retrieve: mocks.retrieve, cancel: mocks.cancel } },
}));
import {
  runAccountDeletionCleanup,
  getAccountDeletionStatus,
} from '@/lib/services/account/AccountDeletionRecoveryService';
import { readAccountDeletionOutcome } from '@/lib/account-deletion-outcome';
const userId = 'fa360906-0000-4000-8000-000000000001';
const step = {
  id: 'fa360906-0000-4000-8000-000000000002',
  operation_id: 'fa360906-0000-4000-8000-000000000003',
  user_id: userId,
  lease_token: 'fa360906-0000-4000-8000-000000000004',
  kind: 'stripe_subscription',
  resource_id: 'sub_audit',
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.rpc.mockImplementation(async (name: string) =>
    name === 'claim_account_cleanup_step'
      ? { data: step, error: null }
      : { error: null }
  );
  mocks.retrieve.mockResolvedValue({
    id: 'sub_audit',
    metadata: { userId },
    status: 'active',
  });
  mocks.cancel.mockResolvedValue({ id: 'sub_audit', status: 'canceled' });
  mocks.deleteUser.mockResolvedValue({
    data: { user: { id: userId } },
    error: null,
  });
});
const run = () => runAccountDeletionCleanup({ maxSteps: 1 });
const expectOutcome = (outcome: string) =>
  expect(mocks.rpc).toHaveBeenLastCalledWith('finish_account_cleanup_step', {
    p_step_id: step.id,
    p_lease_token: step.lease_token,
    p_outcome: outcome,
  });
describe('durable deletion cleanup', () => {
  it('confirms empty deletion responses with a fresh absence check and retries ambiguous checks', async () => {
    mocks.rpc.mockImplementation(async (name: string) =>
      name === 'claim_account_cleanup_step'
        ? {
            data: { ...step, kind: 'auth_user', resource_id: userId },
            error: null,
          }
        : { error: null }
    );
    mocks.deleteUser.mockResolvedValue({ data: { user: {} }, error: null });
    mocks.getUserById.mockResolvedValue({ error: { code: 'user_not_found' } });
    expect(await run()).toMatchObject({ completed: 1 });
    expect(mocks.getUserById).toHaveBeenCalledWith(userId);
    mocks.getUserById.mockResolvedValue({ error: { status: 500 } });
    expect(await run()).toMatchObject({ retried: 1 });
    mocks.getUserById.mockResolvedValue({
      data: { user: { id: userId } },
      error: null,
    });
    expect(await run()).toMatchObject({ retried: 1 });
  });
  it('verifies provider ownership, cancels, then acknowledges the frozen step', async () => {
    expect(await run()).toMatchObject({ completed: 1 });
    expect(mocks.cancel).toHaveBeenCalledWith(
      'sub_audit',
      {},
      { timeout: 10000, maxNetworkRetries: 0 }
    );
    expectOutcome('completed');
  });
  it.each(['userId', 'homeownerId', 'contractorId'])(
    'supports the implemented %s owner metadata',
    async (key) => {
      mocks.retrieve.mockResolvedValue({
        id: 'sub_audit',
        metadata: { [key]: userId },
        status: 'active',
      });
      await run();
      expectOutcome('completed');
    }
  );
  it.each([
    {},
    { userId: 'another-user' },
    { userId, contractorId: 'another-user' },
  ])(
    'refuses cancellation with ambiguous/unrelated ownership %j',
    async (metadata) => {
      mocks.retrieve.mockResolvedValue({
        id: 'sub_audit',
        metadata,
        status: 'active',
      });
      expect(await run()).toMatchObject({ needsReview: 1 });
      expect(mocks.cancel).not.toHaveBeenCalled();
      expectOutcome('needs_review');
    }
  );
  it('recovers an already-canceled subscription after a lost outcome write', async () => {
    mocks.rpc.mockImplementation(async (name) =>
      name === 'claim_account_cleanup_step'
        ? { data: step, error: null }
        : { error: { code: '40001' } }
    );
    await expect(run()).rejects.toThrow('persist');
    mocks.rpc.mockImplementation(async (name) =>
      name === 'claim_account_cleanup_step'
        ? { data: step, error: null }
        : { error: null }
    );
    mocks.retrieve.mockResolvedValue({
      id: 'sub_audit',
      metadata: { userId },
      status: 'canceled',
    });
    await run();
    expect(mocks.cancel).toHaveBeenCalledTimes(1);
    expectOutcome('completed');
  });
  it('keeps an unconfirmed cancellation pending', async () => {
    mocks.cancel.mockResolvedValue({ id: 'sub_audit', status: 'active' });
    expect(await run()).toMatchObject({ retried: 1 });
    expectOutcome('retry');
  });
  it('retries provider outages', async () => {
    mocks.retrieve.mockRejectedValue(new Error('offline'));
    await run();
    expectOutcome('retry');
  });
  it('only treats a provider-confirmed missing resource as complete', async () => {
    mocks.retrieve.mockRejectedValue({
      code: 'resource_missing',
      statusCode: 404,
    });
    await run();
    expectOutcome('completed');
    mocks.retrieve.mockRejectedValue({ statusCode: 404 });
    await run();
    expectOutcome('retry');
    expect(mocks.cancel).not.toHaveBeenCalled();
  });
  it('recovers missing credentials but retries auth provider failure', async () => {
    mocks.rpc.mockImplementation(async (name) =>
      name === 'claim_account_cleanup_step'
        ? {
            data: { ...step, kind: 'auth_user', resource_id: userId },
            error: null,
          }
        : { error: null }
    );
    await run();
    expectOutcome('completed');
    mocks.deleteUser.mockResolvedValue({ error: { code: 'user_not_found' } });
    await run();
    expectOutcome('completed');
    mocks.deleteUser.mockResolvedValue({ error: { status: 500 } });
    await run();
    expectOutcome('retry');
  });
  it('never performs provider work when the database claim fails', async () => {
    mocks.rpc.mockResolvedValue({ error: { code: 'offline' } });
    await expect(run()).rejects.toThrow('claim');
    expect(mocks.cancel).not.toHaveBeenCalled();
    expect(mocks.deleteUser).not.toHaveBeenCalled();
  });
  it('requires all durable steps to be completed before reporting completion', async () => {
    mocks.statuses.mockResolvedValue({
      data: [{ status: 'completed' }, { status: 'pending' }],
      error: null,
    });
    expect(await getAccountDeletionStatus(step.operation_id)).toBe('pending');
    mocks.statuses.mockResolvedValue({
      data: [{ status: 'needs_review' }],
      error: null,
    });
    expect(await getAccountDeletionStatus(step.operation_id)).toBe(
      'needs_review'
    );
    mocks.statuses.mockResolvedValue({ data: [], error: null });
    await expect(getAccountDeletionStatus(step.operation_id)).rejects.toThrow(
      'confirm'
    );
  });
});
describe('deletion response UI contract', () => {
  it('distinguishes pending cleanup from completed deletion', () => {
    expect(
      readAccountDeletionOutcome(
        {
          status: 'pending',
          success: false,
          requestId: step.operation_id,
          message: 'Still processing',
        },
        202
      ).completed
    ).toBe(false);
    expect(
      readAccountDeletionOutcome(
        {
          status: 'completed',
          success: true,
          requestId: step.operation_id,
          message: 'Deleted',
        },
        200
      ).completed
    ).toBe(true);
  });
  it.each([
    { status: 'pending', success: true },
    { status: 'completed', success: false },
    {},
  ])('rejects contradictory or incomplete results %j', (body) => {
    expect(() =>
      readAccountDeletionOutcome(
        { requestId: step.operation_id, message: 'Result', ...body },
        202
      )
    ).toThrow();
  });
});
