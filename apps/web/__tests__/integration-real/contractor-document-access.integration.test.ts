import { beforeAll, afterAll, expect, it, vi } from 'vitest';
import { createTestUser, type TestUser } from '../../test/integration/fixtures';
import { createServiceClient, createAuthenticatedClient } from '../../test/integration/supabase-test-client';
vi.mock('@/lib/api/supabaseServer', async () => {
  const { createServiceClient } = await import('../../test/integration/supabase-test-client');
  return { serverSupabase: createServiceClient() };
});
vi.mock('@/lib/api/with-api-handler', () => ({ withApiHandler: (_: unknown, handler: Function) => handler }));
import { GET, DELETE } from '@/app/api/contractor/documents/route';
const service = createServiceClient();
const users: TestUser[] = [];
const paths: string[] = [];
const ids: string[] = [];
beforeAll(async () => {
  users.push(await createTestUser({ role: 'contractor' }), await createTestUser({ role: 'contractor' }));
  for (const user of users) {
    const path = `${user.id}/document.pdf`;
    paths.push(path);
    expect((await service.storage.from('contractor-documents').upload(path, Buffer.from('%PDF-1.4\nfixture'), { contentType: 'application/pdf' })).error).toBeNull();
  }
  // An actual authenticated user can create their own row with a forged path.
  const client = await createAuthenticatedClient(users[0].email, users[0].password);
  for (const path of paths) {
    const result = await client.from('contractor_documents').insert({
      contractor_id: users[0].id, name: 'fixture.pdf', file_type: 'pdf',
      category: 'other', storage_path: path, size_bytes: 16,
    }).select('id').single();
    expect(result.error).toBeNull();
    ids.push(result.data!.id);
  }
});
afterAll(async () => {
  if (ids.length) await service.from('contractor_documents').delete().in('id', ids);
  await service.storage.from('contractor-documents').remove(paths);
  for (const user of users.reverse()) await user.cleanup();
});
it('does not sign a victim file referenced by an attacker-owned metadata row', async () => {
  const response = await GET({} as never, { user: { id: users[0].id } } as never);
  expect(response.status).toBe(200);
  const body = await response.json();
  const own = body.documents.find((d: { id: string }) => d.id === ids[0]);
  const forged = body.documents.find((d: { id: string }) => d.id === ids[1]);
  expect(forged.public_url).toBeNull();
  expect((await fetch(own.public_url)).ok).toBe(true);
});
it('does not delete the victim file via the forged metadata row', async () => {
  const response = await DELETE({ url: `http://localhost/api/contractor/documents?id=${ids[1]}` } as never, { user: { id: users[0].id } } as never);
  expect(response.status).toBe(403);
  expect((await service.storage.from('contractor-documents').download(paths[1])).error).toBeNull();
});
it('still deletes an owned document and its file', async () => {
  const response = await DELETE({ url: `http://localhost/api/contractor/documents?id=${ids[0]}` } as never, { user: { id: users[0].id } } as never);
  expect(response.status).toBe(200);
  expect((await service.storage.from('contractor-documents').download(paths[0])).error).not.toBeNull();
});
