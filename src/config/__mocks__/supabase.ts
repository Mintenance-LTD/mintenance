// Jest manual mock for Supabase client used in tests that call jest.mock('.../config/supabase')
// Provides a chainable query builder surface.

const createMockChain = () => {
  const chain: any = {};
  // Build methods explicitly to ensure mockReturnValue binding works
  chain.select = jest.fn();
  chain.insert = jest.fn();
  chain.update = jest.fn();
  chain.upsert = jest.fn();
  chain.delete = jest.fn();
  chain.eq = jest.fn();
  chain.neq = jest.fn();
  chain.gt = jest.fn();
  chain.gte = jest.fn();
  chain.lt = jest.fn();
  chain.lte = jest.fn();
  chain.like = jest.fn();
  chain.ilike = jest.fn();
  chain.in = jest.fn();
  chain.or = jest.fn();
  chain.and = jest.fn();
  chain.not = jest.fn();
  chain.order = jest.fn();
  chain.limit = jest.fn();
  chain.range = jest.fn();
  chain.textSearch = jest.fn();
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });

  const ret = (fn: any) => fn.mockReturnValue(chain);
  ret(chain.select);
  ret(chain.insert);
  ret(chain.update);
  ret(chain.upsert);
  ret(chain.delete);
  ret(chain.eq);
  ret(chain.neq);
  ret(chain.gt);
  ret(chain.gte);
  ret(chain.lt);
  ret(chain.lte);
  ret(chain.like);
  ret(chain.ilike);
  ret(chain.in);
  ret(chain.or);
  ret(chain.and);
  ret(chain.not);
  ret(chain.order);
  ret(chain.limit);
  ret(chain.range);
  ret(chain.textSearch);
  return chain;
};

console.log('[jest] Using manual mock: src/config/__mocks__/supabase.ts');

// Use a SINGLE persistent chain instance so tests that mutate leaf mocks
// (e.g., .single.mockResolvedValue) affect subsequent service calls
const persistentChain = createMockChain();

export const supabase: any = {
  from: jest.fn(() => persistentChain),
  channel: jest.fn(() => ({
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn(),
    unsubscribe: jest.fn(),
    send: jest.fn(),
  })),
  removeChannel: jest.fn(),
  getChannels: jest.fn(() => []),
  auth: {
    signUp: jest.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null })),
    signInWithPassword: jest.fn(() => Promise.resolve({ data: { user: { id: 'u1' } }, error: null })),
    signOut: jest.fn(() => Promise.resolve({ error: null })),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null }, error: null })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null }, error: null })),
  },
};

export default supabase;
