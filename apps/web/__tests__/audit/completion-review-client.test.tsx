import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  csrf: vi.fn(),
  success: vi.fn(),
  error: vi.fn(),
}));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: mocks.csrf }));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));
import { useCompletionReview } from '@/app/homeowner/escrow/approve/components/useCompletionReview';
const data = {
  escrowId: 'escrow',
  jobTitle: 'Synthetic repair',
  amount: 500,
  completedAt: '2026-09-15T10:00:00.123456Z',
  homeownerApproval: false,
  inspectionCompleted: false,
  canReview: true,
  autoApprovalDate: null,
  beforePhotos: [{ url: '/before' }],
  afterPhotos: [{ url: '/after' }],
};
const response = (body: unknown, ok = true) => ({ ok, json: async () => body });
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.get);
  mocks.get.mockResolvedValue(response({ success: true, data }));
  mocks.csrf.mockResolvedValue(response({ success: true }));
});
afterEach(() => vi.unstubAllGlobals());
const show = async () => {
  const hook = renderHook(() => useCompletionReview('escrow'));
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

it.each(['handleApprove', 'handleReject', 'handleMarkInspection'] as const)(
  'uses the CSRF helper and displayed version for %s',
  async (action) => {
    const hook = await show();
    act(() => hook.result.current.setRejectionReason('Please repair the seal'));
    await act(async () => {
      await hook.result.current[action]();
    });
    expect(mocks.csrf).toHaveBeenCalledTimes(1);
    const options = mocks.csrf.mock.calls[0][1];
    expect(options.method).toBe('POST');
    expect(JSON.parse(options.body)).toMatchObject({
      completedAt: data.completedAt,
    });
    expect(mocks.get.mock.calls.every(([, options]) => !options?.method)).toBe(
      true
    );
  }
);
it('preserves rejection text and shows structured errors without false success', async () => {
  const hook = await show();
  act(() => hook.result.current.setRejectionReason('Please repair the seal'));
  mocks.csrf.mockResolvedValue(
    response({ error: { message: 'Completion changed. Refresh.' } }, false)
  );
  await act(async () => {
    await hook.result.current.handleReject();
  });
  expect(mocks.error).toHaveBeenCalledWith('Completion changed. Refresh.');
  expect(mocks.success).not.toHaveBeenCalled();
  expect(hook.result.current.rejectionReason).toBe('Please repair the seal');
});
it('does not mark inspection complete on an unconfirmed HTTP 200', async () => {
  const hook = await show();
  mocks.csrf.mockResolvedValue(response({}));
  await act(async () => {
    await hook.result.current.handleMarkInspection();
  });
  expect(hook.result.current.inspectionCompleted).toBe(false);
  expect(mocks.error).toHaveBeenCalled();
});
it('restores persisted inspection and blocks actions for a read-only participant', async () => {
  mocks.get.mockResolvedValue(
    response({
      success: true,
      data: { ...data, inspectionCompleted: true, canReview: false },
    })
  );
  const hook = await show();
  expect(hook.result.current.inspectionCompleted).toBe(true);
  await act(async () => {
    await hook.result.current.handleApprove();
  });
  expect(mocks.csrf).not.toHaveBeenCalled();
});
it('exposes a retryable load failure instead of presenting missing data as success', async () => {
  mocks.get.mockRejectedValueOnce(new Error('Offline'));
  const hook = await show();
  expect(hook.result.current.loadError).toBe('Offline');
  expect(hook.result.current.approvalData).toBeNull();
  await act(async () => {
    await hook.result.current.retry();
  });
  expect(hook.result.current.loadError).toBeNull();
  expect(hook.result.current.approvalData?.jobTitle).toBe('Synthetic repair');
});
