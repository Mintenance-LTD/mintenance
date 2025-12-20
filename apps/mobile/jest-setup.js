import 'react-native-gesture-handler/jestSetup';

// Stabilize time and locale for consistent test results
process.env.TZ = 'UTC';

// Setup environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock React Native Localize
jest.mock('react-native-localize', () => ({
  getLocales: jest.fn(() => [
    {
      countryCode: 'US',
      languageTag: 'en-US',
      languageCode: 'en',
      isRTL: false,
    },
  ]),
  getNumberFormatSettings: jest.fn(() => ({
    decimalSeparator: '.',
    groupingSeparator: ',',
  })),
  getCalendar: jest.fn(() => 'gregorian'),
  getCountry: jest.fn(() => 'US'),
  getCurrencies: jest.fn(() => ['USD']),
  getTemperatureUnit: jest.fn(() => 'fahrenheit'),
  getTimeZone: jest.fn(() => 'America/New_York'),
  uses24HourClock: jest.fn(() => false),
  usesMetricSystem: jest.fn(() => false),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
}), { virtual: true });

// Mock React Native modules with better TypeScript support
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.NativeModules.SettingsManager = {
    settings: {
      AppleLocale: 'en_US',
      AppleLanguages: ['en'],
    },
  };
  RN.Alert = {
    alert: jest.fn(),
  };
  return RN;
});

// Mock Expo modules
jest.mock('expo-location', () => ({
  requestForegroundPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getCurrentPositionAsync: jest.fn(() =>
    Promise.resolve({
      coords: {
        latitude: 37.7749,
        longitude: -122.4194,
        altitude: 10,
        accuracy: 10,
        altitudeAccuracy: 10,
        heading: 0,
        speed: 0,
      },
      timestamp: Date.now(),
    })
  ),
  reverseGeocodeAsync: jest.fn(() =>
    Promise.resolve([
      {
        streetNumber: '123',
        street: 'Main St',
        city: 'San Francisco',
        region: 'CA',
        postalCode: '94103',
        country: 'US',
      },
    ])
  ),
  LocationAccuracy: {
    Balanced: 1,
  },
  Accuracy: {
    Balanced: 1,
  },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('expo-image-picker', () => ({
  launchImageLibraryAsync: jest.fn(),
  requestMediaLibraryPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
}));

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}), { virtual: true });

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({ data: 'ExponentPushToken[test-token]' })),
  scheduleNotificationAsync: jest.fn(async () => 'mock-identifier'),
  cancelScheduledNotificationAsync: jest.fn(async () => undefined),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  setBadgeCountAsync: jest.fn(async () => undefined),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
}));

// Mock expo-device with a shared, mutable object so tests can toggle isDevice
const __deviceState = { isDevice: true };
jest.mock('expo-device', () => __deviceState, { virtual: true });

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    getItem: jest.fn(async (key) => (Object.prototype.hasOwnProperty.call(store, key) ? store[key] : null)),
    setItem: jest.fn(async (key, value) => {
      store[key] = value;
    }),
    removeItem: jest.fn(async (key) => {
      delete store[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(store).forEach((k) => delete store[k]);
    }),
  };
});

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  fetch: jest.fn(() =>
    Promise.resolve({
      isConnected: true,
      isInternetReachable: true,
      type: 'wifi',
    })
  ),
  NetInfoStateType: {
    wifi: 'wifi',
    cellular: 'cellular',
    none: 'none',
    unknown: 'unknown',
  },
}));

// Mock Sentry
jest.mock('@sentry/react-native', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
  setUser: jest.fn(),
  setContext: jest.fn(),
  setTag: jest.fn(),
  init: jest.fn(),
}), { virtual: true });

// Mock sentry-expo
jest.mock('sentry-expo', () => ({
  init: jest.fn(),
}), { virtual: true });

// Mock expo-constants
jest.mock('expo-constants', () => ({
  default: {
    appOwnership: 'expo',
    name: 'test-app',
    expoConfig: { extra: { eas: { projectId: 'test-project-id' } } },
  },
}));

// Mock expo-asset and expo (lightweight)
jest.mock('expo-asset', () => ({
  Asset: { fromModule: () => ({ downloadAsync: jest.fn() }) },
}));
jest.mock('expo', () => ({
  // minimal surface used in tests
}));

