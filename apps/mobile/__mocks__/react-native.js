module.exports = {
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
    ValueXY: jest.fn(function(value) {
      const xValue = value?.x ?? 0;
      const yValue = value?.y ?? 0;

      this.x = {
        _value: xValue,
        setValue: jest.fn(function(v) { this._value = v; }),
        setOffset: jest.fn(),
        flattenOffset: jest.fn(),
        extractOffset: jest.fn(),
        interpolate: jest.fn(function() { return this; }),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn()
      };

      this.y = {
        _value: yValue,
        setValue: jest.fn(function(v) { this._value = v; }),
        setOffset: jest.fn(),
        flattenOffset: jest.fn(),
        extractOffset: jest.fn(),
        interpolate: jest.fn(function() { return this; }),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        removeAllListeners: jest.fn(),
        stopAnimation: jest.fn(),
        resetAnimation: jest.fn()
      };

      this._value = { x: xValue, y: yValue };
      this.setValue = jest.fn((val) => {
        if (val?.x !== undefined) { this.x.setValue(val.x); this._value.x = val.x; }
        if (val?.y !== undefined) { this.y.setValue(val.y); this._value.y = val.y; }
      });
      this.setOffset = jest.fn((offset) => {
        if (offset?.x !== undefined) this.x.setOffset(offset.x);
        if (offset?.y !== undefined) this.y.setOffset(offset.y);
      });
      this.flattenOffset = jest.fn(() => {
        this.x.flattenOffset();
        this.y.flattenOffset();
      });
      this.extractOffset = jest.fn(() => {
        this.x.extractOffset();
        this.y.extractOffset();
      });
      this.addListener = jest.fn();
      this.removeListener = jest.fn();
      this.removeAllListeners = jest.fn();
      this.stopAnimation = jest.fn();
      this.resetAnimation = jest.fn();
      this.getLayout = jest.fn(() => ({ left: this.x, top: this.y }));
      this.getTranslateTransform = jest.fn(() => [{ translateX: this.x }, { translateY: this.y }]);
      return this;
    }),
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
  useWindowDimensions: jest.fn(() => ({
    width: 375,
    height: 812,
    scale: 2,
    fontScale: 1,
  })),

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
    isReduceMotionEnabled: jest.fn(() => Promise.resolve(false)),
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
};
