import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ContractorVerificationPage from '@/app/contractor/(dashboard)/verification/page';
const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  user: { id: 'contractor', admin_verified: true },
}));
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ user: mocks.user }),
}));
vi.mock('@/lib/hooks/useCSRF', () => ({
  useCSRF: () => ({ getCsrfHeaders: vi.fn() }),
}));
vi.mock('@/app/contractor/components/ContractorPageWrapper', () => ({
  ContractorPageWrapper: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', mocks.fetch);
});
it('does not present unloaded or failed document data as an unverified account, and supports retry', async () => {
  mocks.fetch
    .mockResolvedValueOnce({ ok: false })
    .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [] }) });
  render(<ContractorVerificationPage />);
  expect(screen.getByRole('status')).toHaveTextContent(
    'Loading document review status'
  );
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'could not be loaded'
  );
  expect(screen.queryByText('Not Started')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
  expect(await screen.findByText(/Account review:/)).toHaveTextContent(
    'Admin reviewed'
  );
  expect(screen.getByText(/Account review:/)).toHaveTextContent(
    'does not measure account approval or guarantee workmanship'
  );
});
