"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.__setSupabaseDefaultList = exports.__setSupabaseDefaultSingle = exports.__queueSupabaseList = exports.__queueSupabaseSingle = exports.__resetSupabaseMock = exports.supabase = void 0;
const singleQueues = {};
const listQueues = {};
const defaultSingles = {};
const defaultLists = {};
const getSingleResponse = (table) => {
    var _a;
    const queue = singleQueues[table];
    if (queue && queue.length) {
        return queue.shift();
    }
    return (_a = defaultSingles[table]) !== null && _a !== void 0 ? _a : { data: null, error: null };
};
const getListResponse = (table) => {
    var _a;
    const queue = listQueues[table];
    if (queue && queue.length) {
        return queue.shift();
    }
    return (_a = defaultLists[table]) !== null && _a !== void 0 ? _a : { data: [], error: null };
};
const createMockChain = (table) => {
    const chain = {};
    const passthrough = (fn) => fn.mockReturnValue(chain);
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
    chain.single = jest.fn(() => Promise.resolve(getSingleResponse(table)));
    chain.maybeSingle = jest.fn(() => Promise.resolve(getSingleResponse(table)));
    chain.then = (resolve, reject) => Promise.resolve(getListResponse(table)).then(resolve, reject);
    chain.catch = (reject) => Promise.resolve(getListResponse(table)).catch(reject);
    [
        chain.select,
        chain.insert,
        chain.update,
        chain.upsert,
        chain.delete,
        chain.eq,
        chain.neq,
        chain.gt,
        chain.gte,
        chain.lt,
        chain.lte,
        chain.like,
        chain.ilike,
        chain.in,
        chain.or,
        chain.and,
        chain.not,
        chain.order,
        chain.limit,
        chain.range,
        chain.textSearch,
    ].forEach(passthrough);
    return chain;
};
console.log('[jest] Using manual mock: src/config/__mocks__/supabase.ts');
const createChannelMock = () => {
    const channel = {
        on: jest.fn().mockReturnThis(),
        subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
        unsubscribe: jest.fn(),
        send: jest.fn(),
    };
    return channel;
};
const fromMock = jest.fn((table) => createMockChain(table));
exports.supabase = {
    from: fromMock,
    channel: jest.fn(() => createChannelMock()),
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
const __resetSupabaseMock = () => {
    Object.keys(singleQueues).forEach((key) => (singleQueues[key] = []));
    Object.keys(listQueues).forEach((key) => (listQueues[key] = []));
    Object.keys(defaultSingles).forEach((key) => delete defaultSingles[key]);
    Object.keys(defaultLists).forEach((key) => delete defaultLists[key]);
    fromMock.mockClear();
    exports.supabase.channel.mockClear();
    exports.supabase.removeChannel.mockClear();
    exports.supabase.getChannels.mockClear();
    Object.values(exports.supabase.auth).forEach((fn) => { var _a; return (_a = fn.mockClear) === null || _a === void 0 ? void 0 : _a.call(fn); });
};
exports.__resetSupabaseMock = __resetSupabaseMock;
const __queueSupabaseSingle = (table, response) => {
    var _a;
    ((_a = singleQueues[table]) !== null && _a !== void 0 ? _a : (singleQueues[table] = [])).push(response);
};
exports.__queueSupabaseSingle = __queueSupabaseSingle;
const __queueSupabaseList = (table, response) => {
    var _a;
    ((_a = listQueues[table]) !== null && _a !== void 0 ? _a : (listQueues[table] = [])).push(response);
};
exports.__queueSupabaseList = __queueSupabaseList;
const __setSupabaseDefaultSingle = (table, response) => {
    defaultSingles[table] = response;
};
exports.__setSupabaseDefaultSingle = __setSupabaseDefaultSingle;
const __setSupabaseDefaultList = (table, response) => {
    defaultLists[table] = response;
};
exports.__setSupabaseDefaultList = __setSupabaseDefaultList;
exports.default = exports.supabase;
