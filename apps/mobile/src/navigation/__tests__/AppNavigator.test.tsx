// expo-linking pulls in expo-modules-core whose native EventEmitter is
// undefined under jest (the JS-only test runtime has no native module
// host). deepLinking.ts → AppNavigator import it at module load, so stub
// the handful of methods deepLinking touches.
jest.mock('expo-linking', () => ({
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  createURL: jest.fn((path: string) => `mintenance://${path}`),
  parse: jest.fn(() => ({ path: '', queryParams: {} })),
}));

// jest-setup.js mocks reanimated via `require('react-native-reanimated/mock')`,
// but that path crashes under the installed reanimated v4 (its mock pulls in
// NativeReanimatedModule). Override here with a self-contained mock so the
// animation primitives in the screen import graph load cleanly. (Re-requiring
// the repo's __mocks__ file recurses through the moduleNameMapper, so the mock
// is inlined instead.)
jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  const noop = () => undefined;
  return {
    __esModule: true,
    default: {
      createAnimatedComponent: (c: unknown) => c,
      View: RN.View,
      Text: RN.Text,
      Image: RN.Image,
      ScrollView: RN.ScrollView,
    },
    useSharedValue: (v: unknown) => ({ value: v }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    useAnimatedGestureHandler: () => ({}),
    useAnimatedScrollHandler: () => ({}),
    useAnimatedRef: () => ({ current: null }),
    useDerivedValue: (fn: () => unknown) => ({ value: fn() }),
    withSpring: (v: unknown) => v,
    withTiming: (v: unknown) => v,
    withDelay: (_d: number, a: unknown) => a,
    withSequence: (...a: unknown[]) => a[0],
    withRepeat: (a: unknown) => a,
    cancelAnimation: noop,
    runOnJS: (fn: unknown) => fn,
    runOnUI: (fn: unknown) => fn,
    interpolate: noop,
    Extrapolate: { EXTEND: 'extend', CLAMP: 'clamp', IDENTITY: 'identity' },
    Easing: new Proxy({}, { get: () => noop }),
  };
});

// expo-modules-core's native EventEmitter / module proxy are undefined under
// the JS-only jest runtime, so every expo-* package that touches them throws
// at import. Neutralise the core so the wide screen import graph loads.
jest.mock('expo-modules-core', () => {
  class EventEmitter {
    addListener = jest.fn(() => ({ remove: jest.fn() }));
    removeAllListeners = jest.fn();
    removeSubscription = jest.fn();
    emit = jest.fn();
  }
  class NativeModule {}
  class SharedObject {}
  return {
    EventEmitter,
    NativeModule,
    SharedObject,
    NativeModulesProxy: new Proxy({}, { get: () => ({}) }),
    requireNativeModule: jest.fn(() => ({})),
    requireOptionalNativeModule: jest.fn(() => null),
    registerWebModule: jest.fn(),
    Platform: { OS: 'ios' },
    uuid: { v4: () => 'test-uuid' },
  };
});

// expo-task-manager (via BackgroundLocationTask) is a thin TaskManager API.
jest.mock('expo-task-manager', () => ({
  defineTask: jest.fn(),
  isTaskRegisteredAsync: jest.fn(() => Promise.resolve(false)),
  unregisterTaskAsync: jest.fn(() => Promise.resolve()),
  unregisterAllTasksAsync: jest.fn(() => Promise.resolve()),
  getRegisteredTasksAsync: jest.fn(() => Promise.resolve([])),
}));

// expo-screen-capture (via useScreenCaptureGuard) also reaches into
// expo-modules-core's native EventEmitter. No-op the guard API.
jest.mock('expo-screen-capture', () => ({
  preventScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  allowScreenCaptureAsync: jest.fn(() => Promise.resolve()),
  usePreventScreenCapture: jest.fn(),
}));

// jest-setup stubs createNavigatorFactory to a no-op, which breaks the
// native-stack / bottom-tabs factories AppNavigator builds at module load.
// Provide lightweight Navigator/Screen factories instead.
const makeNavigatorMock = () => {
  const React = require('react');
  return jest.fn(() => ({
    Navigator: ({ children }: { children?: unknown }) =>
      React.createElement(React.Fragment, null, children),
    Screen: () => null,
    Group: ({ children }: { children?: unknown }) =>
      React.createElement(React.Fragment, null, children),
  }));
};

jest.mock('@react-navigation/native-stack', () => ({
  createNativeStackNavigator: makeNavigatorMock(),
}));

jest.mock('@react-navigation/bottom-tabs', () => ({
  createBottomTabNavigator: makeNavigatorMock(),
}));

jest.mock('@expo/vector-icons/Ionicons', () => {
  return function MockIonicons() {
    return null;
  };
});

// This is a structural smoke test ("AppNavigator exports a component"). The
// real feature navigators / screens drag in the entire app graph (AI
// services, location/task managers, Stripe, etc.) which is not the unit under
// test. Stub them so AppNavigator's own module loads in isolation. Mirrors
// the screens' export shape: navigators are default exports, the core/booking
// screens are named exports.
const stubComponent = () => null;

jest.mock('../navigators/AuthNavigator', () => ({
  __esModule: true,
  default: stubComponent,
}));
jest.mock('../navigators/JobsNavigator', () => ({
  __esModule: true,
  default: stubComponent,
}));
jest.mock('../navigators/MessagingNavigator', () => ({
  __esModule: true,
  default: stubComponent,
}));
jest.mock('../navigators/ProfileNavigator', () => ({
  __esModule: true,
  default: stubComponent,
}));
jest.mock('../navigators/BusinessNavigator', () => ({
  __esModule: true,
  default: stubComponent,
}));
jest.mock('../navigators/ModalNavigator', () => ({
  __esModule: true,
  default: stubComponent,
}));
jest.mock('../../screens/home', () => ({ HomeScreen: stubComponent }));
jest.mock('../../screens/explore-map/ExploreMapScreen', () => ({
  ExploreMapScreen: stubComponent,
}));
jest.mock('../../screens/job-posting/QuickJobModal', () => ({
  QuickJobModal: stubComponent,
}));
jest.mock('../../screens/booking/RescheduleBookingScreen', () => ({
  RescheduleBookingScreen: stubComponent,
}));
jest.mock('../../screens/booking/RateBookingScreen', () => ({
  RateBookingScreen: stubComponent,
}));
jest.mock('../../screens/booking/BookingDetailsScreen', () => ({
  BookingDetailsScreen: stubComponent,
}));
jest.mock('../../components/onboarding/OnboardingGateStack', () => ({
  OnboardingGateStack: stubComponent,
}));
jest.mock('../../components/OfflineSyncStatus', () => ({
  __esModule: true,
  default: stubComponent,
}));
jest.mock('../../services/NotificationService', () => ({
  NotificationService: { getInstance: jest.fn(() => ({})) },
}));
jest.mock('../../hooks/useMessaging', () => ({
  useUnreadMessageCount: jest.fn(() => 0),
}));
jest.mock('../../hooks/useEnsurePushTokenRegistered', () => ({
  useEnsurePushTokenRegistered: jest.fn(),
}));
jest.mock('../../hooks/useAssignedJobLocationAutoStart', () => ({
  useAssignedJobLocationAutoStart: jest.fn(),
}));

import AppNavigator from '../AppNavigator';

describe('AppNavigator', () => {
  it('exports a component', () => {
    expect(AppNavigator).toBeDefined();
    expect(typeof AppNavigator).toBe('function');
  });
});
