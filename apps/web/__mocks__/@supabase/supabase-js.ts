/**
 * Mock implementation of @supabase/supabase-js for testing
 * Provides chainable mock methods for Supabase client
 */

export const createMockSupabaseResponse = (data: any = null, error: any = null) => ({
  data,
  error,
  count: data ? (Array.isArray(data) ? data.length : 1) : 0,
  status: error ? 500 : 200,
  statusText: error ? 'Error' : 'OK',
});

/**
 * Creates a chainable query builder mock
 */
export const createMockQueryBuilder = (defaultResponse = { data: null, error: null }) => {
  // Create a shared object that all chain methods return
  const chainMethods: any = {
    then: jest.fn((resolve) => Promise.resolve(defaultResponse).then(resolve)),
    catch: jest.fn((reject) => Promise.resolve(defaultResponse).catch(reject)),
    finally: jest.fn((fn) => Promise.resolve(defaultResponse).finally(fn)),
    single: jest.fn().mockResolvedValue(defaultResponse),
    maybeSingle: jest.fn().mockResolvedValue(defaultResponse),
  };

  // Add methods that return the chain itself
  const returnSelfMethods = [
    'select', 'insert', 'update', 'delete', 'upsert', 'eq', 'neq', 'gt', 'gte',
    'lt', 'lte', 'like', 'ilike', 'is', 'in', 'contains', 'containedBy',
    'rangeGt', 'rangeGte', 'rangeLt', 'rangeLte', 'rangeAdjacent', 'overlaps',
    'textSearch', 'match', 'not', 'or', 'filter', 'order', 'limit', 'range'
  ];

  returnSelfMethods.forEach(method => {
    chainMethods[method] = jest.fn().mockReturnValue(chainMethods);
  });

  return chainMethods;
};

/**
 * Mock Supabase client
 */
export const createClient = jest.fn(() => ({
  from: jest.fn((table: string) => createMockQueryBuilder()),
  rpc: jest.fn((fn: string, params?: any) => 
    Promise.resolve({ data: null, error: null })
  ),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
    signInWithPassword: jest.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signUp: jest.fn().mockResolvedValue({ 
      data: { user: null, session: null }, 
      error: null 
    }),
    signOut: jest.fn().mockResolvedValue({ error: null }),
    resetPasswordForEmail: jest.fn().mockResolvedValue({ data: null, error: null }),
    updateUser: jest.fn().mockResolvedValue({ 
      data: { user: null }, 
      error: null 
    }),
    onAuthStateChange: jest.fn(() => ({
      data: { subscription: { unsubscribe: jest.fn() } },
    })),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: null, error: null }),
      download: jest.fn().mockResolvedValue({ data: null, error: null }),
      remove: jest.fn().mockResolvedValue({ data: null, error: null }),
      createSignedUrl: jest.fn().mockResolvedValue({ 
        data: { signedUrl: 'http://example.com/signed' }, 
        error: null 
      }),
      getPublicUrl: jest.fn(() => ({ 
        data: { publicUrl: 'http://example.com/public' } 
      })),
    })),
  },
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    unsubscribe: jest.fn(),
  })),
  removeChannel: jest.fn(),
  removeAllChannels: jest.fn(),
}));

export default {
  createClient,
};

