import { cleanup, render, screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { DisputeCaseDetail } from '@/app/disputes/[id]/DisputeCaseDetail';
import { describeDispute } from '@/lib/disputes/presentation';

afterEach(cleanup);

it('keeps payment pause separate from an unrequested mediation and renders the original filing and evidence', () => {
  const at = '2026-11-23T14:15:00.000Z';
  render(
    <DisputeCaseDetail
      disputeId='01234567-1234-4000-8000-012345678901'
      contractor={false}
      onRefresh={vi.fn()}
      dispute={{
        status: 'disputed',
        dispute_record_status: 'open',
        mediation_status: 'pending',
        job_id: 'job',
        sla_deadline: '2026-11-24T14:00:00.000Z',
        history: [
          {
            id: 'filed',
            title: 'Original statement',
            at,
            description: 'The agreed work is incomplete.',
          },
          {
            id: 'evidence',
            title: 'Evidence submitted with the dispute',
            at,
            evidence: true,
          },
        ],
        dispute_evidence: [
          { label: 'Evidence 1', url: 'https://example.test/signed' },
        ],
      }}
    />
  );
  expect(
    screen.getByRole('heading', { name: 'Dispute under review' })
  ).toBeVisible();
  expect(screen.getByText('Payment paused')).toBeVisible();
  expect(screen.getByText('Not requested')).toBeVisible();
  expect(screen.getByText(/Mintenance will review the case/)).toBeVisible();
  expect(screen.getByText('24 November 2026')).toBeVisible();
  expect(
    screen.getByRole('button', { name: 'Request mediation' })
  ).toBeEnabled();
  const history = within(screen.getByRole('region', { name: 'Case history' }));
  expect(history.getByText('The agreed work is incomplete.')).toBeVisible();
  expect(history.getAllByText(/23 Nov 2026/)).toHaveLength(2);
  expect(history.getByRole('link', { name: /Evidence 1/ })).toHaveAttribute(
    'href',
    'https://example.test/signed'
  );
});

it.each([
  ['pending', 'Requested'],
  ['scheduled', 'Scheduled'],
  ['in_progress', 'In progress'],
  ['completed', 'Completed'],
])(
  'shows mediation %s as %s without changing the case status',
  (mediation_status, mediation) => {
    expect(
      describeDispute({
        status: 'disputed',
        mediation_status,
        mediation_requested: true,
      })
    ).toMatchObject({
      title: 'Dispute under review',
      paymentPaused: true,
      mediation,
      canRequestMediation: false,
    });
  }
);

it('shows a case closed without payment settlement as closed with the hold still in effect', () => {
  expect(
    describeDispute({
      status: 'held',
      dispute_record_status: 'closed',
      admin_hold_status: 'admin_hold',
    })
  ).toMatchObject({
    title: 'Dispute closed',
    paymentPaused: true,
    canRequestMediation: false,
    nextStep: expect.stringContaining(
      'Mintenance still needs to make a payment decision'
    ),
  });
});
