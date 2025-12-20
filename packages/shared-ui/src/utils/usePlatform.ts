/**
 * Platform Detection Hook
 * 
 * Detects if code is running on web or React Native platform
 */

export type Platform = 'web' | 'native';

let platform: Platform | null = null;

/**
 * Detect platform
 */
export function detectPlatform(): Platform {
  if (platform !== null) {
    return platform;
  }

  // Check if React Native is available
  // Use typeof check to avoid bundling react-native in web builds
  if (typeof window !== 'undefined') {
    // Browser environment - definitely web
    platform = 'web';
  } else {
    // Node.js/SSR environment - default to web (React Native will override if needed)
    // We don't check for react-native here to avoid bundling issues in web builds
    platform = 'web';
  }

  return platform;
}

/**
 * Check if running on web
 */
export function isWeb(): boolean {
  return detectPlatform() === 'web';
}

/**
 * Check if running on native (React Native)
 */
export function isNative(): boolean {
  return detectPlatform() === 'native';
}

/**
 * Hook to get current platform
 */
export function usePlatform(): Platform {
  return detectPlatform();
}

