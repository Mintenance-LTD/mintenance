// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  from: vi.fn(),
  download: vi.fn(),
  admin: vi.fn(),
  options: [] as unknown[],
  record: null as unknown,
  auditError: null as unknown,
  eq: vi.fn(),
  contains: vi.fn(),
  insert: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (options: unknown, handler: Function) => {
    m.options.push(options);
    return (req: NextRequest) => handler(req, { user: { id: 'admin' } });
  },
}));
vi.mock('@/lib/admin-verification', () => ({
  requireAdminFromDatabase: (...args: unknown[]) => m.admin(...args),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (...args: unknown[]) => m.from(...args),
    storage: { from: () => ({ download: m.download }) },
  },
}));
import { POST } from '@/app/api/admin/evidence-retention/export/route';
import { buildRetainedEvidencePacket } from '@/lib/privacy/retained-evidence-export';
const id = '11111111-1111-4111-8111-111111111111';
const subject = '22222222-2222-4222-8222-222222222222';
const job = '33333333-3333-4333-8333-333333333333';
const path = `${job}/disputes/${subject}/photo.jpg`;
const body = {
  kind: 'dispute',
  recordId: id,
  subjectId: subject,
  caseReference: 'CASE-TEST',
  identityVerified: true,
};
const call = (value = body) =>
  POST(
    new NextRequest('http://localhost/api/admin/evidence-retention/export', {
      method: 'POST',
      body: JSON.stringify(value),
    }),
    { params: Promise.resolve({}) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.auditError = null;
  m.admin.mockResolvedValue(undefined);
  m.record = {
    dispute_id: id,
    job_id: job,
    claimant_id: subject,
    participant_ids: [subject],
    evidence: { description: `Evidence: job-attachments:${path}` },
  };
  m.download.mockResolvedValue({
    data: new Blob(['synthetic file']),
    error: null,
  });
  m.from.mockImplementation(() => {
    const q = {
      select: () => q,
      eq: (...args: unknown[]) => {
        m.eq(...args);
        return q;
      },
      contains: (...args: unknown[]) => {
        m.contains(...args);
        return q;
      },
      maybeSingle: async () => ({ data: m.record, error: null }),
      insert: async (value: unknown) => {
        m.insert(value);
        return { error: m.auditError };
      },
    };
    return q;
  });
});
it('requires recent MFA and database admin verification, and filters the exact subject/record', async () => {
  expect(m.options).toContainEqual(
    expect.objectContaining({
      roles: ['admin'],
      requireMfaVerifiedWithinMinutes: 15,
    })
  );
  const response = await call();
  const packet = await response.json();
  expect(m.admin).toHaveBeenCalledWith('admin');
  expect(m.eq).toHaveBeenCalledWith('dispute_id', id);
  expect(m.contains).toHaveBeenCalledWith('participant_ids', [subject]);
  expect(m.insert).toHaveBeenCalledWith(
    expect.objectContaining({
      user_id: null,
      performed_by: 'admin',
      new_values: expect.objectContaining({
        subject_id: subject,
        case_reference: 'CASE-TEST',
      }),
    })
  );
  expect(Buffer.from(packet.files[0].content, 'base64').toString()).toBe(
    'synthetic file'
  );
  expect(packet.files[0].sha256).toMatch(/^[a-f0-9]{64}$/);
  expect(response.headers.get('cache-control')).toBe('private, no-store');
});
it('does not access evidence after administrator verification fails', async () => {
  m.admin.mockRejectedValue(new Error('Denied'));
  await expect(call()).rejects.toThrow('Denied');
  expect(m.from).not.toHaveBeenCalled();
});
it('does not export a record for an unrelated subject', async () => {
  m.record = null;
  await expect(call()).rejects.toMatchObject({ statusCode: 404 });
  expect(m.download).not.toHaveBeenCalled();
});
it('requires identity confirmation', async () => {
  await expect(
    call({ ...body, identityVerified: false })
  ).rejects.toMatchObject({ statusCode: 400 });
  expect(m.from).not.toHaveBeenCalled();
});
it('fails closed when its durable audit cannot be written', async () => {
  m.auditError = { message: 'offline' };
  await expect(call()).rejects.toThrow('audit could not be saved');
});
it('fails rather than exporting an incomplete known file', async () => {
  m.download.mockResolvedValue({ data: null, error: { message: 'missing' } });
  await expect(call()).rejects.toThrow('No export was completed');
  expect(m.insert).not.toHaveBeenCalled();
});
it('never fetches an external origin or another claimant’s file', async () => {
  const packet = await buildRetainedEvidencePacket('dispute', {
    job_id: job,
    claimant_id: subject,
    evidence: {
      a: 'https://attacker.invalid/file',
      b: `job-attachments:${job}/disputes/${id}/secret.jpg`,
    },
  });
  expect(m.download).not.toHaveBeenCalled();
  expect(packet.external_files_complete).toBe(false);
  expect(packet.external_references).toHaveLength(2);
});
it('rejects files too large for a synchronous download', async () => {
  m.download.mockResolvedValue({
    data: new Blob([new Uint8Array(2_000_001)]),
    error: null,
  });
  await expect(call()).rejects.toThrow('offline evidence export');
});
