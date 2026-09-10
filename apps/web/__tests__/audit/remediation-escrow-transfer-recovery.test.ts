// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  create: vi.fn(),
  retrieve: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: m.rpc, from: m.from },
}));
vi.mock('@/lib/stripe', () => ({
  stripe: { transfers: { create: m.create, retrieve: m.retrieve } },
}));
import { createEscrowTransfer } from '@/lib/services/payment/EscrowTransferService';

let attempt: Record<string, any>;
let provider: Map<string, { parameters: string; id: string }>;
let loseResponse: boolean;
let failSave: boolean;
let persisted: string | null;
beforeEach(() => {
  vi.clearAllMocks();
  attempt = {
    created_at: new Date().toISOString(),
    transfer_id: null,
    idempotency_key: 'escrow_release_one',
    stripe_parameters: {
      amount: 43000,
      currency: 'gbp',
      destination: 'acct_one',
      metadata: { escrowTransactionId: 'one' },
    },
  };
  provider = new Map();
  loseResponse = false;
  failSave = false;
  persisted = null;
  m.rpc.mockImplementation(async () => ({
    data: [{ ...attempt, transfer_id: persisted }],
    error: null,
  }));
  m.create.mockImplementation(async (params, { idempotencyKey }) => {
    const prior = provider.get(idempotencyKey);
    if (prior && prior.parameters !== JSON.stringify(params))
      throw new Error('Provider payload mismatch');
    const transfer = prior ?? {
      id: 'tr_one',
      parameters: JSON.stringify(params),
    };
    provider.set(idempotencyKey, transfer);
    if (loseResponse) {
      loseResponse = false;
      throw new Error('Lost provider response');
    }
    return { id: transfer.id };
  });
  m.retrieve.mockResolvedValue({
    id: 'tr_one',
    amount: 43000,
    currency: 'gbp',
    destination: 'acct_one',
    reversed: false,
    amount_reversed: 0,
  });
  m.from.mockImplementation(() => ({
    update: ({ transfer_id }: { transfer_id: string }) => ({
      eq: () => ({
        is: () => ({
          select: async () => {
            if (failSave) {
              failSave = false;
              return { data: null, error: { message: 'DB unavailable' } };
            }
            persisted = transfer_id;
            return { data: [{ escrow_id: 'one' }], error: null };
          },
        }),
      }),
    }),
  }));
});
describe('escrow transfer recovery', () => {
  it('recovers provider success with a lost response without a second transfer', async () => {
    loseResponse = true;
    await expect(
      createEscrowTransfer('one', 43000, 'acct_one')
    ).rejects.toThrow('Lost provider response');
    expect(provider.size).toBe(1);
    await expect(
      createEscrowTransfer('one', 43000, 'acct_one')
    ).resolves.toEqual({ id: 'tr_one' });
    expect(provider.size).toBe(1);
    expect(m.create.mock.calls[0]).toEqual(m.create.mock.calls[1]);
  });
  it('recovers a failed DB completion, then retrieves the recorded transfer on further retries', async () => {
    failSave = true;
    await expect(
      createEscrowTransfer('one', 43000, 'acct_one')
    ).rejects.toThrow('awaiting reconciliation');
    await expect(
      createEscrowTransfer('one', 43000, 'acct_one')
    ).resolves.toEqual({ id: 'tr_one' });
    await expect(
      createEscrowTransfer('one', 43000, 'acct_one')
    ).resolves.toEqual({ id: 'tr_one' });
    expect(provider.size).toBe(1);
    expect(m.create).toHaveBeenCalledTimes(2);
    expect(m.retrieve).toHaveBeenCalledWith('tr_one');
  });
  it('does not execute an old unresolved operation after provider key retention may expire', async () => {
    attempt.created_at = new Date(
      Date.now() - 24 * 60 * 60 * 1000
    ).toISOString();
    await expect(
      createEscrowTransfer('one', 43000, 'acct_one')
    ).rejects.toThrow('requires reconciliation');
    expect(m.create).not.toHaveBeenCalled();
  });
  it('does not treat a reversed transfer as a successful payout', async () => {
    persisted = 'tr_one';
    m.retrieve.mockResolvedValue({
      id: 'tr_one',
      reversed: true,
      amount_reversed: 43000,
    });
    await expect(
      createEscrowTransfer('one', 43000, 'acct_one')
    ).rejects.toThrow('requires reconciliation');
    expect(m.create).not.toHaveBeenCalled();
  });
  it('does not call the provider when the durable reservation fails', async () => {
    m.rpc.mockResolvedValue({
      data: null,
      error: { message: 'changed destination' },
    });
    await expect(
      createEscrowTransfer('one', 43000, 'acct_other')
    ).rejects.toThrow('reserve');
    expect(m.create).not.toHaveBeenCalled();
  });
});
