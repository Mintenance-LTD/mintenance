/**
 * Shared navigation ref so non-navigator surfaces (error boundaries,
 * notification handlers, deep-link bridges) can navigate without
 * holding a hook-bound ref.
 *
 * 2026-05-26 audit-58 P2: introduced to back ScreenErrorBoundary's
 * showHomeButton / fallbackRoute props — the class component is
 * outside React Navigation's hook context and can't call useNavigation
 * directly. Use this ref instead.
 *
 * Existing AppNavigator still creates its own hook-bound ref for the
 * NavigationContainer; we attach this module-level ref as the source
 * of truth in the same place so both stay in sync.
 */
import { createNavigationContainerRef } from '@react-navigation/native';
import type { RootStackParamList } from './types';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

/**
 * Best-effort navigate. No-ops if the container isn't mounted yet
 * (e.g. boundary fires during Auth bootstrap before NavigationContainer
 * is ready). Caller decides whether to swallow or surface failure.
 */
export function safeNavigate(
  screen: string,
  params?: Record<string, unknown>
): boolean {
  if (!navigationRef.isReady()) return false;
  try {
    // The generic dispatch is the supported escape hatch when the
    // screen name isn't statically known at the call site (Error
    // boundary forwards an arbitrary string from `fallbackRoute`).
    (navigationRef.navigate as (s: string, p?: unknown) => void)(
      screen,
      params
    );
    return true;
  } catch {
    return false;
  }
}
