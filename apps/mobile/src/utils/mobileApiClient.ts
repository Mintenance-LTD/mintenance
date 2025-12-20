/**
 * Mobile API Client Helper
 * 
 * Creates a configured API client instance for mobile app with automatic
 * authentication token handling.
 */

import { ApiClient, RequestOptions } from '@mintenance/api-client';
import { supabase } from '../config/supabase';

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
  constructor() {
    super({
      baseURL: API_BASE_URL,
      timeout: 30000,
      retries: 3,
      retryDelay: 1000,
    });
  }

  /**
   * Override request to automatically add auth token
   */
  protected async request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    // Get auth token
    const token = await getAuthToken();
    
    // Add auth header if token exists
    const headers = {
      ...options.headers,
      ...(token && { Authorization: `Bearer ${token}` }),
    };

    return super.request<T>(url, {
      ...options,
      headers,
    });
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

