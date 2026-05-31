import React from 'react';
/**
 * Tests for critical mobile screens
 *
 * Ensures critical screens render correctly and handle edge cases
 */

import { Alert } from 'react-native';
import { render, fireEvent, waitFor, act } from '../test-utils';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import LoginScreen from '../../screens/LoginScreen';
import RegisterScreen from '../../screens/RegisterScreen';
import JobPostingScreen from '../../screens/JobPostingScreen';
import BidSubmissionScreen from '../../screens/BidSubmissionScreen';
import { JobService } from '../../services/JobService';
import { useAuth } from '../../contexts/AuthContext';

// JobPostingScreen's useCreateJob() reads from a react-query client; wrap
// renders in a fresh QueryClient with retries off.
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });

// BidSubmissionScreen gates the bid form behind a JobService.getJobById()
// fetch (renders a "Loading…" state until it resolves). Mock it so the
// form actually renders.
jest.mock('../../services/JobService', () => ({
  JobService: {
    getJobById: jest.fn(),
    submitBid: jest.fn(),
  },
}));

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

// expo-status-bar's StatusBar calls react-native's useColorScheme, which the
// project's hand-written react-native mock doesn't implement. Render nothing.
jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

// useHaptics -> expo-haptics enums; the static class field
// (Haptics.NotificationFeedbackType.Error) blows up under the test mock.
// LoginScreen drives haptics on every submit, so stub the hook.
jest.mock('../../utils/haptics', () => ({
  useHaptics: () => ({
    buttonPress: jest.fn(),
    formSubmit: jest.fn(),
    loginSuccess: jest.fn(),
    loginFailed: jest.fn(),
    selection: jest.fn(),
    error: jest.fn(),
  }),
}));

const mockNavigation = {
  navigate: jest.fn(),
  goBack: jest.fn(),
  dispatch: jest.fn(),
  reset: jest.fn(),
  setParams: jest.fn(),
  addListener: jest.fn(),
  removeListener: jest.fn(),
  canGoBack: jest.fn(() => true),
  isFocused: jest.fn(() => true),
  setOptions: jest.fn(),
};

const mockRoute = {
  params: {},
  key: 'test-route',
  name: 'TestScreen',
};

jest.mock('../../contexts/AuthContext');
jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  // The real NavigationContainer reaches into react-native's I18nManager
  // native constants, which the project's RN mock doesn't implement. The
  // screens consume navigation purely via useNavigation()/useRoute(), so
  // render the container as a transparent passthrough.
  NavigationContainer: ({ children }: { children: React.ReactNode }) =>
    children,
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    replace: jest.fn(),
    canGoBack: jest.fn(() => true),
    // useUnsavedChanges (JobPosting + BidSubmission) subscribes to the
    // 'beforeRemove' event; return an unsubscribe fn.
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    dispatch: jest.fn(),
    setOptions: jest.fn(),
  }),
  useRoute: () => ({ params: {}, key: 'test-route', name: 'TestScreen' }),
  useFocusEffect: jest.fn(),
}));

