import { afterEach, expect, it, vi } from 'vitest';
import { ApiClient } from '../../../../packages/api-client/src/ApiClient';

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it.each(['application/json', 'text/plain'])(
  'times out a stalled %s body after headers arrive',
  async (contentType) => {
    vi.useFakeTimers();
    const fetchMock = vi.fn(async (_url, options) => {
      const read = () =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError'))
          );
        });
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'content-type': contentType }),
        json: read,
        text: read,
      };
    });
    vi.stubGlobal('fetch', fetchMock);
    const request = new ApiClient({
      baseURL: 'https://test.invalid',
      timeout: 1000,
      retries: 3,
    }).get('/schedule');
    const failed = expect(request).rejects.toThrow('Request timeout');
    await vi.advanceTimersByTimeAsync(1001);
    await failed;
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }
);
