import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RetainedDisputesScreen } from '../RetainedDisputesScreen';

const mockGet = jest.fn();
let mockUser: { id: string } | null = { id: 'actor' };
jest.mock('../../utils/mobileApiClient', () => ({
  mobileApiClient: { get: (...args: unknown[]) => mockGet(...args) },
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: (callback: () => void) => {
    const ReactModule = jest.requireActual('react');
    ReactModule.useEffect(callback, [callback]);
  },
}));
jest.mock('../../components/shared', () => {
  const { Text, TouchableOpacity } = jest.requireActual('react-native');
  return {
    ScreenHeader: () => null,
    LoadingSpinner: () => <Text>Loading</Text>,
    ErrorView: ({
      message,
      onRetry,
    }: {
      message: string;
      onRetry: () => void;
    }) => (
      <TouchableOpacity onPress={onRetry}>
        <Text>{message}</Text>
        <Text>Try Again</Text>
      </TouchableOpacity>
    ),
  };
});

const escrowId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const response = {
  records: [{ escrow_id: escrowId, archived_at: '2026-09-24T12:00:00+00:00' }],
  limit: 50,
};
beforeEach(() => {
  mockGet.mockReset().mockResolvedValue(response);
  mockUser = { id: 'actor' };
});
function screen() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  const navigate = jest.fn();
  const content = () => (
    <QueryClientProvider client={client}>
      <RetainedDisputesScreen
        navigation={{ navigate, goBack: jest.fn() } as never}
      />
    </QueryClientProvider>
  );
  return { ...render(content()), navigate, content };
}
it('uses the authenticated reader and opens the exact retained payment without a website hand-off', async () => {
  const view = screen();
  fireEvent.press(await view.findByText(/View dispute archived/));
  expect(mockGet).toHaveBeenCalledWith(
    '/api/disputes/retained',
    expect.objectContaining({ signal: expect.anything() })
  );
  expect(view.navigate).toHaveBeenCalledWith('DisputeDetails', { escrowId });
});
it('hides cached records on failed refresh and provides a working retry', async () => {
  const view = screen();
  await view.findByText(/View dispute archived/);
  mockGet.mockRejectedValue(new Error('Offline'));
  fireEvent.press(view.getByText('Refresh records'));
  await view.findByText('Try Again');
  expect(view.queryByText(/View dispute archived/)).toBeNull();
  mockGet.mockResolvedValue(response);
  fireEvent.press(view.getByText('Try Again'));
  await view.findByText(/View dispute archived/);
});
it('does not show a prior account archive after account changes or sign-out', async () => {
  const view = screen();
  await view.findByText(/View dispute archived/);
  mockUser = { id: 'other' };
  mockGet.mockResolvedValue({ records: [], limit: 50 });
  view.rerender(view.content());
  await view.findByText('No retained disputes found.');
  expect(view.queryByText(/View dispute archived/)).toBeNull();
  mockUser = null;
  view.rerender(view.content());
  await view.findByText('Please sign in to view retained disputes.');
});
it('rejects malformed archive identifiers instead of creating a navigation target', async () => {
  mockGet.mockResolvedValue({
    records: [{ escrow_id: '../admin', archived_at: 'today' }],
    limit: 50,
  });
  const view = screen();
  await waitFor(() => expect(view.getByText('Try Again')).toBeTruthy());
  expect(view.navigate).not.toHaveBeenCalled();
});
