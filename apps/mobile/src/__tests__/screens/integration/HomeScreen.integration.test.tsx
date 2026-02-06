
import React from 'react';
import { render, fireEvent, waitFor } from '../test-utils';
import { HomeScreen } from '../../../screens/HomeScreen';
import { JobService } from '../../../services/JobService';
import { AuthService } from '../../../services/AuthService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () => require('@react-native-async-storage/async-storage/jest/async-storage-mock'));

jest.mock('../../../services/JobService');
jest.mock('../../../services/AuthService');

describe('HomeScreen Integration - Comprehensive', () => {
  const mockNavigation = {
    navigate: jest.fn(),
    addListener: jest.fn(),
    setOptions: jest.fn(),
  };

  const mockUser = {
    id: 'user_123',
    name: 'John Doe',
    role: 'homeowner',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (AuthService.getCurrentUser as jest.Mock).mockResolvedValue(mockUser);
    (JobService.getJobsByHomeowner as jest.Mock).mockResolvedValue([
      { id: 'job_1', title: 'Plumbing', status: 'posted' },
      { id: 'job_2', title: 'Electrical', status: 'in_progress' },
    ]);
  });

  it('should display user welcome message', async () => {
    const { getByText } = render(
      <HomeScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    await waitFor(() => {
      expect(getByText(/welcome.*john doe/i)).toBeTruthy();
    });
  });

  it('should load and display user jobs', async () => {
    const { getByText } = render(
      <HomeScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    await waitFor(() => {
      expect(getByText('Plumbing')).toBeTruthy();
      expect(getByText('Electrical')).toBeTruthy();
    });
  });

  it('should navigate to job creation', async () => {
    const { getByText } = render(
      <HomeScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    fireEvent.press(getByText(/post.*job/i));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('JobPosting');
  });

  it('should navigate to job details on job press', async () => {
    const { getByText } = render(
      <HomeScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    await waitFor(() => {
      fireEvent.press(getByText('Plumbing'));
    });

    expect(mockNavigation.navigate).toHaveBeenCalledWith('JobDetails', {
      jobId: 'job_1',
    });
  });

  it('should show empty state when no jobs', async () => {
    (JobService.getJobsByHomeowner as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(
      <HomeScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    await waitFor(() => {
      expect(getByText(/no active jobs/i)).toBeTruthy();
    });
  });

  it('should handle pull to refresh', async () => {
    const { getByTestId } = render(
      <HomeScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    const scrollView = getByTestId('home-scroll-view');

    fireEvent(scrollView, 'onRefresh');

    await waitFor(() => {
      expect(JobService.getJobsByHomeowner).toHaveBeenCalledTimes(2);
    });
  });

  it('should display contractor view for contractors', async () => {
    const contractorUser = { ...mockUser, role: 'contractor' };
    (AuthService.getCurrentUser as jest.Mock).mockResolvedValue(contractorUser);

    const { getByText } = render(
      <HomeScreen navigation={mockNavigation} route={{ params: {} }} />
    );

    await waitFor(() => {
      expect(getByText(/find jobs/i)).toBeTruthy();
    });
  });
});
