import React from 'react';
import { render, screen } from '@testing-library/react';
import { MintEditorialJobDetailView } from '@/app/contractor/(dashboard)/jobs/[id]/components/MintEditorialJobDetailView';
import { StartChecklist } from '@/app/contractor/(dashboard)/jobs/[id]/components/StartChecklist';
import { contractorPaymentPresentation } from '@/app/contractor/(dashboard)/jobs/[id]/payment-presentation';
import {
  buildContractorProgressSteps,
  contractorStageUsesPaymentMessage,
  getStageConfig,
} from '@/app/contractor/(dashboard)/jobs/[id]/stage-helpers';
vi.mock('@/app/jobs/[id]/components/ContractManagement', () => ({
  ContractManagement: () => null,
}));
vi.mock('@/app/jobs/[id]/components/JobScheduling', () => ({
  JobScheduling: () => null,
}));
vi.mock(
  '@/app/contractor/(dashboard)/jobs/[id]/components/PreArrivalChecklist',
  () => ({ PreArrivalChecklist: () => null })
);
vi.mock(
  '@/app/contractor/(dashboard)/jobs/[id]/components/PreArrivalPhotoGallery',
  () => ({ PreArrivalPhotoGallery: () => null })
);
vi.mock('@/app/contractor/(dashboard)/jobs/[id]/components/JobMapCard', () => ({
  JobMapCard: () => null,
}));
vi.mock(
  '@/app/contractor/(dashboard)/jobs/[id]/components/JobPhotoUpload',
  () => ({
    JobPhotoUpload: () => <p>Work evidence controls</p>,
  })
);
vi.mock(
  '@/app/contractor/(dashboard)/jobs/[id]/components/ContractorTipsReceivedCard',
  () => ({
    ContractorTipsReceivedCard: () => null,
  })
);

function renderJob(
  {
    status,
    jobStatus = 'assigned',
    adminHold,
    homeownerApproved,
    unavailable,
  }: Parameters<typeof contractorPaymentPresentation>[0],
  historicalBrief = false
) {
  const payment = contractorPaymentPresentation({
    status,
    jobStatus,
    adminHold,
    homeownerApproved,
    unavailable,
  });
  const currentStage =
    jobStatus === 'completed' || jobStatus === 'in_progress'
      ? jobStatus
      : 'awaiting_payment';
  const stage = getStageConfig(currentStage);
  const showPaymentMessage = contractorStageUsesPaymentMessage(
    currentStage,
    payment
  );
  const steps = buildContractorProgressSteps({
    jobStatus: jobStatus ?? 'assigned',
    currentStage,
    contractStatus: 'accepted',
    payment,
  });
  render(
    <MintEditorialJobDetailView
      job={{ id: 'job', title: 'Garden job', status: jobStatus, budget: 1 }}
      homeowner={null}
      contract={null}
      property={null}
      contractStatus='accepted'
      currentStage={currentStage}
      stageTitle={showPaymentMessage ? payment.label : stage.title}
      stageSubtitle={showPaymentMessage ? payment.detail : stage.subtitle}
      steps={steps.map((step) => ({
        label: step.label,
        state: step.completed
          ? 'complete'
          : step.active
            ? 'current'
            : 'pending',
      }))}
      payment={payment}
      escrowId='escrow-id'
      paymentHref='/contractor/payments/escrow-id'
      caseHref={payment.kind === 'disputed' ? '/disputes/exact-disputed-payment' : undefined}
      disputeAction={payment.kind === 'disputed' ? {
        kind: 'dispute',
        label: 'Dispute under review',
        detail: 'Wait for an update and respond if support requests information.',
        escrowId: 'exact-disputed-payment',
      } : undefined}
      paymentAmounts={{
        gross: 1,
        fee: payment.kind === 'released' ? 0.5 : null,
        net: payment.kind === 'released' ? 0.5 : null,
        processing: 0.22,
      }}
      jobPhotoUrls={[]}
      buildingAssessment={
        historicalBrief
          ? { assessment_data: { evidenceSufficient: false } }
          : null
      }
      userId='contractor'
      messageHref='/contractor/messages?jobId=job'
      platformFeeRate={0.05}
    />
  );
  return steps;
}

