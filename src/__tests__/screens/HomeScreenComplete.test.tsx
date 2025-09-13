import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';
import { useAuth } from '../../contexts/AuthContext';
import { JobService } from '../../services/JobService';
import { UserService } from '../../services/UserService';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/JobService');
jest.mock('../../services/UserService');
// Use global navigation mock from jest-setup.js

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockJobService = JobService as jest.Mocked<typeof JobService>;
const mockUserService = UserService as jest.Mocked<typeof UserService>;
const mockNavigate = jest.fn();

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'test@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithBiometrics: jest.fn(),
      isBiometricAvailable: jest.fn(),
      isBiometricEnabled: jest.fn(),
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
    });
  });

  it('renders homeowner dashboard correctly', async () => {
    const mockJobs = [
      {
        id: 'job-1',
        title: 'Fix leaky faucet',
        description: 'Kitchen faucet is leaking',
        location: 'San Francisco, CA',
        homeowner_id: 'homeowner-1',
        budget: 150,
        status: 'posted',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    mockJobService.getUserJobs.mockResolvedValue(mockJobs);

    const { getByText, getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Welcome back, John!')).toBeTruthy();
      expect(getByText('Your Recent Jobs')).toBeTruthy();
      expect(getByText('Fix leaky faucet')).toBeTruthy();
    });
  });

  it('renders contractor dashboard correctly', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user-1',
        email: 'contractor@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithBiometrics: jest.fn(),
      isBiometricAvailable: false,
      isBiometricEnabled: false,
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
    });

    const mockStats = {
      totalJobs: 15,
      completedJobs: 12,
      activeJobs: 2,
      rating: 4.8,
      totalEarnings: 2500,
      monthlyEarnings: 800,
      totalJobsCompleted: 12,
      responseTime: 2.5,
      successRate: 95,
      todaysAppointments: 3,
    };

    mockUserService.getContractorStats.mockResolvedValue(mockStats);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Welcome back, Jane!')).toBeTruthy();
      expect(getByText('Your Stats')).toBeTruthy();
      expect(getByText('15')).toBeTruthy(); // Total jobs
      expect(getByText('4.8')).toBeTruthy(); // Rating
    });
  });

  it('handles loading state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      signInWithBiometrics: jest.fn(),
      isBiometricAvailable: false,
      isBiometricEnabled: false,
      enableBiometric: jest.fn(),
      disableBiometric: jest.fn(),
    });

    const { getByTestId } = render(<HomeScreen />);
    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('handles error state', async () => {
    mockUserService.getPreviousContractors.mockRejectedValue(
      new Error('Failed to load dashboard data')
    );

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('Failed to load dashboard data')).toBeTruthy();
    });
  });

  it('navigates to post job screen', () => {
    const { getByText } = render(<HomeScreen />);

    fireEvent.press(getByText('Post a Job'));

    expect(jest.requireMock('@react-navigation/native').useNavigation().navigate).toHaveBeenCalledWith('PostJob');
  });

  it('navigates to find contractors screen', () => {
    const { getByText } = render(<HomeScreen />);

    fireEvent.press(getByText('Find Contractors'));

    expect(jest.requireMock('@react-navigation/native').useNavigation().navigate).toHaveBeenCalledWith('FindContractors');
  });

  it('refreshes data on pull to refresh', async () => {
    const mockJobs = [];
    mockJobService.getUserJobs.mockResolvedValue(mockJobs);

    const { getByTestId } = render(<HomeScreen />);

    const scrollView = getByTestId('home-scroll-view');
    fireEvent(scrollView, 'refresh');

    await waitFor(() => {
      expect(mockJobService.getUserJobs).toHaveBeenCalledTimes(2); // Initial load + refresh
    });
  });

  it('shows empty state when no jobs', async () => {
    mockJobService.getUserJobs.mockResolvedValue([]);

    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText('No jobs posted yet')).toBeTruthy();
      expect(getByText('Post your first job to get started!')).toBeTruthy();
    });
  });
});
