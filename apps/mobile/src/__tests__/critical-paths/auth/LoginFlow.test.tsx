// Mock React Native modules
import React from 'react';
import { act } from '@testing-library/react-native';
import { render, fireEvent, waitFor } from '../../test-utils';
import LoginScreen from '../../../screens/LoginScreen';
import { useAuth } from '../../../contexts/AuthContext';
import { AuthMockFactory } from '../../../test-utils/authMockFactory';
import { NavigationMockFactory } from '../../../test-utils/navigationMockFactory';

// In-memory AsyncStorage mock so we can assert on Remember-email writes.
const asyncStorageStore: Record<string, string> = {};
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn((key: string, value: string) => {
    asyncStorageStore[key] = value;
    return Promise.resolve();
  }),
  getItem: jest.fn((key: string) =>
    Promise.resolve(asyncStorageStore[key] ?? null)
  ),
  removeItem: jest.fn((key: string) => {
    delete asyncStorageStore[key];
    return Promise.resolve();
  }),
  clear: jest.fn(() => Promise.resolve()),
  multiSet: jest.fn((pairs: [string, string][]) => {
    pairs.forEach(([k, v]) => {
      asyncStorageStore[k] = v;
    });
    return Promise.resolve();
  }),
  multiGet: jest.fn((keys: string[]) =>
    Promise.resolve(keys.map((k) => [k, asyncStorageStore[k] ?? null]))
  ),
  multiRemove: jest.fn((keys: string[]) => {
    keys.forEach((k) => delete asyncStorageStore[k]);
    return Promise.resolve();
  }),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// The Reanimated-backed animation primitives pull the real native module in
// jest (the repo's reanimated mock chokes on it). They're pure presentation
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

// Screen-capture guard hits expo-screen-capture native APIs — no-op it.
jest.mock('../../../hooks/useScreenCaptureGuard', () => ({
  useScreenCaptureGuard: jest.fn(),
}));

// expo-status-bar's StatusBar calls react-native's useColorScheme, which the
// project's hand-written react-native mock doesn't implement. Render nothing.
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// AuthContext is force-mapped to AuthContext-fallback.tsx by jest config.
// The screen consumes auth via useAuth(), so mock that — the redesigned
// LoginScreen no longer calls AuthService directly nor navigates to 'Home'
// (AuthContext drives the post-login redirect by setting `user`).
jest.mock('../../../contexts/AuthContext');

jest.mock('../../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    formSubmit: jest.fn(),
    loginSuccess: jest.fn(),
    loginFailed: jest.fn(),
    selection: jest.fn(),
    error: jest.fn(),
  }),
}));

jest.mock('../../../hooks/useI18n', () => ({
  useI18n: () => ({
    t: jest.fn((key: string, fallback?: { defaultValue?: string } | string) => {
      if (typeof fallback === 'string') return fallback;
      if (fallback && typeof fallback === 'object' && fallback.defaultValue) {
        return fallback.defaultValue;
      }
      return key;
    }),
    auth: {
      email: () => 'Email',
      password: () => 'Password',
      login: () => 'Sign In',
      loggingIn: () => 'Signing in...',
      forgotPassword: () => 'Forgot Password?',
      createAccount: () => 'Sign Up',
      register: () => 'Sign Up',
    },
    common: {
      error: () => 'Error',
    },
    getErrorMessage: jest.fn(
      (_key: string, message?: string) => message || 'An error occurred'
    ),
  }),
}));

jest.mock('../../../hooks/useAccessibleText', () => ({
  useAccessibleText: () => ({ textStyle: {} }),
}));

const mockUseAuth = jest.mocked(useAuth);

describe('Login Flow - Critical Path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(asyncStorageStore).forEach((k) => delete asyncStorageStore[k]);
    mockUseAuth.mockReturnValue(AuthMockFactory.createCompleteAuthMock());
  });

  const renderScreen = () => {
    const navigation = NavigationMockFactory.createAuthNavigationMock();
    const utils = render(
      <LoginScreen navigation={navigation} route={{ params: {} }} />
    );
    return { navigation, ...utils };
  };

  describe('Successful Login', () => {
    it('should login with valid credentials', async () => {
      const signIn = jest.fn().mockResolvedValue({
        user: { id: '1', email: 'test@example.com' },
      });
      mockUseAuth.mockReturnValue(
        AuthMockFactory.createCompleteAuthMock({ signIn })
      );

      const { getByTestId, getByLabelText } = renderScreen();

      act(() => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      });
      act(() => {
        fireEvent.changeText(getByTestId('password-input'), 'password123');
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Sign In'));
      });

      await waitFor(() => {
        expect(signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should persist email when remember email is enabled before login', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const signIn = jest.fn().mockResolvedValue({
        user: { id: '1', email: 'test@example.com' },
      });
      mockUseAuth.mockReturnValue(
        AuthMockFactory.createCompleteAuthMock({ signIn })
      );

      const { getByTestId, getByLabelText } = renderScreen();

      act(() => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      });
      act(() => {
        fireEvent.changeText(getByTestId('password-input'), 'password123');
      });
      act(() => {
        fireEvent.press(getByTestId('remember-email-toggle'));
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Sign In'));
      });

      await waitFor(() => {
        expect(AsyncStorage.multiSet).toHaveBeenCalledWith(
          expect.arrayContaining([
            ['@mintenance:rememberEmail:value', 'test@example.com'],
          ])
        );
      });
    });
  });

  describe('Login Validation', () => {
    // The Mint Editorial redesign dropped client-side email-format
    // validation in favour of a single "fill in all fields" guard plus
    // server-side auth errors. Realigned 2026-05-31 to the current guard.
    it('should block submit and show error when fields are empty', async () => {
      const signIn = jest.fn().mockResolvedValue({});
      mockUseAuth.mockReturnValue(
        AuthMockFactory.createCompleteAuthMock({ signIn })
      );

      const { getByLabelText, queryByText } = renderScreen();

      await act(async () => {
        fireEvent.press(getByLabelText('Sign In'));
      });

      await waitFor(() => {
        expect(queryByText(/fill in all fields/i)).toBeTruthy();
        expect(signIn).not.toHaveBeenCalled();
      });
    });

    it('should show error and not sign in when password is empty', async () => {
      const signIn = jest.fn().mockResolvedValue({});
      mockUseAuth.mockReturnValue(
        AuthMockFactory.createCompleteAuthMock({ signIn })
      );

      const { getByTestId, getByLabelText, queryByText } = renderScreen();

      act(() => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Sign In'));
      });

      await waitFor(() => {
        expect(queryByText(/fill in all fields/i)).toBeTruthy();
        expect(signIn).not.toHaveBeenCalled();
      });
    });
  });

  describe('Login Error Handling', () => {
    it('should handle network errors', async () => {
      const signIn = jest.fn().mockRejectedValue(new Error('Network error'));
      mockUseAuth.mockReturnValue(
        AuthMockFactory.createCompleteAuthMock({ signIn })
      );

      const { getByTestId, getByLabelText, queryByText } = renderScreen();

      act(() => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      });
      act(() => {
        fireEvent.changeText(getByTestId('password-input'), 'password123');
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Sign In'));
      });

      await waitFor(() => {
        expect(queryByText(/network error/i)).toBeTruthy();
      });
    });

    it('should handle invalid credentials', async () => {
      const signIn = jest
        .fn()
        .mockRejectedValue(new Error('Invalid credentials'));
      mockUseAuth.mockReturnValue(
        AuthMockFactory.createCompleteAuthMock({ signIn })
      );

      const { getByTestId, getByLabelText, queryByText } = renderScreen();

      act(() => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      });
      act(() => {
        fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Sign In'));
      });

      await waitFor(() => {
        expect(queryByText(/invalid credentials/i)).toBeTruthy();
      });
    });
  });

  describe('Remember Me Feature', () => {
    it('should save email when remember email is checked', async () => {
      const AsyncStorage = require('@react-native-async-storage/async-storage');
      const signIn = jest.fn().mockResolvedValue({
        user: { id: '1', email: 'test@example.com' },
      });
      mockUseAuth.mockReturnValue(
        AuthMockFactory.createCompleteAuthMock({ signIn })
      );

      const { getByTestId, getByLabelText } = renderScreen();

      act(() => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      });
      act(() => {
        fireEvent.changeText(getByTestId('password-input'), 'password123');
      });
      act(() => {
        fireEvent.press(getByTestId('remember-email-toggle'));
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Sign In'));
      });

      await waitFor(() => {
        expect(AsyncStorage.multiSet).toHaveBeenCalledWith(
          expect.arrayContaining([
            ['@mintenance:rememberEmail', 'true'],
            ['@mintenance:rememberEmail:value', 'test@example.com'],
          ])
        );
      });
    });
  });
});
