/**
 * useWelcomeFirstJobGate — fires the final onboarding screen once
 * per device after every earlier tier has cleared.
 *
 * Rules:
 *   1. Suppress until user.onboarding_completed === true. We don't
 *      want the celebration screen showing before the swiper has
 *      been finished.
 *   2. Suppress once the local `welcome_first_job_seen` flag is set
 *      in AsyncStorage. A single dismissal sticks for the device.
 *
 * Mirrors the shape of `useOnboardingGate` / `useHomeownerSetupGate`
 * so OnboardingGateStack can compose them the same way.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

const STORAGE_KEY = 'welcome_first_job_seen';

export function useWelcomeFirstJobGate() {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user) {
      setChecked(true);
      setShouldShow(false);
      return;
    }
    if (!user.onboarding_completed) {
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
