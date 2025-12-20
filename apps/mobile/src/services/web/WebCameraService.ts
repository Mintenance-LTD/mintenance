import { logger } from '../../utils/logger';
import { addBreadcrumb, trackUserAction } from '../../config/sentry';

export interface CameraResult {
  uri: string;
  width: number;
  height: number;
  type: 'image';
  base64?: string;
}

export interface CameraOptions {
  mediaTypes: 'Images' | 'Videos' | 'All';
  allowsEditing?: boolean;
  aspect?: [number, number];
  quality?: number;
  base64?: boolean;
}

export class WebCameraService {
  private static stream: MediaStream | null = null;

  // Request camera permissions
  static async requestCameraPermissions(): Promise<{ status: 'granted' | 'denied' }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        logger.warn('Camera not supported in this browser');
        return { status: 'denied' };
      }

      // Request camera access to check permissions
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      });

      // Stop the stream immediately since we're just checking permissions
      stream.getTracks().forEach(track => track.stop());

      addBreadcrumb(
        'Web camera permissions granted',
        'camera',
        'info'
      );

      return { status: 'granted' };
    } catch (error) {
      logger.error('Camera permission denied:', error);

      addBreadcrumb(
        `Web camera permission denied: ${error.message}`,
        'camera',
        'error'
      );

      return { status: 'denied' };
    }
  }

  // Launch camera to take photo
  static async launchCameraAsync(options: CameraOptions = { mediaTypes: 'Images' }): Promise<CameraResult | null> {
    try {
      const permission = await this.requestCameraPermissions();

      if (permission.status !== 'granted') {
        throw new Error('Camera permission denied');
      }

      return new Promise((resolve, reject) => {
        // Create camera capture interface
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');

        // Create capture button
        const captureButton = document.createElement('button');
        captureButton.textContent = 'Take Photo';
        captureButton.style.cssText = `
          position: fixed;
          bottom: 50px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 10001;
          padding: 12px 24px;
          background: #10B981;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        `;

        // Create cancel button
        const cancelButton = document.createElement('button');
        cancelButton.textContent = 'Cancel';
        cancelButton.style.cssText = `
          position: fixed;
          bottom: 50px;
          right: 50px;
          z-index: 10001;
          padding: 12px 24px;
          background: #EF4444;
          color: white;
          border: none;
          border-radius: 8px;
          font-size: 16px;
          cursor: pointer;
        `;

        // Create overlay container
        const overlay = document.createElement('div');
        overlay.style.cssText = `
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: black;
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
        `;

        // Style video element
        video.style.cssText = `
          max-width: 90%;
          max-height: 90%;
          border: 2px solid #10B981;
          border-radius: 8px;
        `;

        video.autoplay = true;
        video.playsInline = true;

        const cleanup = () => {
          if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
          }
          document.body.removeChild(overlay);
        };

        // Handle capture
        captureButton.onclick = () => {
          if (!context) {
            reject(new Error('Canvas context not available'));
            return;
          }

          const width = video.videoWidth;
          const height = video.videoHeight;

          canvas.width = width;
          canvas.height = height;

          // Draw video frame to canvas
          context.drawImage(video, 0, 0, width, height);

          // Convert to blob/data URL
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }

            const uri = URL.createObjectURL(blob);

            const result: CameraResult = {
              uri,
              width,
              height,
              type: 'image',
            };

            // Add base64 if requested
            if (options.base64) {
              result.base64 = canvas.toDataURL('image/jpeg', options.quality || 0.8).split(',')[1];
            }

            cleanup();

            addBreadcrumb(
              'Web camera photo captured',
              'camera',
              'info'
            );

            trackUserAction('web_camera_photo_captured', {
              width,
              height,
              timestamp: new Date().toISOString(),
            });

            resolve(result);
          }, 'image/jpeg', options.quality || 0.8);
        };

        // Handle cancel
        cancelButton.onclick = () => {
          cleanup();
          resolve(null);
        };

        // Start camera stream
        navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            facingMode: 'environment' // Use back camera if available
          }
        }).then(stream => {
          this.stream = stream;
          video.srcObject = stream;

          // Add elements to DOM
          overlay.appendChild(video);
          overlay.appendChild(captureButton);
          overlay.appendChild(cancelButton);
          document.body.appendChild(overlay);
        }).catch(error => {
          cleanup();
          reject(error);
        });
      });
    } catch (error) {
      logger.error('Error launching web camera:', error);
      throw error;
    }
  }

  // Launch image picker (file input)
  static async launchImageLibraryAsync(options: CameraOptions = { mediaTypes: 'Images' }): Promise<CameraResult | null> {
    try {
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = options.mediaTypes === 'Images' ? 'image/*' : 'image/*,video/*';
        input.style.display = 'none';

        input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];

          if (!file) {
            resolve(null);
            return;
          }

          if (file.type.startsWith('image/')) {
            const uri = URL.createObjectURL(file);

            // Create image to get dimensions
            const img = new Image();
            img.onload = () => {
              const result: CameraResult = {
                uri,
                width: img.width,
                height: img.height,
                type: 'image',
              };

              // Add base64 if requested
              if (options.base64) {
                const reader = new FileReader();
                reader.onload = () => {
                  const base64 = (reader.result as string).split(',')[1];
                  result.base64 = base64;
                  resolve(result);
                };
                reader.readAsDataURL(file);
              } else {
                resolve(result);
              }

              addBreadcrumb(
                'Web image library photo selected',
                'camera',
                'info'
              );

              trackUserAction('web_image_library_selected', {
                width: img.width,
                height: img.height,
                timestamp: new Date().toISOString(),
              });
            };
            img.src = uri;
          } else {
            resolve(null);
          }

          // Cleanup
          document.body.removeChild(input);
        };

        input.oncancel = () => {
          document.body.removeChild(input);
          resolve(null);
        };

        document.body.appendChild(input);
        input.click();
      });
    } catch (error) {
      logger.error('Error launching web image library:', error);
      throw error;
    }
  }

  // Check camera availability
  static async getCameraPermissionsAsync(): Promise<{ status: 'granted' | 'denied' }> {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { status: 'denied' };
      }

      // Check if we already have permission
      const permissions = await navigator.permissions.query({ name: 'camera' as PermissionName });

      return {
        status: permissions.state === 'granted' ? 'granted' : 'denied'
      };
    } catch (error) {
      logger.error('Error checking camera permissions:', error);
      return { status: 'denied' };
    }
  }
}

// Export with compatible interface
export const ImagePicker = {
  launchCameraAsync: WebCameraService.launchCameraAsync.bind(WebCameraService),
  launchImageLibraryAsync: WebCameraService.launchImageLibraryAsync.bind(WebCameraService),
  requestCameraPermissionsAsync: WebCameraService.requestCameraPermissions.bind(WebCameraService),
  getCameraPermissionsAsync: WebCameraService.getCameraPermissionsAsync.bind(WebCameraService),
};