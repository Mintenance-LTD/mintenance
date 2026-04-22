/**
 * useAlwaysLocationSoftAskGate — Phase 3 (Tier 2) of the
 * 2026-04-19 mobile onboarding audit, PDF §5.4.
 *
 * The "While using the app" soft-ask ships as Tier 1
 * (useLocationSoftAskGate). The "Always / Allow all the time"
 * permission is deliberately a separate, post-first-job ask so
 * the contractor has earned context for why we want
 * always-on tracking: the homeowner's "contractor is on the way"
 * map stays live even when the app is backgrounded.
 *
 * Today, if a contractor leaves the app while driving to a job,
 * `BackgroundLocationTask.start()` fires the system "Always"
 * dialog cold — burning the one-shot allowance with zero
 * rationale on screen. This gate surfaces the rationale BEFORE
 * that cold dialog, so the contractor opts in contextually and
 * our background channel actually receives updates.
 *
 * Gate rules
 * ----------
 *   - user signed in AND role === 'contractor'
 *   - user.onboarding_completed === true (Tier 1 done)
 *   - foreground location is 'granted' (prerequisite — without
 *     it, the Always ask is platform-blocked; Tier 1 gate would
 *     still be asking for foreground)
 *   - background location !== 'granted'
 *   - at least one jobs row WHERE contractor_id = user.id AND
 *     status IN ('assigned', 'in_progress'). Bids 'accepted'
 *     alone isn't a strong-enough trigger — the actual live
 *     job is what makes en-route tracking relevant.
 *   - no AsyncStorage dismissal within the last 7 days
 *
 * Coordination with other Tier 1/2 gates
 * --------------------------------------
 * OnboardingGateStack renders this after StripeConnect. It's
 * Tier 2 (post-first-job, not post-first-bid-won), so it
 * suppresses itself while any Tier 1 gate or the Stripe Connect
 * prompt is visible.
 */

import { useState, useEffect, useCallback } from 'react';
import { Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'always_location_soft_ask_dismissed_at';
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const ACTIVE_JOB_STATUSES = ['assigned', 'in_progress'];

export type AlwaysLocationPermissionStatus =
  | 'undetermined'
  | 'denied'
  | 'granted';

export interface AlwaysLocationSoftAskGate {
  shouldShow: boolean;
  permissionStatus: AlwaysLocationPermissionStatus | null;
  /**
   * Fire the background-location system dialog. Caller can
   * branch on the resolved status (e.g. fall back to foreground-
   * only tracking if 'denied').
   */
  allowAlways: () => Promise<AlwaysLocationPermissionStatus>;
  /** User tapped "Not Now". Sets a 7-day cool-off. */
  dismiss: () => Promise<void>;
  /** Deep-link to OS settings (recovery from 'denied'). */
  openSystemSettings: () => Promise<void>;
  /** Re-run the probe — safe from event handlers. */
  refresh: () => Promise<void>;
}

function normalizeStatus(
  raw: Location.PermissionStatus | undefined
): AlwaysLocationPermissionStatus {
  if (raw === 'granted') return 'granted';
  if (raw === 'denied') return 'denied';
  return 'undetermined';
}

export function useAlwaysLocationSoftAskGate(): AlwaysLocationSoftAskGate {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [permissionStatus, setPermissionStatus] =
    useState<AlwaysLocationPermissionStatus | null>(null);
  const [checked, setChecked] = useState(false);

  const evaluate = useCallback(async () => {
    if (!user) {
      setChecked(true);
      setShouldShow(false);
      return;
    }
    if (user.role !== 'contractor') {
      setChecked(true);
      setShouldShow(false);
      return;
    }
    if (!user.onboarding_completed) {
      setChecked(true);
      setShouldShow(false);
      return;
    }

    try {
      // Foreground permission must already be granted — otherwise
      // the platform blocks background from being requested and
      // the Tier 1 foreground gate is still the right prompt.
      const foreground = await Location.getForegroundPermissionsAsync();
      if (normalizeStatus(foreground.status) !== 'granted') {
        setChecked(true);
        setShouldShow(false);
        return;
      }

      const background = await Location.getBackgroundPermissionsAsync();
      const normalized = normalizeStatus(background.status);
      setPermissionStatus(normalized);

      if (normalized === 'granted') {
        setChecked(true);
        setShouldShow(false);
        return;
      }

      const dismissedAtRaw = await AsyncStorage.getItem(STORAGE_KEY);
      if (dismissedAtRaw) {
        const dismissedAt = Date.parse(dismissedAtRaw);
        if (
          Number.isFinite(dismissedAt) &&
          Date.now() - dismissedAt < COOLDOWN_MS
        ) {
          setChecked(true);
          setShouldShow(false);
          return;
        }
      }

      // The money-moment trigger: contractor has a live active
      // job. Not "bid accepted" (that's Stripe's trigger); the
      // actual job being assigned/in_progress is when the
      // homeowner will be checking the live map.
      const { count, error } = await supabase
        .from('jobs')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', user.id)
        .in('status', ACTIVE_JOB_STATUSES);

      if (error) {
        logger.warn('useAlwaysLocationSoftAskGate: jobs query failed', {
          error: error.message,
        });
        setChecked(true);
        setShouldShow(false);
        return;
      }

      const activeJobCount = count ?? 0;
      setChecked(true);
      setShouldShow(activeJobCount > 0);
    } catch (err) {
      logger.warn('useAlwaysLocationSoftAskGate: evaluation failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      setChecked(true);
      setShouldShow(false);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await evaluate();
    })();
    return () => {
      cancelled = true;
    };
  }, [evaluate]);

  const allowAlways =
    useCallback(async (): Promise<AlwaysLocationPermissionStatus> => {
      if (!user?.id) return 'undetermined';

      try {
        const { status } = await Location.requestBackgroundPermissionsAsync();
        const normalized = normalizeStatus(status);
        setPermissionStatus(normalized);
        setShouldShow(false);

        try {
          await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
        } catch {
          // Non-critical.
        }
        return normalized;
      } catch (err) {
        logger.error('useAlwaysLocationSoftAskGate: allowAlways failed', {
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
      logger.warn('useAlwaysLocationSoftAskGate: dismiss persist failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  const openSystemSettings = useCallback(async () => {
    try {
      await Linking.openSettings();
    } catch (err) {
      logger.warn('useAlwaysLocationSoftAskGate: openSettings failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
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
    allowAlways,
    dismiss,
    openSystemSettings,
    refresh: evaluate,
  };
}
