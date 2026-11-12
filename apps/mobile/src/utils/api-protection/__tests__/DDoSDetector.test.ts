import { DDoSDetector } from '../DDoSDetector';
import type { ApiRequest } from '../types';

describe('DDoS block timer ownership', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  const request = {
    ipAddress: '192.0.2.1',
    endpoint: '/test',
    userAgent: 'fixture',
  } as ApiRequest;

  it('expires a temporary block after fifteen minutes', async () => {
    const blocked = new Set<string>();
    const detector = new DDoSDetector(
      () => Array(601).fill(request),
      blocked,
      jest.fn()
    );
    expect((await detector.check(request)).allowed).toBe(false);
    expect(blocked.has(request.ipAddress!)).toBe(true);
    jest.advanceTimersByTime(15 * 60 * 1000);
    expect(blocked.has(request.ipAddress!)).toBe(false);
    expect(jest.getTimerCount()).toBe(0);
    detector.dispose();
  });

  it('cancels pending unblock work when the owner is disposed', async () => {
    const blocked = new Set<string>();
    const detector = new DDoSDetector(
      () => Array(601).fill(request),
      blocked,
      jest.fn()
    );
    await detector.check(request);
    expect(jest.getTimerCount()).toBe(1);
    detector.dispose();
    detector.dispose();
    expect(jest.getTimerCount()).toBe(0);
  });
});
