import { logger } from '@mintenance/shared';

#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

logger.info('🔧 Adding comprehensive React Native platform mocks...\n');

// Create comprehensive platform mocks in __mocks__ directory
const mocksDir = path.join(__dirname, '__mocks__');

// 1. Create/Update react-native mock
const reactNativeMock = `// Comprehensive React Native mock
const React = require('react');

// Core components
const View = ({ children, ...props }) => React.createElement('View', props, children);
const Text = ({ children, ...props }) => React.createElement('Text', props, children);
const TextInput = React.forwardRef((props, ref) => React.createElement('TextInput', { ...props, ref }));
const ScrollView = ({ children, ...props }) => React.createElement('ScrollView', props, children);
const TouchableOpacity = ({ children, ...props }) => React.createElement('TouchableOpacity', props, children);
const TouchableHighlight = ({ children, ...props }) => React.createElement('TouchableHighlight', props, children);
const TouchableWithoutFeedback = ({ children, ...props }) => React.createElement('TouchableWithoutFeedback', props, children);
const Image = (props) => React.createElement('Image', props);
const FlatList = React.forwardRef((props, ref) => React.createElement('FlatList', { ...props, ref }));
const SectionList = React.forwardRef((props, ref) => React.createElement('SectionList', { ...props, ref }));
const Modal = ({ children, ...props }) => React.createElement('Modal', props, children);
const ActivityIndicator = (props) => React.createElement('ActivityIndicator', props);
const Switch = (props) => React.createElement('Switch', props);
const RefreshControl = (props) => React.createElement('RefreshControl', props);
const Button = (props) => React.createElement('Button', props);
const StatusBar = (props) => React.createElement('StatusBar', props);
const SafeAreaView = ({ children, ...props }) => React.createElement('SafeAreaView', props, children);
const KeyboardAvoidingView = ({ children, ...props }) => React.createElement('KeyboardAvoidingView', props, children);
const VirtualizedList = React.forwardRef((props, ref) => React.createElement('VirtualizedList', { ...props, ref }));

// Platform APIs
const Platform = {
  OS: 'ios',
  Version: 14,
  isPad: false,
  isTV: false,
  isTVOS: false,
  select: (obj) => obj.ios || obj.default,
};

const Dimensions = {
  get: jest.fn(() => ({ width: 375, height: 812, scale: 2, fontScale: 1 })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  set: jest.fn(),
};

const Alert = {
  alert: jest.fn((title, message, buttons) => {
    if (buttons && buttons[0] && buttons[0].onPress) {
      buttons[0].onPress();
    }
  }),
};

const Linking = {
  openURL: jest.fn(() => Promise.resolve()),
  canOpenURL: jest.fn(() => Promise.resolve(true)),
  getInitialURL: jest.fn(() => Promise.resolve(null)),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
};

const Keyboard = {
  dismiss: jest.fn(),
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
};

const InteractionManager = {
  runAfterInteractions: jest.fn((callback) => {
    callback();
    return { cancel: jest.fn() };
  }),
  createInteractionHandle: jest.fn(),
  clearInteractionHandle: jest.fn(),
  setDeadline: jest.fn(),
};

const AppState = {
  currentState: 'active',
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
};

const PermissionsAndroid = {
  request: jest.fn(() => Promise.resolve('granted')),
  requestMultiple: jest.fn(() => Promise.resolve({})),
  check: jest.fn(() => Promise.resolve(true)),
  PERMISSIONS: {},
  RESULTS: {
    GRANTED: 'granted',
    DENIED: 'denied',
    NEVER_ASK_AGAIN: 'never_ask_again',
  },
};

const Share = {
  share: jest.fn(() => Promise.resolve({ action: 'sharedAction' })),
};

const Vibration = {
  vibrate: jest.fn(),
  cancel: jest.fn(),
};

const Clipboard = {
  getString: jest.fn(() => Promise.resolve('')),
  setString: jest.fn(),
};

const BackHandler = {
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  exitApp: jest.fn(),
};

const DeviceEventEmitter = {
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
};

const NativeEventEmitter = jest.fn(() => ({
  addListener: jest.fn(() => ({ remove: jest.fn() })),
  removeListener: jest.fn(),
  removeAllListeners: jest.fn(),
  emit: jest.fn(),
}));

const NativeModules = {
  StatusBarManager: {
    HEIGHT: 20,
    getHeight: jest.fn((callback) => callback({ height: 20 })),
  },
  SettingsManager: {
    settings: {},
  },
  UIManager: {
    RCTView: {
      directEventTypes: {},
    },
    getViewManagerConfig: jest.fn(() => ({})),
  },
  PlatformConstants: {
    forceTouchAvailable: false,
  },
  DeviceInfo: {
    Dimensions: {
      window: { width: 375, height: 812 },
      screen: { width: 375, height: 812 },
    },
  },
};

const Animated = {
  View: View,
  Text: Text,
  ScrollView: ScrollView,
  Image: Image,
  FlatList: FlatList,
  createAnimatedComponent: (comp) => comp,
  timing: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  spring: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  decay: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  parallel: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  sequence: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  loop: jest.fn(() => ({
    start: jest.fn((callback) => callback && callback({ finished: true })),
    stop: jest.fn(),
    reset: jest.fn(),
  })),
  Value: jest.fn((value) => ({
    setValue: jest.fn(),
    setOffset: jest.fn(),
    flattenOffset: jest.fn(),
    extractOffset: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
    removeAllListeners: jest.fn(),
    stopAnimation: jest.fn(),
    interpolate: jest.fn(() => new Animated.Value(value)),
    _value: value,
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
    getLayout: jest.fn(),
    getTranslateTransform: jest.fn(),
    x: new Animated.Value(0),
    y: new Animated.Value(0),
  })),
  add: jest.fn(),
  subtract: jest.fn(),
  divide: jest.fn(),
  multiply: jest.fn(),
  modulo: jest.fn(),
  diffClamp: jest.fn(),
  delay: jest.fn(),
  event: jest.fn(),
};

const StyleSheet = {
  create: (styles) => styles,
  flatten: (style) => style,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  hairlineWidth: 1,
};

const PanResponder = {
  create: jest.fn(() => ({
    panHandlers: {},
  })),
};

const PixelRatio = {
  get: jest.fn(() => 2),
  getFontScale: jest.fn(() => 1),
  getPixelSizeForLayoutSize: jest.fn((size) => size * 2),
  roundToNearestPixel: jest.fn((size) => Math.round(size * 2) / 2),
};

const I18nManager = {
  isRTL: false,
  forceRTL: jest.fn(),
  allowRTL: jest.fn(),
  swapLeftAndRightInRTL: jest.fn(),
  doLeftAndRightSwapInRTL: false,
};

const AccessibilityInfo = {
  isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
  isScreenReaderEnabled: jest.fn(() => Promise.resolve(false)),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  removeEventListener: jest.fn(),
  announceForAccessibility: jest.fn(),
  setAccessibilityFocus: jest.fn(),
};

const ToastAndroid = {
  show: jest.fn(),
  showWithGravity: jest.fn(),
  showWithGravityAndOffset: jest.fn(),
  SHORT: 0,
  LONG: 1,
  TOP: 0,
  BOTTOM: 1,
  CENTER: 2,
};

const Appearance = {
  getColorScheme: jest.fn(() => 'light'),
  addChangeListener: jest.fn(() => ({ remove: jest.fn() })),
  removeChangeListener: jest.fn(),
};

module.exports = {
  // Core Components
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  TouchableHighlight,
  TouchableWithoutFeedback,
  Image,
  FlatList,
  SectionList,
  Modal,
  ActivityIndicator,
  Switch,
  RefreshControl,
  Button,
  StatusBar,
  SafeAreaView,
  KeyboardAvoidingView,
  VirtualizedList,

  // APIs
  Platform,
  Dimensions,
  Alert,
  Linking,
  Keyboard,
  InteractionManager,
  AppState,
  PermissionsAndroid,
  Share,
  Vibration,
  Clipboard,
  BackHandler,
  DeviceEventEmitter,
  NativeEventEmitter,
  NativeModules,
  Animated,
  StyleSheet,
  PanResponder,
  PixelRatio,
  I18nManager,
  AccessibilityInfo,
  ToastAndroid,
  Appearance,

  // Additional utilities
  findNodeHandle: jest.fn(),
  unstable_batchedUpdates: jest.fn((callback) => callback()),
  processColor: jest.fn((color) => color),
  requireNativeComponent: jest.fn((name) => name),
};
`;

