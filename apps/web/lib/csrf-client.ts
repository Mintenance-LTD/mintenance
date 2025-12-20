/**
 * Client-side CSRF token management
 * Fetches and manages CSRF tokens for client-side API requests
 */

import { logger } from '@mintenance/shared';

let cachedToken: string | null = null;
let tokenExpiry: number | null = null;

/**
 * Fetch a new CSRF token from the API
 */
async function fetchCSRFToken(): Promise<string> {
  try {
    const response = await fetch('/api/csrf', {
      method: 'GET',
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch CSRF token: ${response.status}`);
    }

    const data = await response.json();

    if (!data.token) {
      throw new Error('CSRF token not found in response');
    }

    // Cache the token for 55 minutes (tokens are valid for 1 hour)
    cachedToken = data.token;
    tokenExpiry = Date.now() + 55 * 60 * 1000;

    return data.token;
  } catch (error) {
    logger.error('Failed to fetch CSRF token', {
      service: 'csrf-client',
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Get CSRF token for use in API requests
 * Returns cached token if valid, otherwise fetches a new one
 */
export async function getCsrfToken(): Promise<string> {
  // Check if we have a valid cached token
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  // Fetch a new token
  return fetchCSRFToken();
}

/**
 * Clear cached CSRF token
 * Useful when handling authentication state changes
 */
export function clearCsrfToken(): void {
  cachedToken = null;
  tokenExpiry = null;
}

/**
 * Get CSRF headers for API requests
 * Convenience function that returns headers with CSRF token
 */
export async function getCsrfHeaders(): Promise<HeadersInit> {
  const token = await getCsrfToken();
  return {
    'X-CSRF-Token': token,
  };
}

/**
 * Make a fetch request with CSRF protection
 * Automatically adds CSRF token to the request headers
 */
export async function fetchWithCsrf(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = await getCsrfToken();

  const headers = new Headers(options.headers);
  headers.set('X-CSRF-Token', token);

  return fetch(url, {
    ...options,
    headers,
    credentials: options.credentials || 'same-origin',
  });
}