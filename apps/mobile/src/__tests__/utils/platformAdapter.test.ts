import {
  createPlatformAdapter,
  isWeb,
  isMobile,
  platformCapabilities,
  WebPlatformServices,
} from '../../utils/platformAdapter';
import { Platform } from 'react-native';
import { logger } from '@mintenance/shared';

// Mock React Native Platform
jest.mock('react-native', () => ({
  Platform: {
    OS: 'ios',
    select: jest.fn((obj) => obj.default || obj.ios),
  },
}));

// Mock logger
jest.mock('@mintenance/shared', () => ({
  logger: {
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock browser APIs
const mockGetUserMedia = jest.fn();
const mockGetCurrentPosition = jest.fn();
const mockRequestPermission = jest.fn();
const mockShowNotification = jest.fn();
const mockVibrate = jest.fn();
const mockShowOpenFilePicker = jest.fn();
const mockGet = jest.fn();

// Setup global mocks
global.navigator = {
  mediaDevices: {
    getUserMedia: mockGetUserMedia,
  },
  geolocation: {
    getCurrentPosition: mockGetCurrentPosition,
  },
  vibrate: mockVibrate,
  credentials: {
    get: mockGet,
    create: jest.fn(),
  },
  serviceWorker: {
    ready: Promise.resolve({
      showNotification: mockShowNotification,
    }),
  },
} as any;

global.window = {
  Notification: {
    requestPermission: mockRequestPermission,
    permission: 'default',
  },
  showOpenFilePicker: mockShowOpenFilePicker,
} as any;

global.Notification = jest.fn() as any;
global.Notification.requestPermission = mockRequestPermission;
global.Notification.permission = 'default';

global.DataTransfer = jest.fn().mockImplementation(() => ({
  items: {
    add: jest.fn(),
  },
  files: [],
}));

global.document = {
  createElement: jest.fn((tag) => {
    if (tag === 'input') {
      return {
        type: '',
        accept: '',
        multiple: false,
        click: jest.fn(),
        onchange: null,
        oncancel: null,
        files: [],
      };
    }
    return {};
  }),
} as any;

describe('platformAdapter', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPlatformAdapter', () => {
    it('should select mobile config for mobile platform', () => {
      (Platform.OS as any) = 'ios';
      (Platform.select as jest.Mock).mockReturnValue('mobile-value');

      const config = {
        web: 'web-value',
        mobile: 'mobile-value',
      };

      const result = createPlatformAdapter(config);
      expect(result).toBe('mobile-value');
      expect(Platform.select).toHaveBeenCalledWith({
        web: 'web-value',
        default: 'mobile-value',
      });
    });

    it('should select web config for web platform', () => {
      (Platform.OS as any) = 'web';
      (Platform.select as jest.Mock).mockReturnValue('web-value');

      const config = {
        web: 'web-value',
        mobile: 'mobile-value',
      };

      const result = createPlatformAdapter(config);
      expect(result).toBe('web-value');
    });

    it('should work with complex objects', () => {
      const config = {
        web: { api: 'https://web-api.com', feature: false },
        mobile: { api: 'https://mobile-api.com', feature: true },
      };

      (Platform.select as jest.Mock).mockReturnValue(config.mobile);
      const result = createPlatformAdapter(config);
      expect(result).toEqual({ api: 'https://mobile-api.com', feature: true });
    });
  });

  describe('isWeb', () => {
    it('should return true for web platform', () => {
      (Platform.OS as any) = 'web';
      expect(isWeb()).toBe(true);
    });

    it('should return false for iOS platform', () => {
      (Platform.OS as any) = 'ios';
      expect(isWeb()).toBe(false);
    });

    it('should return false for Android platform', () => {
      (Platform.OS as any) = 'android';
      expect(isWeb()).toBe(false);
    });
  });

  describe('isMobile', () => {
    it('should return false for web platform', () => {
      (Platform.OS as any) = 'web';
      expect(isMobile()).toBe(false);
    });

    it('should return true for iOS platform', () => {
      (Platform.OS as any) = 'ios';
      expect(isMobile()).toBe(true);
    });

    it('should return true for Android platform', () => {
      (Platform.OS as any) = 'android';
      expect(isMobile()).toBe(true);
    });
  });

  describe('platformCapabilities', () => {
    it('should have mobile capabilities for mobile platform', () => {
      (Platform.OS as any) = 'ios';
      (Platform.select as jest.Mock).mockReturnValue({
        biometrics: true,
        camera: true,
        location: true,
        notifications: true,
        haptics: true,
        fileSystem: true,
      });

      // Re-import to get new capabilities
      jest.resetModules();
      const { platformCapabilities: caps } = require('../../utils/platformAdapter');

      expect(caps.biometrics).toBe(true);
      expect(caps.camera).toBe(true);
      expect(caps.location).toBe(true);
      expect(caps.notifications).toBe(true);
      expect(caps.haptics).toBe(true);
      expect(caps.fileSystem).toBe(true);
    });

    it('should detect web capabilities based on browser APIs', () => {
      (Platform.OS as any) = 'web';
      (Platform.select as jest.Mock).mockImplementation((obj) => obj.web);

      // Re-import to get web capabilities
      jest.resetModules();
      const { platformCapabilities: caps } = require('../../utils/platformAdapter');

      // These will be true because we mocked the browser APIs
      expect(typeof caps.biometrics).toBe('boolean');
      expect(typeof caps.camera).toBe('boolean');
      expect(typeof caps.location).toBe('boolean');
      expect(typeof caps.notifications).toBe('boolean');
      expect(typeof caps.haptics).toBe('boolean');
      expect(typeof caps.fileSystem).toBe('boolean');
    });
  });

  describe('WebPlatformServices', () => {
    describe('authenticateWithWebAuthn', () => {
      it('should return false if biometrics not supported', async () => {
        const originalCaps = platformCapabilities.biometrics;
        (platformCapabilities as any).biometrics = false;

        const result = await WebPlatformServices.authenticateWithWebAuthn();
        expect(result).toBe(false);

        (platformCapabilities as any).biometrics = originalCaps;
      });

      it('should authenticate successfully with WebAuthn', async () => {
        const originalCaps = platformCapabilities.biometrics;
        (platformCapabilities as any).biometrics = true;
        mockGet.mockResolvedValue({ id: 'credential-id' });

        const result = await WebPlatformServices.authenticateWithWebAuthn();
        expect(result).toBe(true);
        expect(mockGet).toHaveBeenCalledWith({
          publicKey: expect.objectContaining({
            challenge: expect.any(Uint8Array),
            allowCredentials: [],
            timeout: 60000,
            userVerification: 'required',
          }),
        });

        (platformCapabilities as any).biometrics = originalCaps;
      });

      it('should handle WebAuthn errors', async () => {
        const originalCaps = platformCapabilities.biometrics;
        (platformCapabilities as any).biometrics = true;
        mockGet.mockRejectedValue(new Error('WebAuthn failed'));

        const result = await WebPlatformServices.authenticateWithWebAuthn();
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith('WebAuthn authentication failed:', expect.any(Error));

        (platformCapabilities as any).biometrics = originalCaps;
      });
    });

    describe('accessWebCamera', () => {
      it('should return null if camera not supported', async () => {
        const originalCaps = platformCapabilities.camera;
        (platformCapabilities as any).camera = false;

        const result = await WebPlatformServices.accessWebCamera();
        expect(result).toBe(null);

        (platformCapabilities as any).camera = originalCaps;
      });

      it('should access camera successfully', async () => {
        const originalCaps = platformCapabilities.camera;
        (platformCapabilities as any).camera = true;
        const mockStream = { id: 'stream-id' };
        mockGetUserMedia.mockResolvedValue(mockStream);

        const result = await WebPlatformServices.accessWebCamera();
        expect(result).toBe(mockStream);
        expect(mockGetUserMedia).toHaveBeenCalledWith({
          video: { facingMode: 'environment' },
          audio: false,
        });

        (platformCapabilities as any).camera = originalCaps;
      });

      it('should handle camera access errors', async () => {
        const originalCaps = platformCapabilities.camera;
        (platformCapabilities as any).camera = true;
        mockGetUserMedia.mockRejectedValue(new Error('Camera denied'));

        const result = await WebPlatformServices.accessWebCamera();
        expect(result).toBe(null);
        expect(logger.warn).toHaveBeenCalledWith('Web camera access failed:', expect.any(Error));

        (platformCapabilities as any).camera = originalCaps;
      });
    });

    describe('getWebLocation', () => {
      it('should return null if location not supported', async () => {
        const originalCaps = platformCapabilities.location;
        (platformCapabilities as any).location = false;

        const result = await WebPlatformServices.getWebLocation();
        expect(result).toBe(null);

        (platformCapabilities as any).location = originalCaps;
      });

      it('should get location successfully', async () => {
        const originalCaps = platformCapabilities.location;
        (platformCapabilities as any).location = true;
        const mockPosition = {
          coords: { latitude: 40.7128, longitude: -74.0060 },
        };
        mockGetCurrentPosition.mockImplementation((success) => success(mockPosition));

        const result = await WebPlatformServices.getWebLocation();
        expect(result).toBe(mockPosition);
        expect(mockGetCurrentPosition).toHaveBeenCalledWith(
          expect.any(Function),
          expect.any(Function),
          { enableHighAccuracy: true, timeout: 10000 }
        );

        (platformCapabilities as any).location = originalCaps;
      });

      it('should handle location errors', async () => {
        const originalCaps = platformCapabilities.location;
        (platformCapabilities as any).location = true;
        mockGetCurrentPosition.mockImplementation((success, error) => error());

        const result = await WebPlatformServices.getWebLocation();
        expect(result).toBe(null);

        (platformCapabilities as any).location = originalCaps;
      });
    });

    describe('requestWebNotificationPermission', () => {
      it('should return false if notifications not supported', async () => {
        const originalCaps = platformCapabilities.notifications;
        (platformCapabilities as any).notifications = false;

        const result = await WebPlatformServices.requestWebNotificationPermission();
        expect(result).toBe(false);

        (platformCapabilities as any).notifications = originalCaps;
      });

      it('should request permission successfully', async () => {
        const originalCaps = platformCapabilities.notifications;
        (platformCapabilities as any).notifications = true;
        mockRequestPermission.mockResolvedValue('granted');

        const result = await WebPlatformServices.requestWebNotificationPermission();
        expect(result).toBe(true);
        expect(mockRequestPermission).toHaveBeenCalled();

        (platformCapabilities as any).notifications = originalCaps;
      });

      it('should return false for denied permission', async () => {
        const originalCaps = platformCapabilities.notifications;
        (platformCapabilities as any).notifications = true;
        mockRequestPermission.mockResolvedValue('denied');

        const result = await WebPlatformServices.requestWebNotificationPermission();
        expect(result).toBe(false);

        (platformCapabilities as any).notifications = originalCaps;
      });

      it('should handle permission errors', async () => {
        const originalCaps = platformCapabilities.notifications;
        (platformCapabilities as any).notifications = true;
        mockRequestPermission.mockRejectedValue(new Error('Permission error'));

        const result = await WebPlatformServices.requestWebNotificationPermission();
        expect(result).toBe(false);
        expect(logger.warn).toHaveBeenCalledWith('Web notification permission failed:', expect.any(Error));

        (platformCapabilities as any).notifications = originalCaps;
      });
    });

    describe('showWebNotification', () => {
      it('should not show notification if not supported', async () => {
        const originalCaps = platformCapabilities.notifications;
        (platformCapabilities as any).notifications = false;

        await WebPlatformServices.showWebNotification('Test', {});
        expect(mockShowNotification).not.toHaveBeenCalled();

        (platformCapabilities as any).notifications = originalCaps;
      });

      it('should show notification with service worker', async () => {
        const originalCaps = platformCapabilities.notifications;
        const originalPermission = global.Notification.permission;
        (platformCapabilities as any).notifications = true;
        global.Notification.permission = 'granted';

        await WebPlatformServices.showWebNotification('Test Title', { body: 'Test body' });
        expect(mockShowNotification).toHaveBeenCalledWith('Test Title', expect.objectContaining({
          body: 'Test body',
          icon: '/assets/notification-icon.png',
          badge: '/assets/badge-icon.png',
        }));

        (platformCapabilities as any).notifications = originalCaps;
        global.Notification.permission = originalPermission;
      });

      it('should fallback to Notification API when no service worker', async () => {
        const originalCaps = platformCapabilities.notifications;
        const originalPermission = global.Notification.permission;
        const originalServiceWorker = global.navigator.serviceWorker;

        (platformCapabilities as any).notifications = true;
        global.Notification.permission = 'granted';
        delete (global.navigator as any).serviceWorker;

        await WebPlatformServices.showWebNotification('Test Title', { body: 'Test body' });
        expect(global.Notification).toHaveBeenCalledWith('Test Title', { body: 'Test body' });

        (platformCapabilities as any).notifications = originalCaps;
        global.Notification.permission = originalPermission;
        (global.navigator as any).serviceWorker = originalServiceWorker;
      });

      it('should handle notification errors', async () => {
        const originalCaps = platformCapabilities.notifications;
        const originalPermission = global.Notification.permission;
        (platformCapabilities as any).notifications = true;
        global.Notification.permission = 'granted';
        mockShowNotification.mockRejectedValue(new Error('Notification failed'));

        await WebPlatformServices.showWebNotification('Test', {});
        expect(logger.warn).toHaveBeenCalledWith('Web notification failed:', expect.any(Error));

        (platformCapabilities as any).notifications = originalCaps;
        global.Notification.permission = originalPermission;
      });
    });

    describe('triggerWebHaptic', () => {
      it('should trigger haptic feedback when supported', () => {
        const originalCaps = platformCapabilities.haptics;
        (platformCapabilities as any).haptics = true;

        WebPlatformServices.triggerWebHaptic(100);
        expect(mockVibrate).toHaveBeenCalledWith(100);

        WebPlatformServices.triggerWebHaptic([100, 50, 100]);
        expect(mockVibrate).toHaveBeenCalledWith([100, 50, 100]);

        (platformCapabilities as any).haptics = originalCaps;
      });

      it('should use default pattern when not specified', () => {
        const originalCaps = platformCapabilities.haptics;
        (platformCapabilities as any).haptics = true;

        WebPlatformServices.triggerWebHaptic();
        expect(mockVibrate).toHaveBeenCalledWith(200);

        (platformCapabilities as any).haptics = originalCaps;
      });

      it('should not trigger haptic when not supported', () => {
        const originalCaps = platformCapabilities.haptics;
        (platformCapabilities as any).haptics = false;

        WebPlatformServices.triggerWebHaptic(100);
        expect(mockVibrate).not.toHaveBeenCalled();

        (platformCapabilities as any).haptics = originalCaps;
      });
    });

    describe('pickWebFile', () => {
      it('should use file picker API when available', async () => {
        const originalCaps = platformCapabilities.fileSystem;
        (platformCapabilities as any).fileSystem = true;
        const mockFile = new File(['content'], 'test.txt');
        const mockFileHandle = {
          getFile: jest.fn().mockResolvedValue(mockFile),
        };
        mockShowOpenFilePicker.mockResolvedValue([mockFileHandle]);

        const result = await WebPlatformServices.pickWebFile({ accept: 'text/*', multiple: false });
        expect(mockShowOpenFilePicker).toHaveBeenCalledWith({
          types: [{
            description: 'Allowed files',
            accept: { 'text/*': [] },
          }],
          multiple: false,
        });

        (platformCapabilities as any).fileSystem = originalCaps;
      });

      it('should fallback to traditional file input', async () => {
        const originalCaps = platformCapabilities.fileSystem;
        (platformCapabilities as any).fileSystem = false;
        delete (global.window as any).showOpenFilePicker;

        const mockInput = {
          type: '',
          accept: '',
          multiple: false,
          click: jest.fn(),
          onchange: null as any,
          oncancel: null as any,
          files: ['file1', 'file2'],
        };
        (document.createElement as jest.Mock).mockReturnValue(mockInput);

        const promise = WebPlatformServices.pickWebFile({ accept: 'image/*', multiple: true });

        // Simulate file selection
        mockInput.onchange();

        const result = await promise;
        expect(result).toEqual(['file1', 'file2']);
        expect(mockInput.type).toBe('file');
        expect(mockInput.accept).toBe('image/*');
        expect(mockInput.multiple).toBe(true);
        expect(mockInput.click).toHaveBeenCalled();

        (platformCapabilities as any).fileSystem = originalCaps;
      });

      it('should handle file picker errors', async () => {
        const originalCaps = platformCapabilities.fileSystem;
        (platformCapabilities as any).fileSystem = true;
        (global.window as any).showOpenFilePicker = mockShowOpenFilePicker;
        mockShowOpenFilePicker.mockRejectedValue(new Error('User cancelled'));

        const result = await WebPlatformServices.pickWebFile();
        expect(result).toBe(null);
        expect(logger.warn).toHaveBeenCalledWith('Web file picker failed:', expect.any(Error));

        (platformCapabilities as any).fileSystem = originalCaps;
      });

      it('should handle file input cancellation', async () => {
        const originalCaps = platformCapabilities.fileSystem;
        (platformCapabilities as any).fileSystem = false;
        delete (global.window as any).showOpenFilePicker;

        const mockInput = {
          type: '',
          accept: '',
          multiple: false,
          click: jest.fn(),
          onchange: null as any,
          oncancel: null as any,
          files: null,
        };
        (document.createElement as jest.Mock).mockReturnValue(mockInput);

        const promise = WebPlatformServices.pickWebFile();

        // Simulate cancellation
        mockInput.oncancel();

        const result = await promise;
        expect(result).toBe(null);

        (platformCapabilities as any).fileSystem = originalCaps;
      });
    });
  });
});