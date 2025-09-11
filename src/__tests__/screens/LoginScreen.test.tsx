import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { LoginScreen } from '../../screens/LoginScreen';
import { useAuth } from '../../hooks/useAuth';

// Mock dependencies
jest.mock('../../hooks/useAuth');
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

const mockUseAuth = useAuth as jest.MockedFunction<typeof useAuth>;
const mockNavigate = jest.fn();

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(require('@react-navigation/native').useNavigation)
      .mockReturnValue({
        navigate: mockNavigate,
        goBack: jest.fn(),
      });

    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });
  });

  it('renders login form correctly', () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
    expect(getByText("Don't have an account? Sign Up")).toBeTruthy();
  });

  it('validates email format', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('validates password is required', async () => {
    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Password is required')).toBeTruthy();
    });
  });

  it('calls signIn when form is valid', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({});
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith(
        'test@example.com',
        'password123'
      );
    });
  });

  it('shows loading state during sign in', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId } = render(<LoginScreen />);

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('displays error message on sign in failure', async () => {
    const mockSignIn = jest
      .fn()
      .mockRejectedValue(new Error('Invalid credentials'));
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByText('Invalid credentials')).toBeTruthy();
    });
  });

  it('navigates to register screen when sign up link is pressed', () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText("Don't have an account? Sign Up"));

    expect(mockNavigate).toHaveBeenCalledWith('Register');
  });

  it('navigates to forgot password screen', () => {
    const { getByText } = render(<LoginScreen />);

    fireEvent.press(getByText('Forgot Password?'));

    expect(mockNavigate).toHaveBeenCalledWith('ForgotPassword');
  });

  it('toggles password visibility', () => {
    const { getByTestId } = render(<LoginScreen />);

    const passwordInput = getByTestId('password-input');
    const toggleButton = getByTestId('password-toggle');

    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(toggleButton);

    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('redirects to home if already logged in', () => {
    const mockUser = {
      id: 'user-1',
      email: 'test@example.com',
      first_name: 'John',
      last_name: 'Doe',
      role: 'homeowner' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockUseAuth.mockReturnValue({
      user: mockUser,
      session: { user: mockUser },
      loading: false,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    render(<LoginScreen />);

    expect(mockNavigate).toHaveBeenCalledWith('Home');
  });

  it('clears form on successful login', async () => {
    const mockSignIn = jest.fn().mockResolvedValue({});
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: mockSignIn,
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId, getByText } = render(<LoginScreen />);

    fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.press(getByText('Sign In'));

    await waitFor(() => {
      expect(getByTestId('email-input').props.value).toBe('');
      expect(getByTestId('password-input').props.value).toBe('');
    });
  });
});
