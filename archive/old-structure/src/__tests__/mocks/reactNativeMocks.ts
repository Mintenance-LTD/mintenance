import { jest } from '@jest/globals';

// React Native Mock Factory
export class ReactNativeMockFactory {
  // Platform Mock
  static createPlatformMock() {
    return {
      OS: 'ios' as 'ios' | 'android' | 'web' | 'windows' | 'macos',
      Version: '16.0',
      select: jest.fn((obj: any) => obj.ios || obj.default),
      isPad: false,
      isTVOS: false,
      constants: {
        reactNativeVersion: { major: 0, minor: 70, patch: 0 },
      },
    };
  }

  // Dimensions Mock
  static createDimensionsMock() {
    const mockDimensions = {
      width: 375,
      height: 812,
      scale: 3,
      fontScale: 1,
    };

    return {
      get: jest.fn((dimension: 'window' | 'screen') => mockDimensions),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      set: jest.fn((dims: any) => {
        Object.assign(mockDimensions, dims);
      }),
    };
  }

  // Alert Mock
  static createAlertMock() {
    return {
      alert: jest.fn((title, message, buttons, options) => {
        // Simulate pressing first button
        if (buttons && buttons.length > 0 && buttons[0].onPress) {
          buttons[0].onPress();
        }
      }),
      prompt: jest.fn(),
    };
  }

  // Keyboard Mock
  static createKeyboardMock() {
    return {
      addListener: jest.fn(() => ({ remove: jest.fn() })),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      dismiss: jest.fn(),
      isVisible: jest.fn(() => false),
    };
  }

  // NetInfo Mock
  static createNetInfoMock() {
    return {
      fetch: jest.fn(() =>
        Promise.resolve({
          type: 'wifi',
          isConnected: true,
          isInternetReachable: true,
          details: {
            isConnectionExpensive: false,
            ssid: 'Test WiFi',
            bssid: 'aa:bb:cc:dd:ee:ff',
            strength: 99,
            ipAddress: '192.168.1.100',
            subnet: '255.255.255.0',
            frequency: 2437,
          },
        })
      ),
      addEventListener: jest.fn(() => jest.fn()), // Returns unsubscribe function
      useNetInfo: jest.fn(() => ({
        type: 'wifi',
        isConnected: true,
        isInternetReachable: true,
      })),
      NetInfoStateType: {
        none: 'none',
        unknown: 'unknown',
        cellular: 'cellular',
        wifi: 'wifi',
        bluetooth: 'bluetooth',
        ethernet: 'ethernet',
        wimax: 'wimax',
        vpn: 'vpn',
        other: 'other',
      },
      NetInfoCellularGeneration: {
        '2g': '2g',
        '3g': '3g',
        '4g': '4g',
        '5g': '5g',
      },
    };
  }

