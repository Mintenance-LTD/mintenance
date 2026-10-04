import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: NextRequest) =>
    handler(request, { params: { id: 'contractor-fixture' } }),
}));
vi.mock('@/lib/middleware/public-rate-limiter', () => ({
  withPublicRateLimit: (_: unknown, handler: Function) => handler(),
}));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: vi.fn(async () => ({ allowed: true })) },
}));
import { GET } from '@/app/api/contractors/[id]/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.from.mockImplementation((table: string) => {
    if (
      ['job_photos_metadata', 'escrow_transactions', 'profiles'].includes(table)
    ) {
      throw new Error(
        `Public profile must not read private evidence: ${table}`
      );
    }
    const data =
      table === 'profile_directory'
        ? {
            id: 'contractor-fixture',
            role: 'contractor',
            first_name: '',
            last_name: '',
            company_name: 'Fixture Plumbing',
            portfolio_images: ['https://example.test/curated.jpg'],
            // Even an accidental extra database field must not become a response field.
            email: 'private@example.test',
            phone: '+447700900123',
            address: 'Private address',
          }
        : table === 'contractor_insurance'
          ? null
          : [];
    const result = { data, error: null, count: table === 'jobs' ? 3 : 0 };
    const builder: Record<string, any> = {};
    for (const method of ['select', 'eq', 'gte', 'order', 'limit'])
      builder[method] = vi.fn(() => builder);
    builder.single = builder.maybeSingle = vi.fn(async () => result);
    builder.then = (resolve: Function) => Promise.resolve(resolve(result));
    return builder;
  });
});

it('returns a usable public profile without contact data or private job evidence', async () => {
  const response = await GET(
    new NextRequest('https://example.test/api/contractors/contractor-fixture'),
    {} as never
  );
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.contractor.name).toBe('Fixture Plumbing');
  for (const field of ['email', 'phone', 'address'])
    expect(body.contractor).not.toHaveProperty(field);
  expect(body.contractor.portfolio).toHaveLength(1);
  expect(body.contractor.portfolio[0].images).toEqual([
    'https://example.test/curated.jpg',
  ]);
  expect(mocks.from).not.toHaveBeenCalledWith('profiles');
  expect(mocks.from).not.toHaveBeenCalledWith('job_photos_metadata');
});
