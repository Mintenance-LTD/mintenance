import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';
import { useAuth } from '../../contexts/AuthContext';
import { JobService } from '../../services/JobService';
import { renderWithProviders } from '../utils/renderWithProviders';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/JobService');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockJobService = JobService as jest.Mocked<typeof JobService>;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  role: 'homeowner' as const,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const mockJobs = [
  {
    id: 'job-1',
    title: 'Kitchen Faucet Repair',
    description: 'Leaky kitchen faucet needs professional repair',
    location: '123 Main Street, Anytown',
    budget: 150,
    status: 'posted' as const,
    category: 'Plumbing',
    homeowner_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'job-2',
    title: 'Electrical Outlet Installation',
    description: 'Install new electrical outlet in living room',
    location: '456 Oak Street, Somewhere',
    budget: 200,
    status: 'assigned' as const,
    category: 'Electrical',
    homeowner_id: 'user-1',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

describe('HomeScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  describe('Homeowner View', () => {
    it('renders welcome message with user name', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue(mockJobs);

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('Welcome back, John!')).toBeTruthy();
      });
    });

    it('shows post job button for homeowners', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue([]);

      const { getByTestId } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByTestId('post-job-button')).toBeTruthy();
      });
    });

    it('displays recent jobs section', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue(mockJobs);

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('Your Recent Jobs')).toBeTruthy();
        expect(getByText('Kitchen Faucet Repair')).toBeTruthy();
        expect(getByText('Electrical Outlet Installation')).toBeTruthy();
      });
    });

    it('shows quick actions section', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue([]);

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('Quick Actions')).toBeTruthy();
        expect(getByText('Post New Job')).toBeTruthy();
        expect(getByText('View All Jobs')).toBeTruthy();
      });
    });

    it('handles post job button press', async () => {
      const mockNavigate = jest.fn();
      jest
        .mocked(require('@react-navigation/native').useNavigation)
        .mockReturnValue({
          navigate: mockNavigate,
          goBack: jest.fn(),
        });

      mockJobService.getJobsByHomeowner.mockResolvedValue([]);

      const { getByTestId } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        fireEvent.press(getByTestId('post-job-button'));
        expect(mockNavigate).toHaveBeenCalledWith('PostJob');
      });
    });
  });

  describe('Contractor View', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'contractor' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });
    });

    it('shows browse jobs button for contractors', async () => {
      mockJobService.getJobs.mockResolvedValue(mockJobs);

      const { getByTestId } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByTestId('browse-jobs-button')).toBeTruthy();
      });
    });

    it('displays available jobs section', async () => {
      mockJobService.getJobs.mockResolvedValue(mockJobs);

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('Available Jobs')).toBeTruthy();
        expect(getByText('Kitchen Faucet Repair')).toBeTruthy();
      });
    });

    it('shows contractor-specific quick actions', async () => {
      mockJobService.getJobs.mockResolvedValue([]);

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('Find Jobs')).toBeTruthy();
        expect(getByText('My Bids')).toBeTruthy();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator while fetching data', () => {
      mockUseAuth.mockReturnValue({
        user: mockUser,
        session: null,
        loading: true,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });

      const { getByTestId } = render(<HomeScreen />);

      expect(getByTestId('loading-indicator')).toBeTruthy();
    });

    it('shows skeleton loading for jobs', async () => {
      // Mock delayed response
      mockJobService.getJobsByHomeowner.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100))
      );

      const { getByTestId } = render(<HomeScreen />);

      expect(getByTestId('jobs-skeleton')).toBeTruthy();

      await waitFor(() => {
        expect(() => getByTestId('jobs-skeleton')).toThrow();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles job loading errors gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      mockJobService.getJobsByHomeowner.mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('Unable to load jobs')).toBeTruthy();
      });

      consoleSpy.mockRestore();
    });

    it('shows retry button on error', async () => {
      mockJobService.getJobsByHomeowner.mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Retry')).toBeTruthy();
      });
    });

    it('retries loading on retry button press', async () => {
      mockJobService.getJobsByHomeowner
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockJobs);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        fireEvent.press(getByText('Retry'));
      });

      await waitFor(() => {
        expect(getByText('Kitchen Faucet Repair')).toBeTruthy();
      });
    });
  });

  describe('Pull to Refresh', () => {
    it('refreshes data when pulled down', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue(mockJobs);

      const { getByTestId } = renderWithProviders(<HomeScreen />, render);

      const scrollView = getByTestId('home-scroll-view');
      fireEvent(scrollView, 'refresh');

      await waitFor(() => {
        expect(mockJobService.getJobsByHomeowner).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Empty States', () => {
    it('shows empty state for homeowners with no jobs', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue([]);

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('No jobs posted yet')).toBeTruthy();
        expect(
          getByText('Get started by posting your first maintenance job!')
        ).toBeTruthy();
      });
    });

    it('shows empty state for contractors with no available jobs', async () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'contractor' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });

      mockJobService.getJobs.mockResolvedValue([]);

      const { getByText } = renderWithProviders(<HomeScreen />, render);

      await waitFor(() => {
        expect(getByText('No jobs available')).toBeTruthy();
        expect(
          getByText('Check back later for new opportunities!')
        ).toBeTruthy();
      });
    });
  });

  describe('Job Status Display', () => {
    it('shows correct status badges for different job statuses', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue(mockJobs);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('POSTED')).toBeTruthy();
        expect(getByText('ASSIGNED')).toBeTruthy();
      });
    });

    it('applies correct styling for different statuses', async () => {
      mockJobService.getJobsByHomeowner.mockResolvedValue(mockJobs);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        const postedBadge = getByText('POSTED');
        const assignedBadge = getByText('ASSIGNED');

        expect(postedBadge.props.style).toEqual(
          expect.objectContaining({ backgroundColor: expect.any(String) })
        );
        expect(assignedBadge.props.style).toEqual(
          expect.objectContaining({ backgroundColor: expect.any(String) })
        );
      });
    });
  });
});
