import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { RegisterScreen } from '../../screens/RegisterScreen';
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

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    jest.mocked(require('@react-navigation/native').useNavigation).mockReturnValue({
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

  it('renders registration form correctly', () => {
    const { getByTestId, getByText } = render(<RegisterScreen />);

    expect(getByTestId('first-name-input')).toBeTruthy();
    expect(getByTestId('last-name-input')).toBeTruthy();
    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('confirm-password-input')).toBeTruthy();
    expect(getByTestId('role-homeowner')).toBeTruthy();
    expect(getByTestId('role-contractor')).toBeTruthy();
    expect(getByText('Create Account')).toBeTruthy();
  });

  it('validates required fields', async () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByText('First name is required')).toBeTruthy();
    });
  });

  it('validates email format', async () => {
    const { getByTestId, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByText('Please enter a valid email address')).toBeTruthy();
    });
  });

  it('validates password strength', async () => {
    const { getByTestId, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    fireEvent.changeText(getByTestId('password-input'), '123');
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByText('Password must be at least 8 characters')).toBeTruthy();
    });
  });

  it('validates password confirmation', async () => {
    const { getByTestId, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'differentpassword');
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByText('Passwords do not match')).toBeTruthy();
    });
  });

  it('selects user role correctly', () => {
    const { getByTestId } = render(<RegisterScreen />);

    const homeownerOption = getByTestId('role-homeowner');
    const contractorOption = getByTestId('role-contractor');

    fireEvent.press(contractorOption);
    expect(contractorOption.props.accessibilityState.checked).toBe(true);
    expect(homeownerOption.props.accessibilityState.checked).toBe(false);

    fireEvent.press(homeownerOption);
    expect(homeownerOption.props.accessibilityState.checked).toBe(true);
    expect(contractorOption.props.accessibilityState.checked).toBe(false);
  });

  it('calls signUp with correct data when form is valid', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({});
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: mockSignUp,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId, getByText } = render(<RegisterScreen />);

    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('role-homeowner'));
    fireEvent.press(getByTestId('terms-checkbox'));
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
      });
    });
  });

  it('shows loading state during registration', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: true,
      signIn: jest.fn(),
      signUp: jest.fn(),
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId } = render(<RegisterScreen />);

    expect(getByTestId('loading-spinner')).toBeTruthy();
  });

  it('displays error message on registration failure', async () => {
    const mockSignUp = jest.fn().mockRejectedValue(new Error('Email already exists'));
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: mockSignUp,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId, getByText } = render(<RegisterScreen />);

    // Fill form
    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('role-homeowner'));
    fireEvent.press(getByTestId('terms-checkbox'));
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByText('Email already exists')).toBeTruthy();
    });
  });

  it('requires terms and conditions acceptance', async () => {
    const { getByTestId, getByText } = render(<RegisterScreen />);

    // Fill form but don't check terms
    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('role-homeowner'));
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByText('Please accept the terms and conditions')).toBeTruthy();
    });
  });

  it('navigates to login screen when login link is pressed', () => {
    const { getByText } = render(<RegisterScreen />);

    fireEvent.press(getByText('Already have an account? Sign In'));

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('shows terms and conditions modal', () => {
    const { getByText, getByTestId } = render(<RegisterScreen />);

    fireEvent.press(getByText('Terms and Conditions'));

    expect(getByTestId('terms-modal')).toBeTruthy();
  });

  it('shows privacy policy modal', () => {
    const { getByText, getByTestId } = render(<RegisterScreen />);

    fireEvent.press(getByText('Privacy Policy'));

    expect(getByTestId('privacy-modal')).toBeTruthy();
  });

  it('toggles password visibility', () => {
    const { getByTestId } = render(<RegisterScreen />);

    const passwordInput = getByTestId('password-input');
    const toggleButton = getByTestId('password-toggle');

    expect(passwordInput.props.secureTextEntry).toBe(true);

    fireEvent.press(toggleButton);

    expect(passwordInput.props.secureTextEntry).toBe(false);
  });

  it('clears form after successful registration', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({});
    mockUseAuth.mockReturnValue({
      user: null,
      session: null,
      loading: false,
      signIn: jest.fn(),
      signUp: mockSignUp,
      signOut: jest.fn(),
      updateProfile: jest.fn(),
    });

    const { getByTestId, getByText } = render(<RegisterScreen />);

    // Fill and submit form
    fireEvent.changeText(getByTestId('first-name-input'), 'John');
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    fireEvent.changeText(getByTestId('password-input'), 'password123');
    fireEvent.changeText(getByTestId('confirm-password-input'), 'password123');
    fireEvent.press(getByTestId('role-homeowner'));
    fireEvent.press(getByTestId('terms-checkbox'));
    fireEvent.press(getByText('Create Account'));

    await waitFor(() => {
      expect(getByTestId('first-name-input').props.value).toBe('');
      expect(getByTestId('email-input').props.value).toBe('');
    });
  });
});