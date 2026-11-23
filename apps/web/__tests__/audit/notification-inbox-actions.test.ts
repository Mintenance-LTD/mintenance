import { expect, it, vi } from 'vitest';
import {
  resolveInboxActions,
  type InboxRow,
} from '@/lib/notifications/inbox-actions';

const jobId = '00000000-0000-4000-8000-000000000001';
const escrowId = '00000000-0000-4000-8000-000000000002';
const caseId = '00000000-0000-4000-8000-000000000003';
const actor = { id: 'homeowner' };
const job = {
  id: jobId,
  status: 'completed',
  homeowner_id: actor.id,
  payer_user_id: null,
  contractor_id: 'contractor',
};
const escrow = {
  id: escrowId,
  job_id: jobId,
  job,
  payer_id: actor.id,
  payee_id: 'contractor',
  status: 'held',
  homeowner_approval: false,
  admin_hold_status: null,
};
const reminder: InboxRow = {
  id: 'review',
  type: 'job_completed',
  title: 'Review work',
  message: 'Review the job and release payment',
  action_url: `/jobs/${jobId}`,
  created_at: '2026-11-23T20:00:00Z',
  read: false,
  approval_key: `job:${jobId}`,
};
const alert: InboxRow = {
  ...reminder,
  id: 'dispute',
  type: 'payment',
  title: 'Dispute submitted',
  message: 'The dispute is under review.',
  metadata: { disputeId: caseId },
  approval_key: null,
};

function fixture(payments: unknown[], links: unknown[]) {
  const filters = vi.fn();
  const from = vi.fn((table: string) => ({
    select: () => ({
      in: (column: string, ids: string[]) => {
        filters(table, column, ids);
        return Promise.resolve({
          data: table === 'escrow_transactions' ? payments : links,
          error: null,
        });
      },
    }),
  }));
  return { db: { from } as never, filters };
}

it('supersedes the old release instruction and opens the exact linked dispute', async () => {
  const disputed = { ...escrow, status: 'disputed' };
  const { db, filters } = fixture(
    [disputed],
    [{ dispute_id: caseId, escrow: disputed, dispute: { job_id: jobId } }]
  );
  const rows = await resolveInboxActions(db, actor, [reminder, alert]);
  expect(rows[0]).toMatchObject({
    action_status: 'no_longer_actionable',
    message: 'Payment release is paused while the dispute is reviewed.',
  });
  expect(rows[0].message).not.toContain('Review the job and release payment');
  expect(rows[1].action_url).toBe(`/disputes/${escrowId}`);
  expect(filters).toHaveBeenCalledWith('dispute_escrow_links', 'dispute_id', [
    caseId,
  ]);
});

it('keeps a held payment review actionable and closes it after approval or refund', async () => {
  const live = await resolveInboxActions(fixture([escrow], []).db, actor, [
    reminder,
  ]);
  expect(live[0].action_status).toBeUndefined();
  expect(live[0].action_url).toBe(`/jobs/${jobId}`);
  for (const payment of [
    { ...escrow, homeowner_approval: true },
    { ...escrow, status: 'refunded' },
    { ...escrow, admin_hold_status: 'pending_review' },
  ]) {
    const closed = await resolveInboxActions(fixture([payment], []).db, actor, [
      reminder,
    ]);
    expect(closed[0].action_status).toBe('no_longer_actionable');
  }
});

it('preserves the existing destination when the linked escrow cannot be opened by the recipient', async () => {
  const unrelated = { ...escrow, payer_id: 'someone-else' };
  const { db } = fixture(
    [],
    [{ dispute_id: caseId, escrow: unrelated, dispute: { job_id: jobId } }]
  );
  const [row] = await resolveInboxActions(db, actor, [alert]);
  expect(row.action_url).toBe(alert.action_url);
});
