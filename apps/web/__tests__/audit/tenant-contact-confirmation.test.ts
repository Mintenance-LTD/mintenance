import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  send: vi.fn(),
  removed: false,
  allowed: true,
  insert: vi.fn(),
  identity: vi.fn(),
  contact: null as Record<string, unknown> | null,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, fn: Function) => (req: NextRequest) =>
    fn(req, {
      user: { id: 'owner', role: 'homeowner' },
      params: { id: 'property' },
    }),
}));
vi.mock('@/lib/services/property-team/PropertyTeamService', () => ({
  PropertyTeamService: { authorize: async () => ({ authorized: m.allowed }) },
}));
vi.mock('@/lib/email-service', () => ({
  EmailService: {
    sendTenantInviteEmail: (...args: unknown[]) => m.send(...args),
  },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: vi.fn() },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    auth: {
      admin: { getUserById: (...args: unknown[]) => m.identity(...args) },
    },
    from: (table: string) => {
      let mode = 'read';
      const result = () => ({
        error: null,
        data:
          table === 'properties'
            ? { id: 'property', owner_id: 'owner' }
            : mode === 'insert'
              ? { id: 'contact', invitation_token: 'token' }
              : mode === 'delete' && m.removed
                ? { id: 'contact' }
                : m.contact,
      });
      const q = {
        select: () => q,
        eq: () => q,
        insert: (value: unknown) => {
          mode = 'insert';
          m.insert(value);
          return q;
        },
        delete: () => {
          mode = 'delete';
          return q;
        },
        update: () => q,
        single: async () => result(),
        maybeSingle: async () => result(),
        then: (resolve: Function) => resolve(result()),
      };
      return q;
    },
  },
}));
import { POST, DELETE, PATCH } from '@/app/api/properties/[id]/tenants/route';
const ctx = { params: Promise.resolve({ id: 'property' }) };
const request = (body: unknown) =>
  new NextRequest('http://localhost/api/properties/property/tenants', {
    method: 'POST',
    body: JSON.stringify(body),
  });
beforeEach(() => {
  vi.clearAllMocks();
  m.allowed = true;
  m.removed = false;
  m.contact = null;
  m.send.mockResolvedValue(false);
});
it('does not claim email delivery when provider declines', async () => {
  const res = await POST(
    request({ name: 'Tenant', email: 'tenant@example.invalid' }),
    ctx
  );
  expect(res.status).toBe(201);
  expect(await res.json()).toMatchObject({
    tenant: { id: 'contact' },
    invitation_sent: false,
    invitation_status: 'not_sent',
  });
});
it('preserves successful contact creation if email throws', async () => {
  m.send.mockRejectedValue(new Error('offline'));
  expect(
    (
      await POST(
        request({ name: 'Tenant', email: 'tenant@example.invalid' }),
        ctx
      )
    ).status
  ).toBe(201);
  expect(m.insert).toHaveBeenCalledTimes(1);
});
it('waits for successful email delivery before confirming it', async () => {
  m.send.mockResolvedValue(true);
  const res = await POST(
    request({ name: 'Tenant', email: 'tenant@example.invalid' }),
    ctx
  );
  expect(await res.json()).toMatchObject({
    invitation_sent: true,
    invitation_status: 'sent',
  });
});
it.each([
  { name: '   ' },
  { name: 'Tenant', email: 'invalid' },
  { name: 'Tenant', lease_start: '2026-09-23', lease_end: '2026-09-22' },
])('rejects invalid contact data', async (body) => {
  expect((await POST(request(body), ctx)).status).toBe(400);
  expect(m.insert).not.toHaveBeenCalled();
});
it('denies an unrelated actor before creating or emailing', async () => {
  m.allowed = false;
  expect((await POST(request({ name: 'Tenant' }), ctx)).status).toBe(404);
  expect(m.insert).not.toHaveBeenCalled();
  expect(m.send).not.toHaveBeenCalled();
});
it('does not confirm deletion of a missing or foreign-property contact', async () => {
  const req = new NextRequest(
    'http://localhost/api/properties/property/tenants?tenantId=11111111-1111-4111-8111-111111111111',
    { method: 'DELETE' }
  );
  expect((await DELETE(req, ctx)).status).toBe(404);
});

it('retries delivery without inserting another contact', async () => {
  m.contact = {
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Tenant',
    email: 'tenant@example.invalid',
    invitation_token: 'token',
  };
  m.send.mockResolvedValue(true);
  const req = new NextRequest(
    'http://localhost/api/properties/property/tenants',
    { method: 'PATCH', body: JSON.stringify({ tenantId: m.contact.id }) }
  );
  const response = await PATCH(req, ctx);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ invitation_sent: true });
  expect(m.insert).not.toHaveBeenCalled();
});
