import '@testing-library/jest-native/extend-expect';
import 'react-native-gesture-handler/jestSetup';

// Stabilize time and locale for consistent test results
process.env.TZ = 'UTC';

// Setup environment variables for tests
process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test-supabase-url.supabase.co';
process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-supabase-anon-key';

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  const Reanimated = require('react-native-reanimated/mock');
  Reanimated.default.call = () => {};
  return Reanimated;
});

// Mock React Native Animated Helper (conditionally)
jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper', () => {}, {
  virtual: true,
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
}));

// Mock React Native modules
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
}));

jest.mock('expo-notifications', () => ({
  requestPermissionsAsync: jest.fn(() =>
    Promise.resolve({ status: 'granted' })
  ),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[test-token]' })
  ),
  scheduleNotificationAsync: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  setBadgeCountAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: { DEFAULT: 3, HIGH: 4, MAX: 5 },
}));

// Mock expo-device
jest.mock('expo-device', () => ({
  isDevice: false,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

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
}));

// Mock sentry-expo
jest.mock('sentry-expo', () => ({
  init: jest.fn(),
}));

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

// Mock logger service
jest.mock('./src/utils/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    performance: jest.fn(),
    network: jest.fn(),
    userAction: jest.fn(),
    navigation: jest.fn(),
    auth: jest.fn(),
  },
}));

// Mock sentry config
jest.mock('./src/config/sentry', () => ({
  captureMessage: jest.fn(),
  captureException: jest.fn(),
  addBreadcrumb: jest.fn(),
}));

// Mock Supabase
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
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      range: jest.fn().mockReturnThis(),
      single: jest.fn(() => Promise.resolve({ data: null, error: null })),
    })),
  })),
}));

// Mock expo-sqlite (stateful in-memory implementation for tests)
jest.mock('expo-sqlite', () => {
  // Minimal in-memory tables we interact with in tests
  const state = {
    offline_actions: new Map(), // id -> row
    users: new Map(),
    jobs: new Map(),
    messages: new Map(),
    bids: new Map(),
    sync_metadata: new Map(),
  };

  const normalizeRow = (row) => JSON.parse(JSON.stringify(row));

  const db = {
    // DDL is a no-op in tests
    execAsync: jest.fn(async (_sql) => undefined),

    // Very small SQL router for the queries we use
    runAsync: jest.fn(async (sql, params = []) => {
      const q = (sql || '').trim().toUpperCase();

      // INSERT offline_actions
      if (q.startsWith('INSERT OR REPLACE INTO OFFLINE_ACTIONS')) {
        const [id, type, entity, data, max_retries, query_key, created_at] =
          params;
        state.offline_actions.set(id, {
          id,
          type,
          entity,
          data,
          retry_count: 0,
          max_retries,
          query_key,
          created_at,
          synced_at: null,
        });
        return { rowsAffected: 1 };
      }

      // DELETE from offline_actions by id
      if (q.startsWith('DELETE FROM OFFLINE_ACTIONS WHERE ID =')) {
        const [id] = params;
        state.offline_actions.delete(id);
        return { rowsAffected: 1 };
      }

      // DELETE FROM <table>
      if (q.startsWith('DELETE FROM ')) {
        const table = q.replace('DELETE FROM ', '').trim();
        if (table.startsWith('USERS')) state.users.clear();
        else if (table.startsWith('JOBS')) state.jobs.clear();
        else if (table.startsWith('MESSAGES')) state.messages.clear();
        else if (table.startsWith('BIDS')) state.bids.clear();
        else if (table.startsWith('SYNC_METADATA')) state.sync_metadata.clear();
        else if (table.startsWith('OFFLINE_ACTIONS'))
          state.offline_actions.clear();
        return { rowsAffected: 1 };
      }

      // UPDATE <table> ... (we only need to acknowledge)
      if (q.startsWith('UPDATE ')) {
        return { rowsAffected: 1 };
      }

      // Generic INSERT/REPLACE into other tables (store minimal shape)
      if (q.startsWith('INSERT OR REPLACE INTO USERS')) {
        const [id] = params;
        state.users.set(id, { id });
        return { rowsAffected: 1 };
      }
      if (q.startsWith('INSERT OR REPLACE INTO JOBS')) {
        const [id] = params;
        state.jobs.set(id, { id });
        return { rowsAffected: 1 };
      }
      if (q.startsWith('INSERT OR REPLACE INTO MESSAGES')) {
        const [id] = params;
        state.messages.set(id, { id });
        return { rowsAffected: 1 };
      }
      if (q.startsWith('INSERT OR REPLACE INTO BIDS')) {
        const [id] = params;
        state.bids.set(id, { id });
        return { rowsAffected: 1 };
      }
      if (q.startsWith('INSERT OR REPLACE INTO SYNC_METADATA')) {
        const [table_name, last_sync_timestamp, record_count, is_dirty] =
          params;
        state.sync_metadata.set(table_name, {
          table_name,
          last_sync_timestamp,
          record_count,
          is_dirty,
        });
        return { rowsAffected: 1 };
      }

      return { rowsAffected: 0 };
    }),

    // get first row for some count/selects
    getFirstAsync: jest.fn(async (sql, params = []) => {
      const q = (sql || '').trim().toUpperCase();
      if (q.includes('SELECT COUNT(*) AS ACTIONS FROM OFFLINE_ACTIONS')) {
        const actions = Array.from(state.offline_actions.values()).filter(
          (r) => !r.synced_at
        ).length;
        return { actions };
      }
      if (q.startsWith('SELECT * FROM SYNC_METADATA WHERE TABLE_NAME =')) {
        const [tableName] = params;
        const row = state.sync_metadata.get(tableName);
        return row ? normalizeRow(row) : null;
      }
      return null;
    }),

    // get all rows for supported queries
    getAllAsync: jest.fn(async (sql, _params = []) => {
      const q = (sql || '').trim().toUpperCase();
      if (q.startsWith('SELECT * FROM OFFLINE_ACTIONS')) {
        const rows = Array.from(state.offline_actions.values())
          .filter((r) => !r.synced_at)
          .sort((a, b) => (a.created_at || 0) - (b.created_at || 0))
          .map((r) => normalizeRow(r));
        return rows;
      }
      return [];
    }),

    closeAsync: jest.fn(async () => undefined),
    transaction: jest.fn(),
  };

  return {
    openDatabase: jest.fn(() => ({
      transaction: jest.fn(),
      closeAsync: jest.fn(),
    })),
    openDatabaseAsync: jest.fn(async () => db),
  };
});

// Mock navigation
jest.mock('@react-navigation/native', () => ({
  useNavigation: jest.fn(() => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
    setOptions: jest.fn(),
  })),
  useRoute: jest.fn(() => ({ params: {} })),
  useFocusEffect: jest.fn(),
}));

// Mock React Native Maps
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
});

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

// Add global __DEV__ for tests
global.__DEV__ = process.env.NODE_ENV === 'development';

// Silence console warnings in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

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
