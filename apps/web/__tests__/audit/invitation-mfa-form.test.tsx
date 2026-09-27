import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import MFAVerifyPage from '@/app/auth/mfa-verify/page';

const m = vi.hoisted(() => ({
  fetch: vi.fn(),
  push: vi.fn(),
  error: vi.fn(),
  success: vi.fn(),
  csrf: vi.fn(),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push }),
  useSearchParams: () =>
    new URLSearchParams({
      token: 'synthetic-pending',
      redirect: '/register/invitation?token=synthetic-invite',
    }),
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: () => m.csrf() }));
vi.mock('react-hot-toast', () => ({
  toast: { error: m.error, success: m.success },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', m.fetch);
  m.csrf.mockResolvedValue('synthetic-csrf');
});
it('uses the shared CSRF contract and preserves the invitation after MFA', async () => {
  m.fetch.mockResolvedValue({
    ok: true,
    json: async () => ({ user: { role: 'homeowner' } }),
  });
  render(<MFAVerifyPage />);
  fireEvent.change(screen.getByLabelText('6-digit code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  await waitFor(() =>
    expect(m.push).toHaveBeenCalledWith(
      '/register/invitation?token=synthetic-invite'
    )
  );
  expect(m.fetch).toHaveBeenCalledWith(
    '/api/auth/mfa/verify',
    expect.objectContaining({
      headers: expect.objectContaining({ 'X-CSRF-Token': 'synthetic-csrf' }),
    })
  );
});
it('shows a structured API error without reporting success or navigating', async () => {
  m.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({ error: { message: 'Verification code expired' } }),
  });
  render(<MFAVerifyPage />);
  fireEvent.change(screen.getByLabelText('6-digit code'), {
    target: { value: '123456' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Verify', exact: true }));
  await waitFor(() =>
    expect(m.error).toHaveBeenCalledWith('Verification code expired')
  );
  expect(m.push).not.toHaveBeenCalled();
  expect(m.success).not.toHaveBeenCalled();
});
