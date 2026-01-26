// Simple working mock for MeetingService tests
const mockState = {
  data: null as any,
  dataQueue: [] as any[], // Queue for sequential responses
};

const createMockChain = () => {
  const chain: any = {
    insert: jest.fn(() => chain),
    select: jest.fn(() => chain),
    eq: jest.fn(() => chain),
    gte: jest.fn(() => chain),
    lte: jest.fn(() => chain),
    in: jest.fn(() => chain),
    single: jest.fn(() => {
      const currentData = mockState.data;
      // Return proper response structure for single operations
      if (currentData === null || currentData === undefined) {
        return Promise.resolve({ data: null, error: { code: 'PGRST116', message: 'Not found' } });
      }
      return Promise.resolve({ data: currentData, error: null });
    }),
    update: jest.fn(() => chain),
    upsert: jest.fn(() => chain),
    order: jest.fn(() => chain),
    limit: jest.fn(() => chain),
    throwOnError: jest.fn(() => chain),
    // Handle promise resolution for non-single operations (arrays)
    then: jest.fn((resolve) => {
      // Check queue first for sequential responses
      let currentData = mockState.data;
      if (mockState.dataQueue.length > 0) {
        currentData = mockState.dataQueue.shift();
      }

      if (currentData === null) {
        const result = { data: [], error: null }; // Empty array for failed list operations
        return Promise.resolve(result).then(resolve);
      }
      // If currentData is an array, return it; if single item, wrap in array for list operations
      const responseData = Array.isArray(currentData) ? currentData : [currentData];
      const result = { data: responseData, error: null };
      return Promise.resolve(result).then(resolve);
    }),
  };
  return chain;
};

export const supabase = {
  from: jest.fn(() => createMockChain()),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
  })),
  auth: {
    signUp: jest.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
};

// Helper functions for tests
export const __setMockData = (data: unknown) => {
  mockState.data = data;
};

export const __queueMockData = (dataArray: unknown[]) => {
  mockState.dataQueue = [...dataArray];
};

export const __resetSupabaseMock = () => {
  jest.clearAllMocks();
  mockState.data = null;
  mockState.dataQueue = [];
};

export const __getMockData = () => mockState.data;

// Legacy compatibility functions (do the same as above)
export const __queueSupabaseSingle = (table: string, response: any) => {
  __setMockData(response.data);
};

export const __setSupabaseDefaultSingle = (table: string, response: any) => {
  __setMockData(response.data);
};

export const __setSupabaseDefaultList = (table: string, response: any) => {
  __setMockData(response.data);
};

export const __queueSupabaseList = (table: string, response: any) => {
  __setMockData(response.data);
};

export const __getSupabaseMockState = () => ({ mockData });

export default supabase;
