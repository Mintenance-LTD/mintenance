// @vitest-environment node
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  limit: vi.fn(),
  assess: vi.fn(),
  from: vi.fn(),
  rpc: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_options: unknown, handler: any) => (request: NextRequest) =>
    handler(request, { user: { id: 'owner' } }),
}));
vi.mock('@/lib/rate-limiter', () => ({
  rateLimiter: { checkRateLimit: m.limit },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from, rpc: m.rpc },
}));
vi.mock('@/lib/services/maintenance/MaintenanceAssessmentService', () => ({
  MaintenanceAssessmentService: { assessMaintenanceIssue: m.assess },
}));
import { POST } from '@/app/api/maintenance/assess/route';
const jobId = '11111111-1111-4111-8111-111111111111';
const request = (body = {}) =>
  new NextRequest('http://localhost/api/maintenance/assess', {
    method: 'POST',
    body: JSON.stringify({
      images: ['https://example.test/photo.jpg'],
      ...body,
    }),
  });
let job: { homeowner_id: string; contractor_id: string } | null;
let dbError: { message: string } | null;
beforeEach(() => {
  vi.clearAllMocks();
  job = { homeowner_id: 'owner', contractor_id: 'contractor' };
  dbError = null;
  m.limit.mockResolvedValue({ allowed: true });
  m.assess.mockResolvedValue({
    id: 'assessment',
    status: 'no_issue_detected',
    confidence: 0,
  });
  m.rpc.mockResolvedValue({ error: null });
  m.from.mockImplementation(() => {
    const q: Record<string, any> = {};
    for (const key of ['select', 'eq', 'is']) q[key] = vi.fn(() => q);
    q.maybeSingle = vi.fn(async () => ({ data: job, error: dbError }));
    q.insert = vi.fn(async () => ({ error: null }));
    return q;
  });
});

it('charges every unsaved request to the shared fail-closed inference budget', async () => {
  await POST(request({ saveAssessment: false }), {
    params: Promise.resolve({}),
  });
  expect(m.limit).toHaveBeenCalledWith({
    identifier: 'maintenance-assess:owner',
    windowMs: 3600000,
    maxRequests: 20,
    criticality: 'ai',
  });
  m.limit.mockResolvedValue({ allowed: false, retryAfter: 23 });
  const response = await POST(request({ saveAssessment: false }), {
    params: Promise.resolve({}),
  });
  expect(response.status).toBe(429);
  expect(response.headers.get('Retry-After')).toBe('23');
  expect(m.assess).toHaveBeenCalledTimes(1);
});

it('rejects another user’s job before any inference or persistence', async () => {
  job = { homeowner_id: 'someone-else', contractor_id: 'another-contractor' };
  await expect(
    POST(request({ jobId }), { params: Promise.resolve({}) })
  ).rejects.toMatchObject({ statusCode: 403 });
  expect(m.assess).not.toHaveBeenCalled();
});

it.each(['homeowner', 'contractor'])(
  'allows the assigned %s to assess a job',
  async (role) => {
    job =
      role === 'homeowner'
        ? { homeowner_id: 'owner', contractor_id: 'other' }
        : { homeowner_id: 'other', contractor_id: 'owner' };
    expect(
      (await POST(request({ jobId }), { params: Promise.resolve({}) })).status
    ).toBe(200);
  }
);

it('fails closed on a job lookup error', async () => {
  dbError = { message: 'database unavailable' };
  await expect(
    POST(request({ jobId }), { params: Promise.resolve({}) })
  ).rejects.toMatchObject({ statusCode: 500 });
  expect(m.assess).not.toHaveBeenCalled();
});

it('does not accept a missing or deleted job', async () => {
  job = null;
  await expect(
    POST(request({ jobId }), { params: Promise.resolve({}) })
  ).rejects.toMatchObject({ statusCode: 404 });
  expect(m.assess).not.toHaveBeenCalled();
});
