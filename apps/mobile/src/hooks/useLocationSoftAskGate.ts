/**
 * useLocationSoftAskGate — Tier 1 step 2 of the 2026-04-19 mobile
 * onboarding audit (§5.3). Soft-ask rationale for foreground
 * location permission before the system dialog fires.
 *
 * Why a soft-ask?
 * -----------------
 * Today, location is asked at point-of-use (the Find Jobs map) via
 * the raw system dialog with no context. Per audit §3.2 +
 * §4.2 the contextual pre-prompt pattern moves iOS opt-in by
 * ~20–30 percentage points versus the cold system dialog — and
 * the cold dialog burns the one-shot permission allowance with
 * no rationale on screen.
 *
 * This hook mirrors `usePushSoftAskGate` line-for-line: the
 * contractor sees an in-app screen that explains why location
 * matters (nearby jobs, show on homeowner map, ETA tracking),
 * then on explicit tap we fire the system dialog. Declines are
 * respected and recovered from via a "Open Settings" deep link
 * after the 7-day cool-off.
 *
 * Foreground only at this step. The "Always" permission (for the
 * en-route tracking feature) is a separate, post-first-job ask
 * per PDF §5.4 — not in scope for this gate.
 *
 * Gate rules
 * ----------
 *   - user signed in AND role === 'contractor'
 *   - user.onboarding_completed === true (swiper dismissed)
 *   - permission status is NOT 'granted'
 *   - no AsyncStorage dismissal within the last 7 days
 *
 * Storage contract
 * ----------------
 *   Key:   `location_soft_ask_dismissed_at`
 *   Value: ISO-8601 timestamp. Timestamp-based (not boolean) so
 *          we can re-nag after cool-off — same pattern as push.
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'location_soft_ask_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export type LocationPermissionStatus = 'undetermined' | 'denied' | 'granted';

export interface LocationSoftAskGate {
  /** True when the modal should render. */
  shouldShow: boolean;
  /** Last-known OS permission status. */
  permissionStatus: LocationPermissionStatus | null;
  /**
   * Fire the foreground-location system dialog. Returns the
   * resolved status so the caller can branch UI (e.g. show the
   * Skills + service-area step next on granted).
   */
  allowLocation: () => Promise<LocationPermissionStatus>;
  /** User tapped "Not Now". Sets a 7-day cool-off. */
  dismiss: () => Promise<void>;
  /** Deep-link to OS location settings (recovery from 'denied'). */
  openSystemSettings: () => Promise<void>;
}

function normalizeStatus(
  raw: Location.PermissionStatus | undefined
): LocationPermissionStatus {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'undetermined';
}

export function useLocationSoftAskGate(): LocationSoftAskGate {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<LocationPermissionStatus | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const evaluate = async () => {
      if (!user) {
        if (!cancelled) {
          setChecked(true);
          setShouldShow(false);
        }
        return;
      }

      // Contractor-only. Homeowner location is not a Tier 1 concern;
      // they only need a property address (handled by
      // useFirstPropertyGate).
      if (user.role !== 'contractor') {
        if (!cancelled) {
          setChecked(true);
          setShouldShow(false);
        }
        return;
      }

      // The soft-ask only makes sense AFTER the onboarding swiper
      // has dismissed. Otherwise we'd stack two modals on a fresh
      // contractor.
      if (!user.onboarding_completed) {
        if (!cancelled) {
          setChecked(true);
          setShouldShow(false);
        }
        return;
      }

      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        const normalized = normalizeStatus(status);
        if (!cancelled) setPermissionStatus(normalized);

        if (normalized === 'granted') {
          if (!cancelled) {
            setChecked(true);
            setShouldShow(false);
          }
          return;
        }

        // Respect the 7-day cool-off after a "Not Now" dismissal.
        const dismissedAtRaw = await AsyncStorage.getItem(STORAGE_KEY);
        if (dismissedAtRaw) {
          const dismissedAt = Date.parse(dismissedAtRaw);
          if (
            Number.isFinite(dismissedAt) &&
            Date.now() - dismissedAt < COOLDOWN_MS
          ) {
            if (!cancelled) {
              setChecked(true);
              setShouldShow(false);
            }
            return;
          }
        }

        if (!cancelled) {
          setChecked(true);
          setShouldShow(true);
        }
      } catch (err) {
        // Any failure in the check path = do not show. Safer to
        // skip a soft-ask than to display on a broken state.
        logger.warn('useLocationSoftAskGate: evaluation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        if (!cancelled) {
          setChecked(true);
          setShouldShow(false);
        }
      }
    };

    evaluate();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const allowLocation =
    useCallback(async (): Promise<LocationPermissionStatus> => {
      if (!user?.id) return 'undetermined';

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        const normalized = normalizeStatus(status);
        setPermissionStatus(normalized);

        // Close the modal whatever the outcome. Granted = we're done.
        // Denied = the next cycle (after cool-off) swaps to the
        // "Open Settings" variant.
        setShouldShow(false);

        // Record the attempt so we don't re-prompt within the
        // cool-off window.
        try {
          await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
        } catch {
          // Non-critical.
        }

        return normalized;
      } catch (err) {
        logger.error('useLocationSoftAskGate: allowLocation failed', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
        setShouldShow(false);
        return 'undetermined';
      }
    }, [user]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch (err) {
      logger.warn('useLocationSoftAskGate: dismiss persist failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const openSystemSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      logger.warn('useLocationSoftAskGate: openSettings failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
    // Closing after a settings deep-link is correct; when the user
    // returns to the app the next mount of the gate re-reads status.
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch {
      // Non-critical.
    }
  }, []);

  return {
    shouldShow: checked && shouldShow,
    permissionStatus,
    allowLocation,
    dismiss,
    openSystemSettings,
  };
}
