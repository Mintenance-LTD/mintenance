import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Text, TouchableOpacity, View, TextInput } from 'react-native';
import { QueryClientProvider } from '@tanstack/react-query';

import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import { AuthService } from '../../services/AuthService';
import { BiometricService } from '../../services/BiometricService';
import { createTestQueryClient } from '../utils/test-utils';

// Mock all necessary services
jest.mock('../../services/AuthService', () => ({
  AuthService: {
    signUp: jest.fn(),
    signIn: jest.fn(),
    signOut: jest.fn(),
    getCurrentUser: jest.fn(),
    getCurrentSession: jest.fn(),
    restoreSessionFromBiometricTokens: jest.fn(),
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
    promptEnableBiometric: jest.fn(),
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
  measureAsyncPerformance: jest.fn(async (fn) => await fn()),
}));

jest.mock('../../utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

jest.mock('../../lib/queryClient', () => ({
  queryClient: {
    clear: jest.fn(),
  },
}));

jest.mock('../../services/OfflineManager', () => ({
  OfflineManager: {
    clearQueue: jest.fn(),
  },
}));

const mockAuthService = AuthService as jest.Mocked<typeof AuthService>;
const mockBiometricService = BiometricService as jest.Mocked<
  typeof BiometricService
>;

// Simplified Login Screen Component for Testing
const MockLoginScreen = () => {
  const { user, loading, signIn, signInWithBiometrics, signOut } = useAuth();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');

  const handleSignOut = React.useCallback(async () => {
    await signOut();
  }, [signOut]);

  if (loading) {
    return <Text testID='loading'>Loading...</Text>;
  }

  if (user) {
    return (
      <View testID='home-screen'>
        <Text testID='welcome-message'>Welcome, {user.first_name}!</Text>
      </View>
    );
  }

  const handleSignIn = async () => {
    try {
      await signIn(email, password);
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  const handleBiometricSignIn = async () => {
    try {
      await signInWithBiometrics();
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  return (
    <View testID='login-screen'>
      <Text>Sign In</Text>
      <TextInput
        testID='email-input'
        placeholder='Email'
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        testID='password-input'
        placeholder='Password'
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity testID='sign-in-button' onPress={handleSignIn}>
        <Text>Sign In</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='sign-up-link'>
        <Text>Don't have an account? Sign up</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='biometric-login-button'
        onPress={handleBiometricSignIn}
      >
        <Text>Sign in with biometrics</Text>
      </TouchableOpacity>
    </View>
  );
};

// Simplified Register Screen Component
const MockRegisterScreen = () => {
  const { signUp } = useAuth();
  const [formData, setFormData] = React.useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    role: 'homeowner' as 'homeowner' | 'contractor',
  });

  const handleSignUp = async () => {
    try {
      await signUp(formData.email, formData.password, {
        firstName: formData.firstName,
        lastName: formData.lastName,
        role: formData.role,
      });
    } catch (error) {
      // Error handling would show error message in real app
    }
  };

  return (
    <View testID='register-screen'>
      <Text>Create Account</Text>
      <TextInput
        testID='first-name-input'
        placeholder='First Name'
        value={formData.firstName}
        onChangeText={(text) =>
          setFormData((prev) => ({ ...prev, firstName: text }))
        }
      />
      <TextInput
        testID='last-name-input'
        placeholder='Last Name'
        value={formData.lastName}
        onChangeText={(text) =>
          setFormData((prev) => ({ ...prev, lastName: text }))
        }
      />
      <TextInput
        testID='email-input'
        placeholder='Email'
        value={formData.email}
        onChangeText={(text) =>
          setFormData((prev) => ({ ...prev, email: text }))
        }
      />
      <TextInput
        testID='password-input'
        placeholder='Password'
        value={formData.password}
        onChangeText={(text) =>
          setFormData((prev) => ({ ...prev, password: text }))
        }
        secureTextEntry
      />
      <TouchableOpacity
        testID='homeowner-role-button'
        onPress={() => setFormData((prev) => ({ ...prev, role: 'homeowner' }))}
      >
        <Text>I need help with home projects</Text>
      </TouchableOpacity>
      <TouchableOpacity
        testID='contractor-role-button'
        onPress={() => setFormData((prev) => ({ ...prev, role: 'contractor' }))}
      >
        <Text>I provide home services</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='create-account-button' onPress={handleSignUp}>
        <Text>Create Account</Text>
      </TouchableOpacity>
      <TouchableOpacity testID='sign-in-link'>
        <Text>Already have an account? Sign in</Text>
      </TouchableOpacity>
    </View>
  );
};

// Simple Navigator that switches between login and register
const MockNavigator = ({
  initialScreen = 'login',
}: {
  initialScreen?: string;
}) => {
  const [currentScreen, setCurrentScreen] = React.useState(initialScreen);
  const { user, signOut } = useAuth();

  const handleSignOut = React.useCallback(async () => {
    await signOut();
    setCurrentScreen('login');
  }, [signOut]);

  // Navigate to home if user is authenticated
  if (user) {
    return (
      <View testID="home-screen">
        <Text testID="welcome-message">Welcome, {user.first_name}!</Text>
        <TouchableOpacity testID="sign-out-button" onPress={handleSignOut}>
          <Text>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (currentScreen === 'register') {
    return <MockRegisterScreen />;
  }

  return <MockLoginScreen />;
};

const TestWrapper = ({ initialScreen }: { initialScreen?: string }) => (
  <QueryClientProvider client={createTestQueryClient()}>
    <AuthProvider>
      <MockNavigator initialScreen={initialScreen} />
    </AuthProvider>
  </QueryClientProvider>
);

describe('User Authentication Workflow Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Ensure these promises resolve immediately
    mockAuthService.getCurrentUser.mockImplementation(() => Promise.resolve(null));
    mockAuthService.getCurrentSession.mockImplementation(() => Promise.resolve(null));
    mockAuthService.restoreSessionFromBiometricTokens.mockImplementation(() =>
      Promise.resolve({ user: null, session: null })
    );
    mockBiometricService.isAvailable.mockImplementation(() => Promise.resolve(false));
    mockBiometricService.isBiometricEnabled.mockImplementation(() => Promise.resolve(false));
  });

  describe('User Registration Flow', () => {
    it('should complete the full user registration workflow', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'newuser@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Setup mocks for successful registration
      mockAuthService.getCurrentUser
        .mockResolvedValueOnce(null) // Initial load
        .mockResolvedValue(mockUser); // After registration

      mockAuthService.signUp.mockResolvedValue({
        user: mockUser,
        session: { access_token: 'token123', refresh_token: 'refresh123' },
      });

      const { getByTestId, queryByTestId } = render(
        <TestWrapper initialScreen='register' />
      );

      // Wait for initial loading to complete
      await act(async () => {
        await new Promise(resolve => setTimeout(resolve, 100)); // Let auth context initialize
      });

      await waitFor(
        () => {
          expect(queryByTestId('loading')).toBeNull();
        },
        { timeout: 3000 }
      );

      // Should show registration form
      expect(getByTestId('register-screen')).toBeTruthy();

      // Fill in registration form
      const firstNameInput = getByTestId('first-name-input');
      const lastNameInput = getByTestId('last-name-input');
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');

      await act(async () => {
        fireEvent.changeText(firstNameInput, 'John');
        fireEvent.changeText(lastNameInput, 'Doe');
        fireEvent.changeText(emailInput, 'newuser@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      // Select homeowner role
      const homeownerButton = getByTestId('homeowner-role-button');
      fireEvent.press(homeownerButton);

      // Submit registration
      const createAccountButton = getByTestId('create-account-button');
      await act(async () => {
        fireEvent.press(createAccountButton);
      });

      // Verify registration was called with correct data
      await waitFor(() => {
        expect(mockAuthService.signUp).toHaveBeenCalledWith({
          email: 'newuser@example.com',
          password: 'password123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'homeowner',
        });
      });

      // Should show home screen after successful registration
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('welcome-message')).toBeTruthy();
      });

      // Check welcome message content
      const welcomeMessage = getByTestId('welcome-message');
      const children = welcomeMessage.props.children;
      expect(Array.isArray(children)).toBe(true);
      expect(children).toEqual(['Welcome, ', 'John', '!']);
    });

    it('should handle registration validation errors gracefully', async () => {
      mockAuthService.signUp.mockRejectedValue(
        new Error('Email already exists')
      );

      const { getByTestId, queryByTestId } = render(
        <TestWrapper initialScreen='register' />
      );

      await waitFor(
        () => {
          expect(queryByTestId('loading')).toBeNull();
        },
        { timeout: 3000 }
      );

      // Fill in form with existing email
      const firstNameInput = getByTestId('first-name-input');
      const lastNameInput = getByTestId('last-name-input');
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');

      await act(async () => {
        fireEvent.changeText(firstNameInput, 'John');
        fireEvent.changeText(lastNameInput, 'Doe');
        fireEvent.changeText(emailInput, 'existing@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      const homeownerButton = getByTestId('homeowner-role-button');
      fireEvent.press(homeownerButton);

      const createAccountButton = getByTestId('create-account-button');
      await act(async () => {
        fireEvent.press(createAccountButton);
      });

      // Should remain on registration screen (error handling would show error message)
      expect(getByTestId('register-screen')).toBeTruthy();
      expect(queryByTestId('home-screen')).toBeNull();
    });
  });

  describe('User Login Flow', () => {
    it('should complete the full user login workflow', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Setup mocks for successful login
      mockAuthService.getCurrentUser
        .mockResolvedValueOnce(null) // Initial load
        .mockResolvedValue(mockUser); // After login

      mockAuthService.signIn.mockResolvedValue({
        user: mockUser,
        session: { access_token: 'token123', refresh_token: 'refresh123' },
      });

      const { getByTestId, queryByTestId, rerender } = render(<TestWrapper />);

      await waitFor(
        () => {
          expect(queryByTestId('loading')).toBeNull();
        },
        { timeout: 3000 }
      );

      // Should show login form
      expect(getByTestId('login-screen')).toBeTruthy();

      // Fill in login form
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');

      await act(async () => {
        fireEvent.changeText(emailInput, 'user@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      // Submit login
      const signInButton = getByTestId('sign-in-button');
      await act(async () => {
        fireEvent.press(signInButton);
      });

      // Verify login was called
      await waitFor(() => {
        expect(mockAuthService.signIn).toHaveBeenCalledWith(
          'user@example.com',
          'password123'
        );
      });

      // Should show home screen after successful login
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('welcome-message')).toBeTruthy();
      });

      // Check welcome message content
      const welcomeMessage = getByTestId('welcome-message');
      const children = welcomeMessage.props.children;
      expect(Array.isArray(children)).toBe(true);
      expect(children).toEqual(['Welcome, ', 'Jane', '!']);
    });

    it('should handle invalid login credentials', async () => {
      mockAuthService.signIn.mockRejectedValue(
        new Error('Invalid credentials')
      );

      const { getByTestId, queryByTestId } = render(<TestWrapper />);

      await waitFor(
        () => {
          expect(queryByTestId('loading')).toBeNull();
        },
        { timeout: 3000 }
      );

      // Fill in invalid credentials
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');

      await act(async () => {
        fireEvent.changeText(emailInput, 'user@example.com');
        fireEvent.changeText(passwordInput, 'wrongpassword');
      });

      const signInButton = getByTestId('sign-in-button');
      await act(async () => {
        fireEvent.press(signInButton);
      });

      // Should remain on login screen (error handling would show error message)
      expect(getByTestId('login-screen')).toBeTruthy();
      expect(queryByTestId('home-screen')).toBeNull();
    });
  });

  describe('Biometric Authentication Flow', () => {
    it('should offer biometric setup after successful login', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock biometric availability
      mockBiometricService.isAvailable.mockResolvedValue(true);
      mockBiometricService.isBiometricEnabled.mockResolvedValue(false);

      // Mock successful login
      mockAuthService.getCurrentUser
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockUser);

      mockAuthService.signIn.mockResolvedValue({
        user: mockUser,
        session: { access_token: 'token123', refresh_token: 'refresh123' },
      });

      const { getByTestId, queryByTestId } = render(<TestWrapper />);

      await waitFor(
        () => {
          expect(queryByTestId('loading')).toBeNull();
        },
        { timeout: 3000 }
      );

      // Complete login
      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');

      await act(async () => {
        fireEvent.changeText(emailInput, 'user@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      const signInButton = getByTestId('sign-in-button');
      await act(async () => {
        fireEvent.press(signInButton);
      });

      // Should navigate to home screen
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // Should have triggered biometric setup prompt (via setTimeout in AuthContext)
      expect(mockBiometricService.isAvailable).toHaveBeenCalled();
      expect(mockBiometricService.isBiometricEnabled).toHaveBeenCalled();
    });

    it('should authenticate with biometrics when available', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'Jane',
        last_name: 'Smith',
        role: 'contractor' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock biometric authentication
      mockBiometricService.isAvailable.mockResolvedValue(true);
      mockBiometricService.isBiometricEnabled.mockResolvedValue(true);
      mockBiometricService.authenticate.mockResolvedValue({
        email: 'user@example.com',
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      });

      mockAuthService.restoreSessionFromBiometricTokens.mockResolvedValue({
        user: mockUser,
        session: { access_token: 'token123', refresh_token: 'refresh123' },
      });

      // Mock a fallback current user fetch if needed
      mockAuthService.getCurrentUser
        .mockResolvedValueOnce(null)
        .mockResolvedValue(mockUser);

      mockAuthService.getCurrentSession.mockResolvedValue({
        user: mockUser,
        access_token: 'token123',
        refresh_token: 'refresh123',
      });

      const { getByTestId, queryByTestId } = render(<TestWrapper />);

      await waitFor(
        () => {
          expect(queryByTestId('loading')).toBeNull();
        },
        { timeout: 3000 }
      );

      // Should show biometric login button when available
      expect(getByTestId('biometric-login-button')).toBeTruthy();

      // Click biometric login button
      const biometricButton = getByTestId('biometric-login-button');
      await act(async () => {
        fireEvent.press(biometricButton);
      });

      // Should authenticate with biometrics
      await waitFor(() => {
        expect(mockBiometricService.authenticate).toHaveBeenCalled();
      });

      // Should navigate to home screen
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('welcome-message')).toBeTruthy();
      });
    });
  });

    it('allows biometric sign-in after signing out', async () => {
      const mockUser = {
        id: 'user-456',
        email: 'biometric@example.com',
        first_name: 'Biometric',
        last_name: 'User',
        role: 'homeowner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Initial sign-in setup
      mockBiometricService.isAvailable.mockResolvedValue(true);
      mockBiometricService.isBiometricEnabled.mockResolvedValue(true);
      mockAuthService.signIn.mockResolvedValue({
        user: mockUser,
        session: { access_token: 'token-login', refresh_token: 'refresh-login' },
      });
      mockAuthService.getCurrentSession.mockResolvedValue({
        user: mockUser,
        access_token: 'token-login',
        refresh_token: 'refresh-login',
      });

      const { getByTestId, queryByTestId } = render(<TestWrapper />);

      await waitFor(() => {
        expect(queryByTestId('loading')).toBeNull();
      });

      const emailInput = getByTestId('email-input');
      const passwordInput = getByTestId('password-input');
      await act(async () => {
        fireEvent.changeText(emailInput, 'biometric@example.com');
        fireEvent.changeText(passwordInput, 'password123');
      });

      const signInButton = getByTestId('sign-in-button');
      await act(async () => {
        fireEvent.press(signInButton);
      });

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });

      // Sign out
      mockAuthService.signOut.mockResolvedValue(undefined);
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      mockAuthService.getCurrentSession.mockResolvedValue(null);
      await act(async () => {
        fireEvent.press(getByTestId('sign-out-button'));
        await Promise.resolve();
      });

      await waitFor(() => {
        expect(mockAuthService.signOut).toHaveBeenCalled();
      });

      await waitFor(() => {
        expect(queryByTestId('login-screen')).toBeTruthy();
      });

      // Biometric sign-in after logout



      mockBiometricService.authenticate.mockResolvedValue({
        email: 'biometric@example.com',
        accessToken: 'access-after-logout',
        refreshToken: 'refresh-after-logout',
      });
      mockAuthService.restoreSessionFromBiometricTokens.mockResolvedValue({
        user: mockUser,
        session: {
          access_token: 'access-after-logout',
          refresh_token: 'refresh-after-logout',
        },
      });
      mockAuthService.getCurrentSession.mockResolvedValue({
        user: mockUser,
        access_token: 'access-after-logout',
        refresh_token: 'refresh-after-logout',
      });

      const biometricButton = getByTestId('biometric-login-button');
      await act(async () => {
        fireEvent.press(biometricButton);
      });

      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
      });
    });



  describe('Session Management', () => {
    it('should maintain user session across app launches', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'user@example.com',
        first_name: 'John',
        last_name: 'Doe',
        role: 'homeowner' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      // Mock existing session
      mockAuthService.getCurrentUser.mockResolvedValue(mockUser);
      mockAuthService.getCurrentSession.mockResolvedValue({
        user: mockUser,
        access_token: 'token123',
        refresh_token: 'refresh123',
      });

      const { getByTestId, queryByTestId } = render(<TestWrapper />);

      // Should skip login and go directly to home
      await waitFor(() => {
        expect(getByTestId('home-screen')).toBeTruthy();
        expect(getByTestId('welcome-message')).toBeTruthy();
      });

      // Should not show login screen
      expect(queryByTestId('login-screen')).toBeNull();

      // Check welcome message content
      const welcomeMessage = getByTestId('welcome-message');
      const children = welcomeMessage.props.children;
      expect(Array.isArray(children)).toBe(true);
      expect(children).toEqual(['Welcome, ', 'John', '!']);
    });

    it('should handle session expiry gracefully', async () => {
      // Mock expired session
      mockAuthService.getCurrentUser.mockResolvedValue(null);
      mockAuthService.getCurrentSession.mockResolvedValue(null);

      const { getByTestId, queryByTestId } = render(<TestWrapper />);

      // Should show login screen
      await waitFor(() => {
        expect(getByTestId('login-screen')).toBeTruthy();
      });

      // Should not show home screen
      expect(queryByTestId('home-screen')).toBeNull();
    });
  });
});
