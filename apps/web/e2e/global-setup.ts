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

import { chromium, FullConfig } from '@playwright/test';
import { TEST_USERS } from './helpers/auth';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

// Initialize Supabase client for test data seeding
const getSupabaseClient = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.warn('⚠️  Supabase credentials not found - test data seeding will be skipped');
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
};

/**
 * Check if stored auth token is still valid
 * Returns true if token exists and hasn't expired
 */
function isAuthTokenValid(authFilePath: string, minValidityMinutes: number = 30): boolean {
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
    const authCookie = authData.cookies.find((c: any) =>
      c.name && c.name.includes('sb-') && c.name.includes('-auth-token')
    );

    if (!authCookie || !authCookie.expires) {
      return false;
    }

    // Check if token expires in more than minValidityMinutes
    const expiresAt = authCookie.expires * 1000; // Convert to milliseconds
    const now = Date.now();
    const minValidUntil = now + (minValidityMinutes * 60 * 1000);

    return expiresAt > minValidUntil;
  } catch (error) {
    console.warn(`  ⚠️  Failed to check auth token validity: ${(error as Error).message}`);
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
    console.log('  ✅ Existing auth tokens are still valid - skipping authentication');
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
    const homeownerContext = await browser.newContext();
    const homeownerPage = await homeownerContext.newPage();

    // Navigate to login
    await homeownerPage.goto(`${baseURL}/auth/login`);
    await homeownerPage.waitForLoadState('networkidle');

    // Dismiss modals
    const laterButton = homeownerPage.getByRole('button', { name: /later/i });
    if (await laterButton.isVisible().catch(() => false)) {
      await laterButton.click();
      await homeownerPage.waitForTimeout(500);
    }

    const acceptCookies = homeownerPage.getByRole('button', { name: /accept all|essential only/i }).first();
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
      await homeownerPage.waitForTimeout(500);
    }

    // Login
    await homeownerPage.getByLabel(/email/i).fill(TEST_USERS.homeowner.email);
    await homeownerPage.getByLabel(/password/i).fill(TEST_USERS.homeowner.password);
    await Promise.all([
      homeownerPage.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 30000 }),
      homeownerPage.getByRole('button', { name: /log in|sign in/i }).click(),
    ]);

    // Wait for session to establish
    await homeownerPage.waitForTimeout(2000);

    // Get Supabase session from localStorage
    const sessionData = await homeownerPage.evaluate(() => {
      const keys = Object.keys(localStorage);
      const authKey = keys.find(key => key.includes('sb-') && key.includes('-auth-token'));

      if (!authKey) {
        return null;
      }

      const tokenData = localStorage.getItem(authKey);
      return tokenData ? { key: authKey, value: tokenData } : null;
    });

    if (!sessionData) {
      throw new Error('Homeowner session not established');
    }

    // Add Supabase auth cookie using Playwright API (not document.cookie)
    // This ensures cookies are properly sent in HTTP requests
    await homeownerContext.addCookies([{
      name: sessionData.key,
      value: sessionData.value,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      httpOnly: false, // Must be false for Supabase client to read it
      secure: false, // HTTP (not HTTPS) for localhost
      sameSite: 'Lax',
    }]);

    // Save authenticated state
    await homeownerContext.storageState({ path: 'e2e/.auth/homeowner.json' });
    console.log('  ✅ Homeowner session saved');

    await homeownerContext.close();
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
    const contractorContext = await browser.newContext();
    const contractorPage = await contractorContext.newPage();

    // Navigate to login
    await contractorPage.goto(`${baseURL}/auth/login`);
    await contractorPage.waitForLoadState('networkidle');

    // Dismiss modals
    const laterButton = contractorPage.getByRole('button', { name: /later/i });
    if (await laterButton.isVisible().catch(() => false)) {
      await laterButton.click();
      await contractorPage.waitForTimeout(500);
    }

    const acceptCookies = contractorPage.getByRole('button', { name: /accept all|essential only/i }).first();
    if (await acceptCookies.isVisible().catch(() => false)) {
      await acceptCookies.click();
      await contractorPage.waitForTimeout(500);
    }

    // Login
    await contractorPage.getByLabel(/email/i).fill(TEST_USERS.contractor.email);
    await contractorPage.getByLabel(/password/i).fill(TEST_USERS.contractor.password);
    await Promise.all([
      contractorPage.waitForURL(url => !url.pathname.includes('/auth/login'), { timeout: 30000 }),
      contractorPage.getByRole('button', { name: /log in|sign in/i }).click(),
    ]);

    // Wait for session to establish
    await contractorPage.waitForTimeout(2000);

    // Get Supabase session from localStorage
    const sessionData = await contractorPage.evaluate(() => {
      const keys = Object.keys(localStorage);
      const authKey = keys.find(key => key.includes('sb-') && key.includes('-auth-token'));

      if (!authKey) {
        return null;
      }

      const tokenData = localStorage.getItem(authKey);
      return tokenData ? { key: authKey, value: tokenData } : null;
    });

    if (!sessionData) {
      throw new Error('Contractor session not established');
    }

    // Add Supabase auth cookie using Playwright API (not document.cookie)
    // This ensures cookies are properly sent in HTTP requests
    await contractorContext.addCookies([{
      name: sessionData.key,
      value: sessionData.value,
      domain: 'localhost',
      path: '/',
      expires: Math.floor(Date.now() / 1000) + 7200, // 2 hours from now
      httpOnly: false, // Must be false for Supabase client to read it
      secure: false, // HTTP (not HTTPS) for localhost
      sameSite: 'Lax',
    }]);

    // Save authenticated state
    await contractorContext.storageState({ path: 'e2e/.auth/contractor.json' });
    console.log('  ✅ Contractor session saved');

    await contractorContext.close();
  } catch (error) {
    console.error('  ⚠️  Failed to setup contractor session (skipping):', (error as Error).message);
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
      console.log(`  ✅ Test properties already exist (${existingProperties.length} properties)`);
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

    console.log(`  ✅ Created ${createdProperties?.length || 0} test properties`);
  } catch (error) {
    console.error('  ❌ Error seeding test data:', (error as Error).message);
  }
}

export default globalSetup;
