import {
  ApiClient,
  RequestOptions,
} from '../../../../../packages/api-client/src/ApiClient';

class TestApiClient extends ApiClient {
  requestForTest<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, options);
  }
}

const jsonResponse = (body: unknown): Response =>
  ({
    ok: true,
    status: 200,
    headers: { get: () => 'application/json' },
    json: jest.fn().mockResolvedValue(body),
  }) as unknown as Response;

describe('shared ApiClient request lifecycle', () => {
  const fetchMock = jest.fn() as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('clears the timeout when fetch rejects', async () => {
    const setTimeoutSpy = jest.spyOn(global, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    fetchMock.mockRejectedValueOnce(new Error('network unavailable'));
    const client = new TestApiClient({
      baseURL: 'https://api.example.test',
      timeout: 5000,
      retries: 0,
    });

    await expect(client.requestForTest('/health')).rejects.toBeDefined();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(setTimeoutSpy).toHaveBeenCalled();
    expect(clearTimeoutSpy).toHaveBeenCalled();
  });

  it('propagates a caller abort into the request controller', async () => {
    let requestSignal: AbortSignal | undefined;
    let resolveFetch!: (response: Response) => void;
    fetchMock.mockImplementationOnce((_input, init) => {
      requestSignal = init?.signal as AbortSignal;
      return new Promise<Response>((resolve) => {
        resolveFetch = resolve;
      });
    });

    const controller = new AbortController();
    const client = new TestApiClient({
      baseURL: 'https://api.example.test',
      timeout: 5000,
      retries: 0,
    });
    const request = client.requestForTest('/health', {
      signal: controller.signal,
    });

    await Promise.resolve();
    expect(requestSignal).toBeDefined();
    expect(requestSignal).not.toBe(controller.signal);

    controller.abort();
    expect(requestSignal?.aborted).toBe(true);

    resolveFetch(jsonResponse({ status: 'ok' }));
    await expect(request).resolves.toEqual({ status: 'ok' });
  });
});
