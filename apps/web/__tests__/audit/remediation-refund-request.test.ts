import { randomUUID } from 'node:crypto';
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { readPendingRefund, submitRefund } from '@/lib/payments/refund-request';
const body = {
  jobId: 'job',
  escrowTransactionId: 'escrow',
  amount: 20,
  reason: 'Changed plans',
};
const success = {
  success: true,
  status: 'succeeded',
  operationId: 'op',
  amount: 20,
  remainingAmount: 80,
  cashAmount: 20,
  creditReturned: 0,
};
const fetchMock = vi.fn();
beforeEach(() => {
  localStorage.clear();
  vi.spyOn(crypto, 'randomUUID').mockImplementation(randomUUID);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => vi.unstubAllGlobals());
describe('durable browser refund requests', () => {
  it('reuses the persisted identity after a lost response and module reload', async () => {
    fetchMock.mockRejectedValueOnce(new Error('offline'));
    await expect(submitRefund('payer', body, 'csrf')).rejects.toThrow(
      'offline'
    );
    const saved = readPendingRefund('payer', 'escrow');
    expect(saved?.body).toEqual(body);
    vi.resetModules();
    const reloaded = await import('@/lib/payments/refund-request');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => success });
    await reloaded.submitRefund('payer', body, 'new-csrf');
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).toBe(
      saved?.key
    );
    expect(readPendingRefund('payer', 'escrow')).toBeNull();
  });
  it('rejects changed payloads while an action is unresolved', async () => {
    fetchMock.mockRejectedValue(new Error('offline'));
    await expect(submitRefund('payer', body, 'csrf')).rejects.toThrow();
    await expect(
      submitRefund('payer', { ...body, amount: 30 }, 'csrf')
    ).rejects.toThrow('previous refund');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
  it('uses a new key for another confirmed action and isolates accounts', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => success });
    await submitRefund('payer', body, 'csrf');
    await submitRefund('payer', body, 'csrf');
    await submitRefund('another-payer', body, 'csrf');
    expect(
      new Set(
        fetchMock.mock.calls.map((call) => call[1].headers['Idempotency-Key'])
      ).size
    ).toBe(3);
  });
  it.each([
    { ok: true, result: { success: true } },
    { ok: false, result: { ...success } },
    { ok: true, result: { ...success, remainingAmount: -1 } },
    { ok: false, result: { status: 'pending', operationId: 'op' } },
  ])(
    'retains identity for unconfirmed or malformed response %#',
    async ({ ok, result }) => {
      fetchMock.mockResolvedValue({ ok, json: async () => result });
      await expect(submitRefund('payer', body, 'csrf')).rejects.toThrow();
      expect(readPendingRefund('payer', 'escrow')).not.toBeNull();
    }
  );
  it('does not send when persistence fails', async () => {
    const spy = vi
      .spyOn(window.localStorage, 'setItem')
      .mockImplementation(() => {
        throw new Error('storage blocked');
      });
    await expect(submitRefund('payer', body, 'csrf')).rejects.toThrow(
      'storage blocked'
    );
    expect(fetchMock).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

describe('admin browser refund requests', () => {
  it('sends the admin contract and retains its key after pending and reload', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: false,
        operationId: 'op',
        status: 'processing',
      }),
    });
    await expect(
      submitRefund('admin:operator', body, 'csrf', true)
    ).rejects.toThrow();
    const saved = readPendingRefund('admin:operator', 'escrow');
    expect(fetchMock.mock.calls[0][0]).toBe('/api/admin/refunds/escrow');
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toEqual({
      action: 'refund',
      reason: body.reason,
      refundAmount: body.amount,
    });
    expect(readPendingRefund('operator', 'escrow')).toBeNull();
    vi.resetModules();
    const reloaded = await import('@/lib/payments/refund-request');
    fetchMock.mockResolvedValueOnce({ ok: true, json: async () => success });
    await reloaded.submitRefund('admin:operator', body, 'new-csrf', true);
    expect(fetchMock.mock.calls[1][1].headers['Idempotency-Key']).toBe(
      saved?.key
    );
    expect(readPendingRefund('admin:operator', 'escrow')).toBeNull();
  });
  it('uses a distinct key for a second identical confirmed partial refund', async () => {
    fetchMock.mockResolvedValue({ ok: true, json: async () => success });
    await submitRefund('admin:operator', body, 'csrf', true);
    await submitRefund('admin:operator', body, 'csrf', true);
    expect(fetchMock.mock.calls[0][1].headers['Idempotency-Key']).not.toBe(
      fetchMock.mock.calls[1][1].headers['Idempotency-Key']
    );
  });
});
