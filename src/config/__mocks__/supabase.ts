const buildChain = () => {
  const chain: any = {};
  const methods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'lt', 'gte', 'lte', 'like', 'ilike', 'in', 'or', 'and', 'not',
    'order', 'limit', 'range', 'textSearch'
  ];
  methods.forEach((m) => {
    chain[m] = jest.fn().mockReturnValue(chain);
  });
  chain.single = jest.fn().mockResolvedValue({ data: null, error: null });
  chain.maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null });
  return chain;
};

const sharedChain = buildChain();

export const supabase = {
  from: jest.fn(() => sharedChain),
  auth: {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signOut: jest.fn(),
    getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
    getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
  },
  functions: { invoke: jest.fn() },
};

export default { supabase };