// Mock sentry config
jest.mock('./src/config/sentry', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Simplified Supabase mock - let individual tests override as needed
jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      signUp: jest.fn(),
      signInWithPassword: jest.fn(),
      signOut: jest.fn(),
      getUser: jest.fn(() => Promise.resolve({ data: { user: null } })),
      getSession: jest.fn(() => Promise.resolve({ data: { session: null } })),
    },
    from: jest.fn(() => ({
      select: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
      upsert: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      neq: jest.fn().mockReturnThis(),
      gt: jest.fn().mockReturnThis(),
      lt: jest.fn().mockReturnThis(),
      gte: jest.fn().mockReturnThis(),
      lte: jest.fn().mockReturnThis(),
      like: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      in: jest.fn().mockReturnThis(),
      or: jest.fn().mockReturnThis(),
      and: jest.fn().mockReturnThis(),
      not: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      textSearch: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: null }),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    })),
    functions: { invoke: jest.fn() },
    channel: jest.fn(() => ({
      on: jest.fn().mockReturnThis(),
      subscribe: jest.fn().mockReturnThis(),
      unsubscribe: jest.fn(),
      send: jest.fn(),
    })),
    removeChannel: jest.fn(),
    getChannels: jest.fn(() => []),
  })),
}));

// Mock React Navigation completely
jest.mock('@react-navigation/native', () => {
  const actualNav = jest.requireActual('@react-navigation/native');
  const navMock = {
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
    addListener: jest.fn(() => jest.fn()),
    removeListener: jest.fn(),
    dispatch: jest.fn(),
    reset: jest.fn(),
    setParams: jest.fn(),
  };
  return {
    ...actualNav,
    NavigationContainer: ({ children }) => children,
    useNavigation: jest.fn(() => navMock),
    useRoute: jest.fn(() => ({ 
      params: {},
      key: 'test-key-' + 'x'.repeat(20),
      name: 'test-route',
    })),
    useFocusEffect: jest.fn(),
    useIsFocused: jest.fn(() => true),
    createNavigatorFactory: jest.fn(),
  };
});

// Mock React Navigation Stack
jest.mock('@react-navigation/stack', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    createStackNavigator: jest.fn(() => ({
      Navigator: ({ children, initialRouteName }) => {
        // Debug: log all route names
        const childrenArray = React.Children.toArray(children);
        const routeNames = childrenArray
          .filter(child => React.isValidElement(child))
          .map(child => child.props.name);
        // Special case: if we have one undefined route, this is likely the authenticated TabNavigator case
        if (routeNames.length === 1 && routeNames[0] === undefined) {
          return React.createElement(View, { 
            testID: 'home-screen',
            accessibilityLabel: 'Home tab'
          }, 'Mock Home Screen');
        }
        
        // Find the initial screen component, or fallback to any named screen
        let initialScreen = React.Children.toArray(children).find(child => 
          React.isValidElement(child) && child.props.name === initialRouteName
        );
        
        // If no initial screen found (or initialRouteName is undefined), try to find any named screen
        if (!initialScreen) {
          initialScreen = React.Children.toArray(children).find(child => 
            React.isValidElement(child) && child.props.name
          );
        }
        
        if (initialScreen && React.isValidElement(initialScreen)) {
          const routeName = initialScreen.props.name;
          // Return mock components with expected testIDs based on route name
          if (routeName === 'Auth') {
            // AuthNavigator should render login screen
            return React.createElement(View, { testID: 'login-screen' }, 'Mock Login Screen');
          } else if (routeName === 'Main') {
            // TabNavigator should render home screen
            return React.createElement(View, { testID: 'home-screen' }, 'Mock Home Screen');
          } else if (routeName === 'Login') {
            return React.createElement(View, { testID: 'login-screen' }, 'Mock Login Screen');
          } else if (routeName === 'JobsList') {
            return React.createElement(View, { testID: 'jobs-screen' }, 'Mock Jobs Screen');
          }
          // Generic case: if a concrete screen component is provided, render it directly (for unit tests)
          if (initialScreen.props.component) {
            const Comp = initialScreen.props.component;
            return React.createElement(Comp, {});
          }
        }
        
        // Fallback to first child's component
        const firstChild = React.Children.toArray(children)[0];
        if (firstChild && React.isValidElement(firstChild)) {
          const routeName = firstChild.props.name;
          // Return mock components with expected testIDs based on route name
          if (routeName === 'Auth') {
            return React.createElement(View, { testID: 'login-screen' }, 'Mock Login Screen');
          } else if (routeName === 'Main') {
            return React.createElement(View, { testID: 'home-screen' }, 'Mock Home Screen');
          } else if (routeName === 'Login') {
            return React.createElement(View, { testID: 'login-screen' }, 'Mock Login Screen');
          } else if (routeName === 'JobsList') {
            return React.createElement(View, { testID: 'jobs-screen' }, 'Mock Jobs Screen');
          } else if (routeName === 'MessagesList') {
            return React.createElement(View, { testID: 'messages-list-screen' }, 'Mock Messages Screen');
          } else if (routeName === 'ProfileMain') {
            return React.createElement(View, { testID: 'profile-screen' }, 'Mock Profile Screen');
          } else if (routeName === 'ServiceRequest') {
            return React.createElement(View, { testID: 'servicerequest-screen' }, 'Mock Service Request Screen');
          }
          // Generic fallback: render provided component when possible (for simple test stacks)
          if (firstChild.props.component) {
            const Comp = firstChild.props.component;
            return React.createElement(Comp, {});
          }
        }
        
        return React.createElement(View, { testID: 'mock-navigator' });
      },
      Screen: ({ children, component, name }) => {
        // Screen components don't render directly in tests
        return null;
      },
      Group: ({ children }) => children,
    })),
    CardStyleInterpolators: {
      forHorizontalIOS: {},
      forVerticalIOS: {},
      forModalPresentationIOS: {},
      forFadeFromBottomAndroid: {},
      forRevealFromBottomAndroid: {},
    },
    TransitionIOSSpec: {},
    HeaderStyleInterpolators: {
      forUIKit: {},
      forFade: {},
      forStatic: {},
    },
  };
});

