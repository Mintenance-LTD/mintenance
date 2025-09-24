// Fallback manual mock for nested resolution differences in TS/Jest
import '../../test-utils/jest-globals';

const createStub = () => global.jest?.fn?.() || (() => {});
const createChainStub = () => global.jest?.fn?.() || (() => ({}));
const createPromiseStub = (value: any) =>
  global.jest?.fn?.()?.mockResolvedValue?.(value) || (() => Promise.resolve(value));

const createMockChain = () => {
  const chain: any = {};

  // Chain methods that return the chain
  const chainMethods = [
    'select', 'insert', 'update', 'upsert', 'delete', 'eq', 'neq',
    'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in', 'or', 'and',
    'not', 'order', 'limit', 'range'
  ];

  chainMethods.forEach(method => {
    chain[method] = global.jest?.fn?.()?.mockReturnValue?.(chain) || (() => chain);
  });

  // Terminal methods that return promises
  chain.single = createPromiseStub({ data: null, error: null });
  chain.maybeSingle = createPromiseStub({ data: null, error: null });

  return chain;
};

export const supabase: any = {
  from: global.jest?.fn?.(() => createMockChain()) || (() => createMockChain()),
  channel: global.jest?.fn?.(() => ({
    on: createChainStub(),
    subscribe: createStub(),
    unsubscribe: createStub(),
    send: createStub(),
  })) || (() => ({
    on: () => ({}),
    subscribe: () => {},
    unsubscribe: () => {},
    send: () => {},
  })),
  removeChannel: createStub(),
  getChannels: global.jest?.fn?.(() => []) || (() => []),
  auth: {
    getSession: createPromiseStub({ data: { session: null }, error: null }),
  },
};

export default supabase;

