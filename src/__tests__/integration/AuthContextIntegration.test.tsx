import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, View } from 'react-native';

import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/AuthService';
import { BiometricService } from '../../services/BiometricService';

// Mock services
jest.mock('../../services/AuthService', () => ({
  AuthService: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    getCurrentSession: jest.fn(),
    resetPassword: jest.fn(),
    validateToken: jest.fn(),
  },
}));

jest.mock('../../services/BiometricService', () => ({
  BiometricService: {
    isAvailable: jest.fn(() => Promise.resolve(false)),
    isBiometricEnabled: jest.fn(() => Promise.resolve(false)),
    authenticate: jest.fn(),
    enableBiometric: jest.fn(),
    disableBiometric: jest.fn(),
  },
}));

jest.mock('../../services/NotificationService', () => ({
  NotificationService: {
    requestPermissions: jest.fn(() => Promise.resolve(true)),
    registerForPushNotifications: jest.fn(),
    initialize: jest.fn(() => Promise.resolve('mock-token')),
    savePushToken: jest.fn(),
  },
}));

jest.mock('../../utils/errorHandler', () => ({
  handleError: jest.fn(),
}));

jest.mock('../../config/sentry', () => ({
  setUserContext: jest.fn(),
  trackUserAction: jest.fn(),
  addBreadcrumb: jest.fn(),
  measureAsyncPerformance: jest.fn((fn) => fn()),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockBiometricService = BiometricService as jest.Mocked<typeof BiometricService>;

// Test component that uses AuthContext
const TestAuthComponent = () => {
  const { user, loading, signIn, signUp, signOut } = useAuth();

  if (loading) {
    return <Text testID="loading">Loading...</Text>;
  }

  if (user) {
    return (
      <View>
        <Text testID="user-info">Welcome, {user.first_name}!</Text>
        <TouchableOpacity testID="sign-out-button" onPress={signOut}>
          <Text>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View>
      <TouchableOpacity
        testID="sign-in-button"
        onPress={() => signIn('test@example.com', 'password123')}
      >
        <Text>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID="sign-up-button"
        onPress={() => signUp('test@example.com', 'password123', {
          firstName: 'Test',
          lastName: 'User',
          role: 'homeowner'
        })}
      >
        <Text>Sign Up</Text>
      </TouchableOpacity>
    </View>
  );
};

const TestWrapper = () => (
  <AuthProvider>
    <TestAuthComponent />
  </AuthProvider>
);

describe('Auth Context Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuthService.getCurrentUser.mockResolvedValue(null);
    mockAuthService.getCurrentSession.mockResolvedValue(null);
  });

  it('should show loading state initially', async () => {
    // Use a delayed promise to control loading state timing
    let resolveGetCurrentUser: (value: null) => void;
    const getCurrentUserPromise = new Promise<null>((resolve) => {
      resolveGetCurrentUser = resolve;
    });
    mockAuthService.getCurrentUser.mockReturnValue(getCurrentUserPromise);

    const { getByTestId, queryByTestId } = render(<TestWrapper />);

    // Should show loading initially
    expect(getByTestId('loading')).toBeTruthy();

    // Resolve the getCurrentUser promise
    resolveGetCurrentUser!(null);

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId('loading')).toBeNull();
    });
  });

  it('should handle successful sign in', async () => {
    // Start with no user, then set user after sign in
    mockAuthService.getCurrentUser
      .mockResolvedValueOnce(null) // Initial call
      .mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'homeowner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'homeowner' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockAuthService.signIn.mockResolvedValue({
      user: mockUser,
      session: { access_token: 'token123' },
    });

    const { getByTestId, queryByTestId } = render(<TestWrapper />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId('loading')).toBeNull();
    });

    // Should show sign in button initially
    expect(getByTestId('sign-in-button')).toBeTruthy();

    // Click sign in button
    const signInButton = getByTestId('sign-in-button');
    await act(async () => {
      fireEvent.press(signInButton);
    });

    // Verify sign in was called
    expect(mockAuthService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');

    // Should show user info after successful sign in
    await waitFor(() => {
      expect(getByTestId('user-info')).toBeTruthy();
    });

    // Check the welcome text content (React renders as array: ["Welcome, ", "Test", "!"])
    const userInfo = getByTestId('user-info');
    const children = userInfo.props.children;
    expect(Array.isArray(children)).toBe(true);
    expect(children).toEqual(['Welcome, ', 'Test', '!']);
  });

  it('should handle successful sign up', async () => {
    // Start with no user, then set user after sign up
    mockAuthService.getCurrentUser
      .mockResolvedValueOnce(null) // Initial call
      .mockResolvedValue({
        id: 'user-456',
        email: 'test@example.com',
        first_name: 'Test',
        last_name: 'User',
        role: 'homeowner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

    const mockUser = {
      id: 'user-456',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'homeowner' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockAuthService.signUp.mockResolvedValue({
      user: mockUser,
      session: { access_token: 'token123' },
    });

    const { getByTestId, queryByTestId } = render(<TestWrapper />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(queryByTestId('loading')).toBeNull();
    });

    // Should show sign up button initially
    expect(getByTestId('sign-up-button')).toBeTruthy();

    // Click sign up button
    const signUpButton = getByTestId('sign-up-button');
    await act(async () => {
      fireEvent.press(signUpButton);
    });

    // Verify sign up was called with correct data
    expect(mockAuthService.signUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password123',
      firstName: 'Test',
      lastName: 'User',
      role: 'homeowner',
    });

    // Should show user info after successful sign up
    await waitFor(() => {
      expect(getByTestId('user-info')).toBeTruthy();
    });

    // Check the welcome text content (React renders as array: ["Welcome, ", "Test", "!"])
    const userInfo = getByTestId('user-info');
    const children = userInfo.props.children;
    expect(Array.isArray(children)).toBe(true);
    expect(children).toEqual(['Welcome, ', 'Test', '!']);
  });

  it('should handle sign out', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      first_name: 'Test',
      last_name: 'User',
      role: 'homeowner' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Start with authenticated user
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    mockAuthService.getCurrentSession.mockResolvedValue({
      user: mockUser,
      access_token: 'token123',
    });
    mockAuthService.signOut.mockResolvedValue();

    const { getByTestId, queryByTestId } = render(<TestWrapper />);

    // Wait for loading to complete and user to be loaded
    await waitFor(() => {
      expect(queryByTestId('loading')).toBeNull();
      expect(getByTestId('user-info')).toBeTruthy();
    });

    // Click sign out button
    const signOutButton = getByTestId('sign-out-button');
    await act(async () => {
      fireEvent.press(signOutButton);
    });

    // Verify sign out was called
    expect(mockAuthService.signOut).toHaveBeenCalled();

    // Should show sign in/up buttons after sign out
    await waitFor(() => {
      expect(queryByTestId('user-info')).toBeNull();
      expect(getByTestId('sign-in-button')).toBeTruthy();
      expect(getByTestId('sign-up-button')).toBeTruthy();
    });
  });

  it('should handle existing session on app start', async () => {
    const mockUser = {
      id: 'user-123',
      email: 'existing@example.com',
      first_name: 'Existing',
      last_name: 'User',
      role: 'contractor' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Mock to return existing user from the start
    mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
    mockAuthService.getCurrentSession.mockResolvedValue({
      user: mockUser,
      access_token: 'existing-token',
    });

    const { getByTestId, queryByTestId } = render(<TestWrapper />);

    // Should show loading initially
    expect(getByTestId('loading')).toBeTruthy();

    // Should load existing user and skip to authenticated state
    await waitFor(() => {
      expect(queryByTestId('loading')).toBeNull();
      expect(getByTestId('user-info')).toBeTruthy();
    });

    // Check the welcome text content (React renders as array: ["Welcome, ", "Existing", "!"])
    const userInfo = getByTestId('user-info');
    const children = userInfo.props.children;
    expect(Array.isArray(children)).toBe(true);
    expect(children).toEqual(['Welcome, ', 'Existing', '!']);
  });
});