import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const fetcher = vi.hoisted(() => vi.fn());
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: fetcher }));
import { useMediationRequest } from '@/app/disputes/components/useMediationRequest';
const id = 'fa220922-0000-4000-8000-000000000020';
const other = 'fa220922-0000-4000-8000-000000000021';
const response = (escrowId = id, status = 200) => ({
  ok: status < 300,
  status,
  json: async () => ({
    success: true,
    mediation: {
      escrowId,
      status: 'pending',
      requestedAt: '2026-09-22T12:00:00Z',
      scheduledAt: null,
      completedAt: null,
    },
  }),
});
beforeEach(() => fetcher.mockReset());
it('suppresses same-tick duplicate requests and reports the confirmed state', async () => {
  let finish!: (value: unknown) => void;
  fetcher.mockReturnValue(
    new Promise((resolve) => {
      finish = resolve;
    })
  );
  const updated = vi.fn();
  const { result } = renderHook(() => useMediationRequest(id, updated));
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.request();
    void result.current.request();
  });
  expect(fetcher).toHaveBeenCalledTimes(1);
  await act(async () => {
    finish(response());
    await pending;
  });
  expect(updated).toHaveBeenCalledTimes(1);
  expect(result.current.pending).toBe(false);
});
it.each([202, 500])(
  'keeps an unconfirmed %s response visible and permits retry',
  async (status) => {
    fetcher
      .mockResolvedValueOnce(response(id, status))
      .mockResolvedValueOnce(response());
    const updated = vi.fn();
    const { result } = renderHook(() => useMediationRequest(id, updated));
    await act(() => result.current.request());
    expect(result.current.error).toBeTruthy();
    expect(updated).not.toHaveBeenCalled();
    await act(() => result.current.request());
    expect(result.current.error).toBeNull();
    expect(updated).toHaveBeenCalledTimes(1);
  }
);
it('ignores a response after navigation to a different dispute', async () => {
  let finish!: (value: unknown) => void;
  fetcher
    .mockReturnValueOnce(
      new Promise((resolve) => {
        finish = resolve;
      })
    )
    .mockResolvedValueOnce(response(other));
  const updated = vi.fn();
  const { result, rerender } = renderHook(
    ({ escrowId }) => useMediationRequest(escrowId, updated),
    { initialProps: { escrowId: id } }
  );
  let pending!: Promise<void>;
  act(() => {
    pending = result.current.request();
  });
  rerender({ escrowId: other });
  await act(async () => {
    finish(response());
    await pending;
  });
  expect(updated).not.toHaveBeenCalled();
  await act(() => result.current.request());
  expect(updated).toHaveBeenCalledWith(
    expect.objectContaining({ escrowId: other })
  );
});
it('does not accept confirmation for a different payment', async () => {
  fetcher.mockResolvedValue(response(other));
  const updated = vi.fn();
  const { result } = renderHook(() => useMediationRequest(id, updated));
  await act(() => result.current.request());
  expect(updated).not.toHaveBeenCalled();
  expect(result.current.error).toBeTruthy();
});
