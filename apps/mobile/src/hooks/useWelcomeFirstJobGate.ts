import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';

// This homeowner finale belongs to an onboarding flow completed in this
// session, not every existing account signing in on a fresh installation.
export function useWelcomeFirstJobGate() {
  const { user } = useAuth();
  const eligibleAccount = useRef<string | null>(null);
  const [visibleAccount, setVisibleAccount] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    setVisibleAccount(null);
    if (!user || user.role !== 'homeowner') {
      eligibleAccount.current = null;
      return;
    }
    if (user.onboarding_completed === false) {
      eligibleAccount.current = user.id;
      return;
    }
    if (!user.onboarding_completed || eligibleAccount.current !== user.id) return;
    AsyncStorage.getItem(`welcome_first_job_seen:${user.id}`)
      .then((value) => {
        if (active && value !== '1') setVisibleAccount(user.id);
      })
      .catch(() => { /* Optional guidance must not block sign-in. */ });
    return () => { active = false; };
  }, [user?.id, user?.role, user?.onboarding_completed]);

  const dismiss = useCallback(async () => {
    setVisibleAccount(null);
    eligibleAccount.current = null;
    if (!user) return;
    try {
      await AsyncStorage.setItem(`welcome_first_job_seen:${user.id}`, '1');
    } catch { /* The current session remains dismissed. */ }
  }, [user?.id]);

  return {
    shouldShow: user?.role === 'homeowner' && !!user?.onboarding_completed && visibleAccount === user?.id,
    dismiss,
  };
}
