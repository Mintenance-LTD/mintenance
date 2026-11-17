import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const actor = '00000000-0000-4000-8000-000000000001';
const payment = '00000000-0000-4000-8000-000000000002';
const job = '00000000-0000-4000-8000-000000000003';
const s = vi.hoisted(() => ({
  row: null as unknown,
  error: null as unknown,
  filters: vi.fn(),
  upload: vi.fn(),
  validate: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, { user: { id: '00000000-0000-4000-8000-000000000001' } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        select: () => q,
        eq: (...v: unknown[]) => {
          s.filters('eq', ...v);
          return q;
        },
        or: (v: string) => {
          s.filters('or', v);
          return q;
        },
        maybeSingle: async () => ({ data: s.row, error: s.error }),
      };
      return q;
    },
    storage: {
      from: (bucket: string) => {
        s.filters('bucket', bucket);
        return { upload: s.upload };
      },
    },
  },
}));
vi.mock('@/lib/utils/fileValidation', () => ({
  validateImageUpload: s.validate,
}));
import { GET } from '@/app/api/disputes/context/route';
import { POST } from '@/app/api/disputes/evidence/route';
beforeEach(() => {
  vi.clearAllMocks();
  s.row = {
    id: payment,
    job_id: job,
    amount: 1.2,
    status: 'held',
    jobs: { title: 'Test repair' },
  };
  s.error = null;
  s.validate.mockResolvedValue({ valid: true, detectedType: 'image/png' });
  s.upload.mockResolvedValue({ error: null });
});
const context = () =>
  GET(
    new NextRequest(
      'https://example.test/api/disputes/context?escrowId=' + payment
    )
  );
const evidence = () =>
  POST({
    headers: new Headers(),
    formData: async () => {
      const form = new FormData();
      form.set('escrowId', payment);
      form.set('file', new File(['png'], 'proof.png', { type: 'image/png' }));
      return form;
    },
  } as NextRequest);
it('scopes context to the exact payment and either participant', async () => {
  expect(await (await context()).json()).toMatchObject({
    id: payment,
    jobId: job,
    jobTitle: 'Test repair',
    amount: 1.2,
  });
  expect(s.filters).toHaveBeenCalledWith('eq', 'id', payment);
  expect(s.filters).toHaveBeenCalledWith(
    'or',
    `payer_id.eq.${actor},payee_id.eq.${actor}`
  );
});
it('rejects another account before upload or photo processing', async () => {
  s.row = null;
  await expect(context()).rejects.toMatchObject({ statusCode: 404 });
  await expect(evidence()).rejects.toMatchObject({ statusCode: 404 });
  expect(s.validate).not.toHaveBeenCalled();
  expect(s.upload).not.toHaveBeenCalled();
});
it('fails closed when access lookup fails', async () => {
  s.error = { message: 'db offline' };
  await expect(context()).rejects.toMatchObject({ statusCode: 500 });
  await expect(evidence()).rejects.toMatchObject({ statusCode: 500 });
  expect(s.upload).not.toHaveBeenCalled();
});
it('uploads only inside the authenticated claimant and exact job path', async () => {
  const result = await (await evidence()).json();
  expect(result.reference).toMatch(
    new RegExp(`^job-attachments:${job}/disputes/${actor}/[a-f0-9-]+\\.png$`)
  );
  expect(s.upload.mock.calls[0][2]).toEqual({
    contentType: 'image/png',
    upsert: false,
  });
  expect(s.filters).toHaveBeenCalledWith('bucket', 'job-attachments');
});
it('rejects disguised images and settled payments', async () => {
  s.validate.mockResolvedValue({ valid: false, error: 'Not an image' });
  await expect(evidence()).rejects.toMatchObject({ statusCode: 400 });
  expect(s.upload).not.toHaveBeenCalled();
  s.row = { id: payment, job_id: job, status: 'completed' };
  await expect(evidence()).rejects.toMatchObject({ statusCode: 400 });
  expect(s.upload).not.toHaveBeenCalled();
});
