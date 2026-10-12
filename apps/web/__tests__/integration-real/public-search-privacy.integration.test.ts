import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import {
  createTestUser,
  createTestJob,
  type TestUser,
  type TestJob,
} from '../../test/integration/fixtures';
import { createServiceClient } from '../../test/integration/supabase-test-client';
vi.mock('@/lib/api/supabaseServer', async () => {
  const { createServiceClient } =
    await import('../../test/integration/supabase-test-client');
  return { serverSupabase: createServiceClient() };
});
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => handler,
}));
import { getFeaturedContractors } from '@/lib/queries/airbnb-optimized';
import { POST } from '@/app/api/ai/search/route';
const users: TestUser[] = [];
const service = createServiceClient();
let job: TestJob;
const term = `Discovery${Date.now()}`;
beforeAll(async () => {
  for (let i = 0; i < 3; i++) {
    users.push(await createTestUser({ role: 'contractor' }));
    const { error } = await service
      .from('profiles')
      .update({
        company_name: term,
        bio: 'Plumbing services',
        city: 'London',
        location: '17 Private Road',
        address: '17 Private Road',
        phone: '+447700900111',
        verified: i !== 1,
        admin_verified: false,
        deleted_at: i === 2 ? new Date().toISOString() : null,
        is_available: true,
        hourly_rate: 50,
        skills: ['plumbing'],
      })
      .eq('id', users[i].id);
    expect(error).toBeNull();
  }
  job = await createTestJob({
    homeowner_id: users[0].id,
    title: `${term} private repair`,
  });
});
afterAll(async () => {
  if (job) await job.cleanup();
  for (const user of users.reverse()) await user.cleanup();
});
async function search(body: unknown) {
  return POST(
    new NextRequest('http://localhost/api/ai/search', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    {} as never
  );
}
it('returns only verified active contractor directory fields, never jobs or private contacts', async () => {
  const response = await search({ query: term });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.results.map((r: { id: string }) => r.id)).toEqual([users[0].id]);
  expect(body.results[0].metadata.location).toBe('London');
  expect(body.searchMethod).toBe('full-text');
  const output = JSON.stringify(body);
  for (const privateValue of [
    '17 Private Road',
    '+447700900111',
    users[0].email,
    job.id,
  ]) {
    expect(output).not.toContain(privateValue);
  }
});
it('uses city, skills and hourly-rate filters without searching private location', async () => {
  const good = await search({
    query: term,
    filters: {
      location: 'London',
      category: 'plumbing',
      priceRange: { min: 40, max: 60 },
    },
  });
  expect((await good.json()).count).toBe(1);
  const privateAddress = await search({
    query: term,
    filters: { location: '17 Private Road' },
  });
  expect((await privateAddress.json()).count).toBe(0);
});
it.each([
  { query: '' },
  { query: term, limit: 101 },
  { query: term, filters: { rating: 'invalid' } },
])('rejects malformed search parameters %j', async (body) => {
  expect((await search(body)).status).toBe(400);
});

it('includes verified new contractors in browse without exposing deleted or unverified profiles', async () => {
  const contractors = await getFeaturedContractors(50, true);
  expect(contractors.map((person) => person.id)).toContain(users[0].id);
  expect(contractors.map((person) => person.id)).not.toContain(users[1].id);
  expect(contractors.map((person) => person.id)).not.toContain(users[2].id);
  expect(
    contractors.find((person) => person.id === users[0].id)?.skills
  ).toContain('plumbing');
  const output = JSON.stringify(contractors);
  for (const value of ['17 Private Road', '+447700900111', users[0].email])
    expect(output).not.toContain(value);
});
