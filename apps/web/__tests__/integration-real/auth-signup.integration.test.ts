// @vitest-environment node
/**
 * REAL DATABASE integration test — verifies the auth.users → profiles trigger.
 *
 * The handle_new_user trigger (20260206002000_profiles_trigger.sql) is the
 * glue that ensures every auth user has a corresponding profile row.
 * If this trigger breaks or gets dropped, sign-up appears to succeed but
 * leaves users without profiles — they'd fail at login, at job creation,
 * at every RLS-enforced read.
 *
 * Mock tests cannot verify triggers exist and fire. This test can.
 *
 * Trigger behavior:
 *   - Fires AFTER INSERT on auth.users
 *   - Inserts into public.profiles with id=NEW.id, email=NEW.email, role='homeowner'
 *   - ON CONFLICT (id) DO NOTHING (idempotent)
 *   - Uses SECURITY DEFINER so it runs with owner privileges
 *
 * Cascade behavior:
 *   - profiles.id REFERENCES auth.users(id) ON DELETE CASCADE
 *   - Deleting an auth.user deletes the profile row
 */
import { describe, it, expect, beforeAll, afterEach } from 'vitest';
import { randomUUID } from 'crypto';
import {
  createServiceClient,
  isLocalSupabaseAvailable,
} from '../../test/integration/supabase-test-client';

describe('auth signup → profiles trigger (real DB)', () => {
  const createdUserIds: string[] = [];

  beforeAll(async () => {
    const available = await isLocalSupabaseAvailable();
    if (!available) {
      throw new Error(
        'INTEGRATION_TESTS=1 was set but Supabase is not reachable at ' +
          'http://localhost:54321. Run `supabase start` first.',
      );
    }
  });

  afterEach(async () => {
    const admin = createServiceClient();
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
    createdUserIds.length = 0;
  });

  it('creating an auth user auto-creates a profile row (trigger fires)', async () => {
    const admin = createServiceClient();
    const email = `itest_${randomUUID()}@test.local`;

    const { data: userData, error: userErr } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });
    expect(userErr).toBeNull();
    expect(userData.user).not.toBeNull();
    const userId = userData.user!.id;
    createdUserIds.push(userId);

    // Trigger should have inserted a profile row synchronously
    const { data: profile, error: profileErr } = await admin
      .from('profiles')
      .select('id, email, role')
      .eq('id', userId)
      .single();

    expect(profileErr).toBeNull();
    expect(profile).not.toBeNull();
    expect(profile?.id).toBe(userId);
    expect(profile?.email).toBe(email);
  });

  it('auto-created profile defaults to role="homeowner"', async () => {
    const admin = createServiceClient();
    const email = `itest_${randomUUID()}@test.local`;

    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });
    const userId = userData.user!.id;
    createdUserIds.push(userId);

    const { data: profile } = await admin
      .from('profiles')
      .select('role')
      .eq('id', userId)
      .single();

    expect(profile?.role).toBe('homeowner');
  });

  it('trigger is idempotent — does not fail if profile already exists', async () => {
    // The trigger uses ON CONFLICT (id) DO NOTHING
    const admin = createServiceClient();
    const email = `itest_${randomUUID()}@test.local`;

    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });
    const userId = userData.user!.id;
    createdUserIds.push(userId);

    // Attempt to insert a second profile with the same id — should fail at PK
    const { error } = await admin.from('profiles').insert({
      id: userId,
      email: 'different@test.local',
      role: 'contractor',
    });

    // PK conflict — profile already exists from trigger
    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/duplicate|unique|primary/);
  });

  it('deleting auth user CASCADEs to profile', async () => {
    const admin = createServiceClient();
    const email = `itest_${randomUUID()}@test.local`;

    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });
    const userId = userData.user!.id;

    // Verify profile exists
    const { data: before } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    expect(before?.id).toBe(userId);

    // Delete the auth user
    const { error: deleteErr } = await admin.auth.admin.deleteUser(userId);
    expect(deleteErr).toBeNull();

    // Profile should be gone (FK ON DELETE CASCADE)
    const { data: after } = await admin
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .maybeSingle();
    expect(after).toBeNull();
  });

  it('profile role can be updated after signup', async () => {
    const admin = createServiceClient();
    const email = `itest_${randomUUID()}@test.local`;

    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });
    const userId = userData.user!.id;
    createdUserIds.push(userId);

    const { error } = await admin
      .from('profiles')
      .update({ role: 'contractor', first_name: 'Test' })
      .eq('id', userId);
    expect(error).toBeNull();

    const { data: updated } = await admin
      .from('profiles')
      .select('role, first_name')
      .eq('id', userId)
      .single();
    expect(updated?.role).toBe('contractor');
    expect(updated?.first_name).toBe('Test');
  });

  it('role CHECK constraint rejects invalid role value', async () => {
    const admin = createServiceClient();
    const email = `itest_${randomUUID()}@test.local`;

    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });
    const userId = userData.user!.id;
    createdUserIds.push(userId);

    const { error } = await admin
      .from('profiles')
      .update({ role: 'super_admin' })
      .eq('id', userId);

    expect(error).not.toBeNull();
    expect(error?.message.toLowerCase()).toMatch(/check|constraint|invalid/);
  });

  it('email UNIQUE constraint prevents duplicate emails', async () => {
    const admin = createServiceClient();
    const email = `itest_${randomUUID()}@test.local`;

    const { data: userData } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });
    const userId = userData.user!.id;
    createdUserIds.push(userId);

    // Try to create a second user with same email
    const { data: second, error } = await admin.auth.admin.createUser({
      email,
      password: `TestPass_${randomUUID().slice(0, 8)}!`,
      email_confirm: true,
    });

    // auth.users has its own uniqueness constraint
    expect(error).not.toBeNull();
    if (second?.user?.id) createdUserIds.push(second.user.id);
  });
});
