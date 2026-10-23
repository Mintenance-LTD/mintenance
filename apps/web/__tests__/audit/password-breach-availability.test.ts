// @vitest-environment node
import { createHash } from 'node:crypto';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { checkPasswordBreach } from '../../../../packages/auth/src/password-security';

vi.mock('@mintenance/shared', () => ({
  logger: { warn: vi.fn(), error: vi.fn() },
}));
const fetchMock = vi.fn();
const password = 'SyntheticOnly-9!';
const hash = createHash('sha1').update(password).digest('hex').toUpperCase();
beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockReset();
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

it('sends only the hash prefix and rejects a known breached password', async () => {
  fetchMock.mockResolvedValue(new Response(`${hash.slice(5)}:42\r\n`));
  await expect(checkPasswordBreach(password)).resolves.toEqual({
    checked: true,
    isBreached: true,
    occurrences: 42,
  });
  expect(fetchMock).toHaveBeenCalledWith(
    `https://api.pwnedpasswords.com/range/${hash.slice(0, 5)}`,
    expect.objectContaining({
      headers: {
        'User-Agent': 'Mintenance-Security-Check',
        'Add-Padding': 'true',
      },
      signal: expect.any(AbortSignal),
    })
  );
});

it('ignores zero-count padding entries', async () => {
  fetchMock.mockResolvedValue(
    new Response(`${hash.slice(5)}:0\r\n${'A'.repeat(35)}:2\r\n`)
  );
  await expect(checkPasswordBreach(password)).resolves.toEqual({
    checked: true,
    isBreached: false,
  });
});

it.each([
  '',
  '<html>upstream unavailable</html>',
  `${hash.slice(5)}:invalid`,
  'A:1',
])('does not accept malformed response %j', async (body) => {
  fetchMock.mockResolvedValue(new Response(body));
  await expect(checkPasswordBreach(password)).resolves.toEqual({
    checked: false,
    isBreached: false,
  });
});

it('does not treat an HTTP failure as a safe password', async () => {
  fetchMock.mockResolvedValue(new Response('', { status: 503 }));
  expect((await checkPasswordBreach(password)).checked).toBe(false);
});

it('does not treat a network failure as a safe password', async () => {
  fetchMock.mockRejectedValue(new Error('offline'));
  expect((await checkPasswordBreach(password)).checked).toBe(false);
});

it('aborts a stalled request after five seconds', async () => {
  vi.useFakeTimers();
  fetchMock.mockImplementation(
    (_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new Error('aborted')));
      })
  );
  const result = checkPasswordBreach(password);
  await vi.advanceTimersByTimeAsync(5000);
  expect((await result).checked).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
