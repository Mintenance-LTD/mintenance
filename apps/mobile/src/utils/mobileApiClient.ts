/**
 * Mobile API Client Helper
 *
 * Creates a configured API client instance for mobile app with automatic
 * authentication token handling.
 */

import { ApiClient, RequestOptions, IApiError } from '@mintenance/api-client';
import { supabase } from '../config/supabase';
import { logger } from './logger';

/**
 * Resolve the API base URL the mobile client targets.
 *
 * 2026-04-30 audit (P0-6): production builds must NEVER fall back to
 * `http://localhost:3000` — that's unreachable from a real phone and
 * surfaces as generic "network error" UX. We keep the localhost fallback
 * for `__DEV__` builds (Expo simulator workflow) and fail loudly for any
 * production/staging build that ships without the env wired.
 */
function resolveApiBaseUrl(): string {
  const fromEnv =
    process.env.EXPO_PUBLIC_API_URL ?? process.env.EXPO_PUBLIC_API_BASE_URL;

  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv;
  }

  const isDev = typeof __DEV__ !== 'undefined' && __DEV__;
  if (isDev) {
    logger.warn(
      '[CONFIG] EXPO_PUBLIC_API_URL not set; falling back to http://localhost:3000 for development. Set EXPO_PUBLIC_API_URL in eas.json profiles before building staging/production.'
    );
    return 'http://localhost:3000';
  }

  // Production / staging build with no API URL configured: emit a hard
  // error to Sentry so it shows up in release health dashboards. Returning
  // an obviously-invalid URL means every request will fail fast with a
  // clear error rather than silently hitting localhost.
  logger.error(
    '[CONFIG] EXPO_PUBLIC_API_URL / EXPO_PUBLIC_API_BASE_URL is not set in a non-DEV build. The mobile app cannot reach the backend — fix the EAS profile.',
    new Error('Missing mobile API base URL')
  );
  return 'about:blank-missing-api-url';
}

export const API_BASE_URL = resolveApiBaseUrl();

/**
 * Get authentication token from Supabase session.
 * Falls back to SecureStore if the Supabase client session is null
 * (common after app restart before restoreSession completes).
 */
async function getAuthToken(): Promise<string | null> {
  // Primary: get token from Supabase client session
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.access_token) {
      return session.access_token;
    }
  } catch (e) {
    logger.warn('[AUTH] getSession() failed', e);
  }

  // Fallback 1: force a fresh session via getUser() (triggers auto-refresh)
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      // getUser succeeded — session was refreshed, get it now
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.getSession();
      if (refreshedSession?.access_token) {
        logger.info(
          '[AUTH] getAuthToken: recovered token via getUser() refresh'
        );
        return refreshedSession.access_token;
      }
    }
  } catch {
    // getUser may fail if no session at all
  }

  // Fallback 2: load from SecureStore (app restart before restoreSession completes)
  try {
    const SecureStore = await import('expo-secure-store');
    const sessionJson = await SecureStore.getItemAsync('mintenance_session');
    if (sessionJson) {
      const persisted = JSON.parse(sessionJson);
      if (persisted?.access_token && persisted?.refresh_token) {
        await supabase.auth.setSession({
          access_token: persisted.access_token,
          refresh_token: persisted.refresh_token,
        });
        logger.info('[AUTH] getAuthToken: restored from SecureStore');
        return persisted.access_token;
      }
    }
  } catch {
    // SecureStore may not be available in all environments
  }

  logger.warn('[AUTH] getAuthToken: no token available from any source');
  return null;
}

/**
 * Mobile API Client instance with automatic auth token handling
 */
class MobileApiClient extends ApiClient {
  private isRefreshing = false;
  private refreshQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: unknown) => void;
  }> = [];

  constructor() {
    super({
      baseURL: API_BASE_URL,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    });
  }

  /**
   * Override request to automatically add auth token and handle 401 with refresh.
   * Uses a queue to prevent concurrent refresh attempts (race condition fix).
   */
  protected async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const token = await getAuthToken();

    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    try {
      return await super.request<T>(url, { ...options, headers });
    } catch (error) {
      const apiError = error as IApiError;
      if (apiError.statusCode === 401) {
        // Wait for token refresh (queued if another refresh is in progress)
        const newToken = await this.waitForTokenRefresh();
        const retryHeaders = {
          ...options.headers,
          Authorization: `Bearer ${newToken}`,
        };
        return await super.request<T>(url, {
          ...options,
          headers: retryHeaders,
        });
      }
      throw error;
    }
  }

  /**
   * Queue-based token refresh: if a refresh is already in progress, subsequent
   * callers wait for the same refresh to complete instead of triggering a new one.
   */
  private waitForTokenRefresh(): Promise<string> {
    if (this.isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        this.refreshQueue.push({ resolve, reject });
      });
    }

    this.isRefreshing = true;
    return this.performTokenRefresh();
  }

  private async performTokenRefresh(): Promise<string> {
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error || !data.session) {
        logger.warn('Session refresh failed, signing out');
        await supabase.auth.signOut();
        const refreshError = error || new Error('Session expired');
        this.refreshQueue.forEach(({ reject }) => reject(refreshError));
        this.refreshQueue = [];
        throw refreshError;
      }

      const newToken = data.session.access_token;
      this.refreshQueue.forEach(({ resolve }) => resolve(newToken));
      this.refreshQueue = [];
      return newToken;
    } catch (refreshError) {
      logger.error('Token refresh failed', refreshError);
      this.refreshQueue.forEach(({ reject }) => reject(refreshError));
      this.refreshQueue = [];
      throw refreshError;
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * POST with FormData (for file uploads).
   *
   * AUDIT_PUNCH_LIST P1 #10 (B3-P1-1) — was bypassing the 401 retry
   * path used by `request()` (GET/POST/PUT/PATCH/DELETE), so any
   * photo/video upload that hit a stale-but-refreshable token would
   * fail outright instead of silently re-authing. Now mirrors the
   * same wait-for-refresh queue: retry once with the freshly-minted
   * access token before surfacing the upload error to the caller.
   */
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

    const doRequest = async (token: string | null): Promise<Response> => {
      return fetch(fullUrl, {
        method: 'POST',
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });
    };

    const initialToken = await getAuthToken();
    let response = await doRequest(initialToken);

    if (response.status === 401) {
      // Mirror request()'s behaviour: wait for the queued refresh, retry once.
      const newToken = await this.waitForTokenRefresh();
      response = await doRequest(newToken);
    }

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.status}`);
    }
    return response.json();
  }

  /**
   * GET request with auto auth
   */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request with auto auth
   */
  async post<T>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request with auto auth
   */
  async put<T>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request with auto auth
   */
  async patch<T>(
    url: string,
    data?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request with auto auth
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

/**
 * Default mobile API client instance
 */
export const mobileApiClient = new MobileApiClient();
