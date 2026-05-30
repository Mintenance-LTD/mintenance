import { Platform } from 'react-native';
import Constants from 'expo-constants';

/**
 * 2026-05-27 audit-79 P2: single source of truth for "can native
 * MapView render on Android". Two inputs feed into this:
 *
 *   1. The JS env var `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` — baked into
 *      the bundle at build time; readable directly via process.env.
 *   2. The build-time boolean `extra.androidGoogleMapsConfigured`
 *      stamped by app.config.js — true iff EITHER `EXPO_PUBLIC_*`
 *      OR the non-public `GOOGLE_MAPS_API_KEY` (EAS secret) was set
 *      when the native build's AndroidManifest was generated.
 *
 * The prior runtime guards only checked (1), so an EAS build with
 * only the non-public secret correctly received a valid Google Maps
 * key in the native manifest but the JS thought no key existed and
 * fell back to "Map unavailable". Reading (2) makes the JS guard
 * agree with the actual native build configuration.
 */
export function isAndroidGoogleMapsAvailable(): boolean {
  if (Platform.OS !== 'android') return true;
  if (process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY) return true;
  const extra = Constants.expoConfig?.extra as
    | { androidGoogleMapsConfigured?: boolean }
    | undefined;
  return Boolean(extra?.androidGoogleMapsConfigured);
}

/**
 * Convenience: returns true if the native MapView should render
 * (always true off-Android, gated by Google Maps key on Android).
 */
export function shouldRenderNativeMap(): boolean {
  return Platform.OS !== 'android' || isAndroidGoogleMapsAvailable();
}
