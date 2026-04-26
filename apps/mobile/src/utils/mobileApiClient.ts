/**
 * Mobile API Client Helper
 *
 * Creates a configured API client instance for mobile app with automatic
 * authentication token handling.
 */

import { ApiClient, RequestOptions, IApiError } from '@mintenance/api-client';
import { supabase } from '../config/supabase';
import { logger } from './logger';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  'http://localhost:3000';

// Safety: log a loud warning if both supported API URL vars are missing in
// production. EAS profiles historically used EXPO_PUBLIC_API_BASE_URL while
// this client read EXPO_PUBLIC_API_URL; support both to avoid localhost builds.
// Don't throw — that would crash the app on startup — but make it visible.
if (
  !process.env.EXPO_PUBLIC_API_URL &&
  !process.env.EXPO_PUBLIC_API_BASE_URL &&
  typeof __DEV__ !== 'undefined' &&
  !__DEV__
) {
  logger.error(
    '[CONFIG] EXPO_PUBLIC_API_URL / EXPO_PUBLIC_API_BASE_URL is not set — API calls will target localhost, which is unreachable on a real device',
    new Error('Missing mobile API base URL')
  );
}

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
   * POST with FormData (for file uploads)
   */
  async postFormData<T>(url: string, formData: FormData): Promise<T> {
    const token = await getAuthToken();
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    });
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
