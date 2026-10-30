'use client';
import { getCsrfHeaders } from '@/lib/csrf-client';
export async function inspectionRequest<T>(
  url: string,
  body?: unknown,
  signal?: AbortSignal,
  method: 'POST' | 'PATCH' = 'POST'
): Promise<T> {
  const response = await fetch(
    url,
    body === undefined
      ? { signal, cache: 'no-store' }
      : {
          method,
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
          body: JSON.stringify(body),
          signal,
        }
  );
  if (!response.ok) {
    if (response.status === 401)
      throw new Error('Sign in to view this property’s inspection records.');
    if (response.status === 402)
      throw new Error(
        'The property owner needs a Landlord or Agency plan to create records.'
      );
    if (response.status === 404 || response.status === 403)
      throw new Error(
        'These records are unavailable or you no longer have property access.'
      );
    if (response.status === 409)
      throw new Error('This folder changed. Reload the folders before saving.');
    if (response.status === 400)
      throw new Error('Check the dates and selected photos, then try again.');
    throw new Error(
      'Inspection records could not be loaded or saved. Please retry.'
    );
  }
  return response.json() as Promise<T>;
}
