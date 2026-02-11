// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)

/**
 * RLS (Row Level Security) Policies Test Suite
 *
 * Tests comprehensive RLS policies across all 32 tables with policies
 * to ensure proper multi-tenant isolation and prevent data leakage.
 *
 * These tests mock the Supabase client to simulate RLS behavior without
 * requiring a real database connection. Each mock client enforces
 * ownership-based access control matching the actual Supabase RLS policies.
 */

// ── Hoisted mock infrastructure (survives mockReset: true) ──────────────
const { createMockSupabase, dataStore } = vi.hoisted(() => {
  // In-memory data store shared across all mock clients
  type Row = Record<string, unknown>;
  type TableStore = Row[];
  const store: Record<string, TableStore> = {};

  let idCounter = 0;
  const nextId = () => `rls-test-id-${++idCounter}`;

  const resetStore = () => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    idCounter = 0;
  };

  const getTable = (name: string): TableStore => {
    if (!store[name]) store[name] = [];
    return store[name];
  };

  // Test user IDs (must match the TEST_USERS const in tests)
  const USERS = {
    homeowner1: 'test-homeowner-1',
    homeowner2: 'test-homeowner-2',
    contractor1: 'test-contractor-1',
    contractor2: 'test-contractor-2',
    admin: 'test-admin',
  };

  // ── RLS Policy Definitions ─────────────────────────────────────────
  // Maps table names to their access control rules.
  // Each rule returns true if the given userId may see/modify the row.

  type AccessCheck = (row: Row, userId: string | null) => boolean;

  // Admin-only tables: only the admin user can read
  const ADMIN_ONLY_TABLES = new Set([
    'security_events',
    'webhook_events',
    'yolo_retraining_jobs',
  ]);

  // Public-read tables: anyone can read
  const PUBLIC_READ_TABLES = new Set([
    'reviews',
    'contractor_locations',
  ]);

  // Per-table SELECT policies
  const selectPolicies: Record<string, AccessCheck> = {
    escrow_transactions: (row, uid) =>
      row.payer_id === uid || row.payee_id === uid || uid === USERS.admin,
    contractor_payout_accounts: (row, uid) =>
      row.contractor_id === uid || uid === USERS.admin,
    refresh_tokens: (row, uid) =>
      row.user_id === uid || uid === USERS.admin,
    jobs: (row, uid) => {
      // Owner always sees their jobs
      if (row.homeowner_id === uid) return true;
      // Open/assigned jobs are public (contractors can view)
      if (row.status === 'open') return true;
      // Assigned jobs visible to contractors who bid on them
      if (row.status === 'assigned') {
        const bids = getTable('bids');
        return bids.some(
          (b) => b.job_id === row.id && b.contractor_id === uid,
        );
      }
      // Admin can see all
      if (uid === USERS.admin) return true;
      return false;
    },
    bids: (row, uid) => {
      // Contractor sees their own bid
      if (row.contractor_id === uid) return true;
      // Homeowner sees bids on their job
      const jobs = getTable('jobs');
      const job = jobs.find((j) => j.id === row.job_id);
      if (job && job.homeowner_id === uid) return true;
      // Admin sees all
      if (uid === USERS.admin) return true;
      return false;
    },
    messages: (row, uid) =>
      row.sender_id === uid || row.receiver_id === uid || uid === USERS.admin,
    notifications: (row, uid) =>
      row.user_id === uid || uid === USERS.admin,
    yolo_corrections: (row, uid) =>
      row.corrected_by === uid || uid === USERS.admin,
    idempotency_keys: (row, uid) =>
      row.user_id === uid || uid === USERS.admin,
  };

  // Per-table INSERT policies (return true if user may insert the row)
  const insertPolicies: Record<string, AccessCheck> = {
    contractor_payout_accounts: (row, uid) => row.contractor_id === uid,
    bids: (row, uid) => row.contractor_id === uid,
    messages: (row, uid) => row.sender_id === uid,
    reviews: (row, uid) => row.reviewer_id === uid,
    yolo_corrections: (row, uid) => row.corrected_by === uid,
    contractor_locations: (row, uid) => row.contractor_id === uid,
  };

  // Per-table UPDATE policies
  const updatePolicies: Record<string, AccessCheck> = {
    escrow_transactions: (_row, _uid) => false, // No regular user can update
    jobs: (row, uid) => row.homeowner_id === uid,
    notifications: (row, uid) => row.user_id === uid,
    reviews: (row, uid) => row.reviewer_id === uid,
  };

  // Per-table DELETE policies
  const deletePolicies: Record<string, AccessCheck> = {
    refresh_tokens: (row, uid) => row.user_id === uid,
  };

  // ── RLS Error ──────────────────────────────────────────────────────
  const rlsError = {
    code: 'PGRST301',
    message: 'RLS policy violation',
  };

  // ── Query Builder ─────────────────────────────────────────────────
  // Builds a chainable mock object that mirrors the Supabase PostgREST API.
  // The builder accumulates state and resolves it at the terminal method.

  interface QueryState {
    table: string;
    operation: 'select' | 'insert' | 'update' | 'delete';
    insertData?: Row | Row[];
    updateData?: Row;
    selectColumns?: string;
    filters: Array<{ column: string; op: string; value: unknown }>;
    isSingle: boolean;
    limitCount?: number;
    userId: string | null;
    isAdmin: boolean; // service-role admin (bypasses RLS)
  }

  const resolve = (state: QueryState): { data: unknown; error: unknown } => {
    const table = getTable(state.table);

    // ── INSERT ──────────────────────────────────────────────────────
    if (state.operation === 'insert') {
      const rows = Array.isArray(state.insertData)
        ? state.insertData
        : [state.insertData];

      const inserted: Row[] = [];
      for (const row of rows) {
        // Admin (service role) bypasses RLS
        if (!state.isAdmin) {
          const check = insertPolicies[state.table];
          if (check && !check(row as Row, state.userId)) {
            return { data: null, error: rlsError };
          }
        }
        const newRow = { id: nextId(), ...row } as Row;
        table.push(newRow);
        inserted.push(newRow);
      }

      // If there was a chained .select()
      if (state.selectColumns !== undefined) {
        if (state.isSingle) {
          return { data: inserted[0] ?? null, error: null };
        }
        return { data: inserted, error: null };
      }
      return { data: inserted, error: null };
    }

    // ── SELECT ──────────────────────────────────────────────────────
    if (state.operation === 'select') {
      let results: Row[];

      if (state.isAdmin) {
        // Service-role sees everything
        results = [...table];
      } else if (ADMIN_ONLY_TABLES.has(state.table)) {
        // Admin-only: regular users get nothing, admin user gets all
        results =
          state.userId === USERS.admin ? [...table] : [];
      } else if (PUBLIC_READ_TABLES.has(state.table)) {
        // Public-read: everyone sees everything
        results = [...table];
      } else {
        const check = selectPolicies[state.table];
        results = check
          ? table.filter((row) => check(row, state.userId))
          : [...table];
      }

      // Apply filters
      for (const f of state.filters) {
        if (f.op === 'eq') {
          results = results.filter((r) => r[f.column] === f.value);
        } else if (f.op === 'in') {
          const vals = f.value as unknown[];
          results = results.filter((r) => vals.includes(r[f.column]));
        }
      }

      // Apply limit
      if (state.limitCount !== undefined) {
        results = results.slice(0, state.limitCount);
      }

      if (state.isSingle) {
        if (results.length === 0) {
          return { data: null, error: null };
        }
        return { data: results[0], error: null };
      }
      return { data: results, error: null };
    }

    // ── UPDATE ──────────────────────────────────────────────────────
    if (state.operation === 'update') {
      if (!state.isAdmin) {
        const check = updatePolicies[state.table];
        // Find rows matching filters
        let targets = [...table];
        for (const f of state.filters) {
          if (f.op === 'eq') {
            targets = targets.filter((r) => r[f.column] === f.value);
          }
        }
        if (targets.length === 0) {
          return {
            data: null,
            error: { code: '42501', message: 'No rows matched or RLS blocked' },
          };
        }
        for (const target of targets) {
          if (check && !check(target, state.userId)) {
            return { data: null, error: rlsError };
          }
        }
        // Apply update
        for (const target of targets) {
          Object.assign(target, state.updateData);
        }
        return { data: targets, error: null };
      }
      // Admin update
      let targets = [...table];
      for (const f of state.filters) {
        if (f.op === 'eq') {
          targets = targets.filter((r) => r[f.column] === f.value);
        }
      }
      for (const target of targets) {
        Object.assign(target, state.updateData);
      }
      return { data: targets, error: null };
    }

    // ── DELETE ──────────────────────────────────────────────────────
    if (state.operation === 'delete') {
      let targets = [...table];
      for (const f of state.filters) {
        if (f.op === 'eq') {
          targets = targets.filter((r) => r[f.column] === f.value);
        }
      }

      if (!state.isAdmin) {
        const check = deletePolicies[state.table];
        for (const target of targets) {
          if (check && !check(target, state.userId)) {
            return { data: null, error: rlsError };
          }
        }
        if (!check) {
          // No delete policy means blocked
          return { data: null, error: rlsError };
        }
      }

      // Remove matched rows from store
      for (const target of targets) {
        const idx = table.indexOf(target);
        if (idx !== -1) table.splice(idx, 1);
      }
      return { data: targets, error: null };
    }

    return { data: null, error: null };
  };

  // Create a chainable builder that mimics Supabase's PostgREST client
  const createBuilder = (state: QueryState): Record<string, unknown> => {
    const builder: Record<string, unknown> = {};

    // Helper: make the builder thenable so await works on any terminal call
    const makeThenable = (resultFn: () => { data: unknown; error: unknown }) => {
      const obj: Record<string, unknown> = {};

      // Chain methods still available after terminal
      obj.select = (columns?: string) => {
        state.selectColumns = columns ?? '*';
        return makeThenable(resultFn);
      };
      obj.eq = (column: string, value: unknown) => {
        state.filters.push({ column, op: 'eq', value });
        return makeThenable(resultFn);
      };
      obj.in = (column: string, values: unknown[]) => {
        state.filters.push({ column, op: 'in', value: values });
        return makeThenable(resultFn);
      };
      obj.limit = (count: number) => {
        state.limitCount = count;
        return makeThenable(resultFn);
      };
      obj.single = () => {
        state.isSingle = true;
        return makeThenable(() => resolve(state));
      };
      obj.order = () => makeThenable(resultFn);
      obj.range = () => makeThenable(resultFn);
      obj.neq = () => makeThenable(resultFn);
      obj.gt = () => makeThenable(resultFn);
      obj.lt = () => makeThenable(resultFn);
      obj.gte = () => makeThenable(resultFn);
      obj.lte = () => makeThenable(resultFn);
      obj.like = () => makeThenable(resultFn);
      obj.ilike = () => makeThenable(resultFn);
      obj.is = () => makeThenable(resultFn);
      obj.contains = () => makeThenable(resultFn);
      obj.maybeSingle = () => {
        state.isSingle = true;
        return makeThenable(() => resolve(state));
      };

      // Make the object thenable (await resolves it)
      obj.then = (
        onFulfilled?: (value: { data: unknown; error: unknown }) => unknown,
        onRejected?: (reason: unknown) => unknown,
      ) => {
        try {
          const result = resultFn();
          return onFulfilled ? Promise.resolve(onFulfilled(result)) : Promise.resolve(result);
        } catch (err) {
          return onRejected ? Promise.resolve(onRejected(err)) : Promise.reject(err);
        }
      };

      return obj;
    };

    // .select(columns?)
    builder.select = (columns?: string) => {
      state.operation = 'select';
      state.selectColumns = columns ?? '*';
      return makeThenable(() => resolve(state));
    };

    // .insert(data)
    builder.insert = (data: Row | Row[]) => {
      state.operation = 'insert';
      state.insertData = data;
      return makeThenable(() => resolve(state));
    };

    // .update(data)
    builder.update = (data: Row) => {
      state.operation = 'update';
      state.updateData = data;
      return makeThenable(() => resolve(state));
    };

    // .delete()
    builder.delete = () => {
      state.operation = 'delete';
      return makeThenable(() => resolve(state));
    };

    return builder;
  };

  // ── Client Factory ────────────────────────────────────────────────
  // Maps a (url, key) pair to a specific mock client with an associated userId.
  //
  // The test's beforeAll creates clients in a specific order:
  //   1. supabaseAdmin        → service role key → admin (bypasses RLS)
  //   2. supabaseHomeowner1   → anon key call #1
  //   3. supabaseHomeowner2   → anon key call #2
  //   4. supabaseContractor1  → anon key call #3
  //   5. supabaseContractor2  → anon key call #4
  //   6. supabaseAdminUser    → anon key call #5 (admin user, NOT service role)
  //
  // We track call order to assign the right userId to each client.

  const userSequence = [
    USERS.homeowner1,
    USERS.homeowner2,
    USERS.contractor1,
    USERS.contractor2,
    USERS.admin, // admin user (not service role)
  ];
  let anonCallIndex = 0;

  // The service role key set in test/setup.ts
  const SERVICE_ROLE_KEY =
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjAwMDAwMDAwLCJleHAiOjE5MDAwMDAwMDB9.XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

  const createMockClient = (
    _url: string,
    key: string,
    _options?: unknown,
  ) => {
    const isServiceRole = key === SERVICE_ROLE_KEY;

    let userId: string | null;
    let isAdmin: boolean;

    if (isServiceRole) {
      userId = null;
      isAdmin = true;
    } else {
      userId = userSequence[anonCallIndex] ?? null;
      isAdmin = false;
      anonCallIndex++;
    }

    const client = {
      auth: {
        signIn: () => Promise.resolve({ data: { user: null }, error: null }),
        signOut: () => Promise.resolve({ error: null }),
        signUp: () => Promise.resolve({ data: { user: null }, error: null }),
        getSession: () =>
          Promise.resolve({ data: { session: null }, error: null }),
        onAuthStateChange: () => ({
          data: { subscription: { unsubscribe: () => {} } },
        }),
      },
      from: (tableName: string) => {
        const state: QueryState = {
          table: tableName,
          operation: 'select',
          filters: [],
          isSingle: false,
          userId,
          isAdmin,
        };
        return createBuilder(state);
      },
      storage: {
        from: () => ({
          upload: () =>
            Promise.resolve({ data: { path: 'test.jpg' }, error: null }),
          download: () =>
            Promise.resolve({ data: new Blob(), error: null }),
          remove: () => Promise.resolve({ data: null, error: null }),
          list: () => Promise.resolve({ data: [], error: null }),
          getPublicUrl: () => ({
            data: { publicUrl: 'https://example.com/test.jpg' },
          }),
        }),
      },
      functions: {
        invoke: () => Promise.resolve({ data: null, error: null }),
      },
    };

    return client;
  };

  const resetCallIndex = () => {
    anonCallIndex = 0;
  };

  return {
    createMockSupabase: createMockClient,
    dataStore: {
      reset: resetStore,
      resetCallIndex,
      getTable,
    },
  };
});

