import { Platform } from 'react-native';

export interface PlatformAdapter<T> {
  web: T;
  mobile: T;
}

export function createPlatformAdapter<T>(config: PlatformAdapter<T>): T {
  return Platform.select({
    web: config.web,
    default: config.mobile,
  });
}

export function isWeb(): boolean {
  return Platform.OS === 'web';
}

export function isMobile(): boolean {
  return Platform.OS !== 'web';
}

export interface PlatformCapabilities {
  biometrics: boolean;
  camera: boolean;
  location: boolean;
  notifications: boolean;
  haptics: boolean;
  fileSystem: boolean;
}

export const platformCapabilities: PlatformCapabilities = Platform.select({
  web: {
    biometrics: typeof navigator !== 'undefined' && !!(navigator.credentials && navigator.credentials.create), // WebAuthn support
    camera: typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia), // HTML5 Media API
    location: typeof navigator !== 'undefined' && !!navigator.geolocation, // Web Geolocation API
    notifications: typeof window !== 'undefined' && 'Notification' in window, // Web Push API
    haptics: typeof navigator !== 'undefined' && 'vibrate' in navigator, // Web vibration API
    fileSystem: typeof window !== 'undefined' && 'showOpenFilePicker' in window, // Web File API
  },
  default: {
    biometrics: true,
    camera: true,
    location: true,
    notifications: true,
    haptics: true,
    fileSystem: true,
  },
});

/**
 * Enhanced Platform Services for Web Compatibility
 */
export class WebPlatformServices {
  /**
   * Web Authentication (WebAuthn) Alternative to Biometrics
   */
  static async authenticateWithWebAuthn(): Promise<boolean> {
    if (!platformCapabilities.biometrics) return false;

    try {
      const publicKeyCredentialRequestOptions = {
        challenge: new Uint8Array(32),
        allowCredentials: [],
        timeout: 60000,
        userVerification: 'required' as UserVerificationRequirement,
      };

      const credential = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      });

      return !!credential;
    } catch (error) {
      console.warn('WebAuthn authentication failed:', error);
      return false;
    }
  }

  /**
   * Web Camera Access
   */
  static async accessWebCamera(): Promise<MediaStream | null> {
    if (!platformCapabilities.camera) return null;

    try {
      return await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
    } catch (error) {
      console.warn('Web camera access failed:', error);
      return null;
    }
  }

  /**
   * Web Geolocation
   */
  static async getWebLocation(): Promise<GeolocationPosition | null> {
    if (!platformCapabilities.location) return null;

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  /**
   * Web Push Notifications
   */
  static async requestWebNotificationPermission(): Promise<boolean> {
    if (!platformCapabilities.notifications) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.warn('Web notification permission failed:', error);
      return false;
    }
  }

  /**
   * Show Web Notification
   */
  static async showWebNotification(title: string, options: NotificationOptions = {}): Promise<void> {
    if (!platformCapabilities.notifications || Notification.permission !== 'granted') return;

    try {
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          ...options,
          icon: options.icon || '/assets/notification-icon.png',
          badge: '/assets/badge-icon.png'
        });
      } else {
        new Notification(title, options);
      }
    } catch (error) {
      console.warn('Web notification failed:', error);
    }
  }

  /**
   * Web Haptic Feedback
   */
  static triggerWebHaptic(pattern: number | number[] = 200): void {
    if (platformCapabilities.haptics && navigator.vibrate) {
      navigator.vibrate(pattern);
    }
  }

  /**
   * Web File Picker
   */
  static async pickWebFile(options: { accept?: string; multiple?: boolean } = {}): Promise<FileList | null> {
    if (!platformCapabilities.fileSystem && !(window as any).showOpenFilePicker) {
      // Fallback to traditional file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = options.accept || '*/*';
        input.multiple = options.multiple || false;

        input.onchange = () => resolve(input.files);
        input.oncancel = () => resolve(null);

        input.click();
      });
    }

    try {
      const [fileHandle] = await (window as any).showOpenFilePicker({
        types: options.accept ? [{
          description: 'Allowed files',
          accept: { [options.accept]: [] }
        }] : [],
        multiple: options.multiple || false
      });

      const file = await fileHandle.getFile();
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(file);
      return dataTransfer.files;
    } catch (error) {
      console.warn('Web file picker failed:', error);
      return null;
    }
  }
}

/**
 * Responsive Design Utilities for Web
 */
export class WebResponsiveUtils {
  static readonly breakpoints = {
    mobile: 768,
    tablet: 1024,
    desktop: 1440,
    wide: 1920
  };

  static getCurrentBreakpoint(): 'mobile' | 'tablet' | 'desktop' | 'wide' {
    if (typeof window === 'undefined') return 'mobile';

    const width = window.innerWidth;

    if (width >= this.breakpoints.wide) return 'wide';
    if (width >= this.breakpoints.desktop) return 'desktop';
    if (width >= this.breakpoints.tablet) return 'tablet';
    return 'mobile';
  }

  static isMobileView(): boolean {
    return this.getCurrentBreakpoint() === 'mobile';
  }

  static isTabletView(): boolean {
    return this.getCurrentBreakpoint() === 'tablet';
  }

  static isDesktopView(): boolean {
    const bp = this.getCurrentBreakpoint();
    return bp === 'desktop' || bp === 'wide';
  }

  static getViewportDimensions(): { width: number; height: number } {
    if (typeof window === 'undefined') return { width: 0, height: 0 };

    return {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }
}

/**
 * Web-Specific Component Adaptations
 */
export const webComponentAdaptations = {
  /**
   * TouchableOpacity replacement for web
   */
  TouchableOpacity: Platform.select({
    web: require('react-native').TouchableOpacity,
    default: require('react-native').TouchableOpacity
  }),

  /**
   * ScrollView with web optimizations
   */
  ScrollView: Platform.select({
    web: require('react-native').ScrollView,
    default: require('react-native').ScrollView
  }),

  /**
   * SafeAreaView for web
   */
  SafeAreaView: Platform.select({
    web: require('react-native').SafeAreaView,
    default: require('react-native').SafeAreaView
  })
};

export interface ResponsiveBreakpoints {
  mobile: number;
  tablet: number;
  desktop: number;
}

export const breakpoints: ResponsiveBreakpoints = {
  mobile: 768,
  tablet: 1024,
  desktop: 1440,
};