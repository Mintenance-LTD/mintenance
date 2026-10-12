import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  createTestJob,
  createTestUser,
  type TestUser,
} from '../../test/integration/fixtures';
import {
  createAnonClient,
  createAuthenticatedClient,
  createServiceClient,
} from '../../test/integration/supabase-test-client';

describe('profile privacy through the real Data API', () => {
  const users: TestUser[] = [];
  let owner: TestUser;
  let stranger: SupabaseClient;
  let ownerClient: SupabaseClient;
  let admin: SupabaseClient;
  beforeAll(async () => {
    for (const role of ['contractor', 'homeowner', 'admin'] as const) {
      users.push(await createTestUser({ role }));
    }
    [owner] = users;
    ownerClient = await createAuthenticatedClient(owner.email, owner.password);
    stranger = await createAuthenticatedClient(
      users[1].email,
      users[1].password
    );
    admin = await createAuthenticatedClient(users[2].email, users[2].password);
    const { error } = await createServiceClient()
      .from('profiles')
      .update({
        phone: '+447700900123',
        address: '123 Private Fixture Road',
        postcode: 'SW1A 1AA',
        latitude: 51.501234,
        longitude: -0.141234,
        company_name: 'Fixture Plumbing',
        bio: 'Fixture contractor',
        is_available: true,
      })
      .eq('id', owner.id);
    expect(error).toBeNull();
  });
  afterAll(async () => {
    for (const user of users.reverse()) await user.cleanup();
  });

  it('hides another account contact fields and location, including list queries', async () => {
    const read = await stranger
      .from('profiles')
      .select(
        'id, email, phone, address, postcode, latitude, longitude, settings, notification_preferences'
      )
      .eq('id', owner.id);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);
    const list = await stranger.from('profiles').select('id, email');
    expect(list.error).toBeNull();
    expect(list.data?.map((row) => row.id)).toEqual([users[1].id]);
  });
  it('preserves owner and administrator contact reads', async () => {
    for (const client of [ownerClient, admin]) {
      const read = await client
        .from('profiles')
        .select('email, phone, address')
        .eq('id', owner.id)
        .single();
      expect(read.error).toBeNull();
      expect(read.data?.email).toBe(owner.email);
      expect(read.data?.phone).toBe('+447700900123');
    }
  });
  it('exposes only safe directory fields and coarse contractor coordinates', async () => {
    const read = await stranger
      .from('profile_directory')
      .select('*')
      .eq('id', owner.id)
      .single();
    expect(read.error).toBeNull();
    expect(read.data?.company_name).toBe('Fixture Plumbing');
    expect(read.data?.latitude).toBe(51.5);
    expect(read.data?.longitude).toBe(-0.1);
    for (const field of [
      'email',
      'phone',
      'address',
      'postcode',
      'settings',
      'notification_preferences',
    ]) {
      expect(read.data).not.toHaveProperty(field);
      const probe = await stranger
        .from('profile_directory')
        .select(field)
        .eq('id', owner.id);
      expect(probe.error).not.toBeNull();
    }
  });
  it('preserves contractor skill and review relationships used by mobile discovery', async () => {
    const read = await stranger
      .from('profile_directory')
      .select(
        'id, contractor_skills!contractor_id(id, skill_name, created_at), reviews:reviews!reviewee_id(id, rating, comment, created_at)'
      )
      .eq('id', owner.id)
      .single();
    expect(read.error).toBeNull();
    expect(read.data?.id).toBe(owner.id);
  });
  it('rejects anonymous access and directory writes', async () => {
    const anon = await createAnonClient()
      .from('profile_directory')
      .select('id');
    expect(anon.error).not.toBeNull();
    const write = await stranger
      .from('profile_directory')
      .update({ company_name: 'Forged' })
      .eq('id', owner.id);
    expect(write.error).not.toBeNull();
    const privateWrite = await stranger
      .from('profiles')
      .update({ phone: 'forged' })
      .eq('id', owner.id)
      .select('id');
    expect(privateWrite.error !== null || privateWrite.data?.length === 0).toBe(
      true
    );
  });
  it('cannot promote an owner to administrator or forge verification', async () => {
    for (const updates of [{ role: 'admin' }, { admin_verified: true }]) {
      const write = await ownerClient
        .from('profiles')
        .update(updates)
        .eq('id', owner.id);
      expect(write.error).not.toBeNull();
    }
  });
  it('keeps safe participant names available through job relationships', async () => {
    const job = await createTestJob({
      homeowner_id: users[1].id,
      status: 'posted',
    });
    try {
      const update = await createServiceClient()
        .from('jobs')
        .update({ contractor_id: owner.id })
        .eq('id', job.id);
      expect(update.error).toBeNull();
      const read = await stranger
        .from('jobs')
        .select(
          'id, contractor:profile_directory!contractor_id(id, first_name, last_name, contractor_skills!contractor_id(skill_name))'
        )
        .eq('id', job.id)
        .single();
      expect(read.error).toBeNull();
      expect(read.data?.contractor).toMatchObject({ id: owner.id });
      const hidden = await stranger
        .from('jobs')
        .select('id, contractor:profiles!contractor_id(email)')
        .eq('id', job.id)
        .single();
      expect(hidden.error).toBeNull();
      expect(hidden.data?.contractor).toBeNull();
    } finally {
      await job.cleanup();
    }
  });
  it('removes soft-deleted accounts from the directory', async () => {
    const db = createServiceClient();
    const update = await db
      .from('profiles')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', owner.id);
    expect(update.error).toBeNull();
    const read = await stranger
      .from('profile_directory')
      .select('id')
      .eq('id', owner.id);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);
  });
});