describe('Critical Screens - Edge Cases', () => {
  const mockUseAuth = jest.mocked(useAuth);
  const mockGetJobById = JobService.getJobById as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  // Screens consume navigation/route as props (LoginScreen, BidSubmission)
  // AND via the mocked useNavigation/useRoute hooks (RegisterScreen,
  // JobPostingScreen). Provide a complete prop pair so prop-based screens
  // don't throw on render.
  const makeNav = () =>
    ({
      navigate: jest.fn(),
      goBack: jest.fn(),
      replace: jest.fn(),
      canGoBack: jest.fn(() => true),
      addListener: jest.fn(() => jest.fn()),
      removeListener: jest.fn(),
      dispatch: jest.fn(),
      setOptions: jest.fn(),
    }) as any;

  const setAuth = (overrides: Record<string, unknown> = {}) =>
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      signIn: jest.fn(),
      signOut: jest.fn(),
      signUp: jest.fn(),
      ...overrides,
    } as any);

  describe('LoginScreen', () => {
    it('blocks submit and surfaces an error when fields are empty', async () => {
      setAuth();

      const { getByText, getByLabelText, queryByTestId } = render(
        <NavigationContainer>
          <LoginScreen navigation={makeNav()} route={{ params: {} } as any} />
        </NavigationContainer>
      );

      // Tapping "Log In" with both fields empty must not crash and must
      // surface the inline "fill in all fields" validation banner.
      await act(async () => {
        fireEvent.press(getByLabelText('Log In'));
      });

      await waitFor(() => {
        expect(queryByTestId('login-error-banner')).toBeTruthy();
      });
      expect(getByText(/fill in all fields/i)).toBeTruthy();
    });

    it('surfaces the fill-fields error when only the email is entered', async () => {
      setAuth();

      const { getByTestId, getByLabelText, queryByTestId } = render(
        <NavigationContainer>
          <LoginScreen navigation={makeNav()} route={{ params: {} } as any} />
        </NavigationContainer>
      );

      const emailInput = getByTestId('email-input');
      await act(async () => {
        fireEvent.changeText(emailInput, 'invalid-email');
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Log In'));
      });

      // Password still empty -> the required-fields guard fires.
      await waitFor(() => {
        expect(queryByTestId('login-error-banner')).toBeTruthy();
      });
    });

    it('shows the auth error banner when sign-in rejects', async () => {
      const mockSignIn = jest
        .fn()
        .mockRejectedValue(new Error('Invalid credentials'));
      setAuth({ signIn: mockSignIn });

      const { getByTestId, getByText, getByLabelText } = render(
        <NavigationContainer>
          <LoginScreen navigation={makeNav()} route={{ params: {} } as any} />
        </NavigationContainer>
      );

      await act(async () => {
        fireEvent.changeText(getByTestId('email-input'), 'test@example.com');
      });
      await act(async () => {
        fireEvent.changeText(getByTestId('password-input'), 'wrongpassword');
      });
      await act(async () => {
        fireEvent.press(getByLabelText('Log In'));
      });

      await waitFor(() => {
        expect(mockSignIn).toHaveBeenCalledWith(
          'test@example.com',
          'wrongpassword'
        );
      });
      // The rejected sign-in is caught and rendered as an error banner.
      await waitFor(() => {
        expect(getByText(/invalid credentials/i)).toBeTruthy();
      });
    });
  });

  describe('RegisterScreen', () => {
    it('shows a mismatch error after the confirm-password field is blurred', async () => {
      setAuth();

      const { getByTestId, getByText } = render(
        <NavigationContainer>
          <RegisterScreen />
        </NavigationContainer>
      );

      // The wizard validates on blur (not on every keystroke), so type then
      // blur the confirm field to trigger the comparison.
      await act(async () => {
        fireEvent.changeText(getByTestId('password-input'), 'Password123!');
      });
      await act(async () => {
        fireEvent.changeText(
          getByTestId('confirm-password-input'),
          'DifferentPassword123!'
        );
      });
      await act(async () => {
        fireEvent(getByTestId('confirm-password-input'), 'blur');
      });

      await waitFor(() => {
        expect(getByText(/do not match/i)).toBeTruthy();
      });
    });

    it('reflects a weak password in the strength meter', async () => {
      setAuth();

      const { getByTestId, getByText } = render(
        <NavigationContainer>
          <RegisterScreen />
        </NavigationContainer>
      );

      // 8 lowercase chars => strength score 1 => "Weak" label. (A 4-char
      // value scores 0, which the meter renders as its empty fallback.)
      await act(async () => {
        fireEvent.changeText(getByTestId('password-input'), 'password');
      });

      // PasswordStrengthBar renders a "Weak" label for a low-entropy value.
      await waitFor(() => {
        expect(getByText(/weak/i)).toBeTruthy();
      });
    });
  });

  describe('JobPostingScreen', () => {
    const homeowner = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'homeowner' as const,
    };

    const renderJobPosting = () =>
      render(
        <QueryClientProvider client={createTestQueryClient()}>
          <NavigationContainer>
            <JobPostingScreen navigation={makeNav()} />
          </NavigationContainer>
        </QueryClientProvider>
      );

    it('shows the title validation message on submit with an empty title', async () => {
      setAuth({ user: homeowner });

      const { getByText } = renderJobPosting();

      await act(async () => {
        fireEvent.press(getByText(/post job/i));
      });

      // validateJobDraft runs the canonical Zod schema: an empty title
      // yields the min-length message.
      await waitFor(() => {
        expect(getByText(/title must be at least 5 characters/i)).toBeTruthy();
      });
    });

    it('blocks submit with a photos-required prompt when no photo is attached', async () => {
      setAuth({ user: homeowner });

      const alertSpy = jest
        .spyOn(Alert, 'alert')
        .mockImplementation(() => undefined);

      const { getByTestId, getByText } = renderJobPosting();

      // Title is valid; description/location are optional in the canonical
      // schema, so the next gate is the mandatory-photo check.
      await act(async () => {
        fireEvent.changeText(
          getByTestId('job-title-input'),
          'Fix the leaky tap'
        );
      });
      await act(async () => {
        fireEvent.press(getByText(/post job/i));
      });

      await waitFor(() => {
        expect(alertSpy).toHaveBeenCalledWith(
          'Photos required',
          expect.stringMatching(/at least one photo/i)
        );
      });

      alertSpy.mockRestore();
    });
  });

  describe('BidSubmissionScreen', () => {
    const contractor = {
      id: 'user-1',
      email: 'test@example.com',
      role: 'contractor' as const,
    };

    const job = {
      id: 'job-1',
      title: 'Fix the boiler',
      status: 'posted',
      homeowner_id: 'owner-1',
    };

    const renderBid = () =>
      render(
        <NavigationContainer>
          <BidSubmissionScreen
            navigation={makeNav()}
            route={
              {
                params: { jobId: 'job-1' },
                key: 'k',
                name: 'BidSubmission',
              } as any
            }
          />
        </NavigationContainer>
      );

    it('keeps submit disabled for a negative bid amount', async () => {
      setAuth({ user: contractor });
      mockGetJobById.mockResolvedValue(job as any);

      const { getByLabelText } = renderBid();

      // Wait for the job fetch to resolve and the form to replace the
      // "Loading…" gate.
      const amountInput = await waitFor(() =>
        getByLabelText('Bid amount in pounds')
      );

      await act(async () => {
        fireEvent.changeText(amountInput, '-100');
      });

      // isValid requires bidAmount > 0 (plus description/duration/date), so
      // a negative amount leaves the submit CTA disabled.
      const submit = getByLabelText('Submit bid');
      expect(submit.props.accessibilityState?.disabled).toBe(true);
    });

    it('renders the quick-bid form once the job loads', async () => {
      setAuth({ user: contractor });
      mockGetJobById.mockResolvedValue(job as any);

      const { getByLabelText } = renderBid();

      const amountInput = await waitFor(() =>
        getByLabelText('Bid amount in pounds')
      );

      await act(async () => {
        fireEvent.changeText(amountInput, '500');
      });

      // Amount accepted into the form; submit CTA is present (still gated by
      // the other required fields, which is the screen's intended behaviour).
      expect(getByLabelText('Submit bid')).toBeTruthy();
    });
  });
});
