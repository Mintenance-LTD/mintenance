// @vitest-environment node
import { NextRequest } from 'next/server';
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  actor: 'payer',
  from: vi.fn(),
  sign: vi.fn(),
  failPage: false,
  filters: [] as string[],
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (_options: unknown, handler: Function) => (request: NextRequest) =>
      handler(request, {
        user: { id: state.actor, role: 'homeowner' },
        params: { id: 'escrow' },
      }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: state.from },
}));
vi.mock('@/lib/api/job-storage', () => ({ resignJobStorageUrls: state.sign }));
import { GET } from '@/app/api/escrow/[id]/homeowner/pending-approval/route';
const photo = (id: string, type: string) => ({
  id,
  photo_type: type,
  photo_url: `expired/${id}`,
  storage_path: `private/${id}`,
  angle_type: null,
  quality_score: null,
  created_at: '2026-09-16T10:00:00.123457Z',
});
beforeEach(() => {
  vi.clearAllMocks();
  state.actor = 'payer';
  state.failPage = false;
  state.filters = [];
  state.sign.mockImplementation(async (paths: string[]) =>
    paths.map((p) => `signed/${p}`)
  );
  state.from.mockImplementation((table: string) => {
    let cursor: string | null = null;
    const q = {
      select: vi.fn(() => q),
      eq: vi.fn(() => q),
      order: vi.fn(() => q),
      limit: vi.fn(() => q),
      in: vi.fn(() => q),
      gt: vi.fn((_key: string, value: string) => {
        cursor = value;
        return q;
      }),
      or: vi.fn((filter: string) => {
        state.filters.push(filter);
        return q;
      }),
      single: async () => ({
        data: {
          id: 'escrow',
          amount: 500,
          status: 'held',
          admin_hold_status: 'none',
          homeowner_approval: false,
          homeowner_inspection_completed: true,
          auto_approval_date: null,
          jobs: {
            id: 'job',
            title: 'Synthetic repair',
            homeowner_id: 'owner',
            payer_user_id: 'payer',
            status: 'completed',
            completed_at: '2026-09-16T11:00:00Z',
          },
        },
        error: null,
      }),
      maybeSingle: async () => ({
        data: { created_at: '2026-09-16T10:00:00.123456+00:00' },
        error: null,
      }),
      then: (resolve: Function) => {
        if (table !== 'job_photos_metadata')
          throw new Error('Unexpected query');
        return Promise.resolve(
          cursor && state.failPage
            ? { data: null, error: { message: 'Synthetic read failure' } }
            : {
                data:
                  cursor === null
                    ? [photo('001', 'before')]
                    : cursor === '001'
                      ? [photo('002', 'after')]
                      : [],
                error: null,
              }
        ).then(resolve as never);
      },
    };
    return q;
  });
});
const send = () =>
  GET(
    new NextRequest(
      'http://localhost/api/escrow/escrow/homeowner/pending-approval'
    ),
    { params: Promise.resolve({ id: 'escrow' }) }
  );
it('returns both photo types across short pages and refreshes private URLs for the actual viewer', async () => {
  const result = await (await send()).json();
  expect(result.data.beforePhotos).toEqual([
    expect.objectContaining({ url: 'signed/private/001' }),
  ]);
  expect(result.data.afterPhotos).toEqual([
    expect.objectContaining({ url: 'signed/private/002' }),
  ]);
  expect(result.data.inspectionCompleted).toBe(true);
  expect(result.data.canReview).toBe(true);
  expect(state.sign).toHaveBeenCalledWith(
    ['private/001', 'private/002'],
    'payer'
  );
  expect(state.filters).toContain(
    'photo_type.eq.before,created_at.gt.2026-09-16T10:00:00.123456+00:00'
  );
});
it('denies unrelated users before reading or signing photo metadata', async () => {
  state.actor = 'unrelated';
  await expect(send()).rejects.toMatchObject({ statusCode: 403 });
  expect(state.from).toHaveBeenCalledTimes(1);
  expect(state.sign).not.toHaveBeenCalled();
});
it('returns a read-only view to the owner when someone else is the designated payer', async () => {
  state.actor = 'owner';
  expect((await (await send()).json()).data.canReview).toBe(false);
});
it('does not return partial photo evidence after a later page fails', async () => {
  state.failPage = true;
  await expect(send()).rejects.toMatchObject({ statusCode: 500 });
  expect(state.sign).not.toHaveBeenCalled();
});
