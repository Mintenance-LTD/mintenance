import { describe, expect, it } from 'vitest';
import { buildNeedsYouFeed } from '@/app/dashboard/lib/needs-you-aggregator';
import {
  transformJobsToEvents,
  transformRecurringSchedulesToEvents,
} from '@/app/scheduling/lib/event-transformer';

describe('dashboard and scheduling truthfulness', () => {
  it('does not invent property verification requirements', () => {
    expect(
      buildNeedsYouFeed({
        pendingBids: [],
        allBids: [],
        postedJobs: [],
        properties: [{ id: 'property', property_name: 'Home' }],
      })
    ).toEqual([]);
  });
  const job = {
    id: 'job',
    title: 'Repair',
    created_at: '2026-09-01',
    scheduled_start_date: '2026-10-01',
    scheduled_end_date: null,
    status: 'assigned',
    contractor_id: 'assigned-contractor',
  };
  const options = {
    userId: 'assigned-contractor',
    userRole: 'contractor' as const,
    viewedJobIds: new Set<string>(),
    bidJobIds: new Set<string>(),
  };
  it('shows assigned work without a previous view or bid', () => {
    expect(transformJobsToEvents([job], options)).toMatchObject([
      { type: 'job' },
    ]);
  });
  it('does not schedule a losing bidder', () => {
    expect(
      transformJobsToEvents([job], {
        ...options,
        userId: 'other',
        bidJobIds: new Set(['job']),
      })
    ).toEqual([]);
  });
  it('excludes cancelled work', () => {
    expect(
      transformJobsToEvents([{ ...job, status: 'cancelled' }], options)
    ).toEqual([]);
  });
  it('uses recurring due dates and skips invalid dates', () => {
    expect(
      transformRecurringSchedulesToEvents([
        { id: 'schedule', title: 'Garden', next_due_date: '2026-10-01' },
        { id: 'invalid', title: 'Invalid', next_due_date: 'invalid' },
      ])
    ).toEqual([
      {
        id: 'recurring-schedule',
        title: 'Garden (due)',
        date: '2026-10-01T00:00:00.000Z',
        type: 'maintenance',
      },
    ]);
  });
});
