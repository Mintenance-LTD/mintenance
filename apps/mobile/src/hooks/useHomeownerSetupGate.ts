/**
 * useHomeownerSetupGate — decides whether the HomeownerSetupModal
 * should fire as part of the post-sign-up onboarding chain.
 *
 * Rules:
 *   1. Suppress unless user.role === 'homeowner'. Contractors have
 *      their own verification flow (IdentitySetup / BackgroundCheck /
 *      SelfieCapture gates above this one).
 *   2. Suppress once the local `homeowner_setup_dismissed` flag is
 *      set in AsyncStorage. The screen captures preferences (property
 *      type + concern tags) that aren't a hard onboarding gate, so a
 *      single dismissal sticks for the device.
 *   3. The dismissal flag is per-device (no DB column today). If the
 *      user re-installs the app they'll see the modal again — that's
 *      acceptable for v1, and a follow-up can migrate the flag to
 *      `profiles.preferences_completed` JSONB.
 *
 * Mirrors the shape of `useOnboardingGate` so OnboardingGateStack can
 * compose them the same way.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'homeowner_setup_dismissed';

export function useHomeownerSetupGate() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      setShouldShow(false);
      return;
    }
    if (user.role !== 'homeowner') {
      setChecked(true);
      setShouldShow(false);
      return;
    }
    AsyncStorage.getItem(STORAGE_KEY)
      .then((val) => {
        setShouldShow(val !== '1');
        setChecked(true);
      })
      .catch(() => {
        // Storage failure → don't show (safe default; user can hit
        // the setup later via Profile → Edit Profile).
        setChecked(true);
        setShouldShow(false);
      });
  }, [user]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Non-critical — the gate will re-evaluate on next mount.
    }
  }, []);

  return { shouldShow: checked && shouldShow, dismiss };
}
