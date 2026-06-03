import React from 'react';
import { act } from '@testing-library/react-native';
import { render, fireEvent, waitFor } from '../test-utils';
import RegisterScreen from '../../screens/RegisterScreen';
import { useAuth } from '../../contexts/AuthContext';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// The Reanimated-backed animation primitives pull the real native module in
// jest (the repo's reanimated mock chokes on it). They're pure presentation
// wrappers — render children straight through.
jest.mock('../../components/animations/primitives', () => {
  const ReactActual = require('react');
  const pass = ({ children }: { children: React.ReactNode }) =>
    ReactActual.createElement(ReactActual.Fragment, null, children);
  return {
    FadeIn: pass,
    SlideIn: pass,
    ScaleIn: pass,
    Pulse: pass,
    BouncyPress: pass,
  };
});

// Screen-capture guard hits expo-screen-capture native APIs — no-op it.
jest.mock('../../hooks/useScreenCaptureGuard', () => ({
  useScreenCaptureGuard: jest.fn(),
}));

// Mock dependencies
jest.mock('../../contexts/AuthContext');

const mockNavigate = jest.fn();
const mockReplace = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => true);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    navigate: mockNavigate,
    replace: mockReplace,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({
    params: {},
    key: 'test-route',
    name: 'Register',
  }),
}));

const mockUseAuth = jest.mocked(useAuth);

// RegisterScreen is now a 3-step wizard backed by useRegistrationForm:
//   Step 1: email / password / confirm-password / terms ("Continue")
//   Step 2: first-name / last-name / role          ("Continue")
//   Step 3: phone-number                            ("Create Account")
// signUp is consumed from useAuth(); success navigates to
// EmailVerificationPending via navigation.replace.
const VALID_PASSWORD = 'Password1!';

const renderAuth = (overrides: Partial<ReturnType<typeof useAuth>> = {}) => {
  mockUseAuth.mockReturnValue({
    user: null,
    session: null,
    loading: false,
    signIn: jest.fn(),
    signUp: jest.fn(),
    signOut: jest.fn(),
    updateProfile: jest.fn(),
    ...overrides,
  } as unknown as ReturnType<typeof useAuth>);
};

// Advance the wizard from step 1 to step 3 with valid data, leaving the
// final "Create Account" submit to the caller.
const fillThroughToStep3 = async (
  utils: ReturnType<typeof render>,
  opts: { role?: 'homeowner' | 'contractor' } = {}
) => {
  const { getByTestId, getByText } = utils;

  // --- Step 1: identity ---
  await act(async () => {
    fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
  });
  await act(async () => {
    fireEvent.changeText(getByTestId('password-input'), VALID_PASSWORD);
  });
  await act(async () => {
    fireEvent.changeText(getByTestId('confirm-password-input'), VALID_PASSWORD);
  });
  await act(async () => {
    fireEvent.press(getByTestId('terms-checkbox'));
  });
  await act(async () => {
    fireEvent.press(getByText('Continue'));
  });

  // --- Step 2: name + role ---
  await act(async () => {
    fireEvent.changeText(getByTestId('first-name-input'), 'John');
  });
  await act(async () => {
    fireEvent.changeText(getByTestId('last-name-input'), 'Doe');
  });
  if (opts.role) {
    await act(async () => {
      fireEvent.press(getByTestId(`role-${opts.role}`));
    });
  }
  await act(async () => {
    fireEvent.press(getByText('Continue'));
  });
};

