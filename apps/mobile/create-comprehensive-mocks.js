import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

logger.info('🔧 Creating comprehensive mock library...\n');

// Create comprehensive React Native mock
const reactNativeMock = `module.exports = {
  // Core Components
  View: 'View',
  Text: 'Text',
  TextInput: 'TextInput',
  ScrollView: 'ScrollView',
  FlatList: 'FlatList',
  SectionList: 'SectionList',
  TouchableOpacity: 'TouchableOpacity',
  TouchableHighlight: 'TouchableHighlight',
  TouchableWithoutFeedback: 'TouchableWithoutFeedback',
  TouchableNativeFeedback: { SelectableBackground: jest.fn() },
  Image: 'Image',
  ImageBackground: 'ImageBackground',
  Switch: 'Switch',
  Button: 'Button',
  ActivityIndicator: 'ActivityIndicator',
  KeyboardAvoidingView: 'KeyboardAvoidingView',
  Modal: 'Modal',
  Pressable: 'Pressable',
  RefreshControl: 'RefreshControl',
  SafeAreaView: 'SafeAreaView',
  StatusBar: 'StatusBar',
  VirtualizedList: 'VirtualizedList',

  // APIs
  Alert: {
    alert: jest.fn((title, message, buttons) => {
      if (buttons && buttons.length > 0) {
        const button = buttons[0];
        if (button.onPress) button.onPress();
      }
    }),
    prompt: jest.fn(),
  },

  Animated: {
    Value: jest.fn(() => ({
      setValue: jest.fn(),
      setOffset: jest.fn(),
      flattenOffset: jest.fn(),
      extractOffset: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
      interpolate: jest.fn(() => ({ getValue: jest.fn(() => 0) })),
      animate: jest.fn(),
    })),
    ValueXY: jest.fn(() => ({
      setValue: jest.fn(),
      setOffset: jest.fn(),
      flattenOffset: jest.fn(),
      extractOffset: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      removeAllListeners: jest.fn(),
      stopAnimation: jest.fn(),
      resetAnimation: jest.fn(),
      getLayout: jest.fn(),
      getTranslateTransform: jest.fn(),
    })),
    timing: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    spring: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    decay: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    sequence: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    parallel: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    delay: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    stagger: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    loop: jest.fn(() => ({ start: jest.fn((cb) => cb && cb({ finished: true })), stop: jest.fn() })),
    event: jest.fn(),
    add: jest.fn(),
    subtract: jest.fn(),
    divide: jest.fn(),
    multiply: jest.fn(),
    modulo: jest.fn(),
    diffClamp: jest.fn(),
    createAnimatedComponent: jest.fn((component) => component),
    View: 'Animated.View',
    Text: 'Animated.Text',
    Image: 'Animated.Image',
    ScrollView: 'Animated.ScrollView',
    FlatList: 'Animated.FlatList',
  },

  AppState: {
    currentState: 'active',
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    isAvailable: true,
  },

  AppRegistry: {
    registerComponent: jest.fn(),
    registerRunnable: jest.fn(),
    registerConfig: jest.fn(),
    getAppKeys: jest.fn(),
    runApplication: jest.fn(),
  },

  BackHandler: {
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    exitApp: jest.fn(),
  },

  Clipboard: {
    getString: jest.fn(() => Promise.resolve('')),
    setString: jest.fn(),
  },

  Dimensions: {
    get: jest.fn((dim) => {
      if (dim === 'window') return { width: 375, height: 812, scale: 2, fontScale: 1 };
      if (dim === 'screen') return { width: 375, height: 812, scale: 2, fontScale: 1 };
      return { width: 375, height: 812 };
    }),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    set: jest.fn(),
  },

  Easing: {
    linear: jest.fn(),
    ease: jest.fn(),
    quad: jest.fn(),
    cubic: jest.fn(),
    poly: jest.fn(),
    sin: jest.fn(),
    circle: jest.fn(),
    exp: jest.fn(),
    elastic: jest.fn(),
    back: jest.fn(),
    bounce: jest.fn(),
    bezier: jest.fn(),
    in: jest.fn(),
    out: jest.fn(),
    inOut: jest.fn(),
  },

  I18nManager: {
    isRTL: false,
    forceRTL: jest.fn(),
    allowRTL: jest.fn(),
    swapLeftAndRightInRTL: jest.fn(),
  },

  InteractionManager: {
    runAfterInteractions: jest.fn((cb) => {
      cb();
      return { then: jest.fn(), done: jest.fn(), cancel: jest.fn() };
    }),
    createInteractionHandle: jest.fn(),
    clearInteractionHandle: jest.fn(),
    setDeadline: jest.fn(),
  },

  Keyboard: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    dismiss: jest.fn(),
    scheduleLayoutAnimation: jest.fn(),
  },

  LayoutAnimation: {
    configureNext: jest.fn(),
    create: jest.fn(),
    Types: { spring: 'spring', linear: 'linear', easeInEaseOut: 'easeInEaseOut' },
    Properties: { opacity: 'opacity', scaleXY: 'scaleXY' },
    Presets: { easeInEaseOut: {}, linear: {}, spring: {} },
    easeInEaseOut: jest.fn(),
    linear: jest.fn(),
    spring: jest.fn(),
  },

  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
    openSettings: jest.fn(() => Promise.resolve()),
    getInitialURL: jest.fn(() => Promise.resolve(null)),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    sendIntent: jest.fn(),
  },

  PanResponder: {
    create: jest.fn(() => ({
      panHandlers: {
        onStartShouldSetPanResponder: jest.fn(),
        onStartShouldSetPanResponderCapture: jest.fn(),
        onMoveShouldSetPanResponder: jest.fn(),
        onMoveShouldSetPanResponderCapture: jest.fn(),
        onPanResponderGrant: jest.fn(),
        onPanResponderMove: jest.fn(),
        onPanResponderRelease: jest.fn(),
        onPanResponderTerminate: jest.fn(),
        onPanResponderTerminationRequest: jest.fn(),
        onShouldBlockNativeResponder: jest.fn(),
      },
    })),
  },

  PermissionsAndroid: {
    request: jest.fn(() => Promise.resolve('granted')),
    requestMultiple: jest.fn(() => Promise.resolve({})),
    check: jest.fn(() => Promise.resolve(true)),
    PERMISSIONS: {
      CAMERA: 'android.permission.CAMERA',
      READ_EXTERNAL_STORAGE: 'android.permission.READ_EXTERNAL_STORAGE',
      WRITE_EXTERNAL_STORAGE: 'android.permission.WRITE_EXTERNAL_STORAGE',
    },
    RESULTS: {
      GRANTED: 'granted',
      DENIED: 'denied',
      NEVER_ASK_AGAIN: 'never_ask_again',
    },
  },

  PixelRatio: {
    get: () => 2,
    getFontScale: () => 1,
    getPixelSizeForLayoutSize: (size) => size * 2,
    roundToNearestPixel: (size) => Math.round(size * 2) / 2,
  },

  Platform: {
    OS: 'ios',
    Version: 14,
    isPad: false,
    isTV: false,
    isTesting: true,
    select: jest.fn((obj) => obj.ios || obj.default),
  },

  Share: {
    share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
  },

  StyleSheet: {
    create: (styles) => styles,
    flatten: (style) => style,
    absoluteFill: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    absoluteFillObject: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
    hairlineWidth: 1,
  },

  Vibration: {
    vibrate: jest.fn(),
    cancel: jest.fn(),
  },

  // Utilities
  DeviceEventEmitter: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  },

  NativeEventEmitter: jest.fn(() => ({
    addListener: jest.fn(() => ({ remove: jest.fn() })),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    emit: jest.fn(),
  })),

  NativeModules: {
    UIManager: {
      RCTView: {
        directEventTypes: {},
      },
    },
    PlatformConstants: {
      forceTouchAvailable: false,
    },
    StatusBarManager: {
      HEIGHT: 20,
    },
    KeyboardObserver: {},
    RNGestureHandlerModule: {
      State: {
        UNDETERMINED: 0,
        FAILED: 1,
        BEGAN: 2,
        CANCELLED: 3,
        ACTIVE: 4,
        END: 5,
      },
    },
  },

  requireNativeComponent: jest.fn(() => 'Component'),
  unstable_batchedUpdates: jest.fn((cb) => cb()),
  findNodeHandle: jest.fn(),

  // Additional utilities
  AccessibilityInfo: {
    fetch: jest.fn(() => Promise.resolve({})),
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
    removeEventListener: jest.fn(),
    announceForAccessibility: jest.fn(),
    isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  },

  ToastAndroid: {
    show: jest.fn(),
    showWithGravity: jest.fn(),
    SHORT: 0,
    LONG: 1,
    TOP: 0,
    BOTTOM: 1,
    CENTER: 2,
  },
};`;

