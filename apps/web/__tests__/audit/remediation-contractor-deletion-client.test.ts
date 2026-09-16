import { act, renderHook } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  confirm: vi.fn(),
  refresh: vi.fn(),
  user: {
    id: 'fa360906-0000-4000-8000-000000000001',
    role: 'contractor',
    email: 'audit@example.invalid',
  },
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: mocks.user,
    loading: false,
    refresh: mocks.refresh,
  }),
}));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => mocks.confirm,
}));
vi.mock('react-hot-toast', () => ({
  default: { success: mocks.success, error: mocks.error },
}));
import { useContractorSettingsData } from '@/app/contractor/(dashboard)/settings/useContractorSettingsData';
beforeEach(() => {
  vi.clearAllMocks();
});
it('shows the pending cleanup reference without a success toast after the real handler parses HTTP 202', async () => {
  const fetchMock = vi.spyOn(globalThis, 'fetch');
  fetchMock
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ token: 'synthetic-csrf' }), { status: 200 })
    )
    .mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          success: false,
          status: 'pending',
          requestId: 'fa360906-0000-4000-8000-000000000003',
          message: 'Cleanup is pending',
        }),
        { status: 202 }
      )
    );
  const originalAlert = window.alert;
  const alert = vi.fn();
  window.alert = alert;
  const { result } = renderHook(() => useContractorSettingsData());
  await act(async () => {
    await result.current.handleDeleteAccount();
  });
  expect(alert).toHaveBeenCalledWith(
    expect.stringContaining('Cleanup is pending')
  );
  expect(alert).toHaveBeenCalledWith(
    expect.stringContaining('fa360906-0000-4000-8000-000000000003')
  );
  expect(mocks.success).not.toHaveBeenCalled();
  expect(fetchMock).toHaveBeenLastCalledWith(
    '/api/user/delete-account',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    })
  );
  fetchMock.mockRestore();
  window.alert = originalAlert;
});
