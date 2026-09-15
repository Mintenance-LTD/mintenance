import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const fixture = vi.hoisted(() => ({
  actor: 'former-payer',
  homeowner: 'owner',
  payer: null as string | null,
  contractMissing: false,
  cache: vi.fn(),
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
        user: { id: fixture.actor },
        params: { id: 'fa060915-0000-4000-8000-000000001001' },
      }),
}));
vi.mock('@/lib/idempotency', () => ({
  getIdempotencyKeyFromRequest: () => 'bound-key',
  checkIdempotency: fixture.cache,
  storeIdempotencyResult: vi.fn(),
  releaseOnError: vi.fn(),
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: vi.fn() },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const query = {
        select: () => query,
        eq: () => query,
        update: fixture.update,
        single: async () => ({
          data:
            table === 'contracts'
              ? fixture.contractMissing
                ? null
                : {
                    id: 'contract',
                    job_id: 'job',
                    homeowner_id: fixture.homeowner,
                    contractor_id: 'contractor',
                    status: 'draft',
                  }
              : { payer_user_id: fixture.payer },
          error: null,
        }),
      };
      return query;
    },
  },
}));
import { POST } from '@/app/api/contracts/[id]/reject/route';
const request = () =>
  POST(
    new NextRequest('http://localhost/api/contracts/test/reject', {
      method: 'POST',
      body: JSON.stringify({ reason: 'Revise dates' }),
    }),
    { params: Promise.resolve({ id: 'unused' }) }
  );

describe('contract rejection replay authorization', () => {
  beforeEach(() => {
    fixture.actor = 'former-payer';
    fixture.payer = null;
    fixture.contractMissing = false;
    fixture.cache.mockReset().mockResolvedValue({
      isDuplicate: true,
      cachedResult: { success: true, contract: { id: 'contract' } },
    });
    fixture.update.mockReset();
  });
  it('denies a former designated payer before reading their cached response', async () => {
    await expect(request()).rejects.toMatchObject({ statusCode: 404 });
    expect(fixture.cache).not.toHaveBeenCalled();
    expect(fixture.update).not.toHaveBeenCalled();
  });
  it('does not return a cached record after the contract is deleted', async () => {
    fixture.contractMissing = true;
    await expect(request()).rejects.toMatchObject({ statusCode: 404 });
    expect(fixture.cache).not.toHaveBeenCalled();
  });
  it.each(['owner', 'payer'])(
    'allows a current %s to recover cached success without another mutation',
    async (actor) => {
      fixture.actor = actor;
      fixture.payer = 'payer';
      expect((await request()).status).toBe(200);
      expect(fixture.cache).toHaveBeenCalledWith(
        'bound-key',
        'contract_reject',
        true,
        expect.objectContaining({ userId: actor })
      );
      expect(fixture.update).not.toHaveBeenCalled();
    }
  );
});
