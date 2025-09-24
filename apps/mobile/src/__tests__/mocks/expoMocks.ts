import { jest } from '@jest/globals';

// Expo Modules Mock Factory
export class ExpoMockFactory {
  // Expo Notifications Mock
  static createNotificationsMock() {
    return {
      setNotificationHandler: jest.fn(),
      getPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: 'granted', canAskAgain: true, granted: true })
      ),
      requestPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: 'granted', canAskAgain: true, granted: true })
      ),
      getExpoPushTokenAsync: jest.fn(() =>
        Promise.resolve({ data: 'ExponentPushToken[test-token]' })
      ),
      setNotificationChannelAsync: jest.fn(),
      scheduleNotificationAsync: jest.fn(() =>
        Promise.resolve('notification-id')
      ),
      cancelScheduledNotificationAsync: jest.fn(),
      cancelAllScheduledNotificationsAsync: jest.fn(),
      addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
      addNotificationResponseReceivedListener: jest.fn(() => ({
        remove: jest.fn(),
      })),
      setBadgeCountAsync: jest.fn(),
      getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
      dismissNotificationAsync: jest.fn(),
      dismissAllNotificationsAsync: jest.fn(),
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
    };
  }

  // Expo Device Mock
  static createDeviceMock() {
    return {
      isDevice: true,
      brand: 'Apple',
      manufacturer: 'Apple',
      modelName: 'iPhone 14',
      deviceName: 'Test iPhone',
      osName: 'iOS',
      osVersion: '16.0',
      platformApiLevel: null,
      deviceYearClass: 2022,
      totalMemory: 6442450944,
      supportedCpuArchitectures: ['arm64'],
      DeviceType: {
        PHONE: 1,
        TABLET: 2,
        DESKTOP: 3,
        TV: 4,
        UNKNOWN: 0,
      },
    };
  }

  // Expo Haptics Mock
  static createHapticsMock() {
    return {
      impactAsync: jest.fn(() => Promise.resolve()),
      notificationAsync: jest.fn(() => Promise.resolve()),
      selectionAsync: jest.fn(() => Promise.resolve()),
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
    };
  }

  // Expo Location Mock
  static createLocationMock() {
    return {
      requestForegroundPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: 'granted', canAskAgain: true, granted: true })
      ),
      requestBackgroundPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: 'granted', canAskAgain: true, granted: true })
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
      getLastKnownPositionAsync: jest.fn(),
      watchPositionAsync: jest.fn(),
      geocodeAsync: jest.fn(),
      reverseGeocodeAsync: jest.fn(),
      LocationAccuracy: {
        Lowest: 1,
        Low: 2,
        Balanced: 3,
        High: 4,
        Highest: 5,
        BestForNavigation: 6,
      },
    };
  }

  // Expo SecureStore Mock
  static createSecureStoreMock() {
    const store = new Map<string, string>();

    return {
      getItemAsync: jest.fn((key: string) =>
        Promise.resolve(store.get(key) || null)
      ),
      setItemAsync: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve();
      }),
      deleteItemAsync: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve();
      }),
      isAvailableAsync: jest.fn(() => Promise.resolve(true)),
      __store: store, // For testing purposes
    };
  }

  // Expo Image Picker Mock
  static createImagePickerMock() {
    return {
      launchImageLibraryAsync: jest.fn(() =>
        Promise.resolve({
          canceled: false,
          assets: [
            {
              uri: 'file://test-image.jpg',
              width: 1000,
              height: 1000,
              type: 'image',
              fileSize: 500000,
            },
          ],
        })
      ),
      launchCameraAsync: jest.fn(() =>
        Promise.resolve({
          canceled: false,
          assets: [
            {
              uri: 'file://test-camera-image.jpg',
              width: 1000,
              height: 1000,
              type: 'image',
              fileSize: 500000,
            },
          ],
        })
      ),
      requestMediaLibraryPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: 'granted', canAskAgain: true, granted: true })
      ),
      requestCameraPermissionsAsync: jest.fn(() =>
        Promise.resolve({ status: 'granted', canAskAgain: true, granted: true })
      ),
      MediaTypeOptions: {
        All: 'All',
        Videos: 'Videos',
        Images: 'Images',
      },
      ImagePickerResult: {},
    };
  }

  // Expo Local Authentication Mock
  static createLocalAuthMock() {
    return {
      hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
      isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
      supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1, 2])),
      authenticateAsync: jest.fn(() =>
        Promise.resolve({ success: true, error: undefined })
      ),
      cancelAuthenticate: jest.fn(),
      AuthenticationType: {
        FINGERPRINT: 1,
        FACIAL_RECOGNITION: 2,
        IRIS: 3,
      },
    };
  }

  // Expo Constants Mock
  static createConstantsMock() {
    return {
      default: {
        appOwnership: 'expo',
        name: 'Mintenance Test App',
        slug: 'mintenance-test',
        version: '1.0.0',
        orientation: 'portrait',
        platforms: ['ios', 'android'],
        isDevice: true,
        experienceUrl: 'exp://localhost:19000',
        debugMode: true,
        manifest: {
          name: 'Mintenance Test App',
          version: '1.0.0',
        },
        platform: {
          ios: {
            buildNumber: '1',
            bundleIdentifier: 'com.mintenance.test',
          },
          android: {
            versionCode: 1,
            package: 'com.mintenance.test',
          },
        },
        sessionId: 'test-session-id',
        statusBarHeight: 44,
        systemFonts: ['System'],
        executionEnvironment: 'bare',
      },
    };
  }

  // Expo Font Mock
  static createFontMock() {
    return {
      loadAsync: jest.fn(() => Promise.resolve()),
      isLoaded: jest.fn(() => true),
      isLoading: jest.fn(() => false),
      useFonts: jest.fn(() => [true, null]),
    };
  }

  // Expo Vector Icons Mock
  static createVectorIconsMock() {
    const MockIcon = jest.fn(({ name, size, color, ...props }) => null);
    MockIcon.displayName = 'MockIcon';

    return {
      AntDesign: MockIcon,
      Entypo: MockIcon,
      EvilIcons: MockIcon,
      Feather: MockIcon,
      FontAwesome: MockIcon,
      FontAwesome5: MockIcon,
      Foundation: MockIcon,
      Ionicons: MockIcon,
      MaterialCommunityIcons: MockIcon,
      MaterialIcons: MockIcon,
      Octicons: MockIcon,
      SimpleLineIcons: MockIcon,
      Zocial: MockIcon,
    };
  }

  // Create all Expo mocks
  static createAllMocks() {
    return {
      notifications: this.createNotificationsMock(),
      device: this.createDeviceMock(),
      haptics: this.createHapticsMock(),
      location: this.createLocationMock(),
      secureStore: this.createSecureStoreMock(),
      imagePicker: this.createImagePickerMock(),
      localAuth: this.createLocalAuthMock(),
      constants: this.createConstantsMock(),
      font: this.createFontMock(),
      vectorIcons: this.createVectorIconsMock(),
    };
  }

  // Reset all mocks
  static resetMocks() {
    jest.clearAllMocks();
  }
}

// Export individual mocks for direct use
export const mockExpoNotifications = ExpoMockFactory.createNotificationsMock();
export const mockExpoDevice = ExpoMockFactory.createDeviceMock();
export const mockExpoHaptics = ExpoMockFactory.createHapticsMock();
export const mockExpoLocation = ExpoMockFactory.createLocationMock();
export const mockExpoSecureStore = ExpoMockFactory.createSecureStoreMock();
export const mockExpoImagePicker = ExpoMockFactory.createImagePickerMock();
export const mockExpoLocalAuth = ExpoMockFactory.createLocalAuthMock();
export const mockExpoConstants = ExpoMockFactory.createConstantsMock();
export const mockExpoFont = ExpoMockFactory.createFontMock();
export const mockExpoVectorIcons = ExpoMockFactory.createVectorIconsMock();

// Dummy test to prevent Jest from complaining about no tests
describe('ExpoMockFactory', () => {
  it('should create expo mocks', () => {
    const mocks = ExpoMockFactory.createAllMocks();
    expect(mocks).toBeDefined();
  });
});
