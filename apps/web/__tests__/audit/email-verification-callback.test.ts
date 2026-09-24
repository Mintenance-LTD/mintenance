import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
vi.unmock('next/navigation');
const m = vi.hoisted(() => ({ verify: vi.fn(), update: vi.fn(), eq: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    auth: { verifyOtp: (...args: unknown[]) => m.verify(...args) },
    from: () => ({
      update: (...args: unknown[]) => {
        m.update(...args);
        return { eq: (...args: unknown[]) => m.eq(...args) };
      },
    }),
  },
  createAnonClient: () => ({
    auth: { verifyOtp: (...args: unknown[]) => m.verify(...args) },
  }),
}));
import { GET } from '@/app/auth/callback/route';
beforeEach(() => {
  vi.clearAllMocks();
  m.verify.mockResolvedValue({
    data: {
      user: {
        id: 'confirmed-user',
        email_confirmed_at: '2026-09-24T00:00:00Z',
      },
    },
    error: null,
  });
  m.eq.mockResolvedValue({ error: null });
});
const callback = (query = '') =>
  GET(new NextRequest(`http://localhost/auth/callback${query}`));
it('returns a successful token verification redirect without catching framework redirect exceptions', async () => {
  const response = await callback('?type=signup&token=synthetic-hash');
  const target = new URL(response.headers.get('location')!);
  expect(target.pathname).toBe('/login');
  expect(target.searchParams.get('verified')).toBe('true');
  expect(target.searchParams.has('error')).toBe(false);
  expect(m.eq).toHaveBeenCalledWith('id', 'confirmed-user');
});
it('accepts the documented token_hash parameter', async () => {
  const response = await callback('?type=email&token_hash=synthetic-hash');
  expect(
    new URL(response.headers.get('location')!).searchParams.get('verified')
  ).toBe('true');
  expect(m.verify).toHaveBeenCalledWith({
    token_hash: 'synthetic-hash',
    type: 'email',
  });
});
it('allows default provider redirects to continue to login without claiming proof of verification', async () => {
  const response = await callback();
  expect(response.headers.get('location')).toMatch(/#$/);
  const target = new URL(response.headers.get('location')!);
  expect(target.pathname).toBe('/login');
  expect(target.searchParams.has('error')).toBe(false);
  expect(target.searchParams.has('verified')).toBe(false);
  expect(m.verify).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
});
it('does not claim success after an invalid token or failed profile synchronization', async () => {
  m.verify.mockResolvedValueOnce({
    data: { user: null },
    error: { message: 'Expired' },
  });
  expect(
    new URL(
      (await callback('?type=signup&token=bad')).headers.get('location')!
    ).searchParams.get('error')
  ).toBe('verification_failed');
  m.eq.mockResolvedValueOnce({ error: { message: 'Database unavailable' } });
  expect(
    new URL(
      (await callback('?type=signup&token=valid')).headers.get('location')!
    ).searchParams.get('error')
  ).toBe('verification_sync_failed');
});
it('does not reflect provider error descriptions or tokens into the destination', async () => {
  const response = await callback(
    '?error=denied&error_description=secret-marker&token=private-token'
  );
  expect(response.headers.get('location')).not.toContain('secret-marker');
  expect(response.headers.get('location')).not.toContain('private-token');
});
