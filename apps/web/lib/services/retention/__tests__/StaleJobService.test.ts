/**
 * StaleJobService — escalation ladder for stalled jobs.
 *
 * Pins the behaviour the feature promises: a notice at 14d, a reminder at 30d,
 * auto-archive at 60d; one action per job per run; idempotent notices; and the
 * belt-and-suspenders that a job with money already in escrow is never touched
 * even if jobs.payment_status lagged.
 */

const mocks = vi.hoisted(() => ({
  createNotification: vi.fn(),
  fromImpl: vi.fn(),
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('@/lib/api/supabaseServer', () => ({
  serverSupabase: { from: (...args: unknown[]) => mocks.fromImpl(...args) },
}));
vi.mock('@mintenance/shared', () => ({ logger: mocks.logger }));
vi.mock('@/lib/services/notifications/NotificationService', () => ({
  NotificationService: { createNotification: mocks.createNotification },
}));

import { StaleJobService } from '../StaleJobService';

const DAY = 1000 * 60 * 60 * 24;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();

interface DbConfig {
  posted: Record<string, unknown>[];
  assigned: Record<string, unknown>[];
  // jobId -> notification types already present
  notifications?: Record<string, string[]>;
  // jobId -> escrow rows
  escrow?: Record<string, { status: string }[]>;
}

// Chainable Supabase mock that routes the terminal result by (table, mode,
// captured filters). Every builder method returns the same thenable chain.
function installDb(config: DbConfig) {
  const notif = config.notifications ?? {};
  const escrow = config.escrow ?? {};

  mocks.fromImpl.mockImplementation((table: string) => {
    const state: {
      mode: 'select' | 'update';
      filters: Record<string, unknown>;
    } = { mode: 'select', filters: {} };

    const resolveResult = () => {
      if (table === 'jobs' && state.mode === 'update') return { error: null };
      if (table === 'jobs') {
        const list =
          state.filters.status === 'posted' ? config.posted : config.assigned;
        return { data: list, error: null };
      }
      if (table === 'notifications') {
        const types = notif[String(state.filters['metadata->>jobId'])] ?? [];
        const present = types.includes(String(state.filters.type));
        return { data: present ? [{ id: 'n1' }] : [], error: null };
      }
      if (table === 'escrow_transactions') {
        return {
          data: escrow[String(state.filters.job_id)] ?? [],
          error: null,
        };
      }
      return { data: [], error: null };
    };

    const chain: Record<string, unknown> = {
      select: () => chain,
      update: () => {
        state.mode = 'update';
        return chain;
      },
      eq: (col: string, val: unknown) => {
        state.filters[col] = val;
        return chain;
      },
      neq: () => chain,
      is: () => chain,
      not: () => chain,
      or: () => chain,
      lte: () => chain,
      order: () => chain,
      limit: () => chain,
      then: (resolve: (v: unknown) => unknown) => resolve(resolveResult()),
    };
    return chain;
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('StaleJobService.processStaleJobs', () => {
  it('runs the notice → reminder → archive ladder and respects funded escrow', async () => {
    installDb({
      posted: [
        {
          id: 'p-new',
          homeowner_id: 'h1',
          title: 'Leaky tap',
          created_at: daysAgo(15),
          assigned_at: null,
        },
        {
          id: 'p-old',
          homeowner_id: 'h2',
          title: 'Old paint',
          created_at: daysAgo(61),
          assigned_at: null,
        },
        {
          id: 'p-had',
          homeowner_id: 'h3',
          title: 'Fence',
          created_at: daysAgo(20),
          assigned_at: null,
        },
      ],
      assigned: [
        {
          id: 'a-unf',
          homeowner_id: 'h4',
          title: 'Boiler',
          created_at: daysAgo(50),
          assigned_at: daysAgo(40),
        },
        {
          id: 'a-fund',
          homeowner_id: 'h5',
          title: 'Roof',
          created_at: daysAgo(80),
          assigned_at: daysAgo(70),
        },
      ],
      // p-had already got a notice — must not be re-sent.
      notifications: { 'p-had': ['stale_job_notice'] },
      // a-fund has money in escrow — must be skipped, never archived.
      escrow: { 'a-fund': [{ status: 'held' }] },
    });

    const res = await StaleJobService.processStaleJobs();

    expect(res.checkedPosted).toBe(3);
    expect(res.checkedAssigned).toBe(2);
    expect(res.noticesSent).toBe(1); // p-new only (p-had already noticed)
    expect(res.remindersSent).toBe(1); // a-unf (40d)
    expect(res.archived).toBe(1); // p-old (61d)
    expect(res.skippedFunded).toBe(1); // a-fund
    expect(res.errors).toBe(0);

    const byType = (t: string) =>
      mocks.createNotification.mock.calls
        .map((c) => c[0])
        .filter((p) => p.type === t);

    expect(byType('stale_job_notice')).toHaveLength(1);
    expect(byType('stale_job_notice')[0]).toMatchObject({
      userId: 'h1',
      actionUrl: '/jobs/p-new',
      metadata: { jobId: 'p-new', stallType: 'posted', stage: 'notice' },
    });

    expect(byType('stale_job_reminder')).toHaveLength(1);
    expect(byType('stale_job_reminder')[0]).toMatchObject({
      userId: 'h4',
      metadata: { jobId: 'a-unf', stallType: 'unfunded' },
    });

    expect(byType('stale_job_archived')).toHaveLength(1);
    expect(byType('stale_job_archived')[0]).toMatchObject({
      userId: 'h2',
      metadata: { jobId: 'p-old', stallType: 'posted', stage: 'archive' },
    });

    // The funded job must never be archived.
    const archivedJobIds = byType('stale_job_archived').map(
      (p) => p.metadata.jobId
    );
    expect(archivedJobIds).not.toContain('a-fund');
  });

  it('does nothing for jobs younger than the first threshold', async () => {
    installDb({
      posted: [
        {
          id: 'p-young',
          homeowner_id: 'h1',
          title: 'Fresh',
          created_at: daysAgo(3),
          assigned_at: null,
        },
      ],
      assigned: [],
    });

    const res = await StaleJobService.processStaleJobs();

    expect(res.noticesSent).toBe(0);
    expect(res.remindersSent).toBe(0);
    expect(res.archived).toBe(0);
    expect(mocks.createNotification).not.toHaveBeenCalled();
  });
});
