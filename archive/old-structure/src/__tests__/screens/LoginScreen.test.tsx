import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import LoginScreen from '../../screens/LoginScreen';
import { useAuth } from '../../contexts/AuthContext';
import { NavigationMockFactory } from '../../test-utils/navigationMockFactory';
import { AuthMockFactory } from '../../test-utils/authMockFactory';

// Mock dependencies
jest.mock('../../contexts/AuthContext');

// Mock haptics
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    formSubmit: jest.fn(),
    loginSuccess: jest.fn(),
    loginFailed: jest.fn(),
    error: jest.fn(),
  }),
}));

// Mock i18n
jest.mock('../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: jest.fn((key, fallback) => fallback || key),
    auth: {
      email: () => 'Email',
      password: () => 'Password',
      login: () => 'Log In',
      loggingIn: () => 'Logging in...',
      forgotPassword: () => 'Forgot Password?',
      signUp: () => 'Sign Up',
      register: () => 'Sign Up',
    },
    common: {
      error: () => 'Error',
    },
    getErrorMessage: jest.fn((key, message) => message || 'An error occurred'),
  }),
}));

// Mock accessible text hook
jest.mock('../../hooks/useAccessibleText', () => ({
  useAccessibleText: () => ({
    textStyle: {},
  }),
}));


// Create navigation mock using factory
const mockNavigation = NavigationMockFactory.createAuthNavigationMock();

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => mockNavigation,
  NavigationContainer: ({ children }: any) => children,
  useFocusEffect: jest.fn(),
}));

const mockUseAuth = jest.mocked(useAuth);

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockUseAuth.mockReturnValue(AuthMockFactory.createCompleteAuthMock());
  });

  it('renders login form correctly', () => {
    const { getByTestId, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByText('Log In')).toBeTruthy();
    expect(getByText('Sign Up')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByTestId, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    // Test empty fields
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(getByText('Please fill in all fields')).toBeTruthy();
    });
  });

  it('validates password is required', async () => {
    const { getByTestId, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    // Leave password empty
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(getByText('Please fill in all fields')).toBeTruthy();
    });
  });

  it('calls signIn when form is valid', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({});
    mockUseAuth.mockReturnValue(AuthMockFactory.createCompleteAuthMock({
      signIn: mockSignIn,
    }));

    const { getByTestId, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  it('shows loading state during sign in', () => {
    mockUseAuth.mockReturnValue(AuthMockFactory.createLoadingState());

    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('displays error message on sign in failure', async () => {
    const mockSignIn = jest
      .fn()
      .mockRejectedValue(new Error('Invalid credentials'));
    mockUseAuth.mockReturnValue(AuthMockFactory.createCompleteAuthMock({
      signIn: mockSignIn,
    }));

    const { getByTestId, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('navigates to register screen when sign up link is pressed', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.press(getByText('Sign Up'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to forgot password screen', () => {
    const { getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.press(getByText('Forgot Password?'));

    expect(mockNavigation.navigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('has secure password input', () => {
    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    const passwordInput = getByTestId('password-input');
    
    // Password input should be secure by default
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });

  it('shows login form when user is not logged in', () => {
    mockUseAuth.mockReturnValue(AuthMockFactory.createCompleteAuthMock());

    const { getByTestId } = render(<LoginScreen navigation={mockNavigation} />);

    // Should show login form elements when not logged in
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
  });

  it('successfully calls signIn with valid form', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({});
    mockUseAuth.mockReturnValue(AuthMockFactory.createCompleteAuthMock({
      signIn: mockSignIn,
    }));

    const { getByTestId, getByText } = render(<LoginScreen navigation={mockNavigation} />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByText('Log In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});

