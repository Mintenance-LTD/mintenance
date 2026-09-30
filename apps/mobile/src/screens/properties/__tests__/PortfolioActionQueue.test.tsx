import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PortfolioActionQueue } from '../components/PortfolioActionQueue';
const mockGet = jest.fn();
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: 'file:///cache/',
  writeAsStringAsync: jest.fn(),
  StorageAccessFramework: {},
  EncodingType: { UTF8: 'utf8' },
}));
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'synthetic-manager' } }),
}));
jest.mock('../../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));
let client: QueryClient;
beforeEach(() => {
  jest.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => client.clear());
it('loads on expansion, opens the correct property and retrieves the next page', async () => {
  mockGet.mockResolvedValue({
    items: [
      {
        id: 'job',
        kind: 'job',
        property_id: 'property',
        property_name: 'Synthetic home',
        title: 'Repair',
        next_action: 'Assign a contractor',
      },
    ],
    total: 6,
    hasMore: true,
  });
  const open = jest.fn();
  const view = render(
    <QueryClientProvider client={client}>
      <PortfolioActionQueue onOpenProperty={open} />
    </QueryClientProvider>
  );
  expect(mockGet).not.toHaveBeenCalled();
  fireEvent.press(view.getByText('Maintenance action queue +'));
  await waitFor(() => expect(view.getByText('Repair')).toBeTruthy());
  fireEvent.press(view.getByText('Open property →'));
  expect(open).toHaveBeenCalledWith('property');
  fireEvent.press(view.getByText('Next'));
  await waitFor(() =>
    expect(mockGet).toHaveBeenCalledWith(
      '/api/portfolio/queue?offset=5&limit=5'
    )
  );
});
it('shows a retry action after a failed load', async () => {
  mockGet.mockRejectedValue(new Error('offline'));
  const view = render(
    <QueryClientProvider client={client}>
      <PortfolioActionQueue onOpenProperty={jest.fn()} />
    </QueryClientProvider>
  );
  fireEvent.press(view.getByText('Maintenance action queue +'));
  await waitFor(() =>
    expect(view.getByText('Unable to load actions. Tap to retry.')).toBeTruthy()
  );
});
