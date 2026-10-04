import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { createTestUser, createTestJob, type TestUser, type TestJob } from '../../test/integration/fixtures';
import { createServiceClient, createAuthenticatedClient } from '../../test/integration/supabase-test-client';
vi.mock('@/lib/api/supabaseServer', async () => {
  const { createServiceClient } = await import('../../test/integration/supabase-test-client');
  return { serverSupabase: createServiceClient() };
});
import { prepareMessageAttachment, refreshMessageAttachment, parseMessageAttachment } from '@/lib/messages/attachments';

const service = createServiceClient();
const bucket = service.storage.from('job-attachments');
const users: TestUser[] = [];
let job: TestJob;
const paths: string[] = [];
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=', 'base64');
beforeAll(async () => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.SUPABASE_TEST_URL!);
  users.push(await createTestUser({ role: 'homeowner' }), await createTestUser({ role: 'contractor' }));
  job = await createTestJob({ homeowner_id: users[0].id });
  for (const path of [`${users[0].id}/service.png`, `${users[1].id}/other.png`, `${job.id}/unowned.png`]) {
    paths.push(path);
    expect((await bucket.upload(path, image, { contentType: 'image/png' })).error).toBeNull();
  }
  const owner = await createAuthenticatedClient(users[0].email, users[0].password);
  paths.push(`${job.id}/owned.png`);
  expect((await owner.storage.from('job-attachments').upload(paths[3], image, { contentType: 'image/png' })).error).toBeNull();
});
afterAll(async () => {
  await bucket.remove(paths);
  if (job) await job.cleanup();
  for (const user of users.reverse()) await user.cleanup();
  vi.unstubAllEnvs();
});
function url(path: string) { return bucket.getPublicUrl(path).data.publicUrl; }

it('supports both service uploads in the sender namespace and authenticated job uploads', async () => {
  for (const path of [paths[0], paths[3]]) {
    const saved = await prepareMessageAttachment(url(path), users[0].id, job.id);
    expect(saved).toContain('/object/sign/job-attachments/');
    expect((await fetch(saved)).ok).toBe(true);
    const row = await refreshMessageAttachment({ attachment_url: saved, sender_id: users[0].id, job_id: job.id });
    expect(row.attachment_url).toContain('/object/sign/');
    expect((await fetch(row.attachment_url!)).ok).toBe(true);
  }
});
it('rejects other users and ambiguous unowned job files', async () => {
  for (const path of [paths[1], paths[2]]) {
    await expect(prepareMessageAttachment(url(path), users[0].id, job.id)).rejects.toThrow();
  }
});
it('does not expose the ownership RPC to ordinary users', async () => {
  const client = await createAuthenticatedClient(users[0].email, users[0].password);
  const result = await client.rpc('can_attach_message_file', {
    p_path: paths[0], p_sender: users[0].id, p_job: job.id,
  });
  expect(result.error).not.toBeNull();
});
it('renews legacy links without trusting their old token', async () => {
  const old = url(paths[0]).replace('/public/', '/sign/') + '?token=expired';
  const row = await refreshMessageAttachment({ attachment_url: old, sender_id: users[0].id, job_id: job.id });
  expect(row.attachment_url).not.toContain('token=expired');
  expect((await fetch(row.attachment_url!)).ok).toBe(true);
});
it('omits unsafe and missing legacy attachments without losing the message', async () => {
  for (const value of [url(paths[1]), url(`${users[0].id}/missing.png`), 'https://attacker.test/file.png']) {
    const row = await refreshMessageAttachment({ content: 'preserved', attachment_url: value, sender_id: users[0].id, job_id: job.id });
    expect(row).toMatchObject({ content: 'preserved', attachment_url: null });
  }
});
it('rejects lookalike origins, credentials, other buckets and encoded traversal', () => {
  const base = process.env.SUPABASE_TEST_URL!;
  for (const value of [
    `https://attacker.test/storage/v1/object/sign/job-attachments/${paths[0]}`,
    url(paths[0]).replace('://', '://user:pass@'),
    url(paths[0]).replace('/job-attachments/', '/contractor-documents/'),
    `${base}/storage/v1/object/sign/job-attachments/${users[0].id}/%252e%252e/secret.png`,
    `${base}/storage/v1/object/sign/job-attachments/${users[0].id}/%2fother.png`,
  ]) expect(() => parseMessageAttachment(value)).toThrow();
});
