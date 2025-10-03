// ============================================================================
// MOCK SETUP
// Mock setup and teardown for various services
// ============================================================================

// ============================================================================
// MOCK SETUP UTILITIES
// ============================================================================

const activeMocks: Array<() => void> = [];

export function setupMocks(mockConfig: {
  navigation?: boolean;
  asyncStorage?: boolean;
  haptics?: boolean;
  biometrics?: boolean;
  camera?: boolean;
  notifications?: boolean;
}) {
  // Navigation mocks
  if (mockConfig.navigation) {
    const navigationMock = setupNavigationMock();
    activeMocks.push(navigationMock);
  }

  // AsyncStorage mocks
  if (mockConfig.asyncStorage) {
    const storageMock = setupAsyncStorageMock();
    activeMocks.push(storageMock);
  }

  // Haptics mocks
  if (mockConfig.haptics) {
    const hapticsMock = setupHapticsMock();
    activeMocks.push(hapticsMock);
  }

  // Biometrics mocks
  if (mockConfig.biometrics) {
    const biometricsMock = setupBiometricsMock();
    activeMocks.push(biometricsMock);
  }

  // Camera mocks
  if (mockConfig.camera) {
    const cameraMock = setupCameraMock();
    activeMocks.push(cameraMock);
  }

  // Notifications mocks
  if (mockConfig.notifications) {
    const notificationsMock = setupNotificationsMock();
    activeMocks.push(notificationsMock);
  }
}

export function cleanupMocks() {
  activeMocks.forEach(cleanup => cleanup());
  activeMocks.length = 0;
}

function setupNavigationMock() {
  const mockNavigate = jest.fn();
  const mockGoBack = jest.fn();
  const mockReset = jest.fn();

  (global as any).mockNavigation = {
    navigate: mockNavigate,
    goBack: mockGoBack,
    reset: mockReset,
    canGoBack: () => true,
    getState: () => ({ index: 0, routes: [] }),
  };

  return () => {
    delete (global as any).mockNavigation;
  };
}

function setupAsyncStorageMock() {
  const mockStorage = new Map<string, string>();

  const mockAsyncStorage = {
    getItem: jest.fn((key: string) => Promise.resolve(mockStorage.get(key) || null)),
    setItem: jest.fn((key: string, value: string) => {
      mockStorage.set(key, value);
      return Promise.resolve();
    }),
    removeItem: jest.fn((key: string) => {
      mockStorage.delete(key);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.clear();
      return Promise.resolve();
    }),
    getAllKeys: jest.fn(() => Promise.resolve(Array.from(mockStorage.keys()))),
    multiGet: jest.fn((keys: string[]) =>
      Promise.resolve(keys.map(key => [key, mockStorage.get(key) || null]))
    ),
  };

  (global as any).mockAsyncStorage = mockAsyncStorage;

  return () => {
    delete (global as any).mockAsyncStorage;
    mockStorage.clear();
  };
}

function setupHapticsMock() {
  const mockHaptics = {
    impactAsync: jest.fn(() => Promise.resolve()),
    notificationAsync: jest.fn(() => Promise.resolve()),
    selectionAsync: jest.fn(() => Promise.resolve()),
  };

  (global as any).mockHaptics = mockHaptics;

  return () => {
    delete (global as any).mockHaptics;
  };
}

function setupBiometricsMock() {
  const mockBiometrics = {
    hasHardwareAsync: jest.fn(() => Promise.resolve(true)),
    isEnrolledAsync: jest.fn(() => Promise.resolve(true)),
    authenticateAsync: jest.fn(() => Promise.resolve({ success: true })),
    getAvailableAuthenticationTypesAsync: jest.fn(() => Promise.resolve(['fingerprint'])),
  };

  (global as any).mockBiometrics = mockBiometrics;

  return () => {
    delete (global as any).mockBiometrics;
  };
}

function setupCameraMock() {
  const mockCamera = {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    launchImageLibraryAsync: jest.fn(() => Promise.resolve({
      cancelled: false,
      assets: [{ uri: 'mock://image.jpg' }],
    })),
    launchCameraAsync: jest.fn(() => Promise.resolve({
      cancelled: false,
      assets: [{ uri: 'mock://photo.jpg' }],
    })),
  };

  (global as any).mockCamera = mockCamera;

  return () => {
    delete (global as any).mockCamera;
  };
}

function setupNotificationsMock() {
  const mockNotifications = {
    requestPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
    scheduleNotificationAsync: jest.fn(() => Promise.resolve('mock-id')),
    cancelScheduledNotificationAsync: jest.fn(() => Promise.resolve()),
    getAllScheduledNotificationsAsync: jest.fn(() => Promise.resolve([])),
    registerForPushNotificationsAsync: jest.fn(() => Promise.resolve({ data: 'mock-token' })),
  };

  (global as any).mockNotifications = mockNotifications;

  return () => {
    delete (global as any).mockNotifications;
  };
}
