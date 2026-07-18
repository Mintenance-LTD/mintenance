import { mobileApiClient } from '../../utils/mobileApiClient';

export async function apiRequest<T>(
  path: string,
  options: {
    method: string;
    body?: Record<string, unknown>;
    // Extra request headers (e.g. an Idempotency-Key for payment routes).
    // Threaded through to mobileApiClient so the same key survives the
    // client's internal retry attempts.
    headers?: Record<string, string>;
  }
): Promise<T> {
  // Only forward a 3rd options arg when there are headers to send — keeps the
  // call arity identical to callers that pass none.
  if (options.method === 'GET') {
    return options.headers
      ? mobileApiClient.get<T>(path, { headers: options.headers })
      : mobileApiClient.get<T>(path);
  }
  return options.headers
    ? mobileApiClient.post<T>(path, options.body, { headers: options.headers })
    : mobileApiClient.post<T>(path, options.body);
}
