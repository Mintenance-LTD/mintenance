/**
 * HTTP API Client
 * 
 * Unified HTTP client for web API endpoints with consistent error handling,
 * retry logic, and request/response interceptors.
 */

import { parseError, logError, ApiError, NetworkError } from './ErrorHandler';

export interface ApiClientConfig {
  baseURL?: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

export interface RequestOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

export class ApiClient {
  private baseURL: string;
  private timeout: number;
  private defaultRetries: number;
  private retryDelay: number;
  private defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    this.baseURL = config.baseURL || (typeof window !== 'undefined' ? window.location.origin : '');
    this.timeout = config.timeout || 30000; // 30 seconds
    this.defaultRetries = config.retries || 3;
    this.retryDelay = config.retryDelay || 1000; // 1 second
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      ...config.headers,
    };
  }

  /**
   * Set default headers
   */
  setHeaders(headers: Record<string, string>): void {
    this.defaultHeaders = { ...this.defaultHeaders, ...headers };
  }

  /**
   * Set authorization token
   */
  setAuthToken(token: string): void {
    this.setHeaders({ Authorization: `Bearer ${token}` });
  }

  /**
   * Clear authorization token
   */
  clearAuthToken(): void {
    const { Authorization, ...rest } = this.defaultHeaders;
    this.defaultHeaders = rest;
  }

  /**
   * Make HTTP request with retry logic
   */
  protected async request<T>(
    url: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      timeout = this.timeout,
      retries = this.defaultRetries,
      retryDelay = this.retryDelay,
      ...fetchOptions
    } = options;

    const fullUrl = url.startsWith('http') ? url : `${this.baseURL}${url}`;
    const headers = {
      ...this.defaultHeaders,
      ...fetchOptions.headers,
    };

    let lastError: ApiError | NetworkError | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Create abort controller for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(fullUrl, {
          ...fetchOptions,
          headers,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        // Handle non-OK responses
        if (!response.ok) {
          const errorData = await this.parseErrorResponse(response);
          const error = parseError({
            message: errorData.message || `HTTP ${response.status}`,
            code: errorData.code,
            statusCode: response.status,
            details: errorData,
          });

          // Don't retry on client errors (4xx)
          if (response.status >= 400 && response.status < 500) {
            logError(error, `API Request failed: ${url}`);
            throw error;
          }

          // Retry on server errors (5xx) or network errors
          lastError = error;
          if (attempt < retries) {
            await this.delay(retryDelay * (attempt + 1));
            continue;
          }

          throw error;
        }

        // Parse response
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          return await response.json();
        }

        return (await response.text()) as unknown as T;
      } catch (error) {
        const parsedError = parseError(error);

        // Don't retry on abort (timeout)
        if (error instanceof Error && error.name === 'AbortError') {
          throw new NetworkError('Request timeout', error);
        }

        // Don't retry on client errors
        if (parsedError.type !== 'NETWORK' && parsedError.statusCode && parsedError.statusCode < 500) {
          logError(parsedError, `API Request failed: ${url}`);
          throw parsedError;
        }

        lastError = parsedError;

        // Retry on network errors or server errors
        if (attempt < retries) {
          await this.delay(retryDelay * (attempt + 1));
          continue;
        }
      }
    }

    // All retries exhausted
    if (lastError) {
      logError(lastError, `API Request failed after ${retries} retries: ${url}`);
      throw lastError;
    }

    throw new NetworkError('Request failed after retries');
  }

  /**
   * Parse error response
   */
  private async parseErrorResponse(response: Response): Promise<{
    message: string;
    code?: string;
    details?: unknown;
  }> {
    try {
      const data = await response.json();
      return {
        message: data.message || data.error || `HTTP ${response.status}`,
        code: data.code,
        details: data,
      };
    } catch {
      return {
        message: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
  }

  /**
   * Delay helper for retries
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * GET request
   */
  async get<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * PATCH request
   */
  async patch<T>(url: string, data?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(url: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

/**
 * Default API client instance
 */
export const apiClient = new ApiClient();

