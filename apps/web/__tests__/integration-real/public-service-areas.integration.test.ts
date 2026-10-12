import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { createTestUser, type TestUser } from '../../test/integration/fixtures';
import { createServiceClient } from '../../test/integration/supabase-test-client';

vi.mock('@/lib/api/supabaseServer', async () => {
  const { createServiceClient } = await import('../../test/integration/supabase-test-client');
  return { serverSupabase: createServiceClient() };
});
// Test the handler against actual rows; middleware/CSRF has separate coverage.
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
vi.mock('@/lib/csrf', () => ({ requireCSRF: vi.fn() }));
import { POST } from '@/app/api/contractors/service-areas-batch/route';

const service = createServiceClient();
const users: TestUser[] = [];
beforeAll(async () => {
  for (let i = 0; i < 4; i++) {
    const user = await createTestUser({ role: i === 3 ? 'homeowner' : 'contractor' });
    users.push(user);
    const { error } = await service.from('profiles').update({
      verified: i !== 1, admin_verified: false,
      deleted_at: i === 2 ? new Date().toISOString() : null,
    }).eq('id', user.id);
    expect(error).toBeNull();
    const { error: areaError } = await service.from('service_areas').insert({
      contractor_id: user.id, area_name: 'Private home base', city: 'London',
      zip_code: 'SW1A 1AA', center_latitude: 51.501234, center_longitude: -0.141234,
      radius_km: 12, description: 'Private access instructions',
    });
    expect(areaError).toBeNull();
  }
  const { error } = await service.from('service_areas').insert([
    { contractor_id: users[0].id, area_name: 'Inactive', is_active: false, center_latitude: 52, center_longitude: 1 },
    { contractor_id: users[0].id, area_name: 'No coordinates' },
  ]);
  expect(error).toBeNull();
});
afterAll(async () => {
  if (users.length) await service.from('service_areas').delete().in('contractor_id', users.map(user => user.id));
  for (const user of users.reverse()) await user.cleanup();
});
async function read(ids: string[]) {
  return POST(new NextRequest('http://localhost/api/contractors/service-areas-batch', {
    method: 'POST', body: JSON.stringify({ contractorIds: ids }),
  }), {} as never);
}
it('returns only active areas for verified, non-deleted contractors with approximate coordinates', async () => {
  const response = await read(users.map(user => user.id));
  const body = await response.json();
  expect(body).toHaveLength(1);
  expect(body[0][0]).toBe(users[0].id);
  expect(body[0][1]).toHaveLength(1);
  expect(body[0][1][0]).toMatchObject({ latitude: 51.5, longitude: -0.1, radius_km: 12 });
  expect(response.headers.get('Cache-Control')).toBe('no-store');
  const output = JSON.stringify(body);
  for (const secret of ['SW1A 1AA', '51.501234', '-0.141234', 'Private home base', 'Private access instructions']) {
    expect(output).not.toContain(secret);
  }
});
it('returns no coverage for ineligible IDs', async () => {
  const response = await read(users.slice(1).map(user => user.id));
  expect(await response.json()).toEqual([]);
});
