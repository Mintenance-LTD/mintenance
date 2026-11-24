import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { MintEditorialJobsList } from '@/app/jobs/components/MintEditorialJobsList';
import {
  jobWorkspaceStatus,
  type WorkspaceJob,
  type WorkspacePayment,
} from '@/lib/jobs/workspace-status';
import { returnToWorkspace } from '@/lib/jobs/workspace-navigation';
import { workspaceLocation } from '@/lib/jobs/workspace-location';

afterEach(cleanup);

const common = { budget: 20, created_at: '2026-11-21T10:00:00Z' };
const job = {
  id: 'case-job',
  status: 'in_progress',
  homeowner_id: 'owner',
  payer_user_id: 'payer',
  contractor_id: 'contractor',
} satisfies WorkspaceJob;
const escrow = {
  job_id: job.id,
  payer_id: 'payer',
  payee_id: 'contractor',
  status: 'held',
} satisfies WorkspacePayment;

it('flags the open dispute even with a newer payment attempt and ignores an unrelated payer', () => {
  const disputed = { ...escrow, status: 'disputed' };
  expect(
    jobWorkspaceStatus(job, 'owner', [escrow, disputed], undefined, 0, false)
  ).toEqual({
    label: 'Dispute under review · payment paused',
    needsAttention: true,
    disputed: true,
  });
  expect(
    jobWorkspaceStatus(
      job,
      'owner',
      [{ ...disputed, payer_id: 'someone-else' }],
      undefined,
      0,
      false
    )
  ).toMatchObject({ needsAttention: false });
  expect(
    jobWorkspaceStatus(
      job,
      'owner',
      [{ ...disputed, payer_id: 'owner' }],
      undefined,
      0,
      false
    )
  ).toMatchObject({ disputed: true });
});

it('reports actual completion and funding blockers without offering review for a refund', () => {
  const completed = { ...job, status: 'completed' };
  expect(
    jobWorkspaceStatus(completed, 'payer', [escrow], undefined, 0, true)
  ).toEqual({
    label: 'Review the finished work',
    needsAttention: true,
  });
  expect(
    jobWorkspaceStatus(completed, 'owner', [escrow], undefined, 0, true)
  ).toEqual({
    label: 'Waiting for the payer to review the work',
    needsAttention: false,
  });
  expect(
    jobWorkspaceStatus(completed, 'payer', [], undefined, 0, true)
  ).toEqual({ label: 'Payment needs review', needsAttention: true });
  expect(
    jobWorkspaceStatus(
      completed,
      'owner',
      [{ ...escrow, status: 'refunded' }],
      undefined,
      0,
      true
    )
  ).toEqual({
    label: 'Payment refunded',
    needsAttention: false,
  });
  const signed = {
    job_id: job.id,
    homeowner_id: 'owner',
    contractor_id: 'contractor',
    status: 'accepted',
    homeowner_signed_at: '2026-11-23',
    contractor_signed_at: '2026-11-23',
  };
  expect(
    jobWorkspaceStatus(
      { ...job, status: 'assigned' },
      'owner',
      [],
      signed,
      0,
      false
    )
  ).toEqual({
    label: 'Waiting for the payer to fund the job',
    needsAttention: false,
  });
  expect(
    jobWorkspaceStatus(
      { ...job, status: 'assigned' },
      'payer',
      [],
      signed,
      0,
      false
    )
  ).toEqual({ label: 'Payment needs funding', needsAttention: true });
  expect(
    jobWorkspaceStatus(
      { ...job, status: 'assigned' },
      'owner',
      [],
      {
        ...signed,
        status: 'pending_contractor',
        homeowner_signed_at: null,
        contractor_signed_at: null,
      },
      0,
      false
    )
  ).toEqual({
    label: 'Waiting for the contractor to sign',
    needsAttention: false,
  });
});

it('uses the blockers for Needs attention and cleans up duplicate towns and postcodes', () => {
  expect(
    workspaceLocation({
      propertyLabel: '1 Example Road, Cheltenham GL522EH, Cheltenham',
      propertyTown: 'Cheltenham',
      propertyPostcode: 'GL52 2EH',
    })
  ).toBe('1 Example Road, Cheltenham, GL52 2EH');

  render(
    <MintEditorialJobsList
      jobs={[
        {
          ...common,
          id: job.id,
          title: 'Repair tap',
          status: 'in_progress',
          category: 'plumbing',
          location: 'Cheltenham GL522EH, Cheltenham, GL52 2EH',
          workspaceStatus: jobWorkspaceStatus(
            job,
            'owner',
            [{ ...escrow, status: 'disputed' }],
            undefined,
            0,
            false
          ),
        },
        {
          ...common,
          id: 'regular-job',
          title: 'Routine visit',
          status: 'in_progress',
        },
        {
          ...common,
          id: 'cancelled-job',
          title: 'Cancelled visit',
          status: 'canceled',
        },
      ]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Needs attention · 1' }));
  const disputed = screen.getByRole('link', { name: /Repair tap/ });
  expect(within(disputed).getByText('Disputed')).toBeVisible();
  expect(
    within(disputed).getByText('Dispute under review · payment paused')
  ).toBeVisible();
  expect(
    within(disputed).getByText(/^Cheltenham, GL52 2EH · Posted/)
  ).toBeVisible();
  expect(screen.queryByText('Routine visit')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelled · 1' }));
  expect(screen.getByText('Cancelled visit')).toBeVisible();
  expect(screen.queryByText('Repair tap')).toBeNull();
});

it('combines Done, Plumbing and a property search and encodes them in the job return link', () => {
  render(
    <MintEditorialJobsList
      jobs={[
        {
          ...common,
          id: 'tap',
          title: 'Tap repair',
          status: 'completed',
          category: 'plumbing',
          propertyName: 'Willow Court',
        },
        {
          ...common,
          id: 'painting',
          title: 'Painting',
          status: 'completed',
          category: 'painting',
          propertyName: 'Willow Court',
        },
        {
          ...common,
          id: 'drain',
          title: 'Drain repair',
          status: 'completed',
          category: 'plumbing',
          propertyName: 'Cedar House',
        },
      ]}
    />
  );
  fireEvent.click(screen.getByRole('button', { name: 'Done · 3' }));
  fireEvent.change(screen.getByLabelText('Filter jobs by category'), {
    target: { value: 'plumbing' },
  });
  fireEvent.change(
    screen.getByRole('searchbox', { name: 'Search jobs by title or property' }),
    {
      target: { value: 'Willow' },
    }
  );
  expect(screen.queryByText('Painting')).toBeNull();
  expect(screen.queryByText('Drain repair')).toBeNull();
  const href = screen
    .getByRole('link', { name: /Tap repair/ })
    .getAttribute('href');
  const params = new URL(href!, 'https://example.test').searchParams;
  expect(returnToWorkspace(params.get('fromJobs') ?? undefined)).toBe(
    '/jobs?view=done&jobCategory=plumbing&q=Willow'
  );
  expect(returnToWorkspace('https://elsewhere.invalid/?redirect=other')).toBe(
    '/jobs'
  );
});
