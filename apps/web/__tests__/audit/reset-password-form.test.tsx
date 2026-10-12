import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  csrf: 'synthetic-csrf' as string | null,
  fetch: vi.fn(),
  push: vi.fn(),
}));
vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ csrfToken: m.csrf, loading: false }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: m.push }),
  useSearchParams: () =>
    new URLSearchParams(
      'token=synthetic-recovery-token&refresh_token=synthetic-refresh-token'
    ),
}));
import ResetPasswordPage from '@/app/reset-password/page';
beforeEach(() => {
  m.csrf = 'synthetic-csrf';
  vi.stubGlobal('fetch', m.fetch);
  m.fetch.mockResolvedValue({
    ok: false,
    json: async () => ({
      error: { message: 'Link expired. Request a new one.' },
    }),
  });
});
afterEach(() => vi.unstubAllGlobals());
it('sends the CSRF token and displays structured API errors as useful text', async () => {
  render(<ResetPasswordPage />);
  fireEvent.change(screen.getByLabelText('New password'), {
    target: { value: 'Fresh-Password!7429' },
  });
  fireEvent.change(screen.getByLabelText('Confirm new password'), {
    target: { value: 'Fresh-Password!7429' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Reset password' }));
  await waitFor(() =>
    expect(m.fetch).toHaveBeenCalledWith(
      '/api/auth/reset-password',
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': 'synthetic-csrf',
        },
      })
    )
  );
  expect(
    await screen.findByText('Link expired. Request a new one.')
  ).toBeTruthy();
});
it('does not allow submission without a CSRF token', () => {
  m.csrf = null;
  render(<ResetPasswordPage />);
  expect(screen.getByRole('button', { name: 'Reset password' })).toBeDisabled();
});
