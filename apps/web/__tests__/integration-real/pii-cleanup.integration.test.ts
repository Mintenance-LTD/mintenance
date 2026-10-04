import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { randomUUID } from 'node:crypto';
import { createServiceClient } from '../../test/integration/supabase-test-client';

// Exercise the real handler and database operations. Only replace cron HTTP
// authentication and inject the guarded local test client instead of app env.
vi.mock('@/lib/api/supabaseServer', async () => {
  const { createServiceClient } =
    await import('../../test/integration/supabase-test-client');
  return { serverSupabase: createServiceClient() };
});
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_name: string, handler: Function) => handler,
}));
import { GET } from '@/app/api/cron/pii-cleanup/route';

const oldId = randomUUID();
const recentId = randomUUID();
const db = createServiceClient();
beforeAll(async () => {
  const base = {
    event_type: 'auth_failure',
    severity: 'low',
    endpoint: '/test',
    method: 'POST',
    details: 'Synthetic readiness test',
  };
  const { error } = await db.from('security_events').insert([
    {
      ...base,
      id: oldId,
      ip_address: '2001:db8::1234',
      created_at: new Date(Date.now() - 8 * 86400000).toISOString(),
    },
    {
      ...base,
      id: recentId,
      ip_address: '192.0.2.123',
      created_at: new Date().toISOString(),
    },
  ]);
  expect(error).toBeNull();
});
afterAll(async () => {
  const { error } = await db
    .from('security_events')
    .delete()
    .in('id', [oldId, recentId]);
  expect(error).toBeNull();
});
it('anonymizes expired INET values, preserves recent IPs and tolerates repeated runs', async () => {
  await GET({} as never);
  const read = await db
    .from('security_events')
    .select('id, ip_address, details')
    .in('id', [oldId, recentId]);
  expect(read.error).toBeNull();
  expect(read.data?.find((row) => row.id === oldId)).toMatchObject({
    ip_address: '0.0.0.0',
    details: 'Synthetic readiness test',
  });
  expect(read.data?.find((row) => row.id === recentId)?.ip_address).toBe(
    '192.0.2.123'
  );
  await expect(GET({} as never)).resolves.toMatchObject({
    security_events_anonymized: 0,
  });
});
