// @vitest-environment node
import { beforeEach, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({
  rows: [] as { id: string; created_at: string }[],
  fail: false,
  reads: 0,
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: vi.fn(() => {
      let after = '';
      let before = '';
      const query = {
        select: () => query,
        order: () => query,
        limit: () => query,
        lt: (_key: string, value: string) => {
          before = value;
          return query;
        },
        gt: (_key: string, value: string) => {
          after = value;
          return query;
        },
        then: (resolve: (result: unknown) => unknown) => {
          state.reads++;
          return Promise.resolve(
            resolve({
              data: state.rows
                .filter((r) => r.id > after && r.created_at < before)
                .slice(0, 137),
              error: state.fail ? { message: 'unavailable' } : null,
            })
          );
        },
      };
      return query;
    }),
  },
}));
vi.mock('@/lib/env', () => ({ env: {} }));
vi.mock('@/lib/email-service', () => ({ EmailService: {} }));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: {},
}));
import { loadAnniversaryProperties } from '@/lib/services/retention/AnnualHomeMOTService';
beforeEach(() => {
  state.rows = [];
  state.fail = false;
  state.reads = 0;
});
it('finds anniversaries after row 5000 despite server page caps', async () => {
  state.rows = Array.from({ length: 6001 }, (_, i) => ({
    id: String(i).padStart(8, '0'),
    created_at: i === 6000 ? '2025-11-12T12:00:00Z' : '2025-01-01T12:00:00Z',
  }));
  state.rows.push({ id: '99999999', created_at: '2026-11-12T00:00:00Z' });
  const rows = await loadAnniversaryProperties(
    new Date('2026-11-12T12:00:00Z'),
    '11',
    '12'
  );
  expect(rows.map((r) => r.id)).toEqual(['00006000']);
  expect(state.reads).toBeGreaterThan(40);
});
it('fails the cron scan when the database is unavailable', async () => {
  state.fail = true;
  await expect(
    loadAnniversaryProperties(new Date('2026-11-12T12:00:00Z'), '11', '12')
  ).rejects.toThrow('property scan failed');
});
