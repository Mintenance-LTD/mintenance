import React from 'react';
import { Alert } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { BidReviewScreen } from '../BidReviewScreen';
const mockNavigation = { navigate: jest.fn() };
const mockQueryClient = { invalidateQueries: jest.fn() };
const mockGet = jest.fn();
const mockAccept = jest.fn();
const mockReject = jest.fn();
jest.mock('../../lib/queryClient', () => ({
  queryKeys: {
    jobs: {
      all: ['jobs'],
      details: (id: string) => ['jobs', id],
      bids: (id: string) => ['bids', id],
    },
  },
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  useRoute: () => ({ params: { jobId: 'job' } }),
}));
jest.mock('@tanstack/react-query', () => ({
  useQueryClient: () => mockQueryClient,
}));
jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'owner' } }),
}));
jest.mock('../../services/BidService', () => ({
  BidService: {
    getBidsByJob: (...args: unknown[]) => mockGet(...args),
    acceptBid: (...args: unknown[]) => mockAccept(...args),
    rejectBid: (...args: unknown[]) => mockReject(...args),
  },
}));
jest.mock('../BidReviewCard', () => {
  const { Text } = require('react-native');
  return {
    BidReviewCard: ({ bid }: { bid: { id: string } }) => <Text>{bid.id}</Text>,
  };
});
beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  mockGet.mockResolvedValue([
    { id: 'expensive', contractor_id: 'a', amount: 1.6 },
    { id: 'cheaper', contractor_id: 'b', amount: 1.5 },
  ]);
});
it('offers a retry instead of claiming all bids were reviewed after a load failure', async () => {
  mockGet.mockRejectedValueOnce(new Error('offline'));
  const view = render(<BidReviewScreen />);
  expect(await view.findByText('Could not load bids')).toBeTruthy();
  expect(view.queryByText('All Bids Reviewed')).toBeNull();
  fireEvent.press(view.getByText('Try again'));
  expect(await view.findByText('cheaper')).toBeTruthy();
});
it('lets homeowners compare and return without changing either bid; averages pennies', async () => {
  const view = render(<BidReviewScreen />);
  expect(await view.findByText('cheaper')).toBeTruthy();
  expect(view.getByText('£1.55')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Next bid'));
  expect(view.getByText('expensive')).toBeTruthy();
  fireEvent.press(view.getByLabelText('Previous bid'));
  expect(view.getByText('cheaper')).toBeTruthy();
  expect(mockAccept).not.toHaveBeenCalled();
  expect(mockReject).not.toHaveBeenCalled();
});
it('requires confirmation and keeps the selected bid after an acceptance error', async () => {
  mockAccept.mockRejectedValue(new Error('Payment account setup required'));
  const view = render(<BidReviewScreen />);
  await view.findByText('cheaper');
  fireEvent.press(view.getByLabelText('Next bid'));
  fireEvent.press(view.getByLabelText('Accept this bid'));
  expect(mockAccept).not.toHaveBeenCalled();
  await act(async () => fireEvent.press(view.getByText('Accept bid')));
  await waitFor(() =>
    expect(mockAccept).toHaveBeenCalledWith('expensive', 'job')
  );
  expect(view.getByText('expensive')).toBeTruthy();
  expect(view.getByText('Payment account setup required')).toBeTruthy();
  expect(mockReject).not.toHaveBeenCalled();
});
