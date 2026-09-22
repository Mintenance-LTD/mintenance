import { beforeEach, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MintEditorialPropertyManage } from '@/app/properties/[id]/components/MintEditorialPropertyManage';
const mocks = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: mocks }));
vi.mock('@/lib/csrf-client', () => ({ getCsrfToken: async () => 'test' }));
vi.mock('@/components/FeatureGateCard', () => ({
  FeatureGateCard: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/app/properties/[id]/components/RecurringMaintenance', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/TeamAccess', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/TenantContacts', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/RoomPhotoGallery', () => ({
  default: () => null,
}));
vi.mock('@/app/properties/[id]/components/BulkOperations', () => ({
  default: () => null,
}));
const fetchMock = vi.fn();
const token = {
  id: 'token',
  property_id: 'property',
  label: 'Ground floor',
  is_active: true,
};
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetchMock);
});
const show = () =>
  render(
    <MintEditorialPropertyManage
      propertyId='property'
      propertyName='Synthetic home'
      jobs={[]}
    />
  );
it('offers task-based management sections and retries a failed reporting-link load', async () => {
  fetchMock
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ tokens: [] }) });
  show();
  expect(
    screen.getByRole('navigation', { name: 'Property management sections' })
  ).toBeDefined();
  await screen.findByRole('button', { name: 'Retry reporting links' });
  expect(screen.queryByText('No reporting links yet.')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Retry reporting links' })
  );
  await screen.findByText('No reporting links yet.');
  expect(screen.queryByText('Portfolio analytics')).toBeNull();
});
it('shows all links and keeps the current state when disabling fails', async () => {
  fetchMock.mockResolvedValueOnce({
    ok: true,
    json: async () => ({
      tokens: [
        token,
        ...[2, 3, 4].map((id) => ({
          ...token,
          id: String(id),
          label: `Link ${id}`,
        })),
      ],
    }),
  });
  show();
  await screen.findByText('Link 4 · Active');
  fetchMock.mockResolvedValueOnce({ ok: false });
  fireEvent.click(screen.getAllByRole('button', { name: 'Disable' })[0]);
  await waitFor(() =>
    expect(mocks.error).toHaveBeenCalledWith('Failed to update link')
  );
  expect(screen.getByText('Ground floor · Active')).toBeDefined();
  expect(mocks.success).not.toHaveBeenCalled();
});
