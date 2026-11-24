import { render, screen, within } from '@testing-library/react';
import {
  contractorJobAction,
  contractorVisitWindow,
  pastContractorVisitMessage,
} from '@mintenance/shared';
import { MintEditorialContractorJobs } from '@/app/contractor/(dashboard)/jobs/MintEditorialContractorJobs';
import type { Job } from '@/app/contractor/(dashboard)/jobs/types';
import { contractorFinancialSummary } from '@/lib/contractor/financial-summary';

const visit = {
  scheduled_start_date: '2026-11-17T09:00:00Z',
  scheduled_end_date: '2026-11-17T17:00:00Z',
};
const job: Job = {
  id: 'aaa001-first',
  title: 'Garden Maintenance',
  description: 'Trim garden',
  location: 'Test property',
  category: 'Gardening',
  priority: 'medium',
  status: 'assigned',
  budget: 1.2,
  photos: [],
  created_at: '2026-11-01T12:00:00Z',
  homeowner: { id: 'owner', name: 'Homeowner' },
  ...visit,
};

it('distinguishes same-name jobs and links only the funded card to before photos', () => {
  const base = { jobStatus: 'assigned', contractStatus: 'accepted' };
  render(
    <MintEditorialContractorJobs
      filter='active'
      categoryFilter='all'
      setFilter={vi.fn()}
      setCategoryFilter={vi.fn()}
      jobs={[
        {
          ...job,
          contractor_action: contractorJobAction({
            ...base,
            paymentStatus: 'held',
          }),
        },
        {
          ...job,
          id: 'bbb002-second',
          contractor_action: contractorJobAction(base),
        },
      ]}
      loadingJobs={false}
      loadingStats={false}
      stats={{ active: 2, pending: 0, completed: 0, totalValue: 2.4 }}
    />
  );
  const cards = screen.getAllByRole('article');
  expect(within(cards[0]).getByText(/Job #AAA001 · 17 Nov 2026/)).toBeVisible();
  expect(
    within(cards[0]).getByRole('link', { name: /Upload before photos/ })
  ).toHaveAttribute('href', '/contractor/jobs/aaa001-first#before-photos');
  expect(within(cards[1]).getByText(/Job #BBB002/)).toBeVisible();
  expect(
    within(cards[1]).getByText('Waiting for homeowner payment')
  ).toBeVisible();
});

it('flags an expired visit separately and reflects whether the job can start', () => {
  const now = Date.parse('2026-11-17T17:01:00Z');
  expect(
    contractorVisitWindow(
      visit.scheduled_start_date,
      visit.scheduled_end_date,
      now
    )
  ).toMatchObject({ passed: true });
  expect(
    contractorVisitWindow(visit.scheduled_start_date, undefined, now)
  ).toMatchObject({ passed: false });
  const ready = contractorJobAction({
    jobStatus: 'assigned',
    contractStatus: 'accepted',
    paymentStatus: 'held',
    hasBeforePhoto: true,
  });
  expect(pastContractorVisitMessage(ready)).toMatch(/You can still start/);
  expect(
    contractorJobAction({
      jobStatus: 'assigned',
      contractStatus: 'accepted',
      paymentStatus: 'held',
      hasBeforePhoto: true,
      startRestriction: 'Early-start consent is outstanding.',
    })
  ).toMatchObject({ kind: 'blocked', label: 'Waiting to start' });
});

it('prioritises the exact open dispute and separates its remaining balance from held funds', () => {
  expect(
    contractorJobAction({
      jobStatus: 'in_progress',
      paymentStatus: 'held',
      disputeEscrowId: 'older-disputed-payment',
    })
  ).toMatchObject({ kind: 'dispute', escrowId: 'older-disputed-payment' });
  const common = { job_id: 'job', created_at: '2026-11-17T17:00:00Z' };
  expect(
    contractorFinancialSummary([
      { ...common, id: 'held', status: 'held', amount: 3.72 },
      {
        ...common,
        id: 'dispute',
        status: 'disputed',
        amount: 1.5,
        remaining_minor: 120,
      },
    ])
  ).toMatchObject({
    pendingPayouts: 4.92,
    heldNotDisputed: 3.72,
    heldInDispute: 1.2,
  });
});
