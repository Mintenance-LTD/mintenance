/**
 * Real Supabase client for integration tests.
 *
 * Unlike the mock-based tests in apps/web/__tests__/api/integration/,
 * this client talks to an actual local Supabase instance at localhost:54321.
 *
 * Prerequisites:
 *   1. Supabase CLI installed (https://supabase.com/docs/guides/cli)
 *   2. `supabase start` has been run from the repo root
 *   3. Migrations applied: `supabase db reset`
 *
 * Environment variables (defaults suitable for local dev):
 *   - SUPABASE_TEST_URL            (default: http://localhost:54321)
 *   - SUPABASE_TEST_ANON_KEY       (default: supabase's well-known local anon key)
 *   - SUPABASE_TEST_SERVICE_KEY    (default: supabase's well-known local service key)
 *
 * Local Supabase uses deterministic keys across installs — the defaults below
 * match the keys printed by `supabase start`.
 */
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// These are the well-known, non-secret keys emitted by `supabase start` for
// local development. They are NOT production keys and grant access only to
// a developer's local Postgres instance.
const DEFAULT_LOCAL_URL = 'http://localhost:54321';
const DEFAULT_LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const DEFAULT_LOCAL_SERVICE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

export const TEST_SUPABASE_URL =
  process.env.SUPABASE_TEST_URL || DEFAULT_LOCAL_URL;

const TEST_ANON_KEY =
  process.env.SUPABASE_TEST_ANON_KEY || DEFAULT_LOCAL_ANON_KEY;

const TEST_SERVICE_KEY =
  process.env.SUPABASE_TEST_SERVICE_KEY || DEFAULT_LOCAL_SERVICE_KEY;

/**
 * Anon client — subject to RLS. Use this to verify policies are enforced.
 */
export function createAnonClient(): SupabaseClient {
  return createClient(TEST_SUPABASE_URL, TEST_ANON_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Service-role client — bypasses RLS. Use for test setup/teardown only,
 * never to simulate user actions.
 */
export function createServiceClient(): SupabaseClient {
  return createClient(TEST_SUPABASE_URL, TEST_SERVICE_KEY, {
    auth: { persistSession: false },
  });
}

/**
 * Assert local Supabase is reachable before running integration tests.
 * Throws a helpful error pointing to `supabase start` if not.
 */
export async function requireLocalSupabase(): Promise<void> {
  try {
    const res = await fetch(`${TEST_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: TEST_ANON_KEY },
    });
    if (!res.ok && res.status !== 404) {
      throw new Error(`Unexpected status ${res.status}`);
    }
  } catch (err) {
    throw new Error(
      `Local Supabase is not reachable at ${TEST_SUPABASE_URL}.\n` +
        `Start it with:\n  supabase start\n` +
        `Then apply migrations:\n  supabase db reset\n` +
        `Underlying error: ${(err as Error).message}`,
    );
  }
}

/**
 * Synchronously check if Supabase is likely available by attempting a quick
 * TCP connection. Used at test-file load time where top-level await is unreliable.
 * Returns a Promise that resolves to boolean — never throws.
 */
export async function isLocalSupabaseAvailable(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(`${TEST_SUPABASE_URL}/rest/v1/`, {
      headers: { apikey: TEST_ANON_KEY },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return res.status < 500;
  } catch {
    return false;
  }
}

/**
 * Create an authenticated anon client for a specific test user.
 * Uses email+password sign-in against the local auth service.
 */
export async function createAuthenticatedClient(
  email: string,
  password: string,
): Promise<SupabaseClient> {
  const client = createAnonClient();
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) {
    throw new Error(
      `Failed to authenticate test user ${email}: ${error.message}`,
    );
  }
  return client;
}
