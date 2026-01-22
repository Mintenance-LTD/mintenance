import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '../test-utils';
import ProfileScreen from '../../../screens/ProfileScreen';
import { JobService } from '../../../services/JobService';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));

const mockSignOut = jest.fn();

jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'user_123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      role: 'homeowner',
      createdAt: '2024-01-01',
    },
    signOut: mockSignOut,
  }),
}));

jest.mock('../../../services/JobService', () => ({
  JobService: {
    getJobsByHomeowner: jest.fn(),
  },
}));

describe('ProfileScreen Integration - Comprehensive', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    JobService.getJobsByHomeowner.mockResolvedValue([]);
  });

  it('renders user profile information', async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText('John Doe')).toBeTruthy();
      expect(getByText('john@example.com')).toBeTruthy();
    });
  });

  it('triggers sign out confirmation', async () => {
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});

    const { getByText } = render(<ProfileScreen />);

    fireEvent.press(getByText(/sign out/i));

    expect(alertSpy).toHaveBeenCalledWith(
      'Sign Out',
      'Are you sure you want to sign out?',
      expect.any(Array)
    );
  });
});
