// globals: true in vitest.config — do not import from 'vitest' directly (breaks in v4)
import { updateJobSchema } from '../shared';

/**
 * Regression: the homeowner bulk "Archive" action
 * (app/jobs/components/JobsBulkActionsSection.tsx) used to PATCH
 * /api/jobs/[id] with `{ status: 'archived' }` — a value the status
 * enum, the job state machine, and the live jobs_status_check all
 * reject — so every archive attempt 400'd. Archive is now the
 * dedicated `archived` boolean (mapped to jobs.archived_at), and
 * 'archived' must never become a status value.
 */
describe('updateJobSchema — archive contract', () => {
  it("rejects the old bulk-action payload { status: 'archived' }", () => {
    const result = updateJobSchema.safeParse({ status: 'archived' });
    expect(result.success).toBe(false);
  });

  it('accepts { archived: true } (bulk archive payload)', () => {
    const result = updateJobSchema.safeParse({ archived: true });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archived).toBe(true);
    }
  });

  it('accepts { archived: false } (unarchive)', () => {
    const result = updateJobSchema.safeParse({ archived: false });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.archived).toBe(false);
    }
  });

  it('rejects non-boolean archived values', () => {
    expect(updateJobSchema.safeParse({ archived: 'true' }).success).toBe(false);
    expect(
      updateJobSchema.safeParse({ archived: '2026-07-17T00:00:00Z' }).success
    ).toBe(false);
  });
});

describe('updateJobSchema — status enum matches the state machine + live DB CHECK', () => {
  // Verified against the live jobs_status_check on 2026-07-17
  // (Supabase project ukrjudtlvapiajkjbcrd): the DB allows
  // draft/open/posted/assigned/in_progress/completed/disputed/cancelled.
  // 'draft'/'open' are legacy holdouts deliberately excluded as PATCH
  // *targets*; 'archived' is not a status at all.
  const validTargets = [
    'posted',
    'assigned',
    'in_progress',
    'completed',
    'disputed',
    'cancelled',
  ] as const;

  it.each(validTargets)('accepts status %s', (status) => {
    expect(updateJobSchema.safeParse({ status }).success).toBe(true);
  });

  it.each(['archived', 'draft', 'open', 'deleted', ''])(
    'rejects status %s',
    (status) => {
      expect(updateJobSchema.safeParse({ status }).success).toBe(false);
    }
  );
});
