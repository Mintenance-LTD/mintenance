/**
 * Comprehensive Test Mocks
 *
 * Centralized mocking for missing dependencies and services
 */

// Mock TensorFlow.js (optional dependency)
jest.mock('@tensorflow/tfjs', () => ({
  tensor2d: jest.fn(() => ({
    dispose: jest.fn(),
    isDisposed: false,
    data: jest.fn(() => Promise.resolve([1, 2, 3, 4])),
    shape: [2, 2],
  })),
  Optimizer: class Optimizer {
    applyGradients(): void {}
    dispose(): void {}
    getConfig(): Record<string, unknown> {
      return {};
    }
  },
  memory: jest.fn(() => ({
    numTensors: 0,
    numBytesInGPU: 0,
    numBytes: 0,
  })),
  getBackend: jest.fn(() => 'cpu'),
  version: { tfjs: '0.0.0' },
  ready: jest.fn(() => Promise.resolve()),
  dispose: jest.fn(),
  tidy: jest.fn((fn) => fn()),
  nextFrame: jest.fn(() => Promise.resolve()),
}), { virtual: true });

// Mock React Native Maps (optional dependency)
jest.mock('react-native-maps', () => {
  const React = require('react');
  const { View } = require('react-native');

  const MapView = (props: unknown) => React.createElement(View, props);
  const Marker = (props: unknown) => React.createElement(View, props);
  const Callout = (props: unknown) => React.createElement(View, props);

  return {
    __esModule: true,
    default: MapView,
    MapView,
    Marker,
    Callout,
    PROVIDER_GOOGLE: 'google',
    PROVIDER_DEFAULT: 'default',
  };
}, { virtual: true });

// Mock React Native WebRTC (optional dependency)
jest.mock('react-native-webrtc', () => ({
  RTCPeerConnection: jest.fn().mockImplementation(() => ({
    createOffer: jest.fn(() => Promise.resolve({})),
    createAnswer: jest.fn(() => Promise.resolve({})),
    setLocalDescription: jest.fn(() => Promise.resolve()),
    setRemoteDescription: jest.fn(() => Promise.resolve()),
    addIceCandidate: jest.fn(() => Promise.resolve()),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
  })),
  getUserMedia: jest.fn(() => Promise.resolve({})),
  mediaDevices: {
    getUserMedia: jest.fn(() => Promise.resolve({})),
  },
}), { virtual: true });

// Mock Blockchain SDK (optional dependency)
jest.mock('@blockchain/sdk', () => ({
  BlockchainClient: jest.fn().mockImplementation(() => ({
    createTransaction: jest.fn(() => Promise.resolve({ hash: 'mock-hash' })),
    verifyReview: jest.fn(() => Promise.resolve(true)),
    getTransaction: jest.fn(() => Promise.resolve({})),
  })),
}), { virtual: true });

// Mock AR/VR SDK (optional dependency)
jest.mock('@unity/ar-foundation', () => ({
  ARCamera: jest.fn(),
  ARPlaneManager: jest.fn(),
  ARRaycastManager: jest.fn(),
}), { virtual: true });

// Mock Performance Monitoring (optional dependency)
jest.mock('react-native-performance', () => ({
  PerformanceMonitor: {
    startTransaction: jest.fn(() => ({ finish: jest.fn() })),
    getCurrentMetrics: jest.fn(() => ({
      fps: 60,
      memoryUsage: 100,
      renderTime: 16.67,
    })),
  },
}), { virtual: true });

// Mock Biometric Authentication
jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
  isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
  authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
  supportedAuthenticationTypesAsync: jest.fn(() => Promise.resolve([1])),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
  },
}));

// Mock Background Tasks
jest.mock('expo-background-task', () => ({
  defineTask: jest.fn(),
  startBackgroundSync: jest.fn(() => Promise.resolve()),
}), { virtual: true });

// Mock Push Notifications
jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getNotificationChannelsAsync: jest.fn(() => Promise.resolve([])),
  requestPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-id')),
  getPermissionsAsync: jest.fn(() => Promise.resolve({ status: 'granted' })),
  getExpoPushTokenAsync: jest.fn(() =>
    Promise.resolve({ data: 'ExponentPushToken[mock-token]' })
  ),
  setNotificationChannelAsync: jest.fn(() => Promise.resolve()),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  removeNotificationSubscription: jest.fn(),
  cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
  setBadgeCountAsync: jest.fn(() => Promise.resolve()),
  dismissAllNotificationsAsync: jest.fn(() => Promise.resolve()),
  getLastNotificationResponseAsync: jest.fn(() => Promise.resolve(null)),
  AndroidImportance: {
    MAX: 'max',
    HIGH: 'high',
    DEFAULT: 'default',
  },
  DEFAULT_ACTION_IDENTIFIER: 'default',
}));