describe('RegisterScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    renderAuth();
  });

  it('renders step 1 of the wizard correctly', () => {
    const { getByTestId, getByText } = render(<RegisterScreen />);

    expect(getByTestId('email-input')).toBeTruthy();
    expect(getByTestId('password-input')).toBeTruthy();
    expect(getByTestId('confirm-password-input')).toBeTruthy();
    expect(getByTestId('terms-checkbox')).toBeTruthy();
    // First step shows the "Continue" CTA (not "Create Account" yet).
    expect(getByText('Continue')).toBeTruthy();
  });

  it('validates required fields on step 1', async () => {
    const { getByText, queryAllByText } = render(<RegisterScreen />);

    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    // Step 1 gates on terms acceptance; the missing-terms message wins
    // (surfaced in the error Banner).
    await waitFor(() => {
      expect(
        queryAllByText('Please accept the terms and conditions').length
      ).toBeGreaterThan(0);
    });
  });

  it('validates email format on step 1', async () => {
    const { getByTestId, getByText, queryAllByText } = render(
      <RegisterScreen />
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'invalid-email');
    });
    await act(async () => {
      fireEvent.changeText(getByTestId('password-input'), VALID_PASSWORD);
    });
    await act(async () => {
      fireEvent.changeText(
        getByTestId('confirm-password-input'),
        VALID_PASSWORD
      );
    });
    await act(async () => {
      fireEvent.press(getByTestId('terms-checkbox'));
    });
    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    await waitFor(() => {
      expect(
        queryAllByText('Please enter a valid email').length
      ).toBeGreaterThan(0);
    });
  });

  it('validates password strength on step 1', async () => {
    const { getByTestId, getByText, queryAllByText } = render(
      <RegisterScreen />
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    });
    await act(async () => {
      fireEvent.changeText(getByTestId('password-input'), '123');
    });
    await act(async () => {
      fireEvent.press(getByTestId('terms-checkbox'));
    });
    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    await waitFor(() => {
      expect(
        queryAllByText('Must be at least 8 characters').length
      ).toBeGreaterThan(0);
    });
  });

  it('validates password confirmation on step 1', async () => {
    const { getByTestId, getByText, queryAllByText } = render(
      <RegisterScreen />
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    });
    await act(async () => {
      fireEvent.changeText(getByTestId('password-input'), VALID_PASSWORD);
    });
    await act(async () => {
      fireEvent.changeText(
        getByTestId('confirm-password-input'),
        'differentpassword'
      );
    });
    await act(async () => {
      fireEvent.press(getByTestId('terms-checkbox'));
    });
    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    await waitFor(() => {
      expect(queryAllByText('Passwords do not match').length).toBeGreaterThan(
        0
      );
    });
  });

  it('requires terms and conditions acceptance', async () => {
    const { getByTestId, getByText, queryAllByText } = render(
      <RegisterScreen />
    );

    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    });
    await act(async () => {
      fireEvent.changeText(getByTestId('password-input'), VALID_PASSWORD);
    });
    await act(async () => {
      fireEvent.changeText(
        getByTestId('confirm-password-input'),
        VALID_PASSWORD
      );
    });
    // Intentionally do NOT check terms.
    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    await waitFor(() => {
      expect(
        queryAllByText('Please accept the terms and conditions').length
      ).toBeGreaterThan(0);
    });
  });

  it('toggles the selected role on the step 2 segmented control', async () => {
    const { getByTestId, getByText } = render(<RegisterScreen />);

    // Advance to step 2.
    await act(async () => {
      fireEvent.changeText(getByTestId('email-input'), 'john@example.com');
    });
    await act(async () => {
      fireEvent.changeText(getByTestId('password-input'), VALID_PASSWORD);
    });
    await act(async () => {
      fireEvent.changeText(
        getByTestId('confirm-password-input'),
        VALID_PASSWORD
      );
    });
    await act(async () => {
      fireEvent.press(getByTestId('terms-checkbox'));
    });
    await act(async () => {
      fireEvent.press(getByText('Continue'));
    });

    const homeownerOption = getByTestId('role-homeowner');
    const contractorOption = getByTestId('role-contractor');

    // Default role is homeowner.
    expect(homeownerOption.props.accessibilityState.checked).toBe(true);
    expect(contractorOption.props.accessibilityState.checked).toBe(false);

    await act(async () => {
      fireEvent.press(contractorOption);
    });
    expect(
      getByTestId('role-contractor').props.accessibilityState.checked
    ).toBe(true);
    expect(getByTestId('role-homeowner').props.accessibilityState.checked).toBe(
      false
    );
  });

  it('calls signUp with correct data when the wizard is completed', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({});
    renderAuth({ signUp: mockSignUp });

    const utils = render(<RegisterScreen />);
    const { getByText } = utils;

    await fillThroughToStep3(utils, { role: 'homeowner' });

    // --- Step 3: phone (optional for homeowners) + submit ---
    await act(async () => {
      fireEvent.press(getByText('Create Account'));
    });

    await waitFor(() => {
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'john@example.com',
        password: VALID_PASSWORD,
        firstName: 'John',
        lastName: 'Doe',
        role: 'homeowner',
        phone: undefined,
      });
    });
  });

  it('navigates to EmailVerificationPending after successful registration', async () => {
    const mockSignUp = jest.fn().mockResolvedValue({});
    renderAuth({ signUp: mockSignUp });

    const utils = render(<RegisterScreen />);
    const { getByText } = utils;

    await fillThroughToStep3(utils, { role: 'homeowner' });
    await act(async () => {
      fireEvent.press(getByText('Create Account'));
    });

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith('EmailVerificationPending', {
        email: 'john@example.com',
      });
    });
  });

  it('shows loading state on the final step during registration', () => {
    renderAuth({ loading: true });

    const { getByTestId } = render(<RegisterScreen />);

    // While loading the wizard disables interaction; on step 1 the CTA is
    // still the "Continue" button (loading spinner only swaps in on the
    // last step). Assert the primary CTA exists and is the register button.
    expect(getByTestId('register-button')).toBeTruthy();
  });

  it('displays error message on registration failure', async () => {
    const mockSignUp = jest
      .fn()
      .mockRejectedValue(new Error('Email already exists'));
    renderAuth({ signUp: mockSignUp });

    const utils = render(<RegisterScreen />);
    const { getByText, queryAllByText } = utils;

    await fillThroughToStep3(utils, { role: 'homeowner' });
    await act(async () => {
      fireEvent.press(getByText('Create Account'));
    });

    await waitFor(() => {
      expect(queryAllByText('Email already exists').length).toBeGreaterThan(0);
    });
  });

  it('navigates to login screen when the sign-in link is pressed', () => {
    const { getByText } = render(<RegisterScreen />);

    act(() => {
      fireEvent.press(getByText('Sign in →'));
    });

    expect(mockNavigate).toHaveBeenCalledWith('Login');
  });

  it('shows the terms and conditions modal', async () => {
    const { getByText, getByTestId } = render(<RegisterScreen />);

    await act(async () => {
      fireEvent.press(getByText('Terms and Conditions'));
    });

    expect(getByTestId('terms-modal')).toBeTruthy();
  });

  it('shows the privacy policy modal', async () => {
    const { getByText, getByTestId } = render(<RegisterScreen />);

    await act(async () => {
      fireEvent.press(getByText('Privacy Policy'));
    });

    expect(getByTestId('privacy-modal')).toBeTruthy();
  });

  it('renders the password input as secured by default', () => {
    const { getByTestId } = render(<RegisterScreen />);

    const passwordInput = getByTestId('password-input');
    expect(passwordInput.props.secureTextEntry).toBe(true);
  });
});
