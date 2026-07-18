/**
 * Playwright Global Setup
 *
 * Authenticates test users once before all tests run and saves their
 * authentication state to files. This allows tests to reuse the
 * authenticated sessions without logging in for every test.
 *
 * This solves the Supabase session persistence issue in Playwright.
 *
 * OPTIMIZATION: Checks if existing auth tokens are still valid before
 * regenerating them, significantly speeding up test runs.
 */

import { chromium, Browser, FullConfig } from '@playwright/test';
import { TEST_USERS } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Authenticate a test user via the E2E-only server endpoint and persist the
 * resulting session as Playwright storage state.
 *
 * WHY AN ENDPOINT: the previous approach copied the login page's localStorage
 * token into a single cookie by hand, which `@supabase/ssr` (used by the
 * middleware) could not decode — so protected routes redirected to /login and
 * the authenticated e2e tests all skipped. `POST /api/test-auth/login` signs in
 * through `createServerClient`, so the auth cookies are written in exactly the
 * base64/chunked format the middleware reads back. Driving it through the
 * browser context's request API applies the Set-Cookie headers to that
 * context's cookie jar, which `storageState` then captures verbatim.
 *
 * Requires E2E_TESTING=true and a matching E2E_AUTH_SECRET on BOTH the running
 * web server and this process (see docs/CI_QUALITY_GATES.md and e2e-tests.yml).
 */
async function authenticateViaEndpoint(
  browser: Browser,
  baseURL: string,
  user: { email: string; password: string },
  outPath: string
): Promise<void> {
  const secret = process.env.E2E_AUTH_SECRET;
  if (!secret) {
    throw new Error(
      'E2E_AUTH_SECRET is not set — the /api/test-auth/login endpoint will 404. ' +
        'Set E2E_TESTING=true and E2E_AUTH_SECRET on both the web server and the ' +
        'test runner (see docs/CI_QUALITY_GATES.md).'
    );
  }

  const context = await browser.newContext();
  try {
    const response = await context.request.post(
      `${baseURL}/api/test-auth/login`,
      {
        headers: { 'x-e2e-auth-secret': secret },
        data: { email: user.email, password: user.password },
      }
    );

    if (!response.ok()) {
      const detail = await response.text().catch(() => '');
      throw new Error(
        `test-auth login failed (${response.status()}): ${detail.slice(0, 300)}`
      );
    }

    // The Set-Cookie headers from the response are now in the context's cookie
    // jar; persist them for the test projects to load via storageState.
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    await context.storageState({ path: outPath });
  } finally {
    await context.close();
  }
}

// Initialize Supabase client for test data seeding
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn(
      '⚠️  Supabase credentials not found - test data seeding will be skipped'
    );
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Check if stored auth token is still valid
 * Returns true if token exists and hasn't expired
 */
function isAuthTokenValid(
  authFilePath: string,
  minValidityMinutes: number = 30
): boolean {
  try {
    if (!fs.existsSync(authFilePath)) {
      return false;
    }

    const authData = JSON.parse(fs.readFileSync(authFilePath, 'utf8'));

    // Check if cookies exist
    if (!authData.cookies || authData.cookies.length === 0) {
      return false;
    }

    // Find the Supabase auth token cookie
    const authCookie = authData.cookies.find(
      (c: any) =>
        c.name && c.name.includes('sb-') && c.name.includes('-auth-token')
    );

    if (!authCookie || !authCookie.expires) {
      return false;
    }

    // Check if token expires in more than minValidityMinutes
    const expiresAt = authCookie.expires * 1000; // Convert to milliseconds
    const now = Date.now();
    const minValidUntil = now + minValidityMinutes * 60 * 1000;

    return expiresAt > minValidUntil;
  } catch (error) {
    console.warn(
      `  ⚠️  Failed to check auth token validity: ${(error as Error).message}`
    );
    return false;
  }
}

