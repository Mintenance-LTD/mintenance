'use client';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { readTenancyOverlap } from '@mintenance/shared';

export class InspectionRequestError extends Error {
  constructor(
    message: string,
    readonly code?: string,
    readonly details?: unknown
  ) {
    super(message);
  }
}
export function inspectionAuthRequired(error: unknown) {
  return (
    error instanceof InspectionRequestError && error.code === 'AUTH_REQUIRED'
  );
}
export function inspectionLoginHref(returnTo: string) {
  return '/login?redirect=' + encodeURIComponent(returnTo);
}
export function inspectionOverlap(error: unknown) {
  if (
    !(error instanceof InspectionRequestError) ||
    error.code !== 'TENANCY_PERIOD_OVERLAP'
  )
    return null;
  return readTenancyOverlap(error.details);
}
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
    if (response.status === 422 || response.status === 409) {
      const body = await response.json().catch(() => null);
      const failure = body?.error ?? body;
      if (
        typeof failure?.message === 'string' &&
        typeof failure?.code === 'string'
      )
        throw new InspectionRequestError(
          failure.message,
          failure.code,
          failure.details
        );
    }
    if (response.status === 401)
      throw new InspectionRequestError(
        'Your session ended. Sign in to continue.',
        'AUTH_REQUIRED'
      );
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
