import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  request: vi.fn(),
  filters: [] as unknown[][],
}));
vi.mock('@/lib/csrf-client', () => ({ fetchWithCsrf: state.request }));
vi.mock('@/lib/api/with-api-handler', () => ({
  withApiHandler: (_: unknown, handler: unknown) => handler,
}));
vi.mock('@/lib/notifications/feed', () => ({
  fetchNotificationFeed: async () => [],
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {},
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {},
  resolveRequestDbClient: () => ({
    db: {
      from: (table: string) => {
        const jobs = ['assigned', 'in_progress', 'completed', 'cancelled'].map(
          (status) => ({
            id: status,
            title: status,
            status,
            scheduled_start_date: new Date(
              Date.now() + 9 * 3600000
            ).toISOString(),
          })
        );
        const q = {
          select: () => q,
          eq: (...args: unknown[]) => {
            state.filters.push([table, ...args]);
            return q;
          },
          is: (...args: unknown[]) => {
            state.filters.push([table, ...args]);
            return q;
          },
          gte: () => q,
          lte: () => q,
          order: () => q,
          limit: async () => ({
            data: table === 'jobs' ? jobs : [],
            error: null,
          }),
        };
        return q;
      },
    },
    enforcesRls: true,
  }),
}));
import {
  markAsReadApi,
  markAllAsReadApi,
} from '@/components/notifications/notificationDropdownApi';
import { GET } from '@/app/api/notifications/route';
beforeEach(() => {
  state.request.mockReset();
  state.filters = [];
});
it('uses CSRF-protected mutations and surfaces a rejected read action', async () => {
  state.request.mockResolvedValueOnce(
    new Response(JSON.stringify({ success: true }), { status: 200 })
  );
  await markAsReadApi('notice');
  expect(state.request).toHaveBeenCalledWith(
    '/api/notifications/notice/read',
    expect.objectContaining({ method: 'POST', credentials: 'include' })
  );
  state.request.mockResolvedValueOnce(
    new Response(JSON.stringify({ error: { message: 'Session expired' } }), {
      status: 403,
    })
  );
  await expect(markAllAsReadApi()).rejects.toThrow('Session expired');
});
it('suppresses start reminders for started, completed and reopened work', async () => {
  const handle = GET as unknown as (
    r: Request,
    c: { user: { id: string; role: string } }
  ) => Promise<Response>;
  const response = await handle(
    new Request('https://example.test/api/notifications'),
    { user: { id: 'contractor', role: 'contractor' } }
  );
  const { notifications } = await response.json();
  expect(notifications).toHaveLength(1);
  expect(notifications[0].action_url).toBe('/contractor/jobs/assigned');
  expect(state.filters).toContainEqual(['jobs', 'contractor_id', 'contractor']);
  expect(state.filters).toContainEqual(['jobs', 'status', 'assigned']);
  expect(state.filters).toContainEqual(['jobs', 'started_at', null]);
});