// Create expo-constants mock
const expoConstantsMock = `module.exports = {
  AppOwnership: {
    Expo: 'expo',
    Standalone: 'standalone',
  },
  ExecutionEnvironment: {
    Bare: 'bare',
    Standalone: 'standalone',
    StoreClient: 'storeClient',
  },
  default: {
    appOwnership: 'expo',
    executionEnvironment: 'standalone',
    expoVersion: '49.0.0',
    manifest: {
      name: 'mintenance',
      slug: 'mintenance',
      version: '1.0.0',
      sdkVersion: '49.0.0',
    },
    platform: {
      ios: {
        model: 'iPhone 13',
        systemVersion: '15.0',
      },
      android: {
        versionCode: 1,
      },
    },
  },
};`;

// Create expo-notifications mock
const expoNotificationsMock = `module.exports = {
  requestPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
    expires: 'never',
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
  })),
  getPermissionsAsync: jest.fn(() => Promise.resolve({
    status: 'granted',
    expires: 'never',
    permissions: {
      alert: true,
      badge: true,
      sound: true,
    },
  })),
  getExpoPushTokenAsync: jest.fn(() => Promise.resolve({
    data: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    type: 'expo',
  })),
  setNotificationHandler: jest.fn(),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('notification-id-123')),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  cancelAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve()),
  getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
  presentNotificationAsync: jest.fn(() => Promise.resolve('notification-id-123')),
  dismissNotificationAsync: jest.fn(() => Promise.resolve()),
  dismissAllNotificationsAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn((handler) => ({
    remove: jest.fn()
  })),
  addNotificationResponseReceivedListener: jest.fn((handler) => ({
    remove: jest.fn()
  })),
  addNotificationsDroppedListener: jest.fn((handler) => ({
    remove: jest.fn()
  })),
  setBadgeCountAsync: jest.fn(() => Promise.resolve(true)),
  getBadgeCountAsync: jest.fn(() => Promise.resolve(0)),
  AndroidImportance: {
    MIN: 1,
    LOW: 2,
    DEFAULT: 3,
    HIGH: 4,
    MAX: 5,
  },
  AndroidNotificationPriority: {
    MIN: 'min',
    LOW: 'low',
    DEFAULT: 'default',
    HIGH: 'high',
    MAX: 'max',
  },
};`;

