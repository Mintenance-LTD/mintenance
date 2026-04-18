/**
 * Test data fixtures for integration tests.
 *
 * Each helper:
 *  - Uses the service-role client (bypasses RLS) for setup/teardown
 *  - Returns a cleanup function that the caller MUST call in afterEach/afterAll
 *  - Prefixes all test data with `itest_` for easy identification
 */
import { SupabaseClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { createServiceClient } from './supabase-test-client';

const TEST_PREFIX = 'itest_';

export interface TestUser {
  id: string;
  email: string;
  password: string;
  role: 'homeowner' | 'contractor' | 'admin';
  cleanup: () => Promise<void>;
}

export interface TestJob {
  id: string;
  homeowner_id: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a test user via Supabase Auth admin API.
 * The user is created confirmed (no email verification required).
 */
export async function createTestUser(opts: {
  role: 'homeowner' | 'contractor' | 'admin';
  email?: string;
}): Promise<TestUser> {
  const admin = createServiceClient();
  const email = opts.email ?? `${TEST_PREFIX}${randomUUID()}@test.local`;
  const password = `TestPass_${randomUUID().slice(0, 8)}!`;

  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: opts.role, test_user: true },
  });

  if (error || !data.user) {
    throw new Error(`Failed to create test user: ${error?.message}`);
  }

  const userId = data.user.id;

  // The handle_new_user trigger (20260206002000_profiles_trigger.sql) creates
  // the profile row automatically on auth.users insert with role='homeowner'.
  // We UPDATE to set the real role + test metadata.
  const { error: profileErr } = await admin
    .from('profiles')
    .update({
      role: opts.role,
      first_name: `${TEST_PREFIX}${opts.role}`,
      last_name: 'test',
    })
    .eq('id', userId);

  if (profileErr) {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    throw new Error(`Failed to update profile: ${profileErr.message}`);
  }

  return {
    id: userId,
    email,
    password,
    role: opts.role,
    cleanup: async () => {
      await admin.from('profiles').delete().eq('id', userId);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
    },
  };
}

/**
 * Create a test job owned by a homeowner.
 * Returns cleanup function that deletes the job and its dependent rows.
 */
export async function createTestJob(opts: {
  homeowner_id: string;
  title?: string;
  status?: string;
}): Promise<TestJob> {
  const admin = createServiceClient();
  const title = opts.title ?? `${TEST_PREFIX}job_${randomUUID().slice(0, 8)}`;

  const { data, error } = await admin
    .from('jobs')
    .insert({
      homeowner_id: opts.homeowner_id,
      title,
      description: 'Integration test job — safe to delete',
      category: 'plumbing',
      urgency: 'medium',
      status: opts.status ?? 'posted',
      budget_min: 100,
      budget_max: 500,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test job: ${error?.message}`);
  }

  const jobId = data.id;

  return {
    id: jobId,
    homeowner_id: opts.homeowner_id,
    cleanup: async () => {
      await admin.from('jobs').delete().eq('id', jobId);
    },
  };
}

export interface TestBid {
  id: string;
  job_id: string;
  contractor_id: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a test bid on a job.
 */
export async function createTestBid(opts: {
  job_id: string;
  contractor_id: string;
  amount?: number;
  status?: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
}): Promise<TestBid> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from('bids')
    .insert({
      job_id: opts.job_id,
      contractor_id: opts.contractor_id,
      amount: opts.amount ?? 200,
      message: 'itest_bid',
      status: opts.status ?? 'pending',
      estimated_duration_days: 3,
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test bid: ${error?.message}`);
  }

  const bidId = data.id;

  return {
    id: bidId,
    job_id: opts.job_id,
    contractor_id: opts.contractor_id,
    cleanup: async () => {
      await admin.from('bids').delete().eq('id', bidId);
    },
  };
}

export interface TestPayment {
  id: string;
  cleanup: () => Promise<void>;
}

export interface TestEscrow {
  id: string;
  job_id: string;
  payer_id: string;
  payee_id: string;
  cleanup: () => Promise<void>;
}

/**
 * Create a test payment linking payer (homeowner) → payee (contractor).
 * Status defaults to 'in_escrow' to exercise escrow RLS.
 */
export async function createTestPayment(opts: {
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount?: number;
  status?: string;
}): Promise<TestPayment> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from('payments')
    .insert({
      job_id: opts.job_id,
      payer_id: opts.payer_id,
      payee_id: opts.payee_id,
      amount: opts.amount ?? 250,
      currency: 'gbp',
      status: opts.status ?? 'in_escrow',
      payment_method: 'stripe',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test payment: ${error?.message}`);
  }

  const paymentId = data.id;

  return {
    id: paymentId,
    cleanup: async () => {
      await admin.from('payments').delete().eq('id', paymentId);
    },
  };
}

/**
 * Create a test escrow transaction linked to a job with payer/payee.
 * Uses the primary escrow_transactions table.
 */
export async function createTestEscrow(opts: {
  job_id: string;
  payer_id: string;
  payee_id: string;
  amount?: number;
  status?:
    | 'pending'
    | 'held'
    | 'released'
    | 'refunded'
    | 'awaiting_homeowner_approval'
    | 'pending_review'
    | 'failed'
    | 'cancelled';
}): Promise<TestEscrow> {
  const admin = createServiceClient();
  const { data, error } = await admin
    .from('escrow_transactions')
    .insert({
      job_id: opts.job_id,
      payer_id: opts.payer_id,
      payee_id: opts.payee_id,
      amount: opts.amount ?? 250,
      status: opts.status ?? 'held',
    })
    .select('id')
    .single();

  if (error || !data) {
    throw new Error(`Failed to create test escrow: ${error?.message}`);
  }

  const escrowId = data.id;

  return {
    id: escrowId,
    job_id: opts.job_id,
    payer_id: opts.payer_id,
    payee_id: opts.payee_id,
    cleanup: async () => {
      await admin.from('escrow_transactions').delete().eq('id', escrowId);
    },
  };
}

/**
 * Wipe all rows in a table whose text columns start with the itest_ prefix.
 * Safety net in case a test crashes without calling cleanup.
 */
export async function wipeTestData(
  admin: SupabaseClient,
  table: string,
  column: string
): Promise<void> {
  await admin.from(table).delete().like(column, `${TEST_PREFIX}%`);
}

/**
 * Sprint 7 (5.5): global safety-net cleanup for every table a test can touch.
 * Call this from a file's afterAll so any rows leaked by a crashed test
 * are wiped before the next run. Deletes are keyed on the `itest_` prefix
 * so real data is never affected.
 *
 * Order matters — delete child rows before parents to respect FKs.
 */
export async function sweepAllIntegrationTestData(): Promise<void> {
  const admin = createServiceClient();

  // Children first (reviews, bids, messages reference jobs)
  await wipeTestData(admin, 'reviews', 'comment');
  await wipeTestData(admin, 'messages', 'content');
  await wipeTestData(admin, 'bids', 'message');
  await wipeTestData(admin, 'escrow_transactions', 'notes');
  await wipeTestData(admin, 'notifications', 'title');
  await wipeTestData(admin, 'contracts', 'title');

  // Then parents
  await wipeTestData(admin, 'jobs', 'title');
  await wipeTestData(admin, 'properties', 'property_name');

  // Profiles last — the auth.users cascade takes care of the auth side.
  // Only delete profiles whose email matches the itest_ prefix; first_name
  // is also safe because we seed it with `${TEST_PREFIX}${role}`.
  await wipeTestData(admin, 'profiles', 'email');
}
