/**
 * Comprehensive Supabase Mock Factory
 *
 * Provides a complete mock implementation of Supabase client
 * for testing purposes. Supports all common query builder methods.
 *
 * Usage:
 * ```typescript
 * import { createSupabaseMock } from '../test/mocks/supabaseMockFactory';
 *
 * jest.mock('../../config/supabase', () => ({
 *   supabase: createSupabaseMock()
 * }));
 * ```
 */

export interface MockQueryBuilder {
  select: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  upsert: jest.Mock;
  delete: jest.Mock;
  eq: jest.Mock;
  neq: jest.Mock;
  gt: jest.Mock;
  gte: jest.Mock;
  lt: jest.Mock;
  lte: jest.Mock;
  like: jest.Mock;
  ilike: jest.Mock;
  is: jest.Mock;
  in: jest.Mock;
  contains: jest.Mock;
  containedBy: jest.Mock;
  range: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  csv: jest.Mock;
  geojson: jest.Mock;
  explain: jest.Mock;
  rollback: jest.Mock;
  returns: jest.Mock;
  not: jest.Mock;
  or: jest.Mock;
  filter: jest.Mock;
  match: jest.Mock;
  textSearch: jest.Mock;
  overlaps: jest.Mock;
  rangeGt: jest.Mock;
  rangeGte: jest.Mock;
  rangeLt: jest.Mock;
  rangeLte: jest.Mock;
  rangeAdjacent: jest.Mock;
}

export interface MockRealtimeChannel {
  on: jest.Mock;
  subscribe: jest.Mock;
  unsubscribe: jest.Mock;
  send: jest.Mock;
  track: jest.Mock;
  untrack: jest.Mock;
}

export interface MockSupabaseClient {
  from: jest.Mock;
  rpc: jest.Mock;
  channel: jest.Mock;
  removeChannel: jest.Mock;
  getChannels: jest.Mock;
  auth: {
    getSession: jest.Mock;
    getUser: jest.Mock;
    signUp: jest.Mock;
    signInWithPassword: jest.Mock;
    signInWithOAuth: jest.Mock;
    signOut: jest.Mock;
    refreshSession: jest.Mock;
    updateUser: jest.Mock;
    resetPasswordForEmail: jest.Mock;
    onAuthStateChange: jest.Mock;
  };
  storage: {
    from: jest.Mock;
  };
  functions: {
    invoke: jest.Mock;
  };
}

/**
 * Creates a chainable query builder mock
 * All methods return `this` to support method chaining
 */
export function createQueryBuilderMock(
  finalResult: { data: unknown; error: unknown } | null = { data: null, error: null }
): MockQueryBuilder {
  const queryBuilder: Partial<MockQueryBuilder> = {};

  // Create all methods as mocks that return the queryBuilder for chaining
  const methods: (keyof MockQueryBuilder)[] = [
    'select',
    'insert',
    'update',
    'upsert',
    'delete',
    'eq',
    'neq',
    'gt',
    'gte',
    'lt',
    'lte',
    'like',
    'ilike',
    'is',
    'in',
    'contains',
    'containedBy',
    'range',
    'order',
    'limit',
    'csv',
    'geojson',
    'explain',
    'rollback',
    'returns',
    'not',
    'or',
    'filter',
    'match',
    'textSearch',
    'overlaps',
    'rangeGt',
    'rangeGte',
    'rangeLt',
    'rangeLte',
    'rangeAdjacent',
  ];

  methods.forEach((method) => {
    queryBuilder[method] = jest.fn().mockReturnValue(queryBuilder);
  });

  // Terminal methods that end the chain and return a promise
  queryBuilder.single = jest.fn().mockResolvedValue(finalResult);
  queryBuilder.maybeSingle = jest.fn().mockResolvedValue(finalResult);

  return queryBuilder as MockQueryBuilder;
}

/**
 * Creates a realtime channel mock
 */
export function createRealtimeChannelMock(): MockRealtimeChannel {
  const channel: MockRealtimeChannel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockResolvedValue({ status: 'subscribed' }),
    unsubscribe: jest.fn().mockResolvedValue({ status: 'unsubscribed' }),
    send: jest.fn().mockResolvedValue({ status: 'ok' }),
    track: jest.fn().mockResolvedValue({ status: 'ok' }),
    untrack: jest.fn().mockResolvedValue({ status: 'ok' }),
  };

  return channel;
}