  // AsyncStorage Mock
  static createAsyncStorageMock() {
    const storage = new Map<string, string>();

    return {
      getItem: jest.fn((key: string) =>
        Promise.resolve(storage.get(key) || null)
      ),
      setItem: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      removeItem: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      mergeItem: jest.fn((key: string, value: string) => {
        const existing = storage.get(key);
        if (existing) {
          try {
            const existingObj = JSON.parse(existing);
            const newObj = JSON.parse(value);
            storage.set(key, JSON.stringify({ ...existingObj, ...newObj }));
          } catch {
            storage.set(key, value);
          }
        } else {
          storage.set(key, value);
        }
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
      multiGet: jest.fn((keys: string[]) => {
        const result = keys.map((key) => [key, storage.get(key) || null]);
        return Promise.resolve(result);
      }),
      multiSet: jest.fn((keyValuePairs: [string, string][]) => {
        keyValuePairs.forEach(([key, value]) => storage.set(key, value));
        return Promise.resolve();
      }),
      multiRemove: jest.fn((keys: string[]) => {
        keys.forEach((key) => storage.delete(key));
        return Promise.resolve();
      }),
      __storage: storage, // For testing purposes
    };
  }

  // Linking Mock
  static createLinkingMock() {
    return {
      openURL: jest.fn(() => Promise.resolve()),
      canOpenURL: jest.fn(() => Promise.resolve(true)),
      getInitialURL: jest.fn(() => Promise.resolve(null)),
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      sendIntent: jest.fn(),
      openSettings: jest.fn(() => Promise.resolve()),
    };
  }

  // Permissions Mock
  static createPermissionsMock() {
    return {
      check: jest.fn(() => Promise.resolve('granted')),
      request: jest.fn(() => Promise.resolve('granted')),
      requestMultiple: jest.fn(() => Promise.resolve({})),
      openSettings: jest.fn(() => Promise.resolve()),
      PERMISSIONS: {
        ANDROID: {
          CAMERA: 'android.permission.CAMERA',
          READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
          WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
          ACCESS_FINE_LOCATION: 'android.permission.ACCESS_FINE_LOCATION',
        },
        IOS: {
          CAMERA: 'ios.permission.CAMERA',
          PHOTO_LIBRARY: 'ios.permission.PHOTO_LIBRARY',
          LOCATION_WHEN_IN_USE: 'ios.permission.LOCATION_WHEN_IN_USE',
        },
      },
      RESULTS: {
        GRANTED: 'granted',
        DENIED: 'denied',
        BLOCKED: 'blocked',
        UNAVAILABLE: 'unavailable',
      },
    };
  }

  // ErrorUtils Mock
  static createErrorUtilsMock() {
    return {
      setGlobalHandler: jest.fn(),
      getGlobalHandler: jest.fn(),
    };
  }

  // InteractionManager Mock
  static createInteractionManagerMock() {
    return {
      runAfterInteractions: jest.fn((callback) => {
        // Execute immediately in tests
        setTimeout(callback, 0);
        return { cancel: jest.fn() };
      }),
      createInteractionHandle: jest.fn(() => 1),
      clearInteractionHandle: jest.fn(),
      setDeadline: jest.fn(),
    };
  }

  // BackHandler Mock
  static createBackHandlerMock() {
    return {
      addEventListener: jest.fn(() => ({ remove: jest.fn() })),
      removeEventListener: jest.fn(),
      exitApp: jest.fn(),
    };
  }

  // NativeModules Mock
  static createNativeModulesMock() {
    return {
      SettingsManager: {
        settings: {
          AppleLocale: 'en_US',
          AppleLanguages: ['en'],
        },
      },
      PlatformConstants: {
        forceTouchAvailable: false,
      },
      I18nManager: {
        localeIdentifier: 'en_US',
        isRTL: false,
      },
    };
  }

  // Create complete React Native mock
  static createReactNativeMock() {
    const Platform = this.createPlatformMock();
    const Dimensions = this.createDimensionsMock();
    const Alert = this.createAlertMock();
    const Keyboard = this.createKeyboardMock();
    const Linking = this.createLinkingMock();
    const ErrorUtils = this.createErrorUtilsMock();
    const InteractionManager = this.createInteractionManagerMock();
    const BackHandler = this.createBackHandlerMock();
    const NativeModules = this.createNativeModulesMock();

    // Mock React Native components
    const mockComponent = jest.fn(({ children, ...props }) => children);
    mockComponent.displayName = 'MockComponent';

    return {
      Platform,
      Dimensions,
      Alert,
      Keyboard,
      Linking,
      ErrorUtils,
      InteractionManager,
      BackHandler,
      NativeModules,

      // Core Components
      View: mockComponent,
      Text: mockComponent,
      Image: mockComponent,
      TextInput: mockComponent,
      ScrollView: mockComponent,
      TouchableOpacity: mockComponent,
      TouchableHighlight: mockComponent,
      TouchableWithoutFeedback: mockComponent,
      Pressable: mockComponent,
      ActivityIndicator: mockComponent,
      Modal: mockComponent,
      SafeAreaView: mockComponent,
      StatusBar: mockComponent,

      // Layout Components
      FlatList: mockComponent,
      SectionList: mockComponent,
      VirtualizedList: mockComponent,

      // Styles
      StyleSheet: {
        create: jest.fn((styles) => styles),
        flatten: jest.fn((style) => style),
        absoluteFillObject: {
          position: 'absolute',
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
        },
      },

      // Animated
      Animated: {
        View: mockComponent,
        Text: mockComponent,
        ScrollView: mockComponent,
        FlatList: mockComponent,
        Image: mockComponent,
        Value: jest.fn(() => ({
          setValue: jest.fn(),
          addListener: jest.fn(),
          removeListener: jest.fn(),
          removeAllListeners: jest.fn(),
          interpolate: jest.fn(() => ({ __getValue: jest.fn(() => 0) })),
        })),
        ValueXY: jest.fn(),
        timing: jest.fn(() => ({
          start: jest.fn(
            (callback) => callback && callback({ finished: true })
          ),
          stop: jest.fn(),
          reset: jest.fn(),
        })),

        spring: jest.fn(() => ({
          start: jest.fn(
            (callback) => callback && callback({ finished: true })
          ),
          stop: jest.fn(),
          reset: jest.fn(),
        })),
        decay: jest.fn(() => ({
          start: jest.fn(
            (callback) => callback && callback({ finished: true })
          ),
          stop: jest.fn(),
          reset: jest.fn(),
        })),
        sequence: jest.fn(),
        parallel: jest.fn(),
        stagger: jest.fn(),
        loop: jest.fn(),
        delay: jest.fn(),
        event: jest.fn(),
        createAnimatedComponent: jest.fn((Component) => Component),
        Easing: {
          linear: jest.fn(),
          ease: jest.fn(),
          quad: jest.fn(),
          cubic: jest.fn(),
          bezier: jest.fn(),
          sin: jest.fn(),
          circle: jest.fn(),
          exp: jest.fn(),
          elastic: jest.fn(),
          back: jest.fn(),
          bounce: jest.fn(),
        },
      },

      // PanResponder
      PanResponder: {
        create: jest.fn(() => ({
          panHandlers: {},
        })),
      },
    };
  }

  // Reset all mocks
  static resetMocks() {
    jest.clearAllMocks();
  }
}

// Export commonly used mocks
export const mockPlatform = ReactNativeMockFactory.createPlatformMock();
export const mockDimensions = ReactNativeMockFactory.createDimensionsMock();
export const mockAlert = ReactNativeMockFactory.createAlertMock();
export const mockNetInfo = ReactNativeMockFactory.createNetInfoMock();
export const mockAsyncStorage = ReactNativeMockFactory.createAsyncStorageMock();
export const mockPermissions = ReactNativeMockFactory.createPermissionsMock();

// Dummy test to prevent Jest from complaining about no tests
describe('ReactNativeMockFactory', () => {
  it('should create react native mocks', () => {
    expect(ReactNativeMockFactory.createReactNativeMock()).toBeDefined();
  });
});
