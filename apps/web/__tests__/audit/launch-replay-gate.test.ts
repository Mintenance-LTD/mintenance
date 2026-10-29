import { it, expect, vi } from 'vitest';
import {
  COOKIE_CONSENT_KEY,
  COOKIE_CONSENT_EVENT,
} from '@/lib/analytics-consent';
const m = vi.hoisted(() => ({
  init: vi.fn(),
  add: vi.fn(),
  integration: vi.fn(() => ({ name: 'Replay' })),
  stop: vi.fn(),
  start: vi.fn(),
}));
vi.mock('@sentry/nextjs', () => ({
  init: m.init,
  addIntegration: m.add,
  replayIntegration: m.integration,
  getReplay: () => ({ stop: m.stop, start: m.start }),
  captureRouterTransitionStart: vi.fn(),
}));
it('loads no replay until opt-in and stops it on revocation', async () => {
  localStorage.clear();
  vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', 'https://fixture@example.test/1');
  try {
    await import('@/instrumentation-client');
    expect(m.init.mock.calls[0][0].integrations).toEqual([]);
    expect(m.integration).not.toHaveBeenCalled();
    localStorage.setItem(
      COOKIE_CONSENT_KEY,
      JSON.stringify({ version: '2.0', preferences: { analytics: true } })
    );
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
    expect(m.add).toHaveBeenCalledTimes(1);
    localStorage.removeItem(COOKIE_CONSENT_KEY);
    window.dispatchEvent(new Event(COOKIE_CONSENT_EVENT));
    expect(m.stop).toHaveBeenCalledTimes(1);
  } finally {
    vi.unstubAllEnvs();
    localStorage.clear();
  }
});
