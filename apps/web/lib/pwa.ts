/**
 * PWA (Progressive Web App) Utilities
 * Service Worker registration and management
 */

import { logger } from './logger';

// Service Worker configuration
const SW_CONFIG = {
  url: '/service-worker.js',
  scope: '/',
  updateInterval: 1000 * 60 * 60, // Check for updates every hour
} as const;

// Installation prompt event
let deferredPrompt: any = null;

/**
 * Check if browser supports PWA features
 */
export const isPWASupported = (): boolean => {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'caches' in window &&
    'PushManager' in window
  );
};

/**
 * Check if app is running as installed PWA
 */
export const isRunningAsPWA = (): boolean => {
  if (typeof window === 'undefined') return false;

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

/**
 * Register Service Worker
 */
export const registerServiceWorker = async (): Promise<ServiceWorkerRegistration | null> => {
  if (!isPWASupported()) {
    logger.warn('PWA features not supported in this browser');
    return null;
  }

  try {
    logger.info('Registering service worker');

    const registration = await navigator.serviceWorker.register(
      SW_CONFIG.url,
      { scope: SW_CONFIG.scope }
    );

    logger.info('Service worker registered', {
      scope: registration.scope,
      active: !!registration.active,
    });

    // Check for updates periodically
    setInterval(() => {
      registration.update().catch((error) => {
        logger.error('Service worker update check failed', error);
      });
    }, SW_CONFIG.updateInterval);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;

      if (newWorker) {
        logger.info('New service worker installing');

        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            logger.info('New service worker installed, update available');
            notifyUpdate();
          }
        });
      }
    });

    return registration;
  } catch (error) {
    logger.error('Service worker registration failed', error as Error);
    return null;
  }
};

/**
 * Unregister Service Worker
 */
export const unregisterServiceWorker = async (): Promise<boolean> => {
  if (!isPWASupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      const unregistered = await registration.unregister();
      logger.info('Service worker unregistered', { success: unregistered });
      return unregistered;
    }

    return false;
  } catch (error) {
    logger.error('Service worker unregistration failed', error as Error);
    return false;
  }
};

/**
 * Check for Service Worker updates
 */
export const checkForUpdates = async (): Promise<boolean> => {
  if (!isPWASupported()) return false;

  try {
    const registration = await navigator.serviceWorker.getRegistration();

    if (registration) {
      await registration.update();
      return true;
    }

    return false;
  } catch (error) {
    logger.error('Update check failed', error as Error);
    return false;
  }
};

/**
 * Skip waiting and activate new Service Worker
 */
export const skipWaiting = async (): Promise<void> => {
  if (!isPWASupported()) return;

  const registration = await navigator.serviceWorker.getRegistration();

  if (registration?.waiting) {
    logger.info('Activating new service worker');
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Reload page after activation
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      window.location.reload();
    });
  }
};

/**
 * Notify user about available update
 */
const notifyUpdate = () => {
  // Dispatch custom event for UI to handle
  window.dispatchEvent(new CustomEvent('pwa-update-available'));

  logger.info('PWA update notification dispatched');
};

/**
 * Handle install prompt
 */
export const setupInstallPrompt = () => {
  if (typeof window === 'undefined') return;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();

    // Stash the event so it can be triggered later
    deferredPrompt = e;

    logger.info('Install prompt available');

    // Dispatch custom event for UI to show install button
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    logger.info('PWA installed');
    deferredPrompt = null;

    // Dispatch custom event
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
};

/**
 * Show install prompt
 */
export const showInstallPrompt = async (): Promise<boolean> => {
  if (!deferredPrompt) {
    logger.warn('Install prompt not available');
    return false;
  }

  try {
    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user's response
    const { outcome } = await deferredPrompt.userChoice;

    logger.info('Install prompt outcome', { outcome });

    // Clear the deferred prompt
    deferredPrompt = null;

    return outcome === 'accepted';
  } catch (error) {
    logger.error('Install prompt failed', error as Error);
    return false;
  }
};

/**
 * Check if install prompt is available
 */
export const canShowInstallPrompt = (): boolean => {
  return deferredPrompt !== null;
};

/**
 * Get cache statistics
 */
export const getCacheStats = async (): Promise<{
  cacheNames: string[];
  totalSize: number;
  itemCount: number;
}> => {
  if (!('caches' in window)) {
    return { cacheNames: [], totalSize: 0, itemCount: 0 };
  }

  try {
    const cacheNames = await caches.keys();
    let totalSize = 0;
    let itemCount = 0;

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();
      itemCount += keys.length;

      // Estimate size (approximate)
      for (const request of keys) {
        const response = await cache.match(request);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return { cacheNames, totalSize, itemCount };
  } catch (error) {
    logger.error('Failed to get cache stats', error as Error);
    return { cacheNames: [], totalSize: 0, itemCount: 0 };
  }
};

/**
 * Clear all caches
 */
export const clearAllCaches = async (): Promise<boolean> => {
  if (!('caches' in window)) return false;

  try {
    const cacheNames = await caches.keys();

    await Promise.all(
      cacheNames.map((cacheName) => caches.delete(cacheName))
    );

    logger.info('All caches cleared', { count: cacheNames.length });
    return true;
  } catch (error) {
    logger.error('Failed to clear caches', error as Error);
    return false;
  }
};

/**
 * Request notification permission
 */
export const requestNotificationPermission = async (): Promise<NotificationPermission> => {
  if (!('Notification' in window)) {
    logger.warn('Notifications not supported');
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    logger.info('Notification permission', { permission });
    return permission;
  }

  return Notification.permission;
};

/**
 * Subscribe to push notifications
 */
export const subscribeToPushNotifications = async (
  vapidPublicKey: string
): Promise<PushSubscription | null> => {
  if (!isPWASupported()) return null;

  try {
    const permission = await requestNotificationPermission();

    if (permission !== 'granted') {
      logger.warn('Notification permission denied');
      return null;
    }

    const registration = await navigator.serviceWorker.getRegistration();

    if (!registration) {
      logger.error('Service worker not registered');
      return null;
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
    });

    logger.info('Push notification subscription created');

    return subscription;
  } catch (error) {
    logger.error('Push notification subscription failed', error as Error);
    return null;
  }
};

/**
 * Helper: Convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check network connectivity
 */
export const isOnline = (): boolean => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

/**
 * Setup network status listeners
 */
export const setupNetworkListeners = (
  onOnline?: () => void,
  onOffline?: () => void
) => {
  if (typeof window === 'undefined') return;

  window.addEventListener('online', () => {
    logger.info('Network online');
    onOnline?.();
  });

  window.addEventListener('offline', () => {
    logger.warn('Network offline');
    onOffline?.();
  });
};

/**
 * PWA utilities export
 */
export const pwa = {
  isSupported: isPWASupported,
  isInstalled: isRunningAsPWA,
  register: registerServiceWorker,
  unregister: unregisterServiceWorker,
  checkUpdates: checkForUpdates,
  skipWaiting,
  setupInstallPrompt,
  showInstallPrompt,
  canInstall: canShowInstallPrompt,
  getCacheStats,
  clearCaches: clearAllCaches,
  requestNotifications: requestNotificationPermission,
  subscribePush: subscribeToPushNotifications,
  isOnline,
  setupNetworkListeners,
};

export default pwa;
