import { mobileApiClient } from '../mobileApiClient';
import { supabase } from '../../config/supabase';

// Mock supabase
jest.mock('../../config/supabase', () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

// Mock ApiClient
jest.mock('@mintenance/api-client', () => ({
  ApiClient: class {
    constructor(config: any) {
      this.config = config;
    }
    config: any;
    protected async request<T>(): Promise<T> {
      return {} as T;
    }
  },
  RequestOptions: {},
}));

describe('mobileApiClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock authenticated session
    (supabase.auth.getSession as jest.Mock).mockResolvedValue({
      data: { session: { access_token: 'test-token' } },
      error: null,
    });
  });

  describe('initialization', () => {
    it('should create an instance', () => {
      expect(mobileApiClient).toBeDefined();
      expect(typeof mobileApiClient.get).toBe('function');
      expect(typeof mobileApiClient.post).toBe('function');
      expect(typeof mobileApiClient.put).toBe('function');
      expect(typeof mobileApiClient.patch).toBe('function');
      expect(typeof mobileApiClient.delete).toBe('function');
    });
  });

  describe('methods', () => {
    it('should handle successful operations', async () => {
      // Test that methods are callable
      await expect(mobileApiClient.get('/test')).resolves.toBeDefined();
    });

    it('should handle auth-token failures gracefully without throwing', async () => {
      // getAuthToken is intentionally resilient: a getSession() failure is
      // swallowed, fallbacks (getUser refresh, SecureStore) are tried, and it
      // returns null rather than throwing — so a missing/expired session never
      // crashes an outgoing request. The request proceeds without a token.
      (supabase.auth.getSession as jest.Mock).mockRejectedValue(
        new Error('Auth failed')
      );

      await expect(mobileApiClient.get('/test')).resolves.toBeDefined();
    });

    it('should validate inputs', () => {
      // Test that configuration is valid
      const config = (mobileApiClient as any).config;
      expect(config).toBeDefined();
      expect(config.timeout).toBe(30000);
      expect(config.retries).toBe(3);
      expect(config.retryDelay).toBe(1000);
    });
  });
});
