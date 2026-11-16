import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  existing: {
    id: 'contact',
    owner_id: 'owner',
    property_id: 'property',
    contact_role: 'emergency_contact',
    email: null as string | null,
    phone: '07000000000' as string | null,
    is_active: true,
  },
  authorized: true,
  insert: vi.fn(),
  update: vi.fn(),
  single: vi.fn(),
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_opts: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: {
    authorize: async () => ({ authorized: state.authorized }),
  },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        single: async () => ({
          data:
            table === 'properties'
              ? { id: 'property', owner_id: 'owner' }
              : state.existing,
          error: null,
        }),
        insert: (v: unknown) => {
          state.insert(v);
          return chain;
        },
        update: (v: unknown) => {
          state.update(v);
          return chain;
        },
      };
      return chain;
    },
  },
}));
import { POST } from '@/app/api/landlord/contacts/route';
import { PATCH } from '@/app/api/landlord/contacts/[id]/route';
const context = {
  user: { id: 'owner', role: 'homeowner' },
  params: { id: 'contact' },
};
async function call(handler: typeof POST | typeof PATCH, body: unknown) {
  return (
    handler as unknown as (
      req: Request,
      ctx: typeof context
    ) => Promise<Response>
  )(
    new Request('https://test.invalid/api/contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
    context
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  state.authorized = true;
  state.existing.phone = '07000000000';
  state.existing.email = null;
  state.existing.is_active = true;
});
it('rejects new emergency contacts with blank details but accepts either contact method', async () => {
  const body = {
    property_id: 'property',
    name: 'QA',
    contact_role: 'emergency_contact',
    email: ' ',
    phone: '',
  };
  expect((await call(POST, body)).status).toBe(400);
  expect(state.insert).not.toHaveBeenCalled();
  expect((await call(POST, { ...body, email: 'qa@example.test' })).status).toBe(
    201
  );
  expect((await call(POST, { ...body, phone: '07000000000' })).status).toBe(
    201
  );
});
it('validates the merged contact, allowing email-only edits but blocking removal of the last method', async () => {
  expect((await call(PATCH, { phone: null })).status).toBe(400);
  expect(state.update).not.toHaveBeenCalled();
  expect(
    (await call(PATCH, { phone: null, email: 'qa@example.test' })).status
  ).toBe(200);
  expect((await call(PATCH, { name: 'Corrected' })).status).toBe(200);
});
it('allows archiving an old incomplete record, but refuses to restore it without details', async () => {
  state.existing.phone = null;
  expect((await call(PATCH, { is_active: false })).status).toBe(200);
  state.existing.is_active = false;
  expect((await call(PATCH, { is_active: true })).status).toBe(400);
});
it('keeps property authorization ahead of updates', async () => {
  state.authorized = false;
  expect((await call(PATCH, { phone: '07000000000' })).status).toBe(403);
  expect(state.update).not.toHaveBeenCalled();
  expect(
    (await call(POST, { property_id: 'property', name: 'QA' })).status
  ).toBe(404);
  expect(state.insert).not.toHaveBeenCalled();
});
