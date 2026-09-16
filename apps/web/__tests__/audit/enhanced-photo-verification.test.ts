// @vitest-environment node
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
  quality: vi.fn(),
  sign: vi.fn(),
  actor: 'contractor',
  missing: false,
  legacy: false,
  failPage: false,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (req: NextRequest) =>
    handler(req, {
      user: { id: m.actor, role: 'contractor' },
      params: { id: '11111111-1111-4111-8111-111111111111' },
    }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from, rpc: m.rpc },
}));
vi.mock('@/lib/security/url-validation', () => ({
  validateURLs: async (urls: string[]) => ({ valid: urls, invalid: [] }),
}));
vi.mock('@/lib/api/job-storage', async (original) => ({
  ...(await original<object>()),
  signJobStoragePath: m.sign,
}));
vi.mock('@/lib/services/escrow/PhotoVerificationService', () => ({
  PhotoVerificationService: {
    validatePhotoQuality: m.quality,
    verifyGeolocation: async () => ({ verified: true }),
    verifyTimestamp: async () => ({ verified: true }),
  },
}));
import { POST } from '@/app/api/escrow/[id]/verify-photos-enhanced/route';
const jobId = '22222222-2222-4222-8222-222222222222';
const url =
  'https://audit.supabase.co/storage/v1/object/sign/Job-storage/job-photos/after.png?token=old';
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://audit.supabase.co');
  m.actor = 'contractor';
  m.missing = false;
  m.legacy = false;
  m.failPage = false;
  m.rpc.mockResolvedValue({ data: true, error: null });
  m.quality.mockResolvedValue({ passed: true, qualityScore: 0.9 });
  m.sign.mockResolvedValue(url.replace('old', 'fresh'));
  m.from.mockImplementation((table: string) => {
    let type = '';
    let cursor = false;
    const q = {
      select: () => q,
      order: () => q,
      limit: () => q,
      gt: () => {
        cursor = true;
        return q;
      },
      in: () => q,
      eq: (key: string, value: string) => {
        if (key === 'photo_type') type = value;
        return q;
      },
      single: async () => ({
        data:
          table === 'jobs'
            ? {
                id: jobId,
                completed_at: '2026-09-16T00:00:00Z',
                latitude: 0,
                longitude: 0,
              }
            : { job_id: jobId, payee_id: 'contractor', status: 'held' },
        error: null,
      }),
      then: (resolve: Function) =>
        Promise.resolve({
          data:
            type === 'before' || m.missing || cursor
              ? []
              : [
                  {
                    id: 'photo-id',
                    photo_url: url,
                    storage_path: m.legacy ? null : 'job-photos/after.png',
                  },
                ],
          error:
            cursor && m.failPage
              ? { message: 'Synthetic pagination failure' }
              : null,
        }).then(resolve as never),
    };
    return q;
  });
});
afterEach(() => vi.unstubAllEnvs());
const send = (photo = url) =>
  POST(
    new NextRequest('http://localhost/api/escrow/e/verify-photos-enhanced', {
      method: 'POST',
      body: JSON.stringify({
        escrowId: '11111111-1111-4111-8111-111111111111',
        jobId,
        afterPhotoUrls: [photo],
      }),
      headers: { 'content-type': 'application/json' },
    }),
    { params: Promise.resolve({ id: '11111111-1111-4111-8111-111111111111' }) }
  );
it('rejects another contractor before reading or analyzing evidence', async () => {
  m.actor = 'unrelated';
  await expect(send()).rejects.toThrow(/Not authorized/);
  expect(m.quality).not.toHaveBeenCalled();
  expect(m.sign).not.toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalled();
});
it('rejects another project origin before signing', async () => {
  await expect(
    send(url.replace('audit.supabase.co', 'other.supabase.co'))
  ).rejects.toThrow(/Distinct photos/);
  expect(m.sign).not.toHaveBeenCalled();
});
it('rejects unbound evidence before analysis', async () => {
  m.missing = true;
  await expect(send()).rejects.toThrow(/belong to this job/);
  expect(m.quality).not.toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalled();
});
it('commits exact actor, photo IDs and captured completion version while preserving zero coordinates', async () => {
  expect((await (await send()).json()).success).toBe(true);
  expect(m.quality).toHaveBeenCalledWith(url.replace('old', 'fresh'));
  expect(m.rpc).toHaveBeenCalledWith(
    'record_completion_photo_verification',
    expect.objectContaining({
      p_job_id: jobId,
      p_actor_id: 'contractor',
      p_expected_completed_at: '2026-09-16T00:00:00Z',
      p_photo_ids: ['photo-id'],
      p_verified: true,
    })
  );
});
it('does not report success when the database rejects a stale completion', async () => {
  m.rpc.mockResolvedValue({
    data: null,
    error: { code: '23514', message: 'Completion changed' },
  });
  await expect(send()).rejects.toThrow('Completion changed');
});
it('does not report success for a missing commit result', async () => {
  m.rpc.mockResolvedValue({ data: null, error: null });
  await expect(send()).rejects.toThrow(/Unable to confirm/);
});

it('accepts same-job legacy metadata without a stored path', async () => {
  m.legacy = true;
  expect((await (await send()).json()).success).toBe(true);
  expect(m.sign).toHaveBeenCalledWith('job-photos/after.png');
});

it('fails on a later metadata page without analyzing a partial result', async () => {
  m.failPage = true;
  await expect(send()).rejects.toThrow(/Unable to load completion photos/);
  expect(m.quality).not.toHaveBeenCalled();
  expect(m.rpc).not.toHaveBeenCalled();
});
