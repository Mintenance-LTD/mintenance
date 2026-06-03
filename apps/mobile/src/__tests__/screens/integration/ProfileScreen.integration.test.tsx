import React from 'react';
import { Alert } from 'react-native';
import { fireEvent, render, waitFor } from '../test-utils';

// jest-setup.js mocks `react-native-reanimated` via the upstream
// `react-native-reanimated/mock`, which throws under this RN/reanimated
// version (NativeReanimatedModule access at import time). ProfileScreen pulls
// in `components/animations/primitives` (FadeIn/SlideIn) which imports
// reanimated, so override with the repo's local passthrough mock.
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const passthrough = (value: unknown) => value;
  const Easing = new Proxy({}, { get: () => () => {} });
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (Component: unknown) => Component,
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
      call: () => {},
    },
    useSharedValue: (initialValue: unknown) => ({ value: initialValue }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    useAnimatedRef: () => ({ current: null }),
    useAnimatedGestureHandler: () => ({}),
    useAnimatedScrollHandler: () => ({}),
    withTiming: passthrough,
    withSpring: passthrough,
    withDelay: (_delay: number, animation: unknown) => animation,
    withSequence: (...animations: unknown[]) => animations[0],
    withRepeat: (animation: unknown) => animation,
    cancelAnimation: () => {},
    runOnJS: (fn: unknown) => fn,
    runOnUI: (fn: unknown) => fn,
    interpolate: () => 0,
    Extrapolate: { EXTEND: 'extend', CLAMP: 'clamp', IDENTITY: 'identity' },
    Easing,
  };
});

import ProfileScreen from '../../../screens/ProfileScreen';
import { JobService } from '../../../services/JobService';

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }: { children: React.ReactNode }) => children,
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), getParent: jest.fn() }),
}));

jest.mock('../../../services/NotificationService', () => ({
  NotificationService: {
    getUnreadCount: jest.fn().mockResolvedValue(0),
  },
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