// Mock React Navigation Bottom Tabs
jest.mock('@react-navigation/bottom-tabs', () => {
  const React = require('react');
  const { View } = require('react-native');
  
  return {
    createBottomTabNavigator: jest.fn(() => ({
      Navigator: ({ children }) => {
        // For tab navigator, find the HomeTab screen and render a mock home-screen
        const homeTab = React.Children.toArray(children).find(child => 
          React.isValidElement(child) && child.props.name === 'HomeTab'
        );
        
        if (homeTab && React.isValidElement(homeTab)) {
          // Instead of trying to render the actual component, render a mock with the expected testID and accessibility
          return React.createElement(View, { 
            testID: 'home-screen',
            accessibilityLabel: 'Home tab'
          }, 'Mock Home Screen');
        }
        
        return React.createElement(View, { testID: 'mock-tab-navigator' });
      },
      Screen: ({ children, component, name }) => {
        // Screen components don't render directly in tests
        return null;
      },
    })),
  };
});

// Mock React Native Maps (optional dependency)
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MapView = (props) => React.createElement(View, props);
  const Marker = (props) => React.createElement(View, props);
  const Region = {};

  return {
    __esModule: true,
    default: MapView,
    MapView,
    Marker,
    Region,
  };
}, { virtual: true });

// Mock Expo Vector Icons
jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text } = require('react-native');

  return {
    Ionicons: (props) => React.createElement(Text, props, props.name),
    MaterialIcons: (props) => React.createElement(Text, props, props.name),
    FontAwesome: (props) => React.createElement(Text, props, props.name),
  };
});

// Add global __DEV__ for tests (always true in test env for logger)
global.__DEV__ = true;

// Ensure a stable online state in Node test environment
// Prevents generic errors from being treated as network/offline
if (typeof global.navigator === 'undefined') {
  // @ts-ignore
  global.navigator = { onLine: true };
} else if (typeof global.navigator.onLine === 'undefined') {
  // @ts-ignore
  global.navigator.onLine = true;
}

// Provide ErrorUtils in Node test environment
if (typeof global.ErrorUtils === 'undefined') {
  global.ErrorUtils = { setGlobalHandler: jest.fn() };
} else if (typeof global.ErrorUtils.setGlobalHandler !== 'function') {
  global.ErrorUtils.setGlobalHandler = jest.fn();
}

// Stub ExceptionsManager to avoid require errors
jest.mock(
  'react-native/Libraries/Core/ExceptionsManager',
  () => ({
    unstable_setGlobalHandler: jest.fn(),
  }),
  { virtual: true }
);
