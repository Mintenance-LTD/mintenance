
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from 'react';
import { render, fireEvent, waitFor } from '../../test-utils';
import { JobService } from '../../../services/JobService';
import BidSubmissionScreen from '../../../screens/BidSubmissionScreen';
import { Alert } from 'react-native';

jest.mock('../../../services/JobService', () => ({
  JobService: {
    getJobById: jest.fn(),
    submitBid: jest.fn(),
    getBidsByJob: jest.fn(),
  },
}));

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'contractor_1', role: 'contractor' },
  }),
}));

describe('Job Bidding - Critical Path', () => {
  const mockJob = {
    id: 'job_123',
    title: 'Plumbing Repair',
    description: 'Fix leaky faucet',
    budget: 500,
    status: 'posted',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    JobService.getJobById.mockResolvedValue(mockJob);
    JobService.submitBid.mockResolvedValue({ id: 'bid_123' });
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  });

  it('should submit bid for job', async () => {
    const { getAllByText, getByPlaceholderText, getByText } = render(
      <BidSubmissionScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { jobId: 'job_123' } }}
      />
    );

    await waitFor(() => {
      expect(getByText(/plumbing repair/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/enter your bid amount/i), '450');
    fireEvent.changeText(
      getByPlaceholderText(/describe your approach/i),
      'I can fix this today'
    );

    const submitButtons = getAllByText(/submit bid/i);
    fireEvent.press(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(JobService.submitBid).toHaveBeenCalledWith({
        jobId: 'job_123',
        contractorId: 'contractor_1',
        amount: 450,
        description: 'I can fix this today',
      });
    });
  });

  it('should validate bid amount', async () => {
    const { getAllByText, getByPlaceholderText, getByText } = render(
      <BidSubmissionScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { jobId: 'job_123' } }}
      />
    );

    await waitFor(() => {
      expect(getByText(/plumbing repair/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/enter your bid amount/i), '0');
    fireEvent.changeText(
      getByPlaceholderText(/describe your approach/i),
      'Quick fix'
    );
    const submitButtons = getAllByText(/submit bid/i);
    fireEvent.press(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith('Error', 'Please enter a valid bid amount');
      expect(JobService.submitBid).not.toHaveBeenCalled();
    });
  });

  it('should prevent duplicate bids', async () => {
    (JobService.submitBid as jest.Mock).mockRejectedValue(
      new Error('You have already bid on this job')
    );

    const { getAllByText, getByPlaceholderText, getByText } = render(
      <BidSubmissionScreen
        navigation={{ navigate: jest.fn() }}
        route={{ params: { jobId: 'job_123' } }}
      />
    );

    await waitFor(() => {
      expect(getByText(/plumbing repair/i)).toBeTruthy();
    });

    fireEvent.changeText(getByPlaceholderText(/enter your bid amount/i), '450');
    fireEvent.changeText(
      getByPlaceholderText(/describe your approach/i),
      'I can fix this today'
    );
    const submitButtons = getAllByText(/submit bid/i);
    fireEvent.press(submitButtons[submitButtons.length - 1]);

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        'Error',
        'You have already bid on this job'
      );
    });
  });
});
