import { expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: Function) => (request: NextRequest) =>
    handler(request, { user: { id: 'contractor', role: 'contractor' } }),
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: () => {
      const q: Record<string, unknown> = {};
      for (const key of ['select', 'gte', 'lte', 'in', 'order', 'limit', 'eq'])
        q[key] = () => q;
      q.then = (resolve: Function) =>
        resolve({
          error: null,
          data: [
            { id: 'finished', job: { status: 'completed' } },
            { id: 'cancelled', job: [{ status: 'cancelled' }] },
            { id: 'active', job: { status: 'assigned' } },
            { id: 'manual', job: null },
          ],
        });
      return q;
    },
  },
}));
import { GET } from '@/app/api/appointments/route';

it('excludes terminal jobs from upcoming visits while preserving active and standalone visits', async () => {
  const response = await GET(
    new NextRequest('https://example.test/api/appointments')
  );
  const body = await response.json();
  expect(
    body.appointments.map((appointment: { id: string }) => appointment.id)
  ).toEqual(['active', 'manual']);
});
