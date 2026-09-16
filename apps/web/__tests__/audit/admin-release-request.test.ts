import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  readPendingAdminRelease,
  submitAdminRelease,
} from '@/lib/payments/admin-release-request';

describe('admin release browser recovery', () => {
  const request = vi.fn();
  const reason = 'Work reviewed and approved';
  const submit = () =>
    submitAdminRelease('admin', 'escrow', reason, {
      'X-CSRF-Token': 'synthetic',
    });
  beforeEach(() => {
    localStorage.clear();
    request.mockReset();
    vi.stubGlobal('fetch', request);
  });
  afterEach(() => vi.unstubAllGlobals());

  it('preserves the original action across a network failure and a pending response', async () => {
    request.mockRejectedValueOnce(new Error('network interrupted'));
    await expect(submit()).rejects.toThrow('network interrupted');
    const saved = readPendingAdminRelease('admin', 'escrow');
    expect(saved?.reason).toBe(reason);
    request.mockResolvedValueOnce(
      new Response(JSON.stringify({ success: false, status: 'processing' }), {
        status: 202,
      })
    );
    await expect(submit()).rejects.toThrow('not confirmed');
    expect(readPendingAdminRelease('admin', 'escrow')).toEqual(saved);
    for (const [, options] of request.mock.calls) {
      expect(options.headers.get('Idempotency-Key')).toBe(saved?.key);
      expect(options.headers.get('X-CSRF-Token')).toBe('synthetic');
      expect(JSON.parse(options.body)).toEqual({ action: 'release', reason });
    }
    await expect(
      submitAdminRelease('admin', 'escrow', 'A different reason', {})
    ).rejects.toThrow('original release reason');
    expect(request).toHaveBeenCalledTimes(2);
  });

  it('clears the saved action only after a confirmed balanced result', async () => {
    request.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          operationId: 'release',
          amount: 70,
          contractorPayout: 61.6,
          platformFee: 8.4,
        })
      )
    );
    await expect(submit()).resolves.toMatchObject({ success: true });
    expect(readPendingAdminRelease('admin', 'escrow')).toBeNull();
  });

  it('retains the action if a purported success has inconsistent financial totals', async () => {
    request.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: true,
          status: 'completed',
          operationId: 'release',
          amount: 70,
          contractorPayout: 100,
          platformFee: 8.4,
        })
      )
    );
    await expect(submit()).rejects.toThrow('not confirmed');
    expect(readPendingAdminRelease('admin', 'escrow')?.reason).toBe(reason);
  });

  it('does not send an action when browser persistence is unavailable', async () => {
    const storage = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementationOnce(() => {
        throw new Error('storage unavailable');
      });
    await expect(submit()).rejects.toThrow('storage unavailable');
    expect(request).not.toHaveBeenCalled();
    storage.mockRestore();
  });
});
