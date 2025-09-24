import { Platform } from 'react-native';
import { createPlatformAdapter } from '../utils/platformAdapter';

// Platform-specific service imports
// Mobile services (default)
import { BiometricService as MobileBiometricService } from './BiometricService';
import { NotificationService as MobileNotificationService } from './NotificationService';
import * as MobileImagePicker from 'expo-image-picker';
import * as MobileHaptics from 'expo-haptics';

// Web services
import { BiometricService as WebBiometricService } from './web/WebBiometricService';
import { NotificationService as WebNotificationService } from './web/WebNotificationService';
import { ImagePicker as WebImagePicker } from './web/WebCameraService';

// Platform-aware services that automatically select the correct implementation
export const BiometricService = createPlatformAdapter({
  web: WebBiometricService,
  mobile: MobileBiometricService,
});

export const NotificationService = createPlatformAdapter({
  web: WebNotificationService,
  mobile: MobileNotificationService,
});

export const ImagePicker = createPlatformAdapter({
  web: WebImagePicker,
  mobile: MobileImagePicker,
});

// Haptics service with web fallback
export const Haptics = Platform.select({
  web: {
    // Web fallback for haptics
    impactAsync: async (style: any) => {
      try {
        if ('vibrate' in navigator) {
          const patterns = {
            light: 50,
            medium: 100,
            heavy: 200,
          };
          navigator.vibrate(patterns[style] || 100);
        }
      } catch (error) {
        // Silently fail on web if vibration not supported
      }
    },
    notificationAsync: async (type: any) => {
      try {
        if ('vibrate' in navigator) {
          const patterns = {
            success: [100, 50, 100],
            warning: [200, 100, 200],
            error: [300, 150, 300],
          };
          navigator.vibrate(patterns[type] || [100]);
        }
      } catch (error) {
        // Silently fail on web if vibration not supported
      }
    },
    selectionAsync: async () => {
      try {
        if ('vibrate' in navigator) {
          navigator.vibrate(25);
        }
      } catch (error) {
        // Silently fail on web if vibration not supported
      }
    },
  },
  default: MobileHaptics,
});

// Location service adapter
export const Location = Platform.select({
  web: {
    // Web geolocation API
    requestForegroundPermissionsAsync: async () => {
      try {
        if (!navigator.geolocation) {
          return { status: 'denied' };
        }

        return new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(
            () => resolve({ status: 'granted' }),
            () => resolve({ status: 'denied' }),
            { timeout: 5000 }
          );
        });
      } catch (error) {
        return { status: 'denied' };
      }
    },
    getCurrentPositionAsync: async (options: any = {}) => {
      return new Promise((resolve, reject) => {
        if (!navigator.geolocation) {
          reject(new Error('Geolocation not supported'));
          return;
        }

        navigator.geolocation.getCurrentPosition(
          (position) => {
            resolve({
              coords: {
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                altitude: position.coords.altitude,
                accuracy: position.coords.accuracy,
                altitudeAccuracy: position.coords.altitudeAccuracy,
                heading: position.coords.heading,
                speed: position.coords.speed,
              },
              timestamp: position.timestamp,
            });
          },
          (error) => reject(new Error(error.message)),
          {
            enableHighAccuracy: options.accuracy === 'high',
            timeout: options.timeout || 10000,
            maximumAge: options.maximumAge || 0,
          }
        );
      });
    },
  },
  default: require('expo-location'),
});

// Camera permissions helper
export const CameraPermissions = {
  async requestCameraPermissionsAsync() {
    if (Platform.OS === 'web') {
      return await ImagePicker.requestCameraPermissionsAsync();
    } else {
      return await MobileImagePicker.requestCameraPermissionsAsync();
    }
  },

  async getCameraPermissionsAsync() {
    if (Platform.OS === 'web') {
      return await ImagePicker.getCameraPermissionsAsync();
    } else {
      return await MobileImagePicker.getCameraPermissionsAsync();
    }
  },
};

// Audio/Video recording adapter for web
export const MediaRecording = Platform.select({
  web: {
    // Web media recording implementation
    startRecording: async (options: any = {}) => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: options.video || false,
        });

        const mediaRecorder = new MediaRecorder(stream);
        const chunks: BlobPart[] = [];

        return new Promise((resolve, reject) => {
          mediaRecorder.ondataavailable = (event) => {
            chunks.push(event.data);
          };

          mediaRecorder.onstop = () => {
            const blob = new Blob(chunks, {
              type: options.video ? 'video/webm' : 'audio/webm'
            });
            const uri = URL.createObjectURL(blob);

            resolve({
              uri,
              duration: 0, // Would need to calculate actual duration
            });
          };

          mediaRecorder.onerror = (error) => {
            reject(error);
          };

          mediaRecorder.start();

          // Return recorder for stopping later
          return {
            stop: () => {
              mediaRecorder.stop();
              stream.getTracks().forEach(track => track.stop());
            },
          };
        });
      } catch (error) {
        throw new Error(`Media recording failed: ${error.message}`);
      }
    },
  },
  default: {
    // Mobile implementation would use expo-av
    startRecording: async (options: any = {}) => {
      throw new Error('Media recording not implemented for mobile in this adapter');
    },
  },
});

// Secure storage adapter
export const SecureStore = Platform.select({
  web: {
    // Web localStorage with encryption simulation
    setItemAsync: async (key: string, value: string) => {
      try {
        localStorage.setItem(`secure_${key}`, value);
      } catch (error) {
        throw new Error(`Failed to store item: ${error.message}`);
      }
    },
    getItemAsync: async (key: string) => {
      try {
        return localStorage.getItem(`secure_${key}`);
      } catch (error) {
        throw new Error(`Failed to retrieve item: ${error.message}`);
      }
    },
    deleteItemAsync: async (key: string) => {
      try {
        localStorage.removeItem(`secure_${key}`);
      } catch (error) {
        throw new Error(`Failed to delete item: ${error.message}`);
      }
    },
  },
  default: require('expo-secure-store'),
});

// Export platform detection utilities
export { isWeb, isMobile, platformCapabilities } from '../utils/platformAdapter';