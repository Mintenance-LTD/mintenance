// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mock = vi.hoisted(() => ({
  authorize: vi.fn(),
  from: vi.fn(),
  upload: vi.fn(),
  signed: vi.fn(),
  remove: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  del: vi.fn(),
  filters: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: mock.authorize },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: mock.from,
    storage: {
      from: () => ({
        upload: mock.upload,
        createSignedUrl: mock.signed,
        remove: mock.remove,
      }),
    },
  },
}));
import { GET, POST } from '@/app/api/properties/[id]/documents/route';
import { cleanupPropertyDocumentFiles } from '@/lib/properties/cleanup-document-files';
const id = '00000000-0000-4000-8000-000000000001';
beforeEach(() => {
  vi.clearAllMocks();
  mock.authorize.mockResolvedValue({ authorized: true });
  mock.upload.mockResolvedValue({ error: null });
  mock.signed.mockResolvedValue({
    data: { signedUrl: 'https://example.invalid/file' },
    error: null,
  });
  mock.remove.mockResolvedValue({ error: null });
  mock.from.mockImplementation(() => {
    const chain = {
      select: () => chain,
      eq: (key: string, value: unknown) => {
        mock.filters(key, value);
        return chain;
      },
      order: () => chain,
      range: () => chain,
      or: () => chain,
      limit: () => chain,
      insert: (value: unknown) => {
        mock.insert(value);
        return chain;
      },
      update: (value: unknown) => {
        mock.update(value);
        return chain;
      },
      delete: () => {
        mock.del();
        return chain;
      },
      maybeSingle: async () => ({
        data: { id, object_path: 'synthetic/path', name: 'file.pdf' },
        error: null,
      }),
      then: (resolve: (value: unknown) => unknown) =>
        Promise.resolve({
          data: [{ id, object_path: 'synthetic/path' }],
          error: null,
          count: 1,
        }).then(resolve),
    };
    return chain;
  });
});
const call = (handler: unknown, request: NextRequest) =>
  (handler as (request: NextRequest, context: unknown) => Promise<Response>)(
    request,
    { user: { id: 'actor' }, params: { id: 'property' } }
  );
function upload(content = '%PDF-1.7 synthetic', type = 'application/pdf') {
  const body = new FormData();
  body.append('kind', 'lease');
  body.append('file', new File([content], 'file.pdf', { type }));
  return call(
    POST,
    new NextRequest('http://localhost/api/properties/property/documents', {
      method: 'POST',
      body,
    })
  );
}
it('denies document listing before reading storage for an unauthorized account', async () => {
  mock.authorize.mockResolvedValue({ authorized: false });
  await expect(
    call(
      GET,
      new NextRequest('http://localhost/api/properties/property/documents')
    )
  ).rejects.toThrow('Only property owners');
  expect(mock.from).not.toHaveBeenCalled();
});
it('rejects forged PDF content before reserving or uploading', async () => {
  await expect(upload('<html>bad</html>')).rejects.toThrow('File contents');
  expect(mock.insert).not.toHaveBeenCalled();
  expect(mock.upload).not.toHaveBeenCalled();
});
it('journals the file before upload and marks it ready only after success', async () => {
  expect((await upload()).status).toBe(201);
  expect(mock.insert.mock.invocationCallOrder[0]).toBeLessThan(
    mock.upload.mock.invocationCallOrder[0]
  );
  expect(mock.upload.mock.invocationCallOrder[0]).toBeLessThan(
    mock.update.mock.invocationCallOrder[0]
  );
});
it('leaves a failed upload pending for cleanup rather than showing success', async () => {
  mock.upload.mockResolvedValue({ error: new Error('offline') });
  await expect(upload()).rejects.toThrow('offline');
  expect(mock.update).not.toHaveBeenCalled();
});
it('scopes short-lived downloads to the requested property', async () => {
  await call(
    GET,
    new NextRequest(
      `http://localhost/api/properties/property/documents?documentId=${id}`
    )
  );
  expect(mock.filters).toHaveBeenCalledWith('property_id', 'property');
  expect(mock.filters).toHaveBeenCalledWith('status', 'ready');
  expect(mock.signed).toHaveBeenCalledWith('synthetic/path', 60, {
    download: 'file.pdf',
  });
});
it('retains cleanup tracking when storage removal fails', async () => {
  mock.remove.mockResolvedValue({ error: new Error('storage offline') });
  await expect(cleanupPropertyDocumentFiles()).rejects.toThrow(
    'storage offline'
  );
  expect(mock.del).not.toHaveBeenCalled();
});
