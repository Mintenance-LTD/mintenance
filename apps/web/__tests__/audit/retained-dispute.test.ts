import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({ rpc: vi.fn(), sign: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    rpc: (...args: unknown[]) => m.rpc(...args),
    storage: {
      from: () => ({
        createSignedUrl: (...args: unknown[]) => m.sign(...args),
      }),
    },
  },
}));
import { readRetainedDispute } from '@/lib/services/disputes/retained';
const escrow = '11111111-1111-4111-8111-111111111111';
const job = '22222222-2222-4222-8222-222222222222';
const actor = '33333333-3333-4333-8333-333333333333';
const data = {
  id: escrow,
  job_id: job,
  status: 'archived',
  archived: true,
  description: `Statement\n\nEvidence:\n1. job-attachments:${job}/disputes/${actor}/photo.jpg`,
  raised_by: actor,
  dispute_reason: 'quality',
  resolution: null,
  created_at: '2026-09-22',
  archived_at: '2026-09-22',
  review_due_at: '2026-10-22',
  requires_retention_review: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  m.rpc.mockResolvedValue({ data, error: null });
  m.sign.mockResolvedValue({
    data: { signedUrl: 'https://example.invalid/evidence' },
    error: null,
  });
});
it('passes the authenticated actor to archive authorization and renews only scoped evidence', async () => {
  const result = await readRetainedDispute(escrow, actor);
  expect(m.rpc).toHaveBeenCalledWith('read_retained_dispute', {
    p_escrow_id: escrow,
    p_user_id: actor,
  });
  expect(result).toMatchObject({
    archived: true,
    status: 'archived',
    dispute_evidence: [{ url: 'https://example.invalid/evidence' }],
  });
  expect(m.sign).toHaveBeenCalledWith(
    `${job}/disputes/${actor}/photo.jpg`,
    600
  );
});
it('does not sign anything when the archive denies the caller', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { code: '42501' } });
  await expect(readRetainedDispute(escrow, actor)).rejects.toMatchObject({
    statusCode: 404,
  });
  expect(m.sign).not.toHaveBeenCalled();
});
it('reports unavailable storage without losing the retained statement', async () => {
  m.sign.mockResolvedValue({ data: null, error: { code: 'missing' } });
  expect(await readRetainedDispute(escrow, actor)).toMatchObject({
    description: data.description,
    dispute_evidence: [{ url: null }],
  });
});
it('rejects an archive for a different payment', async () => {
  m.rpc.mockResolvedValue({ data: { ...data, id: job }, error: null });
  await expect(readRetainedDispute(escrow, actor)).rejects.toMatchObject({
    statusCode: 500,
  });
  expect(m.sign).not.toHaveBeenCalled();
});
it('does not return an empty record when the database fails', async () => {
  m.rpc.mockResolvedValue({ data: null, error: { code: '08006' } });
  await expect(readRetainedDispute(escrow, actor)).rejects.toMatchObject({
    statusCode: 500,
  });
});
