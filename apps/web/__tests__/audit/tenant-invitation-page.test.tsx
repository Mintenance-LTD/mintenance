import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { TenantInvitation } from '@/app/register/invitation/TenantInvitation';
import { isAllowedRedirect } from '@/lib/utils/safe-redirect';
const m = vi.hoisted(() => ({ fetch: vi.fn(), token: 'test-token' }));
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams({ token: m.token }),
}));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: async () => 'csrf' }));
beforeEach(() => {
  vi.clearAllMocks();
  m.token = 'test-token';
  vi.stubGlobal('fetch', m.fetch);
});
it('keeps an unauthenticated invitation reachable through login', async () => {
  m.fetch.mockResolvedValue({ ok: false, status: 401, json: async () => ({}) });
  render(<TenantInvitation />);
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Sign in with the invited email'
  );
  const login = screen
    .getByRole('link', { name: 'Sign in' })
    .getAttribute('href')!;
  expect(new URL(login, 'http://localhost').searchParams.get('redirect')).toBe(
    '/register/invitation?token=test-token'
  );
});
it('shows verification guidance without false acceptance', async () => {
  m.fetch.mockResolvedValue({ ok: false, status: 403, json: async () => ({}) });
  render(<TenantInvitation />);
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Verify your email'
  );
  expect(screen.queryByText('Invitation accepted.')).toBeNull();
});
it('recovers after an interrupted response and requires confirmed success', async () => {
  m.fetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      success: true,
      property_id: '11111111-1111-4111-8111-111111111111',
    }),
  });
  render(<TenantInvitation />);
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByRole('button', { name: 'Accept invitation' }));
  await waitFor(() =>
    expect(screen.getByRole('link', { name: 'Open property' })).toBeTruthy()
  );
});
it('does not submit incomplete tokens', () => {
  m.token = '';
  render(<TenantInvitation />);
  expect(screen.queryByRole('button')).toBeNull();
  expect(m.fetch).not.toHaveBeenCalled();
});
it('allows only the exact same-origin invitation return path', () => {
  expect(isAllowedRedirect('/register/invitation?token=abc')).toBe(true);
  expect(isAllowedRedirect('/register/invitation-other')).toBe(false);
  expect(isAllowedRedirect('https://example.invalid/register/invitation')).toBe(
    false
  );
});
