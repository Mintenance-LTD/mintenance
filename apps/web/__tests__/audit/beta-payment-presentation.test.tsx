import React from 'react';
import { render, screen } from '@testing-library/react';
import { MintEditorialJobDetailView } from '@/app/contractor/(dashboard)/jobs/[id]/components/MintEditorialJobDetailView';
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
it('distinguishes a pending £1 payment, contractor estimate, processing fee and bank payout', () => {
  render(
    <MintEditorialJobDetailView
      job={{ id: 'job', title: 'Garden job', status: 'assigned', budget: 1 }}
      homeowner={null}
      contract={null}
      property={null}
      contractStatus='accepted'
      currentStage='awaiting_payment'
      stageTitle='Awaiting payment'
      stageSubtitle='Waiting for funding'
      steps={[]}
      escrowHeld={false}
      escrowStatus='pending'
      escrowId={null}
      paymentAmounts={{ gross: 1, fee: null, net: null, processing: 0.22 }}
      jobPhotoUrls={[]}
      buildingAssessment={null}
      userId='contractor'
      messageHref={null}
      platformFeeRate={0.05}
    />
  );
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
  ).toHaveAttribute('href', '/contractor/payouts');
});