async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL || 'http://localhost:3000';

  console.log('🔐 Setting up authenticated sessions...');

  // Check if existing tokens are still valid (optimization)
  const homeownerAuthPath = path.resolve(__dirname, '.auth/homeowner.json');
  const contractorAuthPath = path.resolve(__dirname, '.auth/contractor.json');

  const homeownerTokenValid = isAuthTokenValid(homeownerAuthPath);
  const contractorTokenValid = isAuthTokenValid(contractorAuthPath);

  if (homeownerTokenValid && contractorTokenValid) {
    console.log(
      '  ✅ Existing auth tokens are still valid - skipping authentication'
    );
    console.log('  ℹ️  To force re-authentication, delete files in e2e/.auth/');

    // Still seed test data
    await seedTestData();

    console.log('✅ Global setup complete\n');
    return;
  }

  // Create browser instance
  const browser = await chromium.launch();

  // Setup homeowner session
  if (!homeownerTokenValid) {
    try {
      console.log('  → Authenticating homeowner...');
      await authenticateViaEndpoint(
        browser,
        baseURL,
        TEST_USERS.homeowner,
        homeownerAuthPath
      );
      console.log('  ✅ Homeowner session saved');
    } catch (error) {
      console.error('  ❌ Failed to setup homeowner session:', error);
      await browser.close();
      throw error;
    }
  } else {
    console.log('  ✅ Homeowner token still valid - skipping authentication');
  }

  // Setup contractor session (optional - skip if fails)
  if (!contractorTokenValid) {
    try {
      console.log('  → Authenticating contractor...');
      await authenticateViaEndpoint(
        browser,
        baseURL,
        TEST_USERS.contractor,
        contractorAuthPath
      );
      console.log('  ✅ Contractor session saved');
    } catch (error) {
      console.error(
        '  ⚠️  Failed to setup contractor session (skipping):',
        (error as Error).message
      );
      // Don't throw - contractor tests will be skipped if no session file exists
    }
  } else {
    console.log('  ✅ Contractor token still valid - skipping authentication');
  }

  // Seed test data (properties for homeowner)
  await seedTestData();

  await browser.close();
  console.log('✅ Global setup complete\n');
}

/**
 * Seed test data into database
 * Creates test properties for homeowner user to enable job creation tests
 */
async function seedTestData() {
  console.log('🌱 Seeding test data...');

  const supabase = getSupabaseClient();
  if (!supabase) {
    console.log('  ⏭️  Skipping test data seeding (no Supabase client)');
    return;
  }

  try {
    // Get homeowner user ID by querying users table directly
    // Note: This requires the service role key to bypass RLS
    const { data: users, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', TEST_USERS.homeowner.email)
      .single();

    if (userError || !users) {
      console.warn('  ⚠️  Homeowner user not found - cannot seed properties');
      return;
    }

    const homeownerId = users.id;

    // Check if properties already exist
    const { data: existingProperties } = await supabase
      .from('properties')
      .select('id')
      .eq('owner_id', homeownerId);

    if (existingProperties && existingProperties.length > 0) {
      console.log(
        `  ✅ Test properties already exist (${existingProperties.length} properties)`
      );
      return;
    }

    // Create test properties
    const testProperties = [
      {
        owner_id: homeownerId,
        property_name: 'Test Property - Main Residence',
        address: '123 Test Street, London, SW1A 1AA, UK',
        property_type: 'residential',
        is_primary: true,
        photos: [],
      },
      {
        owner_id: homeownerId,
        property_name: 'Test Property - Holiday Home',
        address: '456 Beach Road, Brighton, BN1 2AA, UK',
        property_type: 'residential',
        is_primary: false,
        photos: [],
      },
    ];

    const { data: createdProperties, error } = await supabase
      .from('properties')
      .insert(testProperties)
      .select();

    if (error) {
      console.error('  ❌ Failed to seed properties:', error.message);
      return;
    }

    console.log(
      `  ✅ Created ${createdProperties?.length || 0} test properties`
    );
  } catch (error) {
    console.error('  ❌ Error seeding test data:', (error as Error).message);
  }
}

export default globalSetup;
