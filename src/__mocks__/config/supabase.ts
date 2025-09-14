// Fallback manual mock for nested resolution differences in TS/Jest
const createMockChain = () => {
  const chain: any = {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
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
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
  };
  Object.keys(chain).forEach((k) => {
    if (k !== 'single' && k !== 'maybeSingle') {
      chain[k].mockReturnValue(chain);
    }
  });
  return chain;
};

export const supabase: any = {
  from: jest.fn(() => createMockChain()),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    send: jest.fn(),
  })),
  removeChannel: jest.fn(),
  getChannels: jest.fn(() => []),
  auth: {
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
};

export default supabase;

