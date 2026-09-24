/** Real local Postgres compare-and-set and client isolation; no external push calls. */
import { randomUUID } from 'node:crypto';
import {
  createServiceClient,
  createAuthenticatedClient,
} from '../../test/integration/supabase-test-client';
import { createTestUser, type TestUser } from '../../test/integration/fixtures';

// Replace only configuration: operations still reach the guarded local database.
vi.mock('@/lib/api/supabaseServer', async () => {
  const { createServiceClient } =
    await import('../../test/integration/supabase-test-client');
  return { serverSupabase: createServiceClient() };
});
import {
  claimQueuedNotification,
  type QueuedNotificationRow,
} from '../../lib/services/notifications/NotificationQueueRetry';

describe('notification queue claims (real local database)', () => {
  let owner: TestUser;
  const id = randomUUID();
  const db = createServiceClient();
  let row: QueuedNotificationRow;
  beforeAll(async () => {
    owner = await createTestUser({ role: 'homeowner' });
    const { data, error } = await db
      .from('notification_queue')
      .insert({
        id,
        user_id: owner.id,
        notification_type: 'job_update',
        title: 'Synthetic claim',
        message: 'Local test only',
        priority: 'medium',
        status: 'failed_push',
        retry_count: 0,
        scheduled_for: new Date(Date.now() - 1000).toISOString(),
      })
      .select('*')
      .single();
    if (error) throw error;
    row = data;
  });
  afterAll(async () => {
    await db.from('notification_queue').delete().eq('id', id);
    if (owner) await db.auth.admin.deleteUser(owner.id);
  });
  it('grants one of two concurrent claims and prevents reclaiming an active lease', async () => {
    const claims = await Promise.all([
      claimQueuedNotification({ ...row }),
      claimQueuedNotification({ ...row }),
    ]);
    expect(claims.filter(Boolean)).toHaveLength(1);
    expect(await claimQueuedNotification({ ...row })).toBe(false);
    const { data } = await db
      .from('notification_queue')
      .select('*')
      .eq('id', id)
      .single();
    expect(await claimQueuedNotification(data)).toBe(false);
  });
  it('does not allow the recipient to forge accepted devices or requeue delivery', async () => {
    const client = await createAuthenticatedClient(owner.email, owner.password);
    await client
      .from('notification_queue')
      .update({
        metadata: { push_accepted_device_ids: ['forged'] },
        scheduled_for: row.scheduled_for,
      })
      .eq('id', id);
    const { data, error } = await db
      .from('notification_queue')
      .select('metadata, scheduled_for')
      .eq('id', id)
      .single();
    expect(error).toBeNull();
    expect(data?.metadata?.push_accepted_device_ids).toBeUndefined();
    expect(data?.scheduled_for).not.toBe(row.scheduled_for);
  });
  it('allows recovery after an expired lease', async () => {
    const { data, error } = await db
      .from('notification_queue')
      .update({ scheduled_for: new Date(Date.now() - 1000).toISOString() })
      .eq('id', id)
      .select('*')
      .single();
    expect(error).toBeNull();
    expect(await claimQueuedNotification(data)).toBe(true);
  });
});
