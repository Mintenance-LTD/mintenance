import { mobileApiClient } from '../../utils/mobileApiClient';

export async function apiRequest<T>(
  path: string,
  options: { method: string; body?: Record<string, unknown> }
): Promise<T> {
  if (options.method === 'GET') {
    return mobileApiClient.get<T>(path);
  }
  return mobileApiClient.post<T>(path, options.body);
}
