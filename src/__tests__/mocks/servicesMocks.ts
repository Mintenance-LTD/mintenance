import { jest } from '@jest/globals';

// Services Mock Factory
export class ServicesMockFactory {

  // Logger Mock
  static createLoggerMock() {
    return {
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      performance: jest.fn(),
      network: jest.fn(),
      userAction: jest.fn(),
      navigation: jest.fn(),
      auth: jest.fn(),
      setUser: jest.fn(),
      setContext: jest.fn(),
      addBreadcrumb: jest.fn(),
    };
  }

  // Sentry Mock
  static createSentryMock() {
    return {
      init: jest.fn(),
      captureMessage: jest.fn(),
      captureException: jest.fn(),
      addBreadcrumb: jest.fn(),
      setUser: jest.fn(),
      setContext: jest.fn(),
      setTag: jest.fn(),
      setLevel: jest.fn(),
      setFingerprint: jest.fn(),
      withScope: jest.fn((callback) => callback({
        setTag: jest.fn(),
        setLevel: jest.fn(),
        setContext: jest.fn(),
        setFingerprint: jest.fn(),
      })),
      configureScope: jest.fn(),
      Hub: jest.fn(),
      getCurrentHub: jest.fn(() => ({
        getClient: jest.fn(),
        getScope: jest.fn(),
        captureException: jest.fn(),
        captureMessage: jest.fn(),
      })),
    };
  }

  // HTTP Client Mock (for API calls)
  static createHttpClientMock() {
    return {
      get: jest.fn(() => Promise.resolve({ 
        data: {}, 
        status: 200, 
        statusText: 'OK',
        headers: {},
      })),
      post: jest.fn(() => Promise.resolve({ 
        data: {}, 
        status: 201, 
        statusText: 'Created',
        headers: {},
      })),
      put: jest.fn(() => Promise.resolve({ 
        data: {}, 
        status: 200, 
        statusText: 'OK',
        headers: {},
      })),
      patch: jest.fn(() => Promise.resolve({ 
        data: {}, 
        status: 200, 
        statusText: 'OK',
        headers: {},
      })),
      delete: jest.fn(() => Promise.resolve({ 
        data: {}, 
        status: 204, 
        statusText: 'No Content',
        headers: {},
      })),
      request: jest.fn(() => Promise.resolve({ 
        data: {}, 
        status: 200, 
        statusText: 'OK',
        headers: {},
      })),
    };
  }

  // Auth Service Mock
  static createAuthServiceMock() {
    const mockUser = {
      id: 'user-123',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      role: 'homeowner',
      isEmailConfirmed: true,
    };

    return {
      getCurrentUser: jest.fn(() => Promise.resolve(mockUser)),
      signIn: jest.fn(() => Promise.resolve({ user: mockUser, session: { access_token: 'mock-token' } })),
      signUp: jest.fn(() => Promise.resolve({ user: mockUser, session: null })),
      signOut: jest.fn(() => Promise.resolve()),
      resetPassword: jest.fn(() => Promise.resolve()),
      updateProfile: jest.fn(() => Promise.resolve(mockUser)),
      refreshToken: jest.fn(() => Promise.resolve({ access_token: 'new-mock-token' })),
      isAuthenticated: jest.fn(() => Promise.resolve(true)),
      getSession: jest.fn(() => Promise.resolve({ access_token: 'mock-token' })),
      onAuthStateChange: jest.fn(() => ({ unsubscribe: jest.fn() })),
    };
  }

  // Storage Service Mock
  static createStorageServiceMock() {
    const storage = new Map<string, string>();

    return {
      get: jest.fn((key: string) => Promise.resolve(storage.get(key) || null)),
      set: jest.fn((key: string, value: string) => {
        storage.set(key, value);
        return Promise.resolve();
      }),
      remove: jest.fn((key: string) => {
        storage.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        storage.clear();
        return Promise.resolve();
      }),
      getAllKeys: jest.fn(() => Promise.resolve(Array.from(storage.keys()))),
      multiGet: jest.fn((keys: string[]) => {
        const result = keys.map(key => [key, storage.get(key) || null]);
        return Promise.resolve(result);
      }),
      multiSet: jest.fn((pairs: [string, string][]) => {
        pairs.forEach(([key, value]) => storage.set(key, value));
        return Promise.resolve();
      }),
      __storage: storage, // For testing
    };
  }

  // Analytics Service Mock
  static createAnalyticsServiceMock() {
    return {
      track: jest.fn(),
      identify: jest.fn(),
      page: jest.fn(),
      screen: jest.fn(),
      group: jest.fn(),
      alias: jest.fn(),
      reset: jest.fn(),
      flush: jest.fn(),
      enable: jest.fn(),
      disable: jest.fn(),
    };
  }

