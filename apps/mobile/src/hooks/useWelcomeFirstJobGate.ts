import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

// This homeowner finale belongs to an onboarding flow completed in this
// session, not every existing account signing in on a fresh installation.
export function useWelcomeFirstJobGate() {
  const { user } = useAuth();
  const accountId = user?.id;
  const role = user?.role;
  const onboardingCompleted = user?.onboarding_completed;
  const eligibleAccount = useRef<string | null>(null);
  const [visibleAccount, setVisibleAccount] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setVisibleAccount(null);
    if (!accountId || role !== 'homeowner') {
      eligibleAccount.current = null;
      return;
    }
    if (onboardingCompleted === false) {
      eligibleAccount.current = accountId;
      return;
    }
    if (!onboardingCompleted || eligibleAccount.current !== accountId) return;
    AsyncStorage.getItem(`welcome_first_job_seen:${accountId}`)
      .then((value) => {
        if (active && value !== '1') setVisibleAccount(accountId);
      })
      .catch(() => { /* Optional guidance must not block sign-in. */ });
    return () => { active = false; };
  }, [accountId, role, onboardingCompleted]);

  const dismiss = useCallback(async () => {
    setVisibleAccount(null);
    eligibleAccount.current = null;
    if (!accountId) return;
    try {
      await AsyncStorage.setItem(`welcome_first_job_seen:${accountId}`, '1');
    } catch { /* The current session remains dismissed. */ }
  }, [accountId]);

  return {
    shouldShow: user?.role === 'homeowner' && !!user?.onboarding_completed && visibleAccount === user?.id,
    dismiss,
  };
}
