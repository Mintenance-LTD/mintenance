import { beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
const m = vi.hoisted(() => ({
  filters: vi.fn(),
  update: vi.fn(),
  paid: true,
  data: null as unknown,
}));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (req: NextRequest) =>
    handler(req, {
      user: { id: 'manager', role: 'homeowner' },
      params: { id: 'property' },
    }),
}));
vi.mock('@/lib/services/property-team/property-management-access', () => ({
  getPropertyForManagement: async () => ({ id: 'property', owner_id: 'owner' }),
}));
vi.mock('@/lib/subscription/early-access', () => ({
  getEffectiveHomeownerTier: async () => 'free',
}));
vi.mock('@/lib/feature-access-config', () => ({
  hasFeatureAccess: () => m.paid,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q = {
        update: (value: unknown) => {
          m.update(value);
          return q;
        },
        delete: () => q,
        select: () => q,
        eq: (...args: unknown[]) => {
          m.filters(...args);
          return q;
        },
        maybeSingle: async () => ({ data: m.data, error: null }),
      };
      return q;
    },
  },
}));
import {
  PATCH,
  DELETE,
} from '@/app/api/properties/[id]/recurring-maintenance/route';
const id = '11111111-1111-4111-8111-111111111111',
  version = '2026-09-22T12:00:00Z';
const context = { params: Promise.resolve({ id: 'property' }) };
const request = (body: unknown) =>
  new NextRequest(
    'http://localhost/api/properties/property/recurring-maintenance',
    { method: 'PATCH', body: JSON.stringify(body) }
  );
beforeEach(() => {
  vi.clearAllMocks();
  m.paid = true;
  m.data = { id };
});
it('requires the loaded revision for an edit and rejects impossible dates', async () => {
  expect(
    (await PATCH(request({ scheduleId: id, title: 'Edited title' }), context))
      .status
  ).toBe(400);
  expect(
    (
      await PATCH(
        request({
          scheduleId: id,
          next_due_date: '2026-02-31',
          expected_updated_at: version,
        }),
        context
      )
    ).status
  ).toBe(400);
  expect(m.update).not.toHaveBeenCalled();
});
it('conditions edits on property, record and loaded revision; lost races are conflicts', async () => {
  m.data = null;
  expect(
    (
      await PATCH(
        request({
          scheduleId: id,
          frequency: 'annual',
          expected_updated_at: version,
        }),
        context
      )
    ).status
  ).toBe(409);
  expect(m.filters).toHaveBeenCalledWith('id', id);
  expect(m.filters).toHaveBeenCalledWith('property_id', 'property');
  expect(m.filters).toHaveBeenCalledWith('updated_at', version);
  expect(m.update).toHaveBeenCalledWith({ frequency: 'annual' });
});
it('permits pausing on a free tier but blocks reactivation and editing', async () => {
  m.paid = false;
  expect(
    (await PATCH(request({ scheduleId: id, is_active: false }), context)).status
  ).toBe(200);
  expect(
    (await PATCH(request({ scheduleId: id, is_active: true }), context)).status
  ).toBe(402);
  expect(
    (
      await PATCH(
        request({
          scheduleId: id,
          title: 'Edited title',
          expected_updated_at: version,
        }),
        context
      )
    ).status
  ).toBe(402);
});
it('does not confirm deletion when no authorized schedule was removed', async () => {
  m.data = null;
  expect(
    (
      await DELETE(
        new NextRequest(
          `http://localhost/api/properties/property/recurring-maintenance?scheduleId=${id}`,
          { method: 'DELETE' }
        ),
        context
      )
    ).status
  ).toBe(404);
});