it('distinguishes a pending £1 payment, contractor estimate, processing fee and bank payout', () => {
  renderJob({ status: 'pending' });
  expect(screen.getByText('Customer payment amount')).toBeVisible();
  expect(screen.queryByText('Funded amount')).toBeNull();
  expect(screen.getByText('Estimated contractor entitlement')).toBeVisible();
  expect(screen.getByText('£0.5')).toBeVisible();
  expect(screen.getByText(/Stripe processing is a/)).toHaveTextContent('£0.22');
  expect(screen.getByText(/Stripe processing is a/)).toHaveTextContent(
    'not an extra deduction'
  );
  expect(
    screen.getByRole('link', { name: 'Check transfer and bank payout status' })
  ).toHaveAttribute('href', '/contractor/payments/escrow-id');
});

it('keeps the original assessment caveat in the completed job brief', () => {
  renderJob({ status: 'released', jobStatus: 'completed' }, true);
  expect(
    screen.getByText('Original job photos couldn’t be assessed')
  ).toBeVisible();
  expect(screen.queryByText('New photos needed')).toBeNull();
  expect(
    screen.getByRole('heading', { name: 'Payment released' })
  ).toBeVisible();
});

it.each(['released', 'completed'])(
  'uses the recorded %s payment throughout the completed job',
  (status) => {
    const steps = renderJob({ status, jobStatus: 'completed' });
    expect(
      screen.getByRole('heading', { name: 'Payment released' })
    ).toBeVisible();
    expect(
      screen.getByRole('heading', { name: 'Released earnings' })
    ).toBeVisible();
    expect(screen.getByText('Recorded contractor entitlement')).toBeVisible();
    expect(
      screen.getByRole('link', { name: 'View payment record' })
    ).toHaveAttribute('href', '/contractor/payments/escrow-id');
    expect(
      screen.queryByText(/held in escrow|awaiting homeowner review/i)
    ).toBeNull();
    expect(steps.find((step) => step.id === 'paid')).toMatchObject({
      label: 'Release',
      completed: true,
      active: false,
    });
  }
);

it('shows a funded dispute in the main action panel while preserving work evidence controls', () => {
  const steps = renderJob({ status: 'disputed', jobStatus: 'in_progress' });
  expect(
    screen.getByRole('heading', { name: 'Dispute under review' })
  ).toBeVisible();
  expect(
    screen.getAllByText(
      /customer payment was received.*release is paused.*Mintenance reviews the dispute/i
    )[0]
  ).toBeVisible();
  expect(screen.getByText('Work evidence controls')).toBeVisible();
  expect(screen.getByRole('link', {name: 'View dispute'})).toHaveAttribute(
    'href', '/disputes/exact-disputed-payment'
  );
  expect(screen.queryByRole('link', {name: 'Check transfer and bank payout status'})).toBeNull();
  expect(
    screen.getAllByText(/if the job shows a rework request/i)[0]
  ).toBeVisible();
  expect(
    screen.queryByText(/waiting for payment|once the homeowner pays/i)
  ).toBeNull();
  expect(steps.find((step) => step.id === 'payment')).toMatchObject({
    completed: true,
  });
  expect(steps.find((step) => step.id === 'paid')).toMatchObject({
    label: 'Release paused',
    completed: false,
    active: true,
  });
});

it.each([
  [{ status: 'held', adminHold: 'admin_hold' }, 'Payment release paused'],
  [{ status: 'held', homeownerApproved: true }, 'Approved · release pending'],
  [{ status: 'awaiting_homeowner_approval' }, 'Awaiting homeowner review'],
  [{ status: 'release_pending' }, 'Release in progress'],
  [{ status: 'refunded' }, 'Payment refunded'],
  [{ status: null, unavailable: true }, 'Payment status unavailable'],
] as const)(
  'uses the applicable payment instruction after completion',
  (input, title) => {
    renderJob({ ...input, jobStatus: 'completed' });
    expect(screen.getByRole('heading', { name: title })).toBeVisible();
    expect(
      screen.queryByRole('heading', { name: 'Released earnings' })
    ).toBeNull();
  }
);
it('shows before-photo instructions separately from a passed work window', () => {
  render(<StartChecklist funded beforePhotoCount={0} windowPassed />);
  expect(screen.getByText('Customer payment secured')).toBeVisible();
  expect(
    screen.getByText('Upload at least one before photo on site')
  ).toBeVisible();
  expect(screen.getByText(/agree a new date with the homeowner/)).toBeVisible();
  expect(screen.getByRole('link', { name: 'View schedule' })).toHaveAttribute(
    'href',
    '#job-schedule'
  );
});