// Mock haptic feedback
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
}));

// Mock secure store with proper async behavior
jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn((key: string, value: string) => Promise.resolve()),
  getItemAsync: jest.fn((key: string) => Promise.resolve(null)),
  deleteItemAsync: jest.fn((key: string) => Promise.resolve()),
}));

// Mock expo constants
jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {
      supabaseUrl: 'https://mock.supabase.co',
      supabaseAnonKey: 'mock-anon-key',
    },
  },
  isDevice: true,
  platform: {
    ios: {
      platform: 'ios',
    },
  },
}));

// Mock LinearGradient (optional dependency)
jest.mock('expo-linear-gradient', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    LinearGradient: (props: unknown) => React.createElement(View, props),
  };
}, { virtual: true });

// Mock charts (optional dependency)
jest.mock('react-native-chart-kit', () => {
  const React = require('react');
  const { View } = require('react-native');
  const Chart = (props: unknown) => React.createElement(View, props);
  return {
    LineChart: Chart,
    BarChart: Chart,
    PieChart: Chart,
  };
}, { virtual: true });

// Mock FFmpeg kit (optional dependency)
jest.mock('react-native-ffmpeg-kit', () => ({
  FFmpegKit: {
    execute: jest.fn(() => Promise.resolve({
      getReturnCode: jest.fn(() => ({ isValueSuccess: () => true })),
      getAllLogsAsString: jest.fn(() => Promise.resolve('')),
    })),
  },
  FFmpegKitConfig: {
    enableLogCallback: jest.fn(),
    enableStatisticsCallback: jest.fn(),
    enableRedirection: jest.fn(),
  },
  ReturnCode: {
    isSuccess: jest.fn(() => true),
  },
}), { virtual: true });

// Mock shared logger config (optional dependency)
jest.mock('@mintenance/shared/lib/logger-config', () => ({
  createLogger: jest.fn(() => ({
    child: jest.fn(() => ({
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    })),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}), { virtual: true });

jest.mock('@mintenance/shared/enhanced-logger', () => ({}), { virtual: true });

// Mock AI core service
jest.mock('@mintenance/ai-core/services/UnifiedAIService', () => {
  class UnifiedAIService {
    assessBuilding() {
      return Promise.resolve({ success: true, data: {} });
    }
    getPricingRecommendation() {
      return Promise.resolve({ success: true, data: {} });
    }
    requestAgentDecision() {
      return Promise.resolve({ success: true, data: {} });
    }
    search() {
      return Promise.resolve({ success: true, data: {} });
    }
    calculateESGScore() {
      return Promise.resolve({ success: true, data: {} });
    }
    analyzeImages() {
      return Promise.resolve({ success: true, data: {} });
    }
    submitCorrections() {
      return Promise.resolve({ success: true, data: {} });
    }
    getUsageMetrics() {
      return Promise.resolve({ success: true, data: {} });
    }
    completeAgentAction() {
      return Promise.resolve({ success: true, data: {} });
    }
    clearCache() {}
    getCacheStats() {
      return { entries: 0 };
    }
  }

  return { UnifiedAIService };
}, { virtual: true });

// Mock SQLite for local database access
jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(() => Promise.resolve({
    execAsync: jest.fn(() => Promise.resolve()),
    runAsync: jest.fn(() => Promise.resolve()),
    getFirstAsync: jest.fn(() => Promise.resolve(null)),
    getAllAsync: jest.fn(() => Promise.resolve([])),
    closeAsync: jest.fn(() => Promise.resolve()),
  })),
}));

// Global test utilities
(global as any).mockAsyncFn = (returnValue: any = undefined, shouldReject = false) => {
  return jest.fn(() => shouldReject ? Promise.reject(returnValue) : Promise.resolve(returnValue));
};

(global as any).mockServiceWithMethods = (methods: string[]) => {
  const mock: Record<string, unknown> = {};
  methods.forEach(method => {
    mock[method] = jest.fn(() => Promise.resolve());
  });
  return mock;
};

// Network state mock
(global as any).navigator = {
  onLine: true,
  ...((global as any).navigator || {}),
};

// This file is a setup file and doesn't export anything