// Create react-native-gesture-handler mock
const gestureHandlerMock = `import React from 'react';

export const State = {
  UNDETERMINED: 0,
  FAILED: 1,
  BEGAN: 2,
  CANCELLED: 3,
  ACTIVE: 4,
  END: 5,
};

export const Directions = {
  RIGHT: 1,
  LEFT: 2,
  UP: 4,
  DOWN: 8,
};

const createMockComponent = (name) => {
  return React.forwardRef((props, ref) => {
    return React.createElement('View', { ...props, ref });
  });
};

export const BaseButton = createMockComponent('BaseButton');
export const BorderlessButton = createMockComponent('BorderlessButton');
export const RawButton = createMockComponent('RawButton');
export const RectButton = createMockComponent('RectButton');

export const FlatList = createMockComponent('FlatList');
export const ScrollView = createMockComponent('ScrollView');
export const Switch = createMockComponent('Switch');
export const TextInput = createMockComponent('TextInput');
export const DrawerLayout = createMockComponent('DrawerLayout');

export const NativeViewGestureHandler = createMockComponent('NativeViewGestureHandler');
export const TapGestureHandler = createMockComponent('TapGestureHandler');
export const LongPressGestureHandler = createMockComponent('LongPressGestureHandler');
export const PanGestureHandler = createMockComponent('PanGestureHandler');
export const PinchGestureHandler = createMockComponent('PinchGestureHandler');
export const RotationGestureHandler = createMockComponent('RotationGestureHandler');
export const FlingGestureHandler = createMockComponent('FlingGestureHandler');
export const ForceTouchGestureHandler = createMockComponent('ForceTouchGestureHandler');

export const GestureHandlerRootView = ({ children }) => children;
export const GestureDetector = ({ children }) => children;

export const gestureHandlerRootHOC = (Component) => Component;
export const TouchableOpacity = createMockComponent('TouchableOpacity');
export const TouchableHighlight = createMockComponent('TouchableHighlight');
export const TouchableWithoutFeedback = createMockComponent('TouchableWithoutFeedback');
export const TouchableNativeFeedback = createMockComponent('TouchableNativeFeedback');

export const Swipeable = createMockComponent('Swipeable');

export default {
  State,
  Directions,
  BaseButton,
  BorderlessButton,
  RawButton,
  RectButton,
  FlatList,
  ScrollView,
  Switch,
  TextInput,
  DrawerLayout,
  NativeViewGestureHandler,
  TapGestureHandler,
  LongPressGestureHandler,
  PanGestureHandler,
  PinchGestureHandler,
  RotationGestureHandler,
  FlingGestureHandler,
  ForceTouchGestureHandler,
  GestureHandlerRootView,
  GestureDetector,
  gestureHandlerRootHOC,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  TouchableNativeFeedback,
  Swipeable,
};`;

// Write the mock files
const mocksDir = path.join(__dirname, '__mocks__');

// Update react-native mock
fs.writeFileSync(path.join(mocksDir, 'react-native.js'), reactNativeMock);
logger.info('  ✅ Updated __mocks__/react-native.js');

// Update expo-constants mock
fs.writeFileSync(path.join(mocksDir, 'expo-constants.js'), expoConstantsMock);
logger.info('  ✅ Updated __mocks__/expo-constants.js');

// Update expo-notifications mock
fs.writeFileSync(path.join(mocksDir, 'expo-notifications.js'), expoNotificationsMock);
logger.info('  ✅ Updated __mocks__/expo-notifications.js');

// Update react-native-gesture-handler mock
fs.writeFileSync(path.join(mocksDir, 'react-native-gesture-handler.js'), gestureHandlerMock);
logger.info('  ✅ Updated __mocks__/react-native-gesture-handler.js');

logger.info('\n✨ Comprehensive mock library created successfully!');