// Mock React Native modules
import React from 'react';
import { render, fireEvent, waitFor, act } from '../../test-utils';
import RegisterScreen from '../../../screens/RegisterScreen';

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(() => Promise.resolve()),
  getItem: jest.fn(() => Promise.resolve(null)),
  removeItem: jest.fn(() => Promise.resolve()),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn(() => Promise.resolve()),
  multiGet: jest.fn(() => Promise.resolve([])),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// The Reanimated-backed animation primitives pull the real native module in
// jest (which the repo's reanimated mock chokes on). They're pure presentation
// wrappers — render children straight through.
jest.mock('../../../components/animations/primitives', () => {
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

// The RegisterScreen (Mint Editorial v2 redesign) drives navigation through
// the `useNavigation` / `useRoute` hooks rather than props. On a successful
// sign-up it calls `navigation.replace('EmailVerificationPending', { email })`.
const mockReplace = jest.fn();
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();
const mockCanGoBack = jest.fn(() => false);
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({
    replace: mockReplace,
    navigate: mockNavigate,
    goBack: mockGoBack,
    canGoBack: mockCanGoBack,
  }),
  useRoute: () => ({ params: {} }),
}));

// The screen consumes `signUp` + `loading` from the AuthContext (the legacy
// AuthService.signUp wiring was replaced by performSignUp behind useAuth).
const mockSignUp = jest.fn();
jest.mock('../../../contexts/AuthContext', () => ({
  useAuth: () => ({
    signUp: mockSignUp,
    loading: false,
  }),
}));

// Screen-capture guard hits expo-screen-capture native APIs — no-op it.
jest.mock('../../../hooks/useScreenCaptureGuard', () => ({
  useScreenCaptureGuard: jest.fn(),
}));

/**
 * Walk the 3-step wizard with a valid homeowner sign-up. Leaves the
 * caller on step 3 with the Create Account CTA visible (not yet pressed).
 *
 * Steps:
 *   1. email + password + confirm password + accept terms
 *   2. first name + last name (role defaults to homeowner)
 *   3. phone number (optional for homeowner)
 */
async function fillThroughToFinalStep(
  utils: ReturnType<typeof render>,
  overrides: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
  } = {}
) {
  const {
    email = 'newuser@example.com',
    password = 'SecurePass123!',
    confirmPassword = password,
    firstName = 'John',
    lastName = 'Doe',
    phone = '07123 456789',
  } = overrides;

  const { getByTestId, getByText } = utils;

  // Step 1 — identity
  await act(async () => {
    fireEvent.changeText(getByTestId('email-input'), email);
    fireEvent.changeText(getByTestId('password-input'), password);
    fireEvent.changeText(
      getByTestId('confirm-password-input'),
      confirmPassword
    );
    fireEvent.press(getByTestId('terms-checkbox'));
  });
  await act(async () => {
    fireEvent.press(getByText(/continue/i));
  });

  // Step 2 — name
  await waitFor(() => getByTestId('first-name-input'));
  await act(async () => {
    fireEvent.changeText(getByTestId('first-name-input'), firstName);
    fireEvent.changeText(getByTestId('last-name-input'), lastName);
  });
  await act(async () => {
    fireEvent.press(getByText(/continue/i));
  });

  // Step 3 — contact
  await waitFor(() => getByTestId('phone-input'));
  await act(async () => {
    fireEvent.changeText(getByTestId('phone-input'), phone);
  });
}

