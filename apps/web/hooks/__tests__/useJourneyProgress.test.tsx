import { renderHook, act, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { useJourneyProgress } from '../useJourneyProgress';
import { readJourney, writeJourney } from '@/lib/onboarding/journey-state';
const { put } = vi.hoisted(() => ({ put: vi.fn() }));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: put }));
beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ progress: [] }) })
  );
  put.mockReset().mockResolvedValue({ ok: true });
});
it('scopes storage by user and journey', () => {
  writeJourney('alice', 'intro-homeowner', { status: 'completed', step: 4 });
  expect(readJourney('bob', 'intro-homeowner')).toBeNull();
  expect(readJourney('alice', 'guide-homeowner-properties')).toBeNull();
});
it('does not let a slow GET undo a newly completed guide', async () => {
  let resolve!: (value: unknown) => void;
  vi.mocked(fetch).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }) as Promise<Response>
  );
  const { result } = renderHook(() =>
    useJourneyProgress('alice', 'intro-homeowner')
  );
  await act(async () => {
    await result.current.save({ status: 'completed', step: 4 });
  });
  await act(async () =>
    resolve({ ok: true, json: async () => ({ progress: [] }) })
  );
  expect(result.current.progress?.status).toBe('completed');
});
it('retains failed writes and retries instead of falsely acknowledging completion', async () => {
  put.mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
  const { result } = renderHook(() =>
    useJourneyProgress('alice', 'intro-homeowner')
  );
  await waitFor(() => expect(result.current.loaded).toBe(true));
  await act(async () => {
    await result.current.save({ status: 'skipped', step: 1 });
  });
  expect(result.current.progress?.pending).toBe(true);
  expect(result.current.error).toBeTruthy();
  await act(async () => {
    await result.current.retry();
  });
  expect(result.current.progress).toEqual({
    status: 'skipped',
    step: 1,
    pending: false,
  });
  expect(result.current.error).toBeNull();
});