fs.writeFileSync(path.join(mocksDir, 'react-native.js'), reactNativeMock);
logger.info('  ✅ Created react-native.js mock');

// 2. Create NetInfo mock
const netInfoMock = `module.exports = {
  addEventListener: jest.fn(() => ({ unsubscribe: jest.fn() })),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
    details: {
      isConnectionExpensive: false,
      cellularGeneration: null,
    },
  })),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    isInternetReachable: true,
    type: 'wifi',
  })),
};
`;

fs.writeFileSync(path.join(mocksDir, '@react-native-community', 'netinfo.js'), netInfoMock);
logger.info('  ✅ Created netinfo.js mock');

// 3. Create react-native-gesture-handler mock
const gestureHandlerMock = `const React = require('react');

const View = ({ children, ...props }) => React.createElement('View', props, children);

module.exports = {
  ScrollView: View,
  PanGestureHandler: View,
  TapGestureHandler: View,
  LongPressGestureHandler: View,
  PinchGestureHandler: View,
  RotationGestureHandler: View,
  FlingGestureHandler: View,
  ForceTouchGestureHandler: View,
  NativeViewGestureHandler: View,
  RawButton: View,
  BaseButton: View,
  RectButton: View,
  BorderlessButton: View,
  TouchableOpacity: View,
  TouchableHighlight: View,
  TouchableWithoutFeedback: View,
  TouchableNativeFeedback: View,
  Swipeable: View,
  DrawerLayout: View,
  State: {
    UNDETERMINED: 0,
    FAILED: 1,
    BEGAN: 2,
    CANCELLED: 3,
    ACTIVE: 4,
    END: 5,
  },
  Directions: {
    RIGHT: 1,
    LEFT: 2,
    UP: 4,
    DOWN: 8,
  },
  GestureHandlerRootView: View,
  gestureHandlerRootHOC: jest.fn((Component) => Component),
};
`;