describe('Registration Flow - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSignUp.mockResolvedValue(undefined);
  });

  describe('Successful Registration', () => {
    it('should register new user with valid data', async () => {
      const utils = render(<RegisterScreen />);

      await fillThroughToFinalStep(utils);

      await act(async () => {
        fireEvent.press(utils.getByText(/create account/i));
      });

      await waitFor(() => {
        // The hook detects a jest-mock signUp and forwards the whole payload
        // object (vs the real context's positional (email, password, userData)
        // signature). Assert on the payload it actually receives.
        expect(mockSignUp).toHaveBeenCalledWith(
          expect.objectContaining({
            email: 'newuser@example.com',
            password: 'SecurePass123!',
            firstName: 'John',
            lastName: 'Doe',
            role: 'homeowner',
            phone: '07123 456789',
          })
        );
        // Mint Editorial v2: success routes to the email-verification screen.
        expect(mockReplace).toHaveBeenCalledWith('EmailVerificationPending', {
          email: 'newuser@example.com',
        });
      });
    });
  });

  describe('Validation Rules', () => {
    it('should validate email format', async () => {
      const { getByTestId, getByText, queryAllByText } = render(
        <RegisterScreen />
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'invalid.email');
        fireEvent.changeText(getByTestId('password-input'), 'SecurePass123!');
        fireEvent.changeText(
          getByTestId('confirm-password-input'),
          'SecurePass123!'
        );
        fireEvent.press(getByTestId('terms-checkbox'));
      });

      // Attempt to advance from step 1 — the step validator blocks on email.
      await act(async () => {
        fireEvent.press(getByText(/continue/i));
      });

      await waitFor(() => {
        // Surfaced both in the error banner and the field's errorText.
        expect(queryAllByText(/valid email/i).length).toBeGreaterThan(0);
      });
      // Still on step 1 — never reached the name step.
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should enforce password strength requirements', async () => {
      const { getByTestId, getByText, queryAllByText } = render(
        <RegisterScreen />
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'newuser@example.com');
        fireEvent.changeText(getByTestId('password-input'), 'weak');
        fireEvent.press(getByTestId('terms-checkbox'));
      });

      await act(async () => {
        fireEvent.press(getByText(/continue/i));
      });

      await waitFor(() => {
        expect(queryAllByText(/at least 8 characters/i).length).toBeGreaterThan(
          0
        );
      });
      expect(mockSignUp).not.toHaveBeenCalled();
    });

    it('should validate password match', async () => {
      const { getByTestId, getByText, queryAllByText } = render(
        <RegisterScreen />
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'newuser@example.com');
        fireEvent.changeText(getByTestId('password-input'), 'SecurePass123!');
        fireEvent.changeText(
          getByTestId('confirm-password-input'),
          'DifferentPass123!'
        );
        fireEvent.press(getByTestId('terms-checkbox'));
      });

      await act(async () => {
        fireEvent.press(getByText(/continue/i));
      });

      await waitFor(() => {
        expect(
          queryAllByText(/passwords do not match/i).length
        ).toBeGreaterThan(0);
      });
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });

  describe('Duplicate Account Prevention', () => {
    it('should handle existing email error', async () => {
      mockSignUp.mockRejectedValue(new Error('User already registered'));

      const utils = render(<RegisterScreen />);

      await fillThroughToFinalStep(utils, {
        email: 'existing@example.com',
      });

      await act(async () => {
        fireEvent.press(utils.getByText(/create account/i));
      });

      await waitFor(() => {
        expect(utils.queryByText(/already registered/i)).toBeTruthy();
      });
    });
  });

  describe('Terms and Conditions', () => {
    it('should require terms acceptance', async () => {
      const { getByTestId, getByText, queryByText, queryAllByText } = render(
        <RegisterScreen />
      );

      // Fill step 1 fully but leave terms unchecked.
      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'newuser@example.com');
        fireEvent.changeText(getByTestId('password-input'), 'SecurePass123!');
        fireEvent.changeText(
          getByTestId('confirm-password-input'),
          'SecurePass123!'
        );
      });

      await act(async () => {
        fireEvent.press(getByText(/continue/i));
      });

      await waitFor(() => {
        // "Please accept the terms and conditions" only renders in the error
        // banner; the static checkbox label ("I accept the terms…") does not
        // match this prefix, so this targets the validation message.
        expect(queryByText(/please accept the terms/i)).toBeTruthy();
      });
      // Sanity: the error genuinely surfaced (banner present).
      expect(queryAllByText(/terms/i).length).toBeGreaterThan(0);
      expect(mockSignUp).not.toHaveBeenCalled();
    });
  });
});
