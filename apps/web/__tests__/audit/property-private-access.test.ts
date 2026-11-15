// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const property = '00000000-0000-4000-8000-000000000001';
const document = '00000000-0000-4000-8000-000000000002';
const s = vi.hoisted(() => ({
  actor: 'owner',
  role: 'manager',
  status: 'accepted',
  signed: vi.fn(),
  filters: vi.fn(),
  reads: [] as string[],
  failure: false,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    storage: { from: () => ({ createSignedUrl: s.signed }) },
    from: (table: string) => {
      s.reads.push(table);
      const filters: Record<string, unknown> = {};
      const result = () => ({
        error:
          s.failure && table === 'property_team_members'
            ? { code: '08006' }
            : null,
        data:
          table === 'properties'
            ? { owner_id: 'owner' }
            : table === 'property_team_members'
              ? s.status === filters.status && s.role
                ? { role: s.role }
                : null
              : table === 'property_document_files'
                ? { object_path: 'synthetic/document', name: 'test.pdf' }
                : null,
      });
      const q = {
        select: () => q,
        eq: (k: string, v: unknown) => {
          filters[k] = v;
          s.filters(table, k, v);
          return q;
        },
        single: async () => result(),
        maybeSingle: async () => result(),
      };
      return q;
    },
  },
}));
import { GET } from '@/app/api/properties/[id]/documents/route';
import { PropertyTeamService } from '@/lib/services/property-team/PropertyTeamService';
const download = () =>
  (GET as unknown as (r: NextRequest, c: unknown) => Promise<Response>)(
    new NextRequest(
      `https://example.invalid/api/properties/${property}/documents?documentId=${document}`
    ),
    { user: { id: s.actor, role: 'admin' }, params: { id: property } }
  );
beforeEach(() => {
  vi.clearAllMocks();
  s.actor = 'owner';
  s.role = 'manager';
  s.status = 'accepted';
  s.failure = false;
  s.reads = [];
  s.signed.mockResolvedValue({
    data: { signedUrl: 'https://example.invalid/temporary' },
    error: null,
  });
});
it.each(['owner', 'admin', 'manager'])(
  'allows the property %s to request a short-lived download',
  async (role) => {
    s.actor = role === 'owner' ? 'owner' : 'member';
    s.role = role;
    const r = await download();
    expect(r.status).toBe(200);
    expect(r.headers.get('Cache-Control')).toBe('private, no-store');
    expect(s.signed).toHaveBeenCalledWith('synthetic/document', 60, {
      download: 'test.pdf',
    });
    expect(s.filters).toHaveBeenCalledWith(
      'property_document_files',
      'property_id',
      property
    );
  }
);
it.each(['viewer', 'contractor', 'tenant', ''])(
  'denies %s before reading document metadata or storage, regardless of a global admin claim',
  async (role) => {
    s.actor = 'unprivileged';
    s.role = role;
    await expect(download()).rejects.toMatchObject({ statusCode: 403 });
    expect(s.reads).not.toContain('property_document_files');
    expect(s.signed).not.toHaveBeenCalled();
  }
);
it.each(['pending', 'revoked', 'removed'])(
  'denies a manager with %s membership',
  async (status) => {
    s.actor = 'member';
    s.status = status;
    await expect(download()).rejects.toMatchObject({ statusCode: 403 });
    expect(s.signed).not.toHaveBeenCalled();
    expect(s.filters).toHaveBeenCalledWith(
      'property_team_members',
      'user_id',
      'member'
    );
    expect(s.filters).toHaveBeenCalledWith(
      'property_team_members',
      'property_id',
      property
    );
  }
);
it('checks membership again for a new request after revocation', async () => {
  s.actor = 'member';
  await download();
  s.status = 'revoked';
  await expect(download()).rejects.toMatchObject({ statusCode: 403 });
  expect(s.signed).toHaveBeenCalledTimes(1);
});
it('fails closed when membership cannot be verified', async () => {
  s.actor = 'member';
  s.failure = true;
  await expect(download()).rejects.toMatchObject({ statusCode: 500 });
  expect(s.signed).not.toHaveBeenCalled();
});
it.each(['owner', 'admin', 'manager', 'viewer'])(
  'permits inspection viewing for property role %s',
  async (role) => {
    s.actor = role === 'owner' ? 'owner' : 'member';
    s.role = role;
    expect(
      (await PropertyTeamService.authorize(s.actor, property, 'view'))
        .authorized
    ).toBe(true);
  }
);
it.each(['contractor', 'tenant', ''])(
  'does not infer property inspection access from %s',
  async (role) => {
    s.actor = 'unprivileged';
    s.role = role;
    expect(
      (await PropertyTeamService.authorize(s.actor, property, 'view'))
        .authorized
    ).toBe(false);
  }
);
