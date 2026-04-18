/**
 * Central HTTP client for browser (client components + hooks).
 *
 * Sprint 7 (5.3): replaces 15+ scattered `fetch(...)` call sites across
 * components/hooks. Consolidating brings:
 *
 *   - Automatic CSRF header injection (double-submit cookie → x-csrf-token).
 *   - Standard JSON parsing + error shape.
 *   - Retries on transient 5xx / network errors with exponential backoff.
 *   - A single hook for Sentry breadcrumbs / tracing later.
 *
 * Not intended for server-side use — server routes already compose
 * `serverSupabase`, `stripe`, etc. directly; this client runs in the
 * browser and talks to our own `/api/*` routes.
 */

export interface ApiClientError extends Error {
  status: number;
  code?: string;
  retryable: boolean;
  body?: unknown;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  /** AbortSignal, forwarded to fetch. */
  signal?: AbortSignal;
  /** Max retry attempts on 5xx / network error. Default 2. */
  maxRetries?: number;
  /** Base backoff in ms between retries. Default 300. */
  retryBaseMs?: number;
  /** Skip CSRF injection (useful for public endpoints or Bearer-authed mobile). */
  skipCsrf?: boolean;
}

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  // Match both production (__Host-csrf-token) and dev (csrf-token)
  const match = document.cookie.match(/(?:^|;\s*)(?:__Host-)?csrf-token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || status >= 500;
}

function isMutating(method: string): boolean {
  return method === 'POST' || method === 'PUT' || method === 'PATCH' || method === 'DELETE';
}

async function parseError(response: Response): Promise<ApiClientError> {
  let body: unknown;
  try {
    body = await response.clone().json();
  } catch {
    try {
      body = await response.text();
    } catch {
      body = null;
    }
  }
  const message =
    (body && typeof body === 'object' && 'error' in body && typeof (body as { error: unknown }).error === 'string'
      ? (body as { error: string }).error
      : undefined) ||
    response.statusText ||
    `Request failed with status ${response.status}`;

  const err: ApiClientError = Object.assign(new Error(message) as ApiClientError, {
    name: 'ApiClientError',
    status: response.status,
    retryable: isRetryableStatus(response.status),
    body,
  });
  if (body && typeof body === 'object' && 'code' in body) {
    err.code = String((body as { code: unknown }).code);
  }
  return err;
}

async function doRequest<T>(
  url: string,
  options: RequestOptions
): Promise<T> {
  const method = options.method ?? 'GET';
  const maxRetries = options.maxRetries ?? 2;
  const baseDelay = options.retryBaseMs ?? 300;

  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(options.headers ?? {}),
  };

  if (options.body !== undefined && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json';
  }

  // CSRF double-submit: server validates x-csrf-token against the cookie.
  // Skip on GET/HEAD/OPTIONS and when explicitly opted out.
  if (!options.skipCsrf && isMutating(method)) {
    const token = readCsrfCookie();
    if (token && !headers['x-csrf-token']) {
      headers['x-csrf-token'] = token;
    }
  }

  let attempt = 0;
  // Retry loop only triggers for transient failures.
  // eslint-disable-next-line no-constant-condition
  while (true) {
    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        credentials: 'same-origin',
        signal: options.signal,
        body:
          options.body === undefined
            ? undefined
            : typeof options.body === 'string'
              ? options.body
              : JSON.stringify(options.body),
      });
    } catch (networkError) {
      if (attempt < maxRetries) {
        await sleep(baseDelay * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      const err: ApiClientError = Object.assign(
        new Error(
          networkError instanceof Error ? networkError.message : 'Network error'
        ) as ApiClientError,
        {
          name: 'ApiClientError',
          status: 0,
          retryable: true,
          body: null,
        }
      );
      throw err;
    }

    if (!response.ok) {
      const err = await parseError(response);
      if (err.retryable && attempt < maxRetries) {
        await sleep(baseDelay * Math.pow(2, attempt));
        attempt++;
        continue;
      }
      throw err;
    }

    // 204 / empty body support
    if (response.status === 204) {
      return undefined as unknown as T;
    }
    const text = await response.text();
    if (!text) return undefined as unknown as T;
    try {
      return JSON.parse(text) as T;
    } catch {
      // Server sent non-JSON 2xx response — surface as text. Callers
      // that expect JSON will see a type error at call site.
      return text as unknown as T;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const apiClient = {
  get: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    doRequest<T>(url, { ...options, method: 'GET' }),
  post: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    doRequest<T>(url, { ...options, method: 'POST', body }),
  put: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    doRequest<T>(url, { ...options, method: 'PUT', body }),
  patch: <T>(url: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    doRequest<T>(url, { ...options, method: 'PATCH', body }),
  delete: <T>(url: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    doRequest<T>(url, { ...options, method: 'DELETE' }),
} as const;

export type { RequestOptions };
