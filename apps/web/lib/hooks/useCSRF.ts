/**
 * React hook for CSRF protection
 * 
 * Usage:
 * ```tsx
 * const { csrfToken, loading, error } = useCSRF();
 * 
 * // Include in API requests:
 * fetch('/api/endpoint', {
 *   method: 'POST',
 *   headers: {
 *     'Content-Type': 'application/json',
 *     'x-csrf-token': csrfToken,
 *   },
 *   body: JSON.stringify(data),
 * });
 * ```
 */

'use client';

import { useState, useEffect } from 'react';

interface UseCSRFReturn {
  csrfToken: string | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useCSRF(): UseCSRFReturn {
  const [csrfToken, setCSRFToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchToken = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'same-origin',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch CSRF token');
      }

      const data = await response.json();
      setCSRFToken(data.token);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
      setCSRFToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchToken();
  }, []);

  return {
    csrfToken,
    loading,
    error,
    refresh: fetchToken,
  };
}

/**
 * Helper function to add CSRF token to fetch requests
 */
export async function fetchWithCSRF(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Get CSRF token
  const tokenResponse = await fetch('/api/csrf', {
    method: 'GET',
    credentials: 'same-origin',
  });

  if (!tokenResponse.ok) {
    throw new Error('Failed to fetch CSRF token');
  }

  const { token } = await tokenResponse.json();

  // Add CSRF token to headers
  const headers = new Headers(options.headers);
  headers.set('x-csrf-token', token);

  // Make the actual request
  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
}

