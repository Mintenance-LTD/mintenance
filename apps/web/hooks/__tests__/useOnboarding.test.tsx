import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useOnboarding } from '../useOnboarding';
const { put } = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: put }));
beforeEach(() => {
  localStorage.clear();
  put.mockReset().mockResolvedValue({ ok: false });
});
it('does not launch a first-visit tour when account progress cannot be read; manual tours still work locally', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  const { result } = renderHook(() =>
    useOnboarding({ userId: 'alice', autoStart: true })
  );
  await waitFor(() => expect(result.current.loaded).toBe(true));
  expect(result.current.isActive).toBe(false);
  await act(async () => {
    await result.current.startOnboarding();
  });
  expect(result.current.isActive).toBe(true);
  await act(async () => {
    await result.current.skip();
  });
  expect(result.current.isActive).toBe(false);
});
it('starts a confirmed first visit and has no irrelevant feature link on the welcome or final step', async () => {
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ progress: [] }) })
  );
  const { result } = renderHook(() =>
    useOnboarding({ userId: 'alice', autoStart: true })
  );
  await waitFor(() => expect(result.current.isActive).toBe(true));
  expect(result.current.currentStep.href).toBeUndefined();
  expect(result.current.flow.steps.at(-1)?.href).toBeUndefined();
});
