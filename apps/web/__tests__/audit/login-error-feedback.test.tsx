import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }), useSearchParams: () => new URLSearchParams() }));
vi.mock('@/lib/hooks/useCSRF', () => ({ useCSRF: () => ({ csrfToken: 'test-token', loading: false }) }));
import { useLoginSubmit } from '@/app/login/useLoginSubmit';
afterEach(() => vi.unstubAllGlobals());
describe('login API error feedback', () => {
  it.each([
    [400, { error: { code: 'BAD_REQUEST', message: 'Invalid request format' } }, 'Invalid request format'],
    [500, { error: { code: 'INTERNAL_ERROR', message: 'Authentication service error. Please try again.' } }, 'Authentication service error. Please try again.'],
    [401, { error: { message: 'Invalid email or password' } }, 'Invalid email or password'],
    [400, { error: 'Invalid request format' }, 'Invalid request format'],
    [500, { error: { details: {} } }, 'Login failed. Please try again or contact support if the problem persists.'],
    [500, null, 'Login failed. Please try again or contact support if the problem persists.'],
    [429, { error: {} }, 'Too many login attempts. Please wait a few minutes and try again.'],
  ])('renders a readable error for HTTP %s and %j', async (status, payload, expected) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } })));
    const { result } = renderHook(() => useLoginSubmit());
    await act(async () => result.current.onSubmit({ email: 'test@example.com', password: 'example' }));
    expect(result.current.errorMessage).toBe(expected);
    expect(result.current.submitStatus).toBe('error');
  });
});
