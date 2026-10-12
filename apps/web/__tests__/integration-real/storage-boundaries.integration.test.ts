import { afterAll, beforeAll, expect, it } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createTestJob, createTestUser, type TestUser, type TestJob } from '../../test/integration/fixtures';
import { createAuthenticatedClient, createServiceClient } from '../../test/integration/supabase-test-client';

const users: TestUser[] = [];
const paths: string[] = [];
let job: TestJob;
let owner: SupabaseClient;
let stranger: SupabaseClient;
const service = createServiceClient();
const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aZ1cAAAAASUVORK5CYII=', 'base64');
let trainingPath: string;
beforeAll(async () => {
  users.push(await createTestUser({ role: 'homeowner' }), await createTestUser({ role: 'contractor' }));
  job = await createTestJob({ homeowner_id: users[0].id });
  owner = await createAuthenticatedClient(users[0].email, users[0].password);
  stranger = await createAuthenticatedClient(users[1].email, users[1].password);
});
afterAll(async () => {
  if (paths.length) await service.storage.from('job-attachments').remove(paths);
  if (trainingPath) await service.storage.from('training-images').remove([trainingPath]);
  if (job) await job.cleanup();
  for (const user of users.reverse()) await user.cleanup();
});

async function upload(client: SupabaseClient, path: string) {
  paths.push(path);
  return client.storage.from('job-attachments').upload(path, image, { contentType: 'image/png' });
}

it('rejects strangers uploading into another job or user namespace', async () => {
  expect((await upload(stranger, `${job.id}/injected.png`)).error).not.toBeNull();
  expect((await upload(stranger, `${users[0].id}/injected.png`)).error).not.toBeNull();
});

it('preserves participant uploads and private job downloads while denying strangers', async () => {
  const path = `${job.id}/participant.png`;
  expect((await upload(owner, path)).error).toBeNull();
  expect((await owner.storage.from('job-attachments').download(path)).error).toBeNull();
  expect((await stranger.storage.from('job-attachments').download(path)).error).not.toBeNull();
  const { data } = service.storage.from('job-attachments').getPublicUrl(path);
  expect((await fetch(data.publicUrl)).ok).toBe(false);
});

it('permits personal uploads but cannot move them into an unrelated job', async () => {
  const path = `${users[1].id}/personal.png`;
  expect((await upload(stranger, path)).error).toBeNull();
  const destination = `${job.id}/moved.png`;
  paths.push(destination);
  expect((await stranger.storage.from('job-attachments').move(path, destination)).error).not.toBeNull();
  expect((await service.storage.from('job-attachments').download(destination)).error).not.toBeNull();
});

it('preserves dispute evidence restrictions for participants', async () => {
  expect((await upload(owner, `${job.id}/disputes/${users[1].id}/spoof.png`)).error).not.toBeNull();
  const path = `${job.id}/disputes/${users[0].id}/evidence.png`;
  expect((await upload(owner, path)).error).toBeNull();
  expect((await owner.storage.from('job-attachments').update(path, image, { contentType: 'image/png' })).error).not.toBeNull();
  await owner.storage.from('job-attachments').remove([path]);
  expect((await service.storage.from('job-attachments').download(path)).error).toBeNull();
});

it('blocks public and ordinary-user training downloads while retaining service access', async () => {
  trainingPath = `${users[0].id}/privacy-fixture.png`;
  const bucket = service.storage.from('training-images');
  expect((await bucket.upload(trainingPath, image, { contentType: 'image/png' })).error).toBeNull();
  expect((await bucket.download(trainingPath)).error).toBeNull();
  expect((await stranger.storage.from('training-images').download(trainingPath)).error).not.toBeNull();
  const { data } = bucket.getPublicUrl(trainingPath);
  expect((await fetch(data.publicUrl)).ok).toBe(false);
});