  // Push Notification Service Mock
  static createPushNotificationServiceMock() {
    return {
      initialize: jest.fn(() => Promise.resolve('mock-push-token')),
      getPermissions: jest.fn(() => Promise.resolve({ status: 'granted' })),
      requestPermissions: jest.fn(() => Promise.resolve({ status: 'granted' })),
      getPushToken: jest.fn(() => Promise.resolve('mock-push-token')),
      scheduleNotification: jest.fn(() => Promise.resolve('notification-id')),
      cancelNotification: jest.fn(() => Promise.resolve()),
      cancelAllNotifications: jest.fn(() => Promise.resolve()),
      setBadgeCount: jest.fn(() => Promise.resolve()),
      getBadgeCount: jest.fn(() => Promise.resolve(0)),
      onNotificationReceived: jest.fn(() => ({ unsubscribe: jest.fn() })),
      onNotificationOpened: jest.fn(() => ({ unsubscribe: jest.fn() })),
    };
  }

  // Location Service Mock
  static createLocationServiceMock() {
    const mockLocation = {
      latitude: 37.7749,
      longitude: -122.4194,
      accuracy: 10,
      altitude: 10,
      heading: 0,
      speed: 0,
      timestamp: Date.now(),
    };

    return {
      getCurrentLocation: jest.fn(() => Promise.resolve(mockLocation)),
      watchLocation: jest.fn(() => ({
        unsubscribe: jest.fn(),
      })),
      getPermissions: jest.fn(() => Promise.resolve({ status: 'granted' })),
      requestPermissions: jest.fn(() => Promise.resolve({ status: 'granted' })),
      geocode: jest.fn(() => Promise.resolve([{
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Test St, San Francisco, CA 94103',
      }])),
      reverseGeocode: jest.fn(() => Promise.resolve([{
        street: '123 Test St',
        city: 'San Francisco',
        region: 'CA',
        postalCode: '94103',
        country: 'US',
      }])),
    };
  }

  // File Upload Service Mock
  static createFileUploadServiceMock() {
    return {
      uploadImage: jest.fn(() => Promise.resolve({
        url: 'https://example.com/image.jpg',
        publicId: 'mock-public-id',
        size: 1024,
        format: 'jpg',
      })),
      uploadFile: jest.fn(() => Promise.resolve({
        url: 'https://example.com/file.pdf',
        publicId: 'mock-file-id',
        size: 2048,
        format: 'pdf',
      })),
      deleteFile: jest.fn(() => Promise.resolve()),
      getSignedUrl: jest.fn(() => Promise.resolve('https://example.com/signed-url')),
    };
  }

  // Cache Service Mock
  static createCacheServiceMock() {
    const cache = new Map<string, any>();

    return {
      get: jest.fn((key: string) => Promise.resolve(cache.get(key))),
      set: jest.fn((key: string, value: any, ttl?: number) => {
        cache.set(key, value);
        return Promise.resolve();
      }),
      delete: jest.fn((key: string) => {
        cache.delete(key);
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        cache.clear();
        return Promise.resolve();
      }),
      has: jest.fn((key: string) => Promise.resolve(cache.has(key))),
      keys: jest.fn(() => Promise.resolve(Array.from(cache.keys()))),
      __cache: cache, // For testing
    };
  }

  // Event Emitter Mock
  static createEventEmitterMock() {
    const listeners = new Map<string, Function[]>();

    return {
      on: jest.fn((event: string, listener: Function) => {
        if (!listeners.has(event)) {
          listeners.set(event, []);
        }
        listeners.get(event)!.push(listener);
      }),
      off: jest.fn((event: string, listener: Function) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          const index = eventListeners.indexOf(listener);
          if (index > -1) {
            eventListeners.splice(index, 1);
          }
        }
      }),
      emit: jest.fn((event: string, ...args: any[]) => {
        const eventListeners = listeners.get(event);
        if (eventListeners) {
          eventListeners.forEach(listener => listener(...args));
        }
      }),
      removeAllListeners: jest.fn((event?: string) => {
        if (event) {
          listeners.delete(event);
        } else {
          listeners.clear();
        }
      }),
      listenerCount: jest.fn((event: string) => {
        return listeners.get(event)?.length || 0;
      }),
      __listeners: listeners, // For testing
    };
  }

  // Create all service mocks
  static createAllMocks() {
    return {
      logger: this.createLoggerMock(),
      sentry: this.createSentryMock(),
      http: this.createHttpClientMock(),
      auth: this.createAuthServiceMock(),
      storage: this.createStorageServiceMock(),
      analytics: this.createAnalyticsServiceMock(),
      pushNotification: this.createPushNotificationServiceMock(),
      location: this.createLocationServiceMock(),
      fileUpload: this.createFileUploadServiceMock(),
      cache: this.createCacheServiceMock(),
      eventEmitter: this.createEventEmitterMock(),
    };
  }

  // Reset all mocks
  static resetMocks() {
    jest.clearAllMocks();
  }
}

// Export commonly used service mocks
export const mockLogger = ServicesMockFactory.createLoggerMock();
export const mockSentry = ServicesMockFactory.createSentryMock();
export const mockAuthService = ServicesMockFactory.createAuthServiceMock();
export const mockStorageService = ServicesMockFactory.createStorageServiceMock();
export const mockLocationService = ServicesMockFactory.createLocationServiceMock();