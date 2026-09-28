import React from 'react';
import { Share } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TenantReportingLinks } from '../components/TenantReportingLinks';
const mockGet = jest.fn();
const mockPost = jest.fn();
const mockPatch = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner' } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
    patch: (...args: unknown[]) => mockPatch(...args),
  },
}));
const clients: QueryClient[] = [];
function show() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  clients.push(client);
  return render(
    <QueryClientProvider client={client}>
      <TenantReportingLinks propertyId='property' />
    </QueryClientProvider>
  );
}
beforeEach(() => jest.clearAllMocks());
afterEach(() => clients.splice(0).forEach((client) => client.clear()));
it('shows retry on load failure and exposes all recovered reporting links', async () => {
  mockGet.mockRejectedValueOnce(new Error('offline')).mockResolvedValue({
    tokens: [1, 2, 3, 4].map((id) => ({
      id: String(id),
      token: `public-token-${id}`,
      property_id: 'property',
      label: `Link ${id}`,
      is_active: true,
    })),
  });
  const view = show();
  await waitFor(() =>
    expect(view.getByText('Retry reporting links')).toBeTruthy()
  );
  expect(view.queryByText('No reporting links yet.')).toBeNull();
  fireEvent.press(view.getByText('Retry reporting links'));
  await waitFor(() => expect(view.getByText('Link 4 · Active')).toBeTruthy());
});
it('shares the public reporting token, not the internal row ID', async () => {
  const share = jest
    .spyOn(Share, 'share')
    .mockResolvedValue({ action: Share.sharedAction });
  mockGet.mockResolvedValue({
    tokens: [
      {
        id: 'internal-row-id',
        token: 'public-report-token',
        property_id: 'property',
        label: 'Tenant link',
        is_active: true,
      },
    ],
  });
  const view = show();
  await waitFor(() => expect(view.getByText('Share link')).toBeTruthy());
  await act(async () => fireEvent.press(view.getByText('Share link')));
  expect(share).toHaveBeenCalledWith({
    message: 'https://www.mintenance.co.uk/report/public-report-token',
  });
  share.mockRestore();
});
it('does not treat a malformed creation response as saved', async () => {
  mockGet.mockResolvedValue({ tokens: [] });
  mockPost.mockResolvedValue({ token: null });
  const view = show();
  await waitFor(() =>
    expect(view.getByText('Generate report link')).toBeTruthy()
  );
  await act(async () =>
    fireEvent.press(view.getByText('Generate report link'))
  );
  expect(view.getByText(/The link change could not be confirmed/)).toBeTruthy();
  expect(mockGet).toHaveBeenCalledTimes(1);
  expect(mockPost).toHaveBeenCalledWith(
    '/api/properties/property/report-token',
    { label: 'Tenant reporting link' }
  );
});
