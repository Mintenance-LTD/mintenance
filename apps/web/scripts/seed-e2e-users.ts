/**
 * Idempotent seed for the Playwright E2E test users.
 *
 * global-setup.ts signs in as a homeowner (required) and a contractor
 * (optional) via POST /api/test-auth/login, which calls
 * supabase.auth.signInWithPassword. Those accounts must already exist in the
 * target Supabase project, be email-confirmed, and have a public.profiles row
 * with the correct role — nothing in the repo created them until this script.
 *
 * What it does, per user (homeowner + contractor):
 *   1. Find the auth user by email (paginated admin.listUsers).
 *   2. Create it (email_confirm:true, role in user_metadata) if missing, or
 *      reset its password + re-confirm its email if it already exists.
 *   3. Upsert public.profiles {id, email, role} so the role is correct even if
 *      a prior manual creation left it as the trigger's homeowner default.
 * Safe to run repeatedly.
 *
 * Reads the SAME env vars as e2e/helpers/auth.ts (with the same defaults):
 *   E2E_HOMEOWNER_EMAIL / E2E_HOMEOWNER_PASSWORD
 *   E2E_CONTRACTOR_EMAIL / E2E_CONTRACTOR_PASSWORD
 * Requires: NEXT_PUBLIC_SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) and
 *           SUPABASE_SERVICE_ROLE_KEY.
 *
 * Run against a TEST/staging project — it creates users and turns nothing off.
 *   npx tsx scripts/seed-e2e-users.ts     (or: npm run seed:e2e-users)
 */
import { createClient, type User } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Set them ' +
      'in apps/web/.env (or the shell) before running.'
  );
  process.exit(1);
}

if (process.env.NODE_ENV === 'production') {
  console.error('❌ Refusing to run with NODE_ENV=production.');
  process.exit(1);
}

type Role = 'homeowner' | 'contractor';

interface SeedUser {
  email: string;
  password: string;
  role: Role;
}

const USERS: SeedUser[] = [
  {
    email: process.env.E2E_HOMEOWNER_EMAIL ?? 'test-homeowner@example.com',
    password: process.env.E2E_HOMEOWNER_PASSWORD ?? 'TestHomeowner123!',
    role: 'homeowner',
  },
  {
    email: process.env.E2E_CONTRACTOR_EMAIL ?? 'test-contractor@example.com',
    password: process.env.E2E_CONTRACTOR_PASSWORD ?? 'TestContractor123!',
    role: 'contractor',
  },
];

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Find an auth user by email, paginating through admin.listUsers. */
async function findAuthUserByEmail(email: string): Promise<User | null> {
  const target = email.toLowerCase();
  const perPage = 200;
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) throw new Error(`listUsers failed: ${error.message}`);
    const match = data.users.find((u) => u.email?.toLowerCase() === target);
    if (match) return match;
    if (data.users.length < perPage) return null; // last page
  }
  return null;
}

/** Create or repair one seed user + its profile. Returns the auth user id. */
async function ensureUser(user: SeedUser): Promise<string> {
  const metadata = {
    role: user.role,
    first_name: 'E2E',
    last_name: user.role === 'homeowner' ? 'Homeowner' : 'Contractor',
  };

  const existing = await findAuthUserByEmail(user.email);
  let userId: string;

  if (!existing) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error || !data.user) {
      throw new Error(`createUser(${user.email}) failed: ${error?.message}`);
    }
    userId = data.user.id;
    console.log(`  ➕ created ${user.role} ${user.email}`);
  } else {
    // Reset the password + re-confirm so a drifted password can't wedge CI.
    const { error } = await supabase.auth.admin.updateUserById(existing.id, {
      password: user.password,
      email_confirm: true,
      user_metadata: metadata,
    });
    if (error) {
      throw new Error(`updateUserById(${user.email}) failed: ${error.message}`);
    }
    userId = existing.id;
    console.log(`  ♻️  reset ${user.role} ${user.email}`);
  }

  // The handle_new_user trigger only fires on INSERT, so upsert the profile
  // directly to guarantee the role is correct on both create and repair paths.
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, email: user.email, role: user.role },
      { onConflict: 'id' }
    );
  if (profileError) {
    throw new Error(
      `profiles upsert(${user.email}) failed: ${profileError.message}`
    );
  }

  return userId;
}

async function main(): Promise<void> {
  const host = (() => {
    try {
      return new URL(SUPABASE_URL as string).host;
    } catch {
      return SUPABASE_URL;
    }
  })();
  console.log(`🌱 Seeding E2E users into ${host}`);

  let failures = 0;
  for (const user of USERS) {
    try {
      await ensureUser(user);
    } catch (err) {
      failures++;
      console.error(`  ❌ ${user.email}: ${(err as Error).message}`);
    }
  }

  if (failures > 0) {
    console.error(`\n❌ Done with ${failures} failure(s).`);
    process.exit(1);
  }
  console.log('\n✅ E2E users ready (email-confirmed, profiles set).');
}

main().catch((err) => {
  console.error('❌ Fatal:', err);
  process.exit(1);
});
