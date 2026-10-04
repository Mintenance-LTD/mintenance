// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const mocks = vi.hoisted(() => ({ from: vi.fn(), sign: vi.fn() }));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: mocks.from },
  createRequestScopedClient: () => ({ from: mocks.from }),
}));
vi.mock('@/lib/api/job-storage', () => ({ resignJobStorageUrls: mocks.sign }));
vi.mock('@mintenance/shared', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
import { handleGet } from '@/app/api/jobs/[id]/_handlers/get';
const version = '2026-10-04T15:30:00.123456+00:00';
let owner: string;
beforeEach(() => {
  vi.clearAllMocks();
  owner = 'owner';
  mocks.sign.mockImplementation(async (urls: string[]) =>
    urls.map((_, i) => `https://storage.invalid/fresh-${i}`)
  );
  mocks.from.mockImplementation((table: string) => {
    let columns = '';
    const q: Record<string, unknown> = {};
    q.select = vi.fn((value: string) => {
      columns = value;
      return q;
    });
    q.eq = vi.fn(() => q);
    q.order = vi.fn(() => q);
    const result = () => {
      if (table === 'jobs') {
        const row: Record<string, unknown> = {
          id: 'job',
          title: 'Work',
          status: 'completed',
          homeowner_id: owner,
          completed_at: version,
          completion_confirmed_at: null,
        };
        return {
          data: Object.fromEntries(
            columns
              .split(',')
              .map((x) => x.trim())
              .filter((x) => x in row)
              .map((x) => [x, row[x]])
          ),
          error: null,
          count: 1,
        };
      }
      if (table === 'job_photos_metadata')
        return {
          data: [
            {
              id: 'before',
              photo_url: 'expired-before',
              photo_type: 'before',
              created_at: version,
            },
            {
              id: 'after',
              photo_url: 'expired-after',
              photo_type: 'after',
              created_at: version,
            },
          ],
          error: null,
        };
      if (table === 'job_attachments')
        return { data: [{ file_url: 'old-attachment' }], error: null };
      return { data: null, error: null };
    };
    q.single = vi.fn(async () => result());
    q.maybeSingle = vi.fn(async () => result());
    q.then = (resolve: (value: unknown) => unknown) =>
      Promise.resolve(result()).then(resolve);
    return q;
  });
});
describe('job review read contract', () => {
  it('returns the completion version and signed lifecycle photos with matching identities', async () => {
    const response = await handleGet(
      new NextRequest('https://example.invalid/api/jobs/job'),
      { user: { id: 'owner', role: 'homeowner' }, params: { id: 'job' } }
    );
    const { job } = await response.json();
    expect(job.completed_at).toBe(version);
    expect(job.completion_confirmed_at).toBeNull();
    expect(mocks.sign).toHaveBeenCalledWith(
      ['old-attachment', 'expired-before', 'expired-after'],
      'owner'
    );
    expect(job.lifecyclePhotos).toEqual([
      {
        id: 'before',
        photo_url: 'https://storage.invalid/fresh-1',
        photo_type: 'before',
        created_at: version,
      },
      {
        id: 'after',
        photo_url: 'https://storage.invalid/fresh-2',
        photo_type: 'after',
        created_at: version,
      },
    ]);
  });
  it('rejects unrelated viewers before signing photos', async () => {
    owner = 'another-owner';
    await expect(
      handleGet(new NextRequest('https://example.invalid/api/jobs/job'), {
        user: { id: 'owner', role: 'homeowner' },
        params: { id: 'job' },
      })
    ).rejects.toThrow('permission');
    expect(mocks.sign).not.toHaveBeenCalled();
  });
});