fs.writeFileSync(path.join(mocksDir, 'react-native-gesture-handler.js'), gestureHandlerMock);
logger.info('  ✅ Created react-native-gesture-handler.js mock');

// 4. Create react-native-reanimated mock
const reanimatedMock = `module.exports = {
  default: {
    createAnimatedComponent: (Component) => Component,
    View: require('react-native').View,
    Text: require('react-native').Text,
    Image: require('react-native').Image,
    ScrollView: require('react-native').ScrollView,
  },
  useSharedValue: jest.fn((initialValue) => ({ value: initialValue })),
  useAnimatedStyle: jest.fn((fn) => fn()),
  useAnimatedGestureHandler: jest.fn(() => ({})),
  useAnimatedScrollHandler: jest.fn(() => ({})),
  useAnimatedRef: jest.fn(() => ({ current: null })),
  useDerivedValue: jest.fn((fn) => ({ value: fn() })),
  withSpring: jest.fn((value) => value),
  withTiming: jest.fn((value) => value),
  withDelay: jest.fn((delay, animation) => animation),
  withSequence: jest.fn((...animations) => animations[0]),
  withRepeat: jest.fn((animation) => animation),
  cancelAnimation: jest.fn(),
  runOnJS: jest.fn((fn) => fn),
  runOnUI: jest.fn((fn) => fn),
  interpolate: jest.fn(),
  Extrapolate: {
    EXTEND: 'extend',
    CLAMP: 'clamp',
    IDENTITY: 'identity',
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
};
`;

fs.writeFileSync(path.join(mocksDir, 'react-native-reanimated.js'), reanimatedMock);
logger.info('  ✅ Created react-native-reanimated.js mock');

