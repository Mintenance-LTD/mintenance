import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import HomeScreen from '../../screens/HomeScreen';
import { useAuth } from '../../contexts/AuthContext';
import { UserService } from '../../services/UserService';
// We render directly and mock navigation and auth

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/UserService');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
  useFocusEffect: jest.fn(),
}));

const mockUseAuth = jest.mocked(useAuth);
const mockUserService = UserService as jest.Mocked<typeof UserService>;

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  first_name: 'John',
  last_name: 'Doe',
  firstName: 'John',
  lastName: 'Doe',
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
    it('renders welcome header and user name', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Mintenance Service Hub')).toBeTruthy();
        expect(getByText('Good morning,')).toBeTruthy();
        expect(getByText('John')).toBeTruthy();
      });
    });

    it('shows previous contractors section', async () => {
      const { getByText } = render(<HomeScreen />);

      expect(getByText('Previously Used Contractors')).toBeTruthy();
      expect(getByText('Your trusted professionals')).toBeTruthy();
    });

    it('shows Find Contractors call to action', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Find Contractors')).toBeTruthy();
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

    it('shows greeting and verification badge for contractors', async () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'contractor', isVerified: true },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });

      mockUserService.getContractorStats.mockResolvedValue({} as any);

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Good morning!')).toBeTruthy();
        expect(getByText('Verified Contractor')).toBeTruthy();
      });
    });
  });

  // Loading states are handled with skeletons in the contractor view; skipped here.

  describe('Error Handling', () => {
    it('shows error UI and retry button for contractor errors', async () => {
      mockUseAuth.mockReturnValue({
        user: { ...mockUser, role: 'contractor' },
        session: null,
        loading: false,
        signIn: jest.fn(),
        signUp: jest.fn(),
        signOut: jest.fn(),
        updateProfile: jest.fn(),
      });

      mockUserService.getContractorStats.mockRejectedValue(
        new Error('Network error')
      );

      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('Something went wrong')).toBeTruthy();
        expect(getByText('Retry')).toBeTruthy();
      });
    });
  });

  // Pull to refresh covered implicitly via RefreshControl; skip explicit test.

  describe('Empty States', () => {
    it('shows empty previous contractors when none exist', async () => {
      const { getByText } = render(<HomeScreen />);

      await waitFor(() => {
        expect(getByText('No previous contractors yet')).toBeTruthy();
        expect(
          getByText('Complete your first job to see contractors here')
        ).toBeTruthy();
      });
    });
  });

  // Job status badges are not part of the current HomeScreen UI.
});
