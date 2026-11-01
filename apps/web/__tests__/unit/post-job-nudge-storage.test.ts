import { beforeEach, expect, it, vi } from 'vitest';

const m = vi.hoisted(() => ({
  path: 'job-photos/job-a/before/photo.jpg' as unknown,
  from: vi.fn(),
  rpc: vi.fn(),
  bucket: vi.fn(),
  sign: vi.fn(),
  email: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: m.from, rpc: m.rpc, storage: { from: m.bucket } },
}));
vi.mock('@/lib/env', () => ({
  env: { NEXT_PUBLIC_APP_URL: 'https://app.test' },
}));
vi.mock('@/lib/email-service', () => ({
  EmailService: { sendPostJobNudgeEmail: m.email },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: vi.fn().mockResolvedValue({}) },
}));
import { PostJobNudgeService } from '@/lib/services/retention/PostJobNudgeService';

beforeEach(() => {
  vi.clearAllMocks();
  m.path = 'job-photos/job-a/before/photo.jpg';
  m.email.mockResolvedValue(true);
  m.bucket.mockReturnValue({ createSignedUrl: m.sign });
  m.sign.mockResolvedValue({
    data: { signedUrl: 'https://storage.test/signed' },
    error: null,
  });
  m.rpc.mockImplementation(async (_name, args) => ({
    data: args.p_paths.map((path: string) => ({ path })),
    error: null,
  }));
  m.from.mockImplementation((table: string) => {
    const data =
      table === 'jobs'
        ? [
            {
              id: 'job-a',
              homeowner_id: 'owner-a',
              contractor_id: null,
              title: 'Repair',
            },
          ]
        : table === 'profiles'
          ? [
              {
                id: 'owner-a',
                first_name: 'Owner',
                email: 'owner@example.test',
              },
            ]
          : table === 'job_photos_metadata'
            ? { storage_path: m.path }
            : null;
    const q: Record<string, unknown> = {};
    for (const method of [
      'select',
      'eq',
      'gte',
      'lt',
      'limit',
      'in',
      'contains',
      'order',
    ])
      q[method] = () => q;
    q.maybeSingle = async () => ({ data, error: null });
    q.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve({ data, error: null }).then(resolve);
    return q;
  });
});

it.each(['job-photos/job-a/before/photo.jpg', 'job-a/legacy.jpg'])(
  'signs an authorized job photo from the upload bucket: %s',
  async (path) => {
    m.path = path;
    expect((await PostJobNudgeService.sendDailyBatch()).sent).toBe(1);
    expect(m.rpc).toHaveBeenCalledWith('authorized_private_photo_paths', {
      p_actor_id: 'owner-a',
      p_paths: [path],
    });
    expect(m.bucket).toHaveBeenCalledWith('Job-storage');
    expect(m.sign).toHaveBeenCalledWith(path, 3600);
    expect(m.email.mock.calls[0][1]).toMatchObject({
      beforePhotoUrl: 'https://storage.test/signed',
      afterPhotoUrl: 'https://storage.test/signed',
    });
  }
);

it.each([
  'job-photos/other-job/after/private.jpg',
  'other-job/private.jpg',
  'job-photos/job-a/../../other/private.jpg',
  'job-photos/job-a/%2e%2e/private.jpg',
  'job-photos/job-a/after%2fprivate.jpg',
  'job-photos/job-a/after\\private.jpg',
  'job-photos/job-a//photo.jpg',
  'job-photos/job-a/./photo.jpg',
  'job-photos/job-a/photo.jpg?token=old',
  'job-photos/job-a/photo.jpg#fragment',
  'https://other.test/private.jpg',
  'job-photos/job-a/photo\u0000.jpg',
  null,
  42,
])('never signs a forged metadata path: %s', async (path) => {
  m.path = path;
  await PostJobNudgeService.sendDailyBatch();
  expect(m.rpc).not.toHaveBeenCalled();
  expect(m.sign).not.toHaveBeenCalled();
  expect(m.email.mock.calls[0][1]).toMatchObject({
    beforePhotoUrl: null,
    afterPhotoUrl: null,
  });
});

it.each([
  { data: [], error: null },
  { data: null, error: { message: 'authorization unavailable' } },
])('omits images when the recipient cannot be authorized', async (response) => {
  m.rpc.mockResolvedValue(response);
  await PostJobNudgeService.sendDailyBatch();
  expect(m.sign).not.toHaveBeenCalled();
  expect(m.email.mock.calls[0][1]).toMatchObject({
    beforePhotoUrl: null,
    afterPhotoUrl: null,
  });
});

it('omits missing objects instead of reusing an old capability', async () => {
  m.sign.mockResolvedValue({
    data: null,
    error: { message: 'Object not found' },
  });
  await PostJobNudgeService.sendDailyBatch();
  expect(m.email.mock.calls[0][1]).toMatchObject({
    beforePhotoUrl: null,
    afterPhotoUrl: null,
  });
});