// 5. Create react-native-screens mock
const screensMock = `const React = require('react');

const View = ({ children, ...props }) => React.createElement('View', props, children);

module.exports = {
  enableScreens: jest.fn(),
  disableScreens: jest.fn(),
  screensEnabled: jest.fn(() => false),
  Screen: View,
  ScreenContainer: View,
  NativeScreen: View,
  NativeScreenContainer: View,
  ScreenStack: View,
  ScreenStackHeaderConfig: View,
  ScreenStackHeaderBackButtonImage: View,
  ScreenStackHeaderCenterView: View,
  ScreenStackHeaderLeftView: View,
  ScreenStackHeaderRightView: View,
  ScreenStackHeaderSearchBarView: View,
  SearchBar: View,
};
`;

fs.writeFileSync(path.join(mocksDir, 'react-native-screens.js'), screensMock);
logger.info('  ✅ Created react-native-screens.js mock');

// 6. Update jest-setup.js to use these mocks
const jestSetupPath = path.join(__dirname, 'jest-setup.js');
let jestSetup = fs.readFileSync(jestSetupPath, 'utf8');

// Add platform mock registrations if not already present
const platformMocks = `
// Platform Mocks
jest.mock('react-native', () => require('./__mocks__/react-native.js'));
jest.mock('@react-native-community/netinfo', () => require('./__mocks__/@react-native-community/netinfo.js'));
jest.mock('react-native-gesture-handler', () => require('./__mocks__/react-native-gesture-handler.js'));
jest.mock('react-native-reanimated', () => require('./__mocks__/react-native-reanimated.js'));
jest.mock('react-native-screens', () => require('./__mocks__/react-native-screens.js'));

// Additional platform globals
global.requestAnimationFrame = jest.fn((callback) => setTimeout(callback, 0));
global.cancelAnimationFrame = jest.fn((id) => clearTimeout(id));
`;

if (!jestSetup.includes('Platform Mocks')) {
  jestSetup = platformMocks + '\n' + jestSetup;
  fs.writeFileSync(jestSetupPath, jestSetup);
  logger.info('  ✅ Updated jest-setup.js with platform mocks');
}

// 7. Create additional commonly needed mocks
const vectorIconsMock = `module.exports = {
  createIconSet: jest.fn(() => {
    const Icon = () => null;
    Icon.loadFont = jest.fn();
    Icon.hasIcon = jest.fn(() => true);
    Icon.getImageSource = jest.fn(() => Promise.resolve({}));
    Icon.getImageSourceSync = jest.fn(() => ({}));
    return Icon;
  }),
  createIconSetFromFontello: jest.fn(),
  createIconSetFromIcoMoon: jest.fn(),
  createMultiStyleIconSet: jest.fn(),
};
`;

fs.writeFileSync(path.join(mocksDir, 'react-native-vector-icons.js'), vectorIconsMock);
logger.info('  ✅ Created react-native-vector-icons.js mock');

// 8. Create expo mocks if needed
const expoConstantsMock = `module.exports = {
  manifest: {
    name: 'TestApp',
    slug: 'test-app',
    version: '1.0.0',
    orientation: 'portrait',
    platforms: ['ios', 'android'],
  },
  platform: {
    ios: { buildNumber: '1' },
    android: { versionCode: 1 },
  },
  deviceName: 'Test Device',
  deviceYearClass: 2021,
  isDevice: true,
  systemFonts: [],
  statusBarHeight: 20,
  experienceUrl: 'exp://localhost:19000',
  debugMode: true,
  appOwnership: 'standalone',
  nativeAppVersion: '1.0.0',
  nativeBuildVersion: '1',
  sessionId: 'test-session',
  installationId: 'test-installation',
  deviceId: 'test-device',
};
`;

fs.writeFileSync(path.join(mocksDir, 'expo-constants.js'), expoConstantsMock);
logger.info('  ✅ Created expo-constants.js mock');

logger.info('\n✨ React Native platform mocks successfully added!');
logger.info('\n📝 Next steps:');
logger.info('  1. Run tests to verify mock compatibility');
logger.info('  2. Add any project-specific mocks as needed');
logger.info('  3. Update individual test files to use proper async patterns');