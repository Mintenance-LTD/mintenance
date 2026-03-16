/**
 * Mobile API Client Helper
 * 
 * Creates a configured API client instance for mobile app with automatic
 * authentication token handling.
 */

import { ApiClient, RequestOptions, IApiError } from '@mintenance/api-client';
import { supabase } from '../config/supabase';
import { logger } from './logger';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Get authentication token from Supabase session
 */
async function getAuthToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
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
  protected async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
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
        return await super.request<T>(url, { ...options, headers: retryHeaders });
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
  async post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request with auto auth
   */
  async put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request with auto auth
   */
  async patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
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

