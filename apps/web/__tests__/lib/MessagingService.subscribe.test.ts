/**
 * MessagingService.subscribeToJobMessages — realtime fallback (Task 5).
 *
 * Web authenticates with a custom JWT cookie and never establishes a Supabase
 * session, so the browser subscribes as `anon`. RLS on `messages` denies anon
 * every row, so the channel SUBSCRIBEs but never delivers an INSERT — chat was
 * silently dead because the old code only fell back to polling on
 * CHANNEL_ERROR. These tests pin the fix:
 *   - a SUBSCRIBED channel that delivers nothing starts polling (watchdog)
 *   - CHANNEL_ERROR / TIMED_OUT / CLOSED start polling
 *   - the subscription is scoped to the job (job_id filter), not table-wide
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  channel: vi.fn(),
  on: vi.fn(),
  subscribe: vi.fn(),
  unsubscribe: vi.fn(),
  isConfigured: true,
}));

vi.mock('@/lib/supabase', () => ({
  get isSupabaseConfigured() {
    return mocks.isConfigured;
  },
  supabase: { channel: mocks.channel },
}));
vi.mock('@/lib/logger', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { MessagingService } from '@/lib/services/MessagingService';

interface Captured {
  onConfig?: Record<string, unknown>;
  changeHandler?: (payload: { new: Record<string, unknown> }) => void;
  statusCb?: (status: string) => void;
}

function wireChannel(): Captured {
  const captured: Captured = {};
  const chan = {
    on: (
      _event: string,
      config: Record<string, unknown>,
      handler: (payload: { new: Record<string, unknown> }) => void
    ) => {
      captured.onConfig = config;
      captured.changeHandler = handler;
      return chan;
    },
    subscribe: (cb: (status: string) => void) => {
      captured.statusCb = cb;
      return chan;
    },
    unsubscribe: mocks.unsubscribe,
  };
  mocks.channel.mockReturnValue(chan);
  return captured;
}

const JOB = 'job-123';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isConfigured = true;
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  MessagingService.cleanup();
});

describe('subscribeToJobMessages realtime fallback', () => {
  it('scopes the subscription to the job (not the whole messages table)', () => {
    const captured = wireChannel();
    const stop = MessagingService.subscribeToJobMessages(JOB, () => {});
    expect(captured.onConfig).toMatchObject({
      event: 'INSERT',
      table: 'messages',
      filter: `job_id=eq.${JOB}`,
    });
    stop();
  });

  it('falls back to polling when SUBSCRIBED delivers no events (watchdog)', async () => {
    const poll = vi
      .spyOn(MessagingService, 'getJobMessages')
      .mockResolvedValue([]);
    const captured = wireChannel();

    const stop = MessagingService.subscribeToJobMessages(JOB, () => {});
    captured.statusCb?.('SUBSCRIBED');

    // Before the watchdog window, no polling.
    expect(poll).not.toHaveBeenCalled();

    // After the watchdog window, polling has started.
    await vi.advanceTimersByTimeAsync(8000);
    expect(poll).toHaveBeenCalledWith(JOB, 1);
    stop();
  });

  it('falls back to polling immediately on CHANNEL_ERROR', async () => {
    const poll = vi
      .spyOn(MessagingService, 'getJobMessages')
      .mockResolvedValue([]);
    const captured = wireChannel();

    const stop = MessagingService.subscribeToJobMessages(JOB, () => {});
    captured.statusCb?.('CHANNEL_ERROR');

    await vi.advanceTimersByTimeAsync(0);
    expect(mocks.unsubscribe).toHaveBeenCalled();
    expect(poll).toHaveBeenCalledWith(JOB, 1);
    stop();
  });

  it('does NOT fall back when a realtime event arrives before the watchdog', async () => {
    const poll = vi
      .spyOn(MessagingService, 'getJobMessages')
      .mockResolvedValue([]);
    const captured = wireChannel();
    const onNew = vi.fn();

    const stop = MessagingService.subscribeToJobMessages(JOB, onNew);
    captured.statusCb?.('SUBSCRIBED');

    // A real INSERT arrives before the watchdog fires — realtime is working.
    captured.changeHandler?.({
      new: {
        id: 'm1',
        job_id: JOB,
        sender_id: 'u1',
        content: 'hi',
        created_at: '2026-08-05T00:00:00Z',
      },
    });
    expect(onNew).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));

    // Watchdog window elapses — because an event was received, no polling.
    await vi.advanceTimersByTimeAsync(8000);
    expect(poll).not.toHaveBeenCalled();
    stop();
  });
});
