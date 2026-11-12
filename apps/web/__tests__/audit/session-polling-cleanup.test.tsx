import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useSessionMonitor } from '@/hooks/useSessionMonitor';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('cancels rate-limit retries when the monitor unmounts', async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn().mockResolvedValue({ status: 429 });
  vi.stubGlobal('fetch', fetchMock);
  const { unmount } = renderHook(() => useSessionMonitor());
  await act(async () => {
    await Promise.resolve();
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  unmount();
  await act(async () => {
    await vi.advanceTimersByTimeAsync(240_000);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});

it('does not schedule a retry from a request that finishes after disabling polling', async () => {
  vi.useFakeTimers();
  let respond!: (value: { status: number }) => void;
  const fetchMock = vi.fn(
    () =>
      new Promise((resolve) => {
        respond = resolve;
      })
  );
  vi.stubGlobal('fetch', fetchMock);
  const { rerender } = renderHook(
    ({ enabled }) => useSessionMonitor({ enabled }),
    { initialProps: { enabled: true } }
  );
  rerender({ enabled: false });
  await act(async () => {
    respond({ status: 429 });
  });
  await act(async () => {
    await vi.advanceTimersByTimeAsync(240_000);
  });
  expect(fetchMock).toHaveBeenCalledTimes(1);
  expect(vi.getTimerCount()).toBe(0);
});
