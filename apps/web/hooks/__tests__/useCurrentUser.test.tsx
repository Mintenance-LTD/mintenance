import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useCurrentUser } from '../useCurrentUser';
import { fetchCurrentUser } from '@/lib/auth-client';

vi.mock('@mintenance/shared', () => ({ logger: { error: vi.fn() } }));
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

for (const status of [429, 500, 503]) {
  it(`surfaces HTTP ${status} as unavailable instead of unauthenticated`, async () => {
    const readBody = vi.fn();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ status, ok: false, text: readBody })
    );
    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBe('Unable to load current user');
    expect(readBody).not.toHaveBeenCalled();
  });
}

it('surfaces network failure rather than a signed-out state', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  );
  const { result } = renderHook(() => useCurrentUser());
  await waitFor(() =>
    expect(result.current.error).toBe('Unable to load current user')
  );
});

for (const response of [
  { status: 401, ok: false },
  { status: 200, ok: true, json: async () => ({ user: null }) },
]) {
  it(`preserves genuine unauthenticated response HTTP ${response.status}`, async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response));
    const { result } = renderHook(() => useCurrentUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBeNull();
  });
}

it('clears the error after a successful refresh without a new login', async () => {
  const user = { id: 'synthetic-user', role: 'homeowner' };
  const fetchMock = vi
    .fn()
    .mockResolvedValueOnce({ status: 429, ok: false })
    .mockResolvedValueOnce({
      status: 200,
      ok: true,
      json: async () => ({ user }),
    });
  vi.stubGlobal('fetch', fetchMock);
  const { result } = renderHook(() => useCurrentUser());
  await waitFor(() => expect(result.current.error).not.toBeNull());
  act(() => result.current.refresh());
  await waitFor(() => expect(result.current.user).toEqual(user));
  expect(result.current.error).toBeNull();
  expect(fetchMock).toHaveBeenCalledTimes(2);
  expect(fetchMock).toHaveBeenLastCalledWith(
    '/api/auth/session',
    expect.objectContaining({ credentials: 'same-origin', cache: 'no-store' })
  );
});

it('propagates cancellation so callers cannot interpret it as sign-out', async () => {
  const error = new DOMException('Aborted', 'AbortError');
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
  await expect(fetchCurrentUser(new AbortController().signal)).rejects.toBe(
    error
  );
});

it('does not turn invalid session JSON into unauthenticated success', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => {
        throw new SyntaxError('Invalid JSON');
      },
    })
  );
  const { result } = renderHook(() => useCurrentUser());
  await waitFor(() =>
    expect(result.current.error).toBe('Unable to load current user')
  );
});