/**
 * Creates a complete Supabase client mock
 *
 * @param options - Configuration options
 * @param options.defaultData - Default data to return from queries
 * @param options.defaultError - Default error to return from queries
 */
export function createSupabaseMock(options: {
  defaultData?: unknown;
  defaultError?: unknown;
} = {}): MockSupabaseClient {
  const { defaultData = null, defaultError = null } = options;

  const supabaseMock: MockSupabaseClient = {
    // Database query builder
    from: jest.fn((table: string) => {
      return createQueryBuilderMock({ data: defaultData, error: defaultError });
    }),

    // Remote procedure call
    rpc: jest.fn((fn: string, params?: unknown) => {
      return Promise.resolve({ data: defaultData, error: defaultError });
    }),

    // Realtime channels
    channel: jest.fn((name: string) => createRealtimeChannelMock()),
    removeChannel: jest.fn().mockResolvedValue({ status: 'ok' }),
    getChannels: jest.fn().mockReturnValue([]),

    // Authentication
    auth: {
      getSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: defaultError,
      }),
      getUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: defaultError,
      }),
      signUp: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: defaultError,
      }),
      signInWithPassword: jest.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: defaultError,
      }),
      signInWithOAuth: jest.fn().mockResolvedValue({
        data: { url: '', provider: '' },
        error: defaultError,
      }),
      signOut: jest.fn().mockResolvedValue({ error: defaultError }),
      refreshSession: jest.fn().mockResolvedValue({
        data: { session: null },
        error: defaultError,
      }),
      updateUser: jest.fn().mockResolvedValue({
        data: { user: null },
        error: defaultError,
      }),
      resetPasswordForEmail: jest.fn().mockResolvedValue({
        data: {},
        error: defaultError,
      }),
      onAuthStateChange: jest.fn().mockReturnValue({
        data: { subscription: { unsubscribe: jest.fn() } },
      }),
    },

    // Storage
    storage: {
      from: jest.fn((bucket: string) => ({
        upload: jest.fn().mockResolvedValue({ data: null, error: defaultError }),
        download: jest.fn().mockResolvedValue({ data: null, error: defaultError }),
        remove: jest.fn().mockResolvedValue({ data: null, error: defaultError }),
        list: jest.fn().mockResolvedValue({ data: [], error: defaultError }),
        getPublicUrl: jest.fn().mockReturnValue({
          data: { publicUrl: '' },
        }),
        createSignedUrl: jest.fn().mockResolvedValue({
          data: { signedUrl: '' },
          error: defaultError,
        }),
      })),
    },

    // Edge Functions
    functions: {
      invoke: jest.fn().mockResolvedValue({
        data: defaultData,
        error: defaultError,
      }),
    },
  };

  return supabaseMock;
}

/**
 * Helper to set mock data for a specific table query
 *
 * @example
 * const supabase = createSupabaseMock();
 * setMockData(supabase, 'users', { id: '123', email: 'test@example.com' });
 */
export function setMockData(
  supabase: MockSupabaseClient,
  table: string,
  data: unknown,
  error: unknown = null
): void {
  (supabase.from as jest.Mock).mockImplementation((tableName: string) => {
    if (tableName === table) {
      return createQueryBuilderMock({ data, error });
    }
    return createQueryBuilderMock({ data: null, error: null });
  });
}

/**
 * Helper to queue multiple mock responses in order
 *
 * @example
 * const supabase = createSupabaseMock();
 * queueMockData(supabase, [
 *   { data: user1, error: null },
 *   { data: user2, error: null },
 *   { data: null, error: { message: 'Not found' } }
 * ]);
 */
export function queueMockData(
  supabase: MockSupabaseClient,
  responses: Array<{ data: unknown; error: unknown }>
): void {
  let callCount = 0;
  (supabase.from as jest.Mock).mockImplementation(() => {
    const response = responses[callCount] || responses[responses.length - 1];
    callCount++;
    return createQueryBuilderMock(response);
  });
}

/**
 * Reset all mocks to their default state
 */
export function resetSupabaseMock(supabase: MockSupabaseClient): void {
  Object.values(supabase).forEach((value) => {
    if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach((fn) => {
        if (typeof fn === 'function' && 'mockClear' in fn) {
          (fn as jest.Mock).mockClear();
        }
      });
    }
  });
}
