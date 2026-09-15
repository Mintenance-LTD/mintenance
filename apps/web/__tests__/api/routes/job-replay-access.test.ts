import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const state = vi.hoisted(() => ({
  actor: 'contractor',
  missing: false,
  payer: 'payer' as string | null,
  cache: vi.fn(),
  rpc: vi.fn(),
  update: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler:
    (
      _options: unknown,
      handler: (request: NextRequest, context: unknown) => Promise<Response>
    ) =>
    (request: NextRequest) =>
      handler(request, {
        user: { id: state.actor, role: 'contractor' },
        params: { id: 'job' },
      }),
}));
vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: () => 'key',
  getDeterministicIdempotencyKeyFromRequest: () => 'key',
  checkIdempotency: state.cache,
  storeIdempotencyResult: vi.fn(),
  releaseOnError: vi.fn(),
}));
vi.mock('@/lib/api/supabaseServer', () => {
  const db = {
    rpc: state.rpc,
    from: () => {
      const query = {
        select: () => query,
        eq: () => query,
        update: state.update,
        single: async () => ({
          data: state.missing
            ? null
            : {
                id: 'job',
                contractor_id: 'contractor',
                homeowner_id: 'owner',
                payer_user_id: state.payer,
                status: 'in_progress',
                title: 'Repair',
              },
          error: null,
        }),
      };
      return query;
    },
  };
  return { serverSupabase: db, createRequestScopedClient: () => db };
});
import { POST as start } from '@/app/api/jobs/[id]/start/route';
import { POST as rework } from '@/app/api/jobs/[id]/request-changes/route';

import { POST as confirm } from '@/app/api/jobs/[id]/confirm-completion/route';

import { POST as beforePhotos } from '@/app/api/jobs/[id]/photos/before/route';
import { POST as afterPhotos } from '@/app/api/jobs/[id]/photos/after/route';

describe.each([
  { name: 'before photos', route: beforePhotos, actor: 'contractor' },
  { name: 'after photos', route: afterPhotos, actor: 'contractor' },
  { name: 'confirm completion', route: confirm, actor: 'payer' },
  { name: 'start', route: start, actor: 'contractor' },
  { name: 'request changes', route: rework, actor: 'payer' },
])('$name replay access', ({ route, actor }) => {
  const send = () =>
    route(
      new NextRequest('http://localhost/api/jobs/job/action', {
        method: 'POST',
        body: [beforePhotos, afterPhotos].includes(route)
          ? new FormData()
          : JSON.stringify({ comments: 'Please finish the repair' }),
      }),
      { params: Promise.resolve({ id: 'job' }) }
    );
  beforeEach(() => {
    state.actor = actor;
    state.missing = false;
    state.payer = 'payer';
    state.rpc.mockReset();
    state.update.mockReset();
    state.cache.mockReset().mockResolvedValue({
      isDuplicate: true,
      cachedResult: { success: true, message: 'Previous result' },
    });
  });
  it('denies a former participant before reading cached success', async () => {
    state.actor = 'former-participant';
    await expect(send()).rejects.toMatchObject({ statusCode: 403 });
    expect(state.cache).not.toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
  });
  it('denies replay after the job disappears', async () => {
    state.missing = true;
    await expect(send()).rejects.toMatchObject({ statusCode: 404 });
    expect(state.cache).not.toHaveBeenCalled();
  });
  it('allows current participants to recover success without repeating transitions', async () => {
    expect(await (await send()).json()).toMatchObject({ success: true });
    expect(state.cache).toHaveBeenCalled();
    expect(state.rpc).not.toHaveBeenCalled();
    expect(state.update).not.toHaveBeenCalled();
  });
});
