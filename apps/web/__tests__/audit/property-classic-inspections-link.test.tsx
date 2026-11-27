import { cleanup, render, screen, fireEvent } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import PropertyDetailsClient from '@/app/properties/[id]/components/PropertyDetailsClient';

const mocks = vi.hoisted(() => ({ scroll: vi.fn() }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(window.location.search),
}));
vi.mock('@/hooks/usePropertyView', () => ({
  usePropertyView: () => ({ view: 'rental' }),
}));
vi.mock('@/components/ui/confirm-dialog', () => ({
  useConfirm: () => vi.fn(),
}));
vi.mock('@/components/FeatureGateCard', () => ({
  FeatureGateCard: () => null,
}));
vi.mock('@/app/properties/components/SpendingChart', () => ({
  SpendingChart: () => null,
  aggregateSpendingByMonth: () => [],
}));
vi.mock('@/app/properties/[id]/components/PropertyWorkSummary', () => ({
  PropertyWorkSummary: () => null,
}));
vi.mock('@/app/properties/[id]/components/PropertyFileHub', () => ({
  PropertyFileHub: () => null,
}));
vi.mock('@/app/properties/[id]/components/TenancyInspections', () => ({
  default: ({ propertyId }: { propertyId: string }) => (
    <p>Inspection records for {propertyId}</p>
  ),
}));
vi.mock('@/app/properties/[id]/components/RecurringMaintenance', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/TenantContacts', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/TeamAccess', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/BulkOperations', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/RoomPhotoGallery', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/YearOverYearComparison', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/PropertyAssessments', () => ({
  default: () => null,
}));

const property = {
  id: 'dummy-property',
  name: 'Test house',
  address: '',
  city: '',
  postcode: '',
  type: 'Residential',
  bedrooms: 0,
  bathrooms: 0,
  squareFeet: 0,
  yearBuilt: 0,
  images: [],
};
const stats = { completedJobs: 0, activeJobs: 0, totalSpent: 0 };
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

it('opens and scrolls to the matching tenancy records from the classic repair shortcut', () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false }));
  vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(
    mocks.scroll
  );
  window.history.replaceState(
    null,
    '',
    '/properties/dummy-property?tab=manage&manage=records#manage-records'
  );
  const detail = (
    <PropertyDetailsClient property={property} jobs={[]} stats={stats} />
  );
  const { rerender } = render(detail);
  expect(
    screen.getByRole('region', { name: 'Tenancy and inspections' })
  ).toHaveAttribute('id', 'manage-records');
  expect(
    screen.getByText('Inspection records for dummy-property')
  ).toBeInTheDocument();
  expect(mocks.scroll).toHaveBeenCalledWith({ block: 'start' });
  expect(
    screen.getByRole('region', { name: 'Tenancy and inspections' })
  ).toHaveFocus();

  fireEvent.click(screen.getByRole('button', { name: 'Overview' }));
  expect(window.location.search).toBe('?tab=overview');
  expect(window.location.hash).toBe('');
  rerender(
    <PropertyDetailsClient property={property} jobs={[]} stats={stats} />
  );
  expect(
    screen.queryByText('Inspection records for dummy-property')
  ).not.toBeInTheDocument();
});
