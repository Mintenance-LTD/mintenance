import { fireEvent, render, screen } from '@testing-library/react';
import { HireAgainBanner } from '@/app/jobs/create/components/HireAgainBanner';
import { GuideHub } from '@/components/onboarding/GuideHub';
import { CurrentPlanCard } from '@/app/homeowner/subscription/current-plan-card';
import { fullAddress } from '@/app/properties/[id]/components/MintEditorialPropertyCards';
import { SERVICE_CATEGORIES } from '@/app/jobs/create/_components/types';
vi.mock('@/hooks/useJourneyProgress', () => ({
  useJourneyProgress: () => ({ loaded: true, progress: null, save: vi.fn() }),
}));
vi.mock('@/components/onboarding/EarlyAccessSummary', () => ({
  EarlyAccessSummary: () => null,
}));
vi.mock('@/components/onboarding/ReplayQuickTour', () => ({
  ReplayQuickTour: () => null,
}));
afterEach(() => vi.unstubAllGlobals());
it('shows the actual nested contractor name and a readable invitation message', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        contractor: { name: 'Alex Smith', company_name: null },
      }),
    })
  );
  render(<HireAgainBanner preferredContractorId='contractor' />);
  expect(
    await screen.findByText('Hiring Alex Smith again')
  ).toBeInTheDocument();
  expect(screen.getByText(/Posting queues an invitation/)).toBeInTheDocument();
  expect(document.body.textContent).not.toContain('&apos;');
});
it('does not leave an unrelated guide visible after a no-results search', () => {
  render(<GuideHub userId='homeowner' role='homeowner' />);
  fireEvent.change(screen.getByRole('searchbox', { name: 'Find a feature' }), {
    target: { value: 'unmatched-feature-xyz' },
  });
  expect(screen.getByRole('status')).toHaveTextContent('No guides match');
  expect(
    screen.queryByRole('button', { name: 'Mark guide as read' })
  ).not.toBeInTheDocument();
  fireEvent.change(screen.getByRole('searchbox', { name: 'Find a feature' }), {
    target: { value: '' },
  });
  expect(
    screen.getByRole('button', { name: 'Mark guide as read' })
  ).toBeInTheDocument();
});
it('distinguishes early access features from an existing billing plan', () => {
  render(
    <CurrentPlanCard
      subscription={null}
      earlyAccessEligible
      billingCycle='month'
      saving={false}
      formatAmount={String}
      onCancel={vi.fn()}
    />
  );
  expect(
    screen.getByRole('heading', { name: 'Agency — early access' })
  ).toBeInTheDocument();
  expect(screen.getByText(/no upgrade is needed/)).toBeInTheDocument();
});
it('does not append an already present city or postcode', () => {
  expect(
    fullAddress({
      address: '12 Example Road, Stafford, ST1 2AB',
      city: 'Stafford',
      postcode: 'ST1 2AB',
    } as Parameters<typeof fullAddress>[0])
  ).toBe('12 Example Road, Stafford, ST1 2AB');
});
it('offers the converted damp category visibly', () =>
  expect(SERVICE_CATEGORIES.find((c) => c.value === 'damp')?.label).toBe(
    'Damp & mould'
  ));
