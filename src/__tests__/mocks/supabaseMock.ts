import { jest } from '@jest/globals';

// Comprehensive Supabase Mock Factory
export interface MockSupabaseResponse<T = any> {
  data: T | null;
  error: any | null;
  count?: number | null;
}

export interface MockSupabaseChain {
  select: jest.MockedFunction<any>;
  insert: jest.MockedFunction<any>;
  update: jest.MockedFunction<any>;
  delete: jest.MockedFunction<any>;
  upsert: jest.MockedFunction<any>;
  eq: jest.MockedFunction<any>;
  neq: jest.MockedFunction<any>;
  gt: jest.MockedFunction<any>;
  gte: jest.MockedFunction<any>;
  lt: jest.MockedFunction<any>;
  lte: jest.MockedFunction<any>;
  like: jest.MockedFunction<any>;
  ilike: jest.MockedFunction<any>;
  in: jest.MockedFunction<any>;
  or: jest.MockedFunction<any>;
  and: jest.MockedFunction<any>;
  not: jest.MockedFunction<any>;
  order: jest.MockedFunction<any>;
  limit: jest.MockedFunction<any>;
  range: jest.MockedFunction<any>;
  single: jest.MockedFunction<any>;
  maybeSingle: jest.MockedFunction<any>;
}

export class SupabaseMockFactory {
  private static createMockChain(): MockSupabaseChain {
    const chain = {
      select: jest.fn(),
      insert: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
      eq: jest.fn(),
      neq: jest.fn(),
      gt: jest.fn(),
      gte: jest.fn(),
      lt: jest.fn(),
      lte: jest.fn(),
      like: jest.fn(),
      ilike: jest.fn(),
      in: jest.fn(),
      or: jest.fn(),
      and: jest.fn(),
      not: jest.fn(),
      order: jest.fn(),
      limit: jest.fn(),
      range: jest.fn(),
      single: jest.fn(),
      maybeSingle: jest.fn(),
    };

    // Make all methods return the chain for chaining, except terminal methods
    Object.keys(chain).forEach((key) => {
      if (!['single', 'maybeSingle'].includes(key)) {
        (chain as any)[key].mockReturnValue(chain);
      }
    });

    // Terminal methods return promises
    chain.single.mockResolvedValue({ data: null, error: null });
    chain.maybeSingle.mockResolvedValue({ data: null, error: null });

    return chain;
  }

  static createMockClient() {
    const mockFrom = jest.fn(() => this.createMockChain());

    const mockAuth = {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signInWithOtp: jest.fn(),
      signOut: jest.fn(),
      resetPasswordForEmail: jest.fn(),
      updateUser: jest.fn(),
      getUser: jest.fn(() =>
        Promise.resolve({ data: { user: null }, error: null })
      ),
      getSession: jest.fn(() =>
        Promise.resolve({ data: { session: null }, error: null })
      ),
      refreshSession: jest.fn(),
      setSession: jest.fn(),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } },
      })),
    };

    const mockStorage = {
      from: jest.fn(() => ({
        upload: jest.fn(),
        download: jest.fn(),
        remove: jest.fn(),
        list: jest.fn(),
        getPublicUrl: jest.fn(),
        createSignedUrl: jest.fn(),
        createSignedUrls: jest.fn(),
        update: jest.fn(),
        move: jest.fn(),
        copy: jest.fn(),
      })),
    };

    const mockChannel = {
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn(),
      unsubscribe: jest.fn(),
      send: jest.fn(),
    };

    const mockClient = {
      from: mockFrom,
      auth: mockAuth,
      storage: mockStorage,
      channel: jest.fn(() => mockChannel),
      removeChannel: jest.fn(),
      getChannels: jest.fn(),
      realtime: {
        connect: jest.fn(),
        disconnect: jest.fn(),
      },
    };

    return mockClient;
  }

  // Helper methods for common test scenarios
  static mockSuccessResponse<T>(
    data: T,
    count?: number
  ): MockSupabaseResponse<T> {
    return { data, error: null, count };
  }

  static mockErrorResponse(
    message: string,
    code?: string
  ): MockSupabaseResponse {
    return {
      data: null,
      error: {
        message,
        code: code || 'UNKNOWN_ERROR',
        details: null,
        hint: null,
      },
    };
  }

  static setupChainMock(
    chain: MockSupabaseChain,
    response: MockSupabaseResponse
  ) {
    chain.single.mockResolvedValueOnce(response);
    chain.maybeSingle.mockResolvedValueOnce(response);
    return chain;
  }

  static setupSelectMock(
    mockClient: any,
    tableName: string,
    response: MockSupabaseResponse
  ) {
    const chain = this.createMockChain();
    this.setupChainMock(chain, response);
    mockClient.from.mockReturnValueOnce(chain);
    return chain;
  }

  static setupInsertMock(
    mockClient: any,
    tableName: string,
    response: MockSupabaseResponse
  ) {
    const chain = this.createMockChain();
    this.setupChainMock(chain, response);
    mockClient.from.mockReturnValueOnce(chain);
    return chain;
  }

  static setupUpdateMock(
    mockClient: any,
    tableName: string,
    response: MockSupabaseResponse
  ) {
    const chain = this.createMockChain();
    chain.eq.mockResolvedValueOnce(response);
    mockClient.from.mockReturnValueOnce(chain);
    return chain;
  }

  static setupDeleteMock(
    mockClient: any,
    tableName: string,
    response: MockSupabaseResponse
  ) {
    const chain = this.createMockChain();
    chain.eq.mockResolvedValueOnce(response);
    mockClient.from.mockReturnValueOnce(chain);
    return chain;
  }

  // Reset all mocks
  static resetMocks() {
    jest.clearAllMocks();
  }
}

// Default mock for direct use in jest.mock()
export const createMockSupabaseClient = SupabaseMockFactory.createMockClient;

// Export commonly used responses
export const MOCK_RESPONSES = {
  SUCCESS_EMPTY: SupabaseMockFactory.mockSuccessResponse(null),
  ERROR_NOT_FOUND: SupabaseMockFactory.mockErrorResponse(
    'Not found',
    'NOT_FOUND'
  ),
  ERROR_UNAUTHORIZED: SupabaseMockFactory.mockErrorResponse(
    'Unauthorized',
    'UNAUTHORIZED'
  ),
  ERROR_NETWORK: SupabaseMockFactory.mockErrorResponse(
    'Network error',
    'NETWORK_ERROR'
  ),
};
