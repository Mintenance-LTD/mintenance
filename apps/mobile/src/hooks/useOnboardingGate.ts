/**
 * useOnboardingGate — determines if the onboarding intro should show.
 *
 * Rules:
 * 1. If user.onboarding_completed === true → skip (DB flag)
 * 2. If AsyncStorage 'onboarding_dismissed' === '1' → skip (local flag)
 * 3. Otherwise → show the OnboardingSwiper
 *
 * On complete/skip:
 * - Sets AsyncStorage flag (immediate, offline-safe)
 * - Calls POST /api/onboarding/complete (syncs to DB for cross-platform)
 * - Refreshes auth context so the flag propagates
 *
 * Non-forced: user can dismiss at any time. Never shows again.
 *
 * Sprint 7 (4.5) note: an audit flagged AsyncStorage use here as
 * "unencrypted progress in DevTools". That was a false alarm — mobile
 * AsyncStorage writes to app-private storage (NSUserDefaults on iOS,
 * SharedPreferences on Android), not a DevTools-visible bucket, and
 * we only persist a single dismissal flag `'1'`, not step-by-step
 * progress. Source of truth remains `profiles.onboarding_completed`
 * on the server; the local flag is just an offline / cross-session
 * optimization. No SecureStore migration needed.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'onboarding_dismissed';

export function useOnboardingGate() {
  const { user, refreshUser } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      return;
    }

    // Already completed in DB — never show
    if (user.onboarding_completed) {
      setChecked(true);
      setShouldShow(false);
      return;
    }

    // Check local flag (covers offline + cross-session)
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        setShouldShow(val !== '1');
        setChecked(true);
      })
      .catch(() => {
        // If storage fails, don't show (safe default)
        setChecked(true);
      });
  }, [user]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);

    // Persist locally immediately
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Non-critical
    }

    // Sync to DB (non-blocking)
    try {
      await mobileApiClient.post('/api/onboarding/complete', {});
      await refreshUser();
    } catch (err) {
      logger.warn('Failed to sync onboarding completion to server', {
        error: err,
      });
      // Local flag is set — won't show again even if API fails
    }
  }, [refreshUser]);

  return { shouldShow: checked && shouldShow, dismiss };
}
