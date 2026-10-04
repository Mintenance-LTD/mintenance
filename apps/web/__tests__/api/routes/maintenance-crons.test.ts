import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), cleanup: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { rpc: mocks.rpc },
}));
vi.mock('@/lib/properties/cleanup-document-files', () => ({
  cleanupPropertyDocumentFiles: mocks.cleanup,
}));
vi.mock('@/lib/cron-handler', () => ({
  withCronHandler: (_: string, handler: Function) => handler,
}));
import { GET as retention } from '@/app/api/cron/retention-cleanup/route';
import { GET as archival } from '@/app/api/cron/data-archival/route';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.cleanup.mockResolvedValue(2);
});

it('reports actual cleanup work including removed files and deferred accounts', async () => {
  mocks.rpc.mockResolvedValue({
    data: { processed: 4, profiles_deferred_for_review: 1 },
    error: null,
  });
  await expect(retention({} as never)).resolves.toMatchObject({
    processed: 6,
    removedFiles: 2,
    results: { profiles_deferred_for_review: 1 },
  });
  expect(mocks.rpc).toHaveBeenCalledWith('run_retention_cleanup');
});
it('reports the actual archival count and uses the conservative batch settings', async () => {
  mocks.rpc.mockResolvedValue({
    data: { processed: 3, archived: 3, method: 'in_place' },
    error: null,
  });
  await expect(archival({} as never)).resolves.toMatchObject({ processed: 3 });
  expect(mocks.rpc).toHaveBeenCalledWith('archive_old_records', {
    months_threshold: 12,
    batch_size: 500,
  });
});
it.each([null, {}, { processed: -1 }])(
  'does not report malformed database results as success: %j',
  async (data) => {
    mocks.rpc.mockResolvedValue({ data, error: null });
    await expect(retention({} as never)).rejects.toThrow();
    await expect(archival({} as never)).rejects.toThrow();
    expect(mocks.cleanup).not.toHaveBeenCalled();
  }
);
it('surfaces RPC failures so the scheduler can record a failed run', async () => {
  mocks.rpc.mockResolvedValue({
    data: null,
    error: { message: 'database unavailable' },
  });
  await expect(retention({} as never)).rejects.toThrow();
  await expect(archival({} as never)).rejects.toThrow();
  expect(mocks.cleanup).not.toHaveBeenCalled();
});
it('does not hide a document storage cleanup failure', async () => {
  mocks.rpc.mockResolvedValue({
    data: { processed: 0, profiles_deferred_for_review: 0 },
    error: null,
  });
  mocks.cleanup.mockRejectedValue(new Error('storage unavailable'));
  await expect(retention({} as never)).rejects.toThrow('storage unavailable');
});