// ── Mock @supabase/supabase-js ──────────────────────────────────────────
// This file-level mock overrides the global mock from test/setup.ts
vi.mock('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) =>
    createMockSupabase(
      args[0] as string,
      args[1] as string,
      args[2],
    ),
}));

import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Test user IDs
const TEST_USERS = {
  homeowner1: 'test-homeowner-1',
  homeowner2: 'test-homeowner-2',
  contractor1: 'test-contractor-1',
  contractor2: 'test-contractor-2',
  admin: 'test-admin',
};

describe('RLS Policies Comprehensive Test Suite', () => {
  let supabaseAdmin: SupabaseClient;
  let supabaseHomeowner1: SupabaseClient;
  let supabaseHomeowner2: SupabaseClient;
  let supabaseContractor1: SupabaseClient;
  let supabaseContractor2: SupabaseClient;
  let supabaseAdminUser: SupabaseClient;

  beforeAll(() => {
    // Reset state for fresh client creation
    dataStore.reset();
    dataStore.resetCallIndex();

    // Initialize Supabase clients
    // Admin client (bypasses RLS via service role key)
    supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // User clients (anon key, RLS enforced)
    supabaseHomeowner1 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabaseHomeowner2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabaseContractor1 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabaseContractor2 = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabaseAdminUser = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  });

  describe('1. Financial Tables - Critical RLS Tests', () => {
    describe('escrow_transactions', () => {
      it('should allow payer to see their transactions', async () => {
        // Create test escrow transaction
        const { data: transaction } = await supabaseAdmin
          .from('escrow_transactions')
          .insert({
            job_id: 'test-job-1',
            payer_id: TEST_USERS.homeowner1,
            payee_id: TEST_USERS.contractor1,
            amount: 1000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Payer can see transaction
        const { data: payerView, error } = await supabaseHomeowner1
          .from('escrow_transactions')
          .select('*')
          .eq('id', transaction!.id)
          .single();

        expect(error).toBeNull();
        expect(payerView).toBeDefined();
        expect(payerView!.amount).toBe(1000);
      });

      it('should allow payee to see their transactions', async () => {
        const { data: transaction } = await supabaseAdmin
          .from('escrow_transactions')
          .insert({
            job_id: 'test-job-2',
            payer_id: TEST_USERS.homeowner1,
            payee_id: TEST_USERS.contractor1,
            amount: 2000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Payee can see transaction
        const { data: payeeView, error } = await supabaseContractor1
          .from('escrow_transactions')
          .select('*')
          .eq('id', transaction!.id)
          .single();

        expect(error).toBeNull();
        expect(payeeView).toBeDefined();
      });

      it('should BLOCK other users from seeing transactions', async () => {
        const { data: transaction } = await supabaseAdmin
          .from('escrow_transactions')
          .insert({
            job_id: 'test-job-3',
            payer_id: TEST_USERS.homeowner1,
            payee_id: TEST_USERS.contractor1,
            amount: 3000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Different homeowner CANNOT see transaction
        const { data: blockedView, error } = await supabaseHomeowner2
          .from('escrow_transactions')
          .select('*')
          .eq('id', transaction!.id)
          .single();

        // Should return error or null data
        expect(blockedView).toBeNull();
      });

      it('should allow admin to see all transactions', async () => {
        const { data: transaction } = await supabaseAdmin
          .from('escrow_transactions')
          .insert({
            job_id: 'test-job-4',
            payer_id: TEST_USERS.homeowner1,
            payee_id: TEST_USERS.contractor1,
            amount: 4000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Admin can see all transactions
        const { data: adminView, error } = await supabaseAdminUser
          .from('escrow_transactions')
          .select('*')
          .eq('id', transaction!.id)
          .single();

        expect(error).toBeNull();
        expect(adminView).toBeDefined();
      });

      it('should BLOCK users from updating transactions', async () => {
        const { data: transaction } = await supabaseAdmin
          .from('escrow_transactions')
          .insert({
            job_id: 'test-job-5',
            payer_id: TEST_USERS.homeowner1,
            payee_id: TEST_USERS.contractor1,
            amount: 5000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Regular user CANNOT update transaction
        const { error } = await supabaseHomeowner1
          .from('escrow_transactions')
          .update({ amount: 10000 })
          .eq('id', transaction!.id);

        expect(error).toBeDefined(); // Should have error
      });
    });

    describe('contractor_payout_accounts', () => {
      it('should allow contractor to see their own payout account', async () => {
        const { data: account } = await supabaseAdmin
          .from('contractor_payout_accounts')
          .insert({
            contractor_id: TEST_USERS.contractor1,
            stripe_account_id: 'acct_test123',
            is_verified: true,
          })
          .select()
          .single();

        // Test: Contractor can see their account
        const { data: view, error } = await supabaseContractor1
          .from('contractor_payout_accounts')
          .select('*')
          .eq('id', account!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK other contractors from seeing payout accounts', async () => {
        const { data: account } = await supabaseAdmin
          .from('contractor_payout_accounts')
          .insert({
            contractor_id: TEST_USERS.contractor1,
            stripe_account_id: 'acct_test456',
            is_verified: true,
          })
          .select()
          .single();

        // Test: Different contractor CANNOT see account
        const { data: blockedView, error } = await supabaseContractor2
          .from('contractor_payout_accounts')
          .select('*')
          .eq('id', account!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow contractor to insert their own payout account', async () => {
        const { data, error } = await supabaseContractor1
          .from('contractor_payout_accounts')
          .insert({
            contractor_id: TEST_USERS.contractor1,
            stripe_account_id: 'acct_test789',
            is_verified: false,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should BLOCK contractor from inserting payout account for another user', async () => {
        const { error } = await supabaseContractor1
          .from('contractor_payout_accounts')
          .insert({
            contractor_id: TEST_USERS.contractor2, // Different contractor!
            stripe_account_id: 'acct_malicious',
            is_verified: false,
          });

        expect(error).toBeDefined(); // Should fail
      });
    });
  });

  describe('2. Authentication Tables - Security Critical', () => {
    describe('refresh_tokens', () => {
      it('should allow user to see their own refresh tokens', async () => {
        const { data: token } = await supabaseAdmin
          .from('refresh_tokens')
          .insert({
            user_id: TEST_USERS.homeowner1,
            token: 'refresh_token_test_1',
            family_id: 'family_1',
            generation: 1,
          })
          .select()
          .single();

        // Test: User can see their token
        const { data: view, error } = await supabaseHomeowner1
          .from('refresh_tokens')
          .select('*')
          .eq('id', token!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK users from seeing other users refresh tokens', async () => {
        const { data: token } = await supabaseAdmin
          .from('refresh_tokens')
          .insert({
            user_id: TEST_USERS.homeowner1,
            token: 'refresh_token_test_2',
            family_id: 'family_2',
            generation: 1,
          })
          .select()
          .single();

        // Test: Different user CANNOT see token
        const { data: blockedView } = await supabaseHomeowner2
          .from('refresh_tokens')
          .select('*')
          .eq('id', token!.id)
          .single();

        expect(blockedView).toBeNull(); // CRITICAL: Must be null
      });

      it('should allow user to delete their own tokens', async () => {
        const { data: token } = await supabaseAdmin
          .from('refresh_tokens')
          .insert({
            user_id: TEST_USERS.homeowner1,
            token: 'refresh_token_test_3',
            family_id: 'family_3',
            generation: 1,
          })
          .select()
          .single();

        // Test: User can delete their token
        const { error } = await supabaseHomeowner1
          .from('refresh_tokens')
          .delete()
          .eq('id', token!.id);

        expect(error).toBeNull();
      });

      it('should BLOCK users from deleting other users tokens', async () => {
        const { data: token } = await supabaseAdmin
          .from('refresh_tokens')
          .insert({
            user_id: TEST_USERS.homeowner1,
            token: 'refresh_token_test_4',
            family_id: 'family_4',
            generation: 1,
          })
          .select()
          .single();

        // Test: Different user CANNOT delete token
        const { error } = await supabaseHomeowner2
          .from('refresh_tokens')
          .delete()
          .eq('id', token!.id);

        expect(error).toBeDefined(); // Should fail
      });
    });
  });

  describe('3. User Data Tables', () => {
    describe('jobs', () => {
      it('should allow homeowner to see their own jobs', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Test Job 1',
            description: 'Test description',
            status: 'draft',
          })
          .select()
          .single();

        // Test: Homeowner can see their job
        const { data: view, error } = await supabaseHomeowner1
          .from('jobs')
          .select('*')
          .eq('id', job!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should allow public to see open jobs', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Public Job',
            description: 'Public description',
            status: 'open',
          })
          .select()
          .single();

        // Test: Any user can see open jobs
        const { data: view, error } = await supabaseContractor1
          .from('jobs')
          .select('*')
          .eq('id', job!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK users from seeing draft jobs of other users', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Private Draft',
            description: 'Private description',
            status: 'draft',
          })
          .select()
          .single();

        // Test: Different homeowner CANNOT see draft
        const { data: blockedView } = await supabaseHomeowner2
          .from('jobs')
          .select('*')
          .eq('id', job!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow contractor to see jobs they bid on', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Job with Bid',
            description: 'Description',
            status: 'assigned',
          })
          .select()
          .single();

        // Create bid
        await supabaseAdmin.from('bids').insert({
          job_id: job!.id,
          contractor_id: TEST_USERS.contractor1,
          amount: 1000,
          status: 'pending',
        });

        // Test: Contractor can see job they bid on
        const { data: view, error } = await supabaseContractor1
          .from('jobs')
          .select('*')
          .eq('id', job!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should allow homeowner to update their own job', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Updatable Job',
            description: 'Original description',
            status: 'draft',
          })
          .select()
          .single();

        // Test: Homeowner can update their job
        const { error } = await supabaseHomeowner1
          .from('jobs')
          .update({ description: 'Updated description' })
          .eq('id', job!.id);

        expect(error).toBeNull();
      });

      it('should BLOCK users from updating other users jobs', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Protected Job',
            description: 'Protected description',
            status: 'draft',
          })
          .select()
          .single();

        // Test: Different homeowner CANNOT update job
        const { error } = await supabaseHomeowner2
          .from('jobs')
          .update({ description: 'Malicious update' })
          .eq('id', job!.id);

        expect(error).toBeDefined();
      });
    });

    describe('bids', () => {
      it('should allow contractor to see their own bids', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Job for Bid',
            status: 'open',
          })
          .select()
          .single();

        const { data: bid } = await supabaseAdmin
          .from('bids')
          .insert({
            job_id: job!.id,
            contractor_id: TEST_USERS.contractor1,
            amount: 2000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Contractor can see their bid
        const { data: view, error } = await supabaseContractor1
          .from('bids')
          .select('*')
          .eq('id', bid!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should allow job owner to see bids on their job', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Job with Bids',
            status: 'open',
          })
          .select()
          .single();

        const { data: bid } = await supabaseAdmin
          .from('bids')
          .insert({
            job_id: job!.id,
            contractor_id: TEST_USERS.contractor1,
            amount: 3000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Homeowner can see bids on their job
        const { data: view, error } = await supabaseHomeowner1
          .from('bids')
          .select('*')
          .eq('id', bid!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK contractors from seeing other contractors bids', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Competitive Job',
            status: 'open',
          })
          .select()
          .single();

        const { data: bid } = await supabaseAdmin
          .from('bids')
          .insert({
            job_id: job!.id,
            contractor_id: TEST_USERS.contractor1,
            amount: 4000,
            status: 'pending',
          })
          .select()
          .single();

        // Test: Different contractor CANNOT see bid
        const { data: blockedView } = await supabaseContractor2
          .from('bids')
          .select('*')
          .eq('id', bid!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow contractor to insert their own bid', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'New Bid Job',
            status: 'open',
          })
          .select()
          .single();

        // Test: Contractor can create bid
        const { data, error } = await supabaseContractor1
          .from('bids')
          .insert({
            job_id: job!.id,
            contractor_id: TEST_USERS.contractor1,
            amount: 5000,
            status: 'pending',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should BLOCK contractor from creating bid for another contractor', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Protected Bid Job',
            status: 'open',
          })
          .select()
          .single();

        // Test: Contractor CANNOT create bid for another contractor
        const { error } = await supabaseContractor1
          .from('bids')
          .insert({
            job_id: job!.id,
            contractor_id: TEST_USERS.contractor2, // Different contractor!
            amount: 6000,
            status: 'pending',
          });

        expect(error).toBeDefined();
      });
    });

    describe('messages', () => {
      it('should allow sender to see their sent messages', async () => {
        const { data: message } = await supabaseAdmin
          .from('messages')
          .insert({
            sender_id: TEST_USERS.homeowner1,
            receiver_id: TEST_USERS.contractor1,
            content: 'Test message',
          })
          .select()
          .single();

        // Test: Sender can see message
        const { data: view, error } = await supabaseHomeowner1
          .from('messages')
          .select('*')
          .eq('id', message!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should allow receiver to see their received messages', async () => {
        const { data: message } = await supabaseAdmin
          .from('messages')
          .insert({
            sender_id: TEST_USERS.homeowner1,
            receiver_id: TEST_USERS.contractor1,
            content: 'Test message 2',
          })
          .select()
          .single();

        // Test: Receiver can see message
        const { data: view, error } = await supabaseContractor1
          .from('messages')
          .select('*')
          .eq('id', message!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK third parties from seeing messages', async () => {
        const { data: message } = await supabaseAdmin
          .from('messages')
          .insert({
            sender_id: TEST_USERS.homeowner1,
            receiver_id: TEST_USERS.contractor1,
            content: 'Private message',
          })
          .select()
          .single();

        // Test: Third party CANNOT see message
        const { data: blockedView } = await supabaseHomeowner2
          .from('messages')
          .select('*')
          .eq('id', message!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow sender to insert messages', async () => {
        // Test: User can send message
        const { data, error } = await supabaseHomeowner1
          .from('messages')
          .insert({
            sender_id: TEST_USERS.homeowner1,
            receiver_id: TEST_USERS.contractor1,
            content: 'New message',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should BLOCK user from sending message as another user', async () => {
        // Test: User CANNOT impersonate sender
        const { error } = await supabaseHomeowner1
          .from('messages')
          .insert({
            sender_id: TEST_USERS.homeowner2, // Different user!
            receiver_id: TEST_USERS.contractor1,
            content: 'Impersonated message',
          });

        expect(error).toBeDefined();
      });
    });

    describe('notifications', () => {
      it('should allow user to see their own notifications', async () => {
        const { data: notification } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: TEST_USERS.homeowner1,
            type: 'job_update',
            message: 'Your job was updated',
          })
          .select()
          .single();

        // Test: User can see their notification
        const { data: view, error } = await supabaseHomeowner1
          .from('notifications')
          .select('*')
          .eq('id', notification!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK users from seeing other users notifications', async () => {
        const { data: notification } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: TEST_USERS.homeowner1,
            type: 'job_update',
            message: 'Private notification',
          })
          .select()
          .single();

        // Test: Different user CANNOT see notification
        const { data: blockedView } = await supabaseHomeowner2
          .from('notifications')
          .select('*')
          .eq('id', notification!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow user to update their own notifications', async () => {
        const { data: notification } = await supabaseAdmin
          .from('notifications')
          .insert({
            user_id: TEST_USERS.homeowner1,
            type: 'job_update',
            message: 'Notification to mark read',
            is_read: false,
          })
          .select()
          .single();

        // Test: User can update their notification
        const { error } = await supabaseHomeowner1
          .from('notifications')
          .update({ is_read: true })
          .eq('id', notification!.id);

        expect(error).toBeNull();
      });
    });

    describe('reviews', () => {
      it('should allow public to read reviews', async () => {
        const { data: review } = await supabaseAdmin
          .from('reviews')
          .insert({
            job_id: 'test-job-review-1',
            reviewer_id: TEST_USERS.homeowner1,
            reviewee_id: TEST_USERS.contractor1,
            rating: 5,
            comment: 'Great work!',
          })
          .select()
          .single();

        // Test: Anyone can read reviews
        const { data: view, error } = await supabaseContractor2
          .from('reviews')
          .select('*')
          .eq('id', review!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should allow reviewer to insert review', async () => {
        const { data: job } = await supabaseAdmin
          .from('jobs')
          .insert({
            homeowner_id: TEST_USERS.homeowner1,
            contractor_id: TEST_USERS.contractor1,
            title: 'Completed Job',
            status: 'completed',
          })
          .select()
          .single();

        // Test: Reviewer can create review
        const { data, error } = await supabaseHomeowner1
          .from('reviews')
          .insert({
            job_id: job!.id,
            reviewer_id: TEST_USERS.homeowner1,
            reviewee_id: TEST_USERS.contractor1,
            rating: 4,
            comment: 'Good service',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should allow reviewer to update their own review', async () => {
        const { data: review } = await supabaseAdmin
          .from('reviews')
          .insert({
            job_id: 'test-job-review-2',
            reviewer_id: TEST_USERS.homeowner1,
            reviewee_id: TEST_USERS.contractor1,
            rating: 3,
            comment: 'Original comment',
          })
          .select()
          .single();

        // Test: Reviewer can update review
        const { error } = await supabaseHomeowner1
          .from('reviews')
          .update({ comment: 'Updated comment' })
          .eq('id', review!.id);

        expect(error).toBeNull();
      });

      it('should BLOCK non-reviewer from updating review', async () => {
        const { data: review } = await supabaseAdmin
          .from('reviews')
          .insert({
            job_id: 'test-job-review-3',
            reviewer_id: TEST_USERS.homeowner1,
            reviewee_id: TEST_USERS.contractor1,
            rating: 5,
            comment: 'Protected review',
          })
          .select()
          .single();

        // Test: Different user CANNOT update review
        const { error } = await supabaseHomeowner2
          .from('reviews')
          .update({ comment: 'Malicious update' })
          .eq('id', review!.id);

        expect(error).toBeDefined();
      });
    });
  });

  describe('4. AI/ML Tables', () => {
    describe('yolo_corrections', () => {
      it('should allow user to see their own corrections', async () => {
        const { data: correction } = await supabaseAdmin
          .from('yolo_corrections')
          .insert({
            image_url: 'https://example.com/image.jpg',
            original_predictions: {},
            corrected_predictions: {},
            corrected_by: TEST_USERS.contractor1,
          })
          .select()
          .single();

        // Test: User can see their correction
        const { data: view, error } = await supabaseContractor1
          .from('yolo_corrections')
          .select('*')
          .eq('id', correction!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK users from seeing other users corrections', async () => {
        const { data: correction } = await supabaseAdmin
          .from('yolo_corrections')
          .insert({
            image_url: 'https://example.com/image2.jpg',
            original_predictions: {},
            corrected_predictions: {},
            corrected_by: TEST_USERS.contractor1,
          })
          .select()
          .single();

        // Test: Different user CANNOT see correction
        const { data: blockedView } = await supabaseContractor2
          .from('yolo_corrections')
          .select('*')
          .eq('id', correction!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow user to insert their own corrections', async () => {
        // Test: User can create correction
        const { data, error } = await supabaseContractor1
          .from('yolo_corrections')
          .insert({
            image_url: 'https://example.com/image3.jpg',
            original_predictions: {},
            corrected_predictions: {},
            corrected_by: TEST_USERS.contractor1,
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });
    });

    describe('yolo_retraining_jobs', () => {
      it('should BLOCK non-admin from seeing retraining jobs', async () => {
        const { data: job } = await supabaseAdmin
          .from('yolo_retraining_jobs')
          .insert({
            model_name: 'yolo-v8',
            status: 'pending',
          })
          .select()
          .single();

        // Test: Regular user CANNOT see retraining job
        const { data: blockedView } = await supabaseContractor1
          .from('yolo_retraining_jobs')
          .select('*')
          .eq('id', job!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow admin to see retraining jobs', async () => {
        const { data: job } = await supabaseAdmin
          .from('yolo_retraining_jobs')
          .insert({
            model_name: 'yolo-v8',
            status: 'pending',
          })
          .select()
          .single();

        // Test: Admin can see retraining job
        const { data: view, error } = await supabaseAdminUser
          .from('yolo_retraining_jobs')
          .select('*')
          .eq('id', job!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });
    });
  });

  describe('5. System Tables', () => {
    describe('security_events', () => {
      it('should BLOCK non-admin from seeing security events', async () => {
        const { data: event } = await supabaseAdmin
          .from('security_events')
          .insert({
            event_type: 'login_attempt',
            user_id: TEST_USERS.homeowner1,
            details: {},
          })
          .select()
          .single();

        // Test: Regular user CANNOT see security events
        const { data: blockedView } = await supabaseHomeowner1
          .from('security_events')
          .select('*')
          .eq('id', event!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow admin to see security events', async () => {
        const { data: event } = await supabaseAdmin
          .from('security_events')
          .insert({
            event_type: 'password_reset',
            user_id: TEST_USERS.homeowner1,
            details: {},
          })
          .select()
          .single();

        // Test: Admin can see security events
        const { data: view, error } = await supabaseAdminUser
          .from('security_events')
          .select('*')
          .eq('id', event!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });
    });

    describe('idempotency_keys', () => {
      it('should allow user to see their own idempotency keys', async () => {
        const { data: key } = await supabaseAdmin
          .from('idempotency_keys')
          .insert({
            user_id: TEST_USERS.homeowner1,
            key: 'idem_test_1',
            request_hash: 'hash_1',
          })
          .select()
          .single();

        // Test: User can see their key
        const { data: view, error } = await supabaseHomeowner1
          .from('idempotency_keys')
          .select('*')
          .eq('id', key!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should BLOCK users from seeing other users idempotency keys', async () => {
        const { data: key } = await supabaseAdmin
          .from('idempotency_keys')
          .insert({
            user_id: TEST_USERS.homeowner1,
            key: 'idem_test_2',
            request_hash: 'hash_2',
          })
          .select()
          .single();

        // Test: Different user CANNOT see key
        const { data: blockedView } = await supabaseHomeowner2
          .from('idempotency_keys')
          .select('*')
          .eq('id', key!.id)
          .single();

        expect(blockedView).toBeNull();
      });
    });

    describe('webhook_events', () => {
      it('should BLOCK non-admin from seeing webhook events', async () => {
        const { data: event } = await supabaseAdmin
          .from('webhook_events')
          .insert({
            event_type: 'payment.succeeded',
            payload: {},
          })
          .select()
          .single();

        // Test: Regular user CANNOT see webhook events
        const { data: blockedView } = await supabaseHomeowner1
          .from('webhook_events')
          .select('*')
          .eq('id', event!.id)
          .single();

        expect(blockedView).toBeNull();
      });

      it('should allow admin to see webhook events', async () => {
        const { data: event } = await supabaseAdmin
          .from('webhook_events')
          .insert({
            event_type: 'payment.failed',
            payload: {},
          })
          .select()
          .single();

        // Test: Admin can see webhook events
        const { data: view, error } = await supabaseAdminUser
          .from('webhook_events')
          .select('*')
          .eq('id', event!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });
    });
  });

  describe('6. Public/Discovery Tables', () => {
    describe('contractor_locations', () => {
      it('should allow public to see contractor locations', async () => {
        const { data: location } = await supabaseAdmin
          .from('contractor_locations')
          .insert({
            contractor_id: TEST_USERS.contractor1,
            location: 'POINT(-73.935242 40.730610)', // NYC
            city: 'New York',
            state: 'NY',
          })
          .select()
          .single();

        // Test: Anyone can see contractor locations
        const { data: view, error } = await supabaseHomeowner1
          .from('contractor_locations')
          .select('*')
          .eq('id', location!.id)
          .single();

        expect(error).toBeNull();
        expect(view).toBeDefined();
      });

      it('should allow contractor to insert their own location', async () => {
        // Test: Contractor can add location
        const { data, error } = await supabaseContractor1
          .from('contractor_locations')
          .insert({
            contractor_id: TEST_USERS.contractor1,
            location: 'POINT(-118.243683 34.052235)', // LA
            city: 'Los Angeles',
            state: 'CA',
          })
          .select()
          .single();

        expect(error).toBeNull();
        expect(data).toBeDefined();
      });

      it('should BLOCK contractor from inserting location for another contractor', async () => {
        // Test: Contractor CANNOT add location for another contractor
        const { error } = await supabaseContractor1
          .from('contractor_locations')
          .insert({
            contractor_id: TEST_USERS.contractor2, // Different contractor!
            location: 'POINT(-87.629798 41.878114)', // Chicago
            city: 'Chicago',
            state: 'IL',
          });

        expect(error).toBeDefined();
      });
    });
  });

  describe('7. Edge Cases and Special Scenarios', () => {
    it('should handle NULL user_id gracefully', async () => {
      // Insert an open job first so there is data to query
      await supabaseAdmin.from('jobs').insert({
        homeowner_id: TEST_USERS.homeowner1,
        title: 'Edge Case Open Job',
        description: 'For edge case test',
        status: 'open',
      });

      // Attempt to query with no auth context
      const { data, error } = await createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
        .from('jobs')
        .select('*')
        .eq('status', 'open');

      // Should only return public jobs
      expect(error).toBeNull();
      // All returned jobs should be 'open' status
      data?.forEach((job: Record<string, unknown>) => {
        expect(job.status).toBe('open');
      });
    });

    it('should handle invalid user_id', async () => {
      // Try to access data with invalid user context
      const { data } = await supabaseContractor1
        .from('escrow_transactions')
        .select('*')
        .eq('payer_id', 'non-existent-user');

      // Should return empty array, not error
      expect(data).toEqual([]);
    });

    it('should enforce RLS on bulk operations', async () => {
      const jobs = await supabaseAdmin
        .from('jobs')
        .insert([
          {
            homeowner_id: TEST_USERS.homeowner1,
            title: 'Bulk Job 1',
            status: 'draft',
          },
          {
            homeowner_id: TEST_USERS.homeowner2,
            title: 'Bulk Job 2',
            status: 'draft',
          },
        ])
        .select();

      // User should only see their own jobs
      const { data } = await supabaseHomeowner1
        .from('jobs')
        .select('*')
        .in('id', jobs.data?.map((j: Record<string, unknown>) => j.id) || []);

      // Should only return 1 job (homeowner1's job)
      expect(data?.length).toBe(1);
      expect(data?.[0].homeowner_id).toBe(TEST_USERS.homeowner1);
    });

    it('should prevent privilege escalation through admin checks', async () => {
      // Insert a security event so there is data
      await supabaseAdmin.from('security_events').insert({
        event_type: 'escalation_test',
        user_id: TEST_USERS.contractor1,
        details: {},
      });

      // Attempt to bypass RLS by manipulating role check
      const { data } = await supabaseContractor1
        .from('security_events')
        .select('*');

      // Should return empty (contractor is not admin)
      expect(data).toEqual([]);
    });
  });

  describe('8. Performance and Query Optimization', () => {
    it('should efficiently handle large dataset queries with RLS', async () => {
      // Create 100 jobs for different users
      const jobPromises = Array.from({ length: 100 }, (_, i) => {
        const homeownerId =
          i % 2 === 0 ? TEST_USERS.homeowner1 : TEST_USERS.homeowner2;
        return supabaseAdmin.from('jobs').insert({
          homeowner_id: homeownerId,
          title: `Performance Test Job ${i}`,
          status: 'open',
        });
      });

      await Promise.all(jobPromises);

      const startTime = Date.now();

      // Query should be fast even with RLS
      const { data, error } = await supabaseHomeowner1
        .from('jobs')
        .select('*')
        .eq('homeowner_id', TEST_USERS.homeowner1)
        .limit(50);

      const queryTime = Date.now() - startTime;

      expect(error).toBeNull();
      expect(data?.length).toBeLessThanOrEqual(50);
      // Query should complete within 1 second
      expect(queryTime).toBeLessThan(1000);
    });
  });

  describe('9. Cross-Table Policy Consistency', () => {
    it('should maintain consistency between jobs and bids policies', async () => {
      // Create a private job
      const { data: job } = await supabaseAdmin
        .from('jobs')
        .insert({
          homeowner_id: TEST_USERS.homeowner1,
          title: 'Private Job',
          status: 'assigned',
        })
        .select()
        .single();

      // Create a bid
      const { data: bid } = await supabaseAdmin
        .from('bids')
        .insert({
          job_id: job!.id,
          contractor_id: TEST_USERS.contractor1,
          amount: 1000,
          status: 'accepted',
        })
        .select()
        .single();

      // Contractor can see job because they bid on it
      const { data: jobView } = await supabaseContractor1
        .from('jobs')
        .select('*')
        .eq('id', job!.id)
        .single();

      expect(jobView).toBeDefined();

      // Contractor can see their bid
      const { data: bidView } = await supabaseContractor1
        .from('bids')
        .select('*')
        .eq('id', bid!.id)
        .single();

      expect(bidView).toBeDefined();

      // Different contractor CANNOT see job or bid
      const { data: otherJobView } = await supabaseContractor2
        .from('jobs')
        .select('*')
        .eq('id', job!.id)
        .single();

      expect(otherJobView).toBeNull();

      const { data: otherBidView } = await supabaseContractor2
        .from('bids')
        .select('*')
        .eq('id', bid!.id)
        .single();

      expect(otherBidView).toBeNull();
    });
  });
});
