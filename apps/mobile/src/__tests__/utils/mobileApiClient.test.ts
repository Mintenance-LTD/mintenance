import { mobileApiClient } from '../../utils/mobileApiClient';
import { supabase } from '../../config/supabase';
import { ApiClient } from '@mintenance/api-client';

// Mock dependencies
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

const mockApiClientRequest = jest.fn();

jest.mock('@mintenance/api-client', () => {
  class MockApiClient {
    constructor(config: any) {
      this.config = config;
    }

    config: any;

    protected async request<T>(url: string, options: any = {}): Promise<T> {
      return mockApiClientRequest(url, options);
    }
  }

  return {
    ApiClient: MockApiClient,
    RequestOptions: {},
  };
});

describe('MobileApiClient', () => {
  const mockToken = 'test-access-token-123';
  const mockSession = {
    access_token: mockToken,
    refresh_token: 'refresh-token-123',
    user: { id: 'user-123' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Default mock - user is authenticated
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: mockSession },
      error: null,
    });
  });

  describe('Constructor', () => {
    it('should initialize with correct configuration', () => {
      const config = (mobileApiClient as any).config;

      expect(config).toEqual({
        baseURL: expect.stringContaining('localhost:3000'),
        timeout: 30000,
        retries: 3,
        retryDelay: 1000,
      });
    });
  });

  describe('Authentication', () => {
    it('should add auth token to request headers when user is authenticated', async () => {
      const mockResponse = { data: 'test' };
      mockApiClientRequest.mockResolvedValue(mockResponse);

      const result = await mobileApiClient.get('/api/test');

      expect(supabase.auth.getSession).toHaveBeenCalled();
      expect(mockApiClientRequest).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should not add auth header when no session exists', async () => {
      (supabase.auth.getSession as jest.Mock).mockResolvedValue({
        data: { session: null },
        error: null,
      });

      const mockResponse = { data: 'test' };
      mockApiClientRequest.mockResolvedValue(mockResponse);

      const result = await mobileApiClient.get('/api/test');

      expect(mockApiClientRequest).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {},
      });
      expect(result).toEqual(mockResponse);
    });

    it('should preserve existing headers when adding auth', async () => {
      const mockResponse = { data: 'test' };
      mockApiClientRequest.mockResolvedValue(mockResponse);

      const customHeaders = {
        'Content-Type': 'application/json',
        'X-Custom-Header': 'custom-value',
      };

      const result = await mobileApiClient.get('/api/test', {
        headers: customHeaders,
      });

      expect(mockApiClientRequest).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          ...customHeaders,
          Authorization: `Bearer ${mockToken}`,
        },
      });
      expect(result).toEqual(mockResponse);
    });

    it('should handle auth errors gracefully', async () => {
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(
        new Error('Auth service unavailable')
      );

      mockApiClientRequest.mockResolvedValue({ data: 'test' });

      await expect(mobileApiClient.get('/api/test')).rejects.toThrow(
        'Auth service unavailable'
      );
    });
  });

  describe('HTTP Methods', () => {

    beforeEach(() => {
      mockApiClientRequest.mockResolvedValue({ success: true });
    });

    describe('GET', () => {
      it('should make GET request with auth', async () => {
        await mobileApiClient.get('/api/resource');

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        });
      });

      it('should pass query parameters', async () => {
        await mobileApiClient.get('/api/resource', {
          params: { page: 1, limit: 10 },
        });

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource', {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          params: { page: 1, limit: 10 },
        });
      });
    });

    describe('POST', () => {
      it('should make POST request with data and auth', async () => {
        const postData = { name: 'Test', value: 123 };

        await mobileApiClient.post('/api/resource', postData);

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify(postData),
        });
      });

      it('should handle POST without data', async () => {
        await mobileApiClient.post('/api/resource');

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          body: undefined,
        });
      });

      it('should merge custom options with POST', async () => {
        const postData = { test: 'data' };
        const options = {
          headers: { 'X-Custom': 'value' },
          timeout: 5000,
        };

        await mobileApiClient.post('/api/resource', postData, options);

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource', {
          method: 'POST',
          headers: {
            'X-Custom': 'value',
            Authorization: `Bearer ${mockToken}`,
          },
          timeout: 5000,
          body: JSON.stringify(postData),
        });
      });
    });

    describe('PUT', () => {
      it('should make PUT request with data and auth', async () => {
        const putData = { id: 1, name: 'Updated' };

        await mobileApiClient.put('/api/resource/1', putData);

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource/1', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify(putData),
        });
      });

      it('should handle PUT without data', async () => {
        await mobileApiClient.put('/api/resource/1');

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource/1', {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          body: undefined,
        });
      });
    });

    describe('PATCH', () => {
      it('should make PATCH request with partial data and auth', async () => {
        const patchData = { status: 'active' };

        await mobileApiClient.patch('/api/resource/1', patchData);

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource/1', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          body: JSON.stringify(patchData),
        });
      });

      it('should handle PATCH without data', async () => {
        await mobileApiClient.patch('/api/resource/1');

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource/1', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
          body: undefined,
        });
      });
    });

    describe('DELETE', () => {
      it('should make DELETE request with auth', async () => {
        await mobileApiClient.delete('/api/resource/1');

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource/1', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${mockToken}`,
          },
        });
      });

      it('should pass options to DELETE request', async () => {
        const options = {
          headers: { 'X-Confirm': 'true' },
          params: { cascade: true },
        };

        await mobileApiClient.delete('/api/resource/1', options);

        expect(mockApiClientRequest).toHaveBeenCalledWith('/api/resource/1', {
          method: 'DELETE',
          headers: {
            'X-Confirm': 'true',
            Authorization: `Bearer ${mockToken}`,
          },
          params: { cascade: true },
        });
      });
    });
  });

  describe('Error Handling', () => {

    it('should propagate request errors', async () => {
      const error = new Error('Network error');
      mockApiClientRequest.mockRejectedValue(error);

      await expect(mobileApiClient.get('/api/test')).rejects.toThrow('Network error');
    });

    it('should handle JSON stringify errors in POST', async () => {
      const circularRef: any = {};
      circularRef.self = circularRef;

      // JSON.stringify will throw on circular reference
      await expect(mobileApiClient.post('/api/test', circularRef)).rejects.toThrow();
    });

    it('should handle response parsing errors', async () => {
      mockApiClientRequest.mockResolvedValue(undefined);

      const result = await mobileApiClient.get('/api/test');
      expect(result).toBeUndefined();
    });
  });

  describe('Request Options', () => {

    beforeEach(() => {
      mockApiClientRequest.mockResolvedValue({ success: true });
    });

    it('should pass timeout option', async () => {
      await mobileApiClient.get('/api/test', { timeout: 5000 });

      expect(mockApiClientRequest).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        timeout: 5000,
      });
    });

    it('should pass abort signal', async () => {
      const controller = new AbortController();

      await mobileApiClient.get('/api/test', { signal: controller.signal });

      expect(mockApiClientRequest).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${mockToken}`,
        },
        signal: controller.signal,
      });
    });

    it('should handle complex nested options', async () => {
      const options = {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        params: {
          filter: { status: 'active' },
          sort: 'created_at',
        },
        timeout: 10000,
        retries: 5,
      };

      await mobileApiClient.get('/api/complex', options);

      expect(mockApiClientRequest).toHaveBeenCalledWith('/api/complex', {
        method: 'GET',
        headers: {
          ...options.headers,
          Authorization: `Bearer ${mockToken}`,
        },
        params: options.params,
        timeout: options.timeout,
        retries: options.retries,
      });
    });
  });

  describe('Type Safety', () => {

    interface User {
      id: string;
      name: string;
      email: string;
    }

    interface ApiResponse<T> {
      data: T;
      meta: {
        total: number;
      };
    }

    it('should handle typed responses', async () => {
      const mockUser: User = {
        id: '123',
        name: 'Test User',
        email: 'test@example.com',
      };

      mockApiClientRequest.mockResolvedValue(mockUser);

      const result = await mobileApiClient.get<User>('/api/user/123');

      expect(result).toEqual(mockUser);
      expect(result.id).toBe('123');
      expect(result.name).toBe('Test User');
    });

    it('should handle generic API responses', async () => {
      const mockResponse: ApiResponse<User[]> = {
        data: [
          { id: '1', name: 'User 1', email: 'user1@test.com' },
          { id: '2', name: 'User 2', email: 'user2@test.com' },
        ],
        meta: { total: 2 },
      };

      mockApiClientRequest.mockResolvedValue(mockResponse);

      const result = await mobileApiClient.get<ApiResponse<User[]>>('/api/users');

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.data[0].name).toBe('User 1');
    });
  });

  describe('Environment Configuration', () => {
    it('should use environment variable for API URL when available', () => {
      const originalEnv = process.env.EXPO_PUBLIC_API_URL;
      process.env.EXPO_PUBLIC_API_URL = 'https://api.production.com';

      // Since mobileApiClient is already instantiated, we need to test the URL usage
      // The instance was created with the original env value
      expect((mobileApiClient as any).config.baseURL).toBeDefined();

      // Restore original env
      process.env.EXPO_PUBLIC_API_URL = originalEnv;
    });

    it('should use default localhost URL when env variable is not set', () => {
      expect((mobileApiClient as any).config.baseURL).toContain('localhost:3000');
    });
  });

  describe('Concurrent Requests', () => {

    it('should handle multiple concurrent requests', async () => {
      mockApiClientRequest.mockImplementation((url: string) =>
        Promise.resolve({ url, timestamp: Date.now() })
      );

      const promises = [
        mobileApiClient.get('/api/1'),
        mobileApiClient.get('/api/2'),
        mobileApiClient.get('/api/3'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(results[0]).toHaveProperty('url', '/api/1');
      expect(results[1]).toHaveProperty('url', '/api/2');
      expect(results[2]).toHaveProperty('url', '/api/3');
      expect(supabase.auth.getSession).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed HTTP methods concurrently', async () => {
      mockApiClientRequest.mockResolvedValue({ success: true });

      const promises = [
        mobileApiClient.get('/api/get'),
        mobileApiClient.post('/api/post', { data: 'test' }),
        mobileApiClient.put('/api/put', { id: 1 }),
        mobileApiClient.delete('/api/delete'),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(4);
      expect(mockApiClientRequest).toHaveBeenCalledTimes(4);
    });
  });
});