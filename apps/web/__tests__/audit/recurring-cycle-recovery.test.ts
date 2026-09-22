import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  create: vi.fn(),
  notify: vi.fn(),
  filters: vi.fn(),
  update: vi.fn(),
  existing: [] as { id: string }[],
  lookupError: null as unknown,
  advanceError: null as unknown,
  advanced: true,
}));
vi.mock('@/lib/services/job-creation-service', () => ({
  JobCreationService: { getInstance: () => ({ createJob: m.create }) },
}));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: m.notify },
}));
vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: {
    from: (table: string) => {
      let updating = false;
      const q = {
        select: () =>
          updating
            ? Promise.resolve({
                data: m.advanced ? [{ id: 'schedule' }] : [],
                error: m.advanceError,
              })
            : q,
        update: (value: unknown) => {
          updating = true;
          m.update(value);
          return q;
        },
        eq: (key: string, value: unknown) => {
          m.filters(table, key, value);
          return q;
        },
        not: () => q,
        filter: (key: string, op: string, value: string) => {
          m.filters(table, key, value);
          return q;
        },
        limit: async () => ({ data: m.existing, error: m.lookupError }),
        lte: async () => ({
          data: [
            {
              id: 'schedule',
              owner_id: 'owner',
              property_id: 'property',
              title: 'Synthetic schedule',
              frequency: 'monthly',
              next_due_date: '2026-01-31',
            },
          ],
          error: null,
        }),
      };
      return q;
    },
  },
}));
import { RecurringJobCreatorService } from '@/lib/services/recurring/RecurringJobCreatorService';
import { advanceRecurringDate } from '@/lib/services/recurring/advance-recurring-date';
beforeEach(() => {
  vi.clearAllMocks();
  m.existing = [];
  m.lookupError = null;
  m.advanceError = null;
  m.advanced = true;
  m.create.mockResolvedValue({ id: 'job' });
  m.notify.mockResolvedValue(undefined);
});
it.each([
  ['2026-01-31', 'monthly', '2026-02-28'],
  ['2024-02-29', 'annual', '2025-02-28'],
  ['2026-12-31', 'monthly', '2027-01-31'],
  ['2026-01-31', 'weekly', '2026-02-07'],
])('advances %s %s without overflow', (date, frequency, expected) =>
  expect(advanceRecurringDate(date, frequency)).toBe(expected)
);
it.each([
  ['2026-02-30', 'monthly'],
  ['invalid', 'annual'],
  ['2026-01-01', 'unknown'],
])('rejects invalid schedule %s %s', (date, frequency) =>
  expect(() => advanceRecurringDate(date, frequency)).toThrow()
);
it('fails closed when the exact-cycle lookup is unavailable', async () => {
  m.lookupError = { code: '08006' };
  expect(await RecurringJobCreatorService.processSchedules()).toMatchObject({
    errors: 1,
    created: 0,
  });
  expect(m.create).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
});
it('recovers an existing exact occurrence without creating or notifying again', async () => {
  m.existing = [{ id: 'job' }];
  expect(await RecurringJobCreatorService.processSchedules()).toMatchObject({
    skipped: 1,
    errors: 0,
  });
  expect(m.create).not.toHaveBeenCalled();
  expect(m.filters).toHaveBeenCalledWith(
    'jobs',
    'requirements->>schedule_cycle_due',
    '2026-01-31'
  );
  expect(m.update).toHaveBeenCalledWith({ next_due_date: '2026-02-28' });
});
it('reports advancement failure after creation without sending a misleading next-date notice', async () => {
  m.advanceError = { code: '08006' };
  expect(await RecurringJobCreatorService.processSchedules()).toMatchObject({
    created: 0,
    errors: 1,
  });
  expect(m.create).toHaveBeenCalledOnce();
  expect(m.notify).not.toHaveBeenCalled();
});
it('does not overwrite a concurrently changed schedule', async () => {
  m.advanced = false;
  expect(await RecurringJobCreatorService.processSchedules()).toMatchObject({
    errors: 1,
  });
  expect(m.filters).toHaveBeenCalledWith(
    'recurring_schedules',
    'next_due_date',
    '2026-01-31'
  );
  expect(m.notify).not.toHaveBeenCalled();
});
