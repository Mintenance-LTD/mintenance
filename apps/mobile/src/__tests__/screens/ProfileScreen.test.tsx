import React from 'react';
import { act } from '@testing-library/react-native';
import { render, fireEvent, waitFor } from '../test-utils';
import { Alert, Linking } from 'react-native';
import ProfileScreen from '../../screens/ProfileScreen';
import { useAuth } from '../../contexts/AuthContext';
import { JobService } from '../../services/JobService';
import { useNavigation } from '@react-navigation/native';

// Mock dependencies
jest.mock('../../contexts/AuthContext');
jest.mock('../../services/JobService', () => ({
  JobService: {
    getJobsByHomeowner: jest.fn(),
    getJobsByUser: jest.fn(),
    getUserJobs: jest.fn(),
  },
}));
jest.mock('@react-navigation/native');

jest.mock('../../config/legal', () => ({
  TERMS_URL: 'https://example.com/terms',
  PRIVACY_URL: 'https://example.com/privacy',
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  setOptions: jest.fn(),
};

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockUseNavigation = useNavigation as jest.MockedFunction<typeof useNavigation>;
const mockJobService = JobService as jest.Mocked<typeof JobService>;

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseNavigation.mockReturnValue(mockNavigation as any);

    // Default auth context mock
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    // Mock job service responses
    mockJobService.getJobsByHomeowner.mockResolvedValue([
      {
        id: 'job1',
        title: 'Kitchen Renovation',
        description: 'Complete kitchen remodel',
        homeownerId: 'user123',
        status: 'completed',
        budget: 15000,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
        skills: ['plumbing', 'electrical'],
        urgency: 'medium',
        photos: [],
      },
      {
        id: 'job2',
        title: 'Bathroom Repair',
        description: 'Fix leaky faucet',
        homeownerId: 'user123',
        status: 'in_progress',
        budget: 500,
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
        },
        createdAt: '2024-02-01T00:00:00.000Z',
        updatedAt: '2024-02-01T00:00:00.000Z',
        skills: ['plumbing'],
        urgency: 'high',
        photos: [],
      },
    ]);
  });

  it('should render profile screen with user information', async () => {
    const { getByText, getByTestId } = render(<ProfileScreen />);

    expect(getByText('John Doe')).toBeTruthy();
    expect(getByText('test@example.com')).toBeTruthy();
    expect(getByText('Account')).toBeTruthy();
  });

  it('should display user stats for homeowner', async () => {
    const { getAllByText, getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('2')).toBeTruthy(); // Total jobs
      expect(getAllByText('1').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('should handle contractor role', async () => {
    mockUseAuth.mockReturnValue({
      user: {
        id: 'contractor123',
        email: 'contractor@example.com',
        firstName: 'Jane',
        lastName: 'Smith',
        role: 'contractor',
        phone: '555-5678',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    const { getAllByText, getByText } = render(<ProfileScreen />);

    expect(getByText('Jane Smith')).toBeTruthy();
    expect(getByText('contractor@example.com')).toBeTruthy();
  });

  it('should navigate to edit profile when edit button is pressed', () => {
    const { getAllByText, getByText } = render(<ProfileScreen />);

    const editButton = getByText('Edit Profile');
    act(() => fireEvent.press(editButton));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('EditProfile');
  });

  it('should handle sign out with confirmation', async () => {
    const mockSignOut = jest.fn();
    mockUseAuth.mockReturnValue({
      user: {
        id: 'user123',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
        phone: '555-1234',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      signOut: mockSignOut,
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    const { getAllByText, getByText } = render(<ProfileScreen />);

    const signOutButton = getByText('Sign Out');
    act(() => fireEvent.press(signOutButton));

    expect(Alert.alert).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.arrayContaining([
        expect.objectContaining({ text: 'Cancel' }),
        expect.objectContaining({ text: 'Sign Out' }),
      ])
    );

    // Simulate pressing the "Sign Out" button in the alert
    const alertCalls = (Alert.alert as jest.Mock).mock.calls;
    const signOutCall = alertCalls[0];
    const signOutAction = signOutCall[2][1]; // Second button (Sign Out)
    signOutAction.onPress();

    expect(mockSignOut).toHaveBeenCalled();
  });

  it('should open terms and conditions', async () => {
    const { getAllByText, getByText } = render(<ProfileScreen />);

    const termsButton = getByText('Terms of Service');
    act(() => fireEvent.press(termsButton));

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/terms');
  });

  it('should open privacy policy', async () => {
    const { getAllByText, getByText } = render(<ProfileScreen />);

    const privacyButton = getByText('Privacy Policy');
    act(() => fireEvent.press(privacyButton));

    expect(Linking.openURL).toHaveBeenCalledWith('https://example.com/privacy');
  });

  it('should handle job service errors gracefully', async () => {
    mockJobService.getJobsByHomeowner.mockRejectedValue(new Error('Service error'));

    const { getAllByText, getByText } = render(<ProfileScreen />);

    // Should still render the profile without crashing
    expect(getByText('John Doe')).toBeTruthy();

    // Stats should show default values when error occurs
    await waitFor(() => {
      expect(getAllByText('0').length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should handle user without stats', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      signOut: jest.fn(),
      signIn: jest.fn(),
      signUp: jest.fn(),
      loading: false,
      session: null,
    });

    const { getByText } = render(<ProfileScreen />);

    // Should handle null user gracefully
    expect(getByText('Account')).toBeTruthy();
  });

  it('should navigate to notification settings', () => {
    const { getByText } = render(<ProfileScreen />);

    const notificationButton = getByText('Notifications');
    act(() => fireEvent.press(notificationButton));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('NotificationSettings');
  });

  it('should navigate to payment methods', () => {
    const { getByText } = render(<ProfileScreen />);

    const paymentButton = getByText('Payment Methods');
    act(() => fireEvent.press(paymentButton));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('PaymentMethods');
  });

  it('should navigate to help center', () => {
    const { getByText } = render(<ProfileScreen />);

    const helpButton = getByText('Help Center');
    act(() => fireEvent.press(helpButton));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('HelpCenter');
  });

  it('should display correct join date format', async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText(/Since/i)).toBeTruthy();
    });
  });

  it('should show loading state initially', () => {
    mockJobService.getJobsByHomeowner.mockImplementation(
      () => new Promise(() => {}) // Never resolves to test loading state
    );

    const { getByText } = render(<ProfileScreen />);

    // Profile info should still be visible during loading
    expect(getByText('John Doe')).toBeTruthy();
  });

  it('should handle stats calculation correctly', async () => {
    const jobs = [
      { status: 'completed' },
      { status: 'completed' },
      { status: 'in_progress' },
      { status: 'assigned' },
      { status: 'posted' },
    ];

    mockJobService.getJobsByHomeowner.mockResolvedValue(jobs as any);

    const { getByText, getAllByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('5')).toBeTruthy(); // Total jobs
      expect(getAllByText('2').length).toBeGreaterThanOrEqual(2);
    });
  });
});
