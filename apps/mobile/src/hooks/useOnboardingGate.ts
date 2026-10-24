import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';

export function useOnboardingGate(audience?: string | null) {
  const { user, refreshUser } = useAuth();
  const userId = user?.id;
  const role = user?.role;
  const introRole = audience ?? role;
  const [visibleAccount, setVisibleAccount] = useState<string | null>(null);
  const [checkedAccount, setCheckedAccount] = useState<string | null>(null);
  const key = `onboarding:v2:mobile:${userId}:intro-${introRole}`;
  useEffect(() => {
    let active = true;
    setVisibleAccount(null);
    setCheckedAccount(null);
    if (!userId || !role) return;
    if (!['homeowner', 'contractor'].includes(role)) {
      setCheckedAccount(userId);
      return;
    }
    const accountId = userId;
    (async () => {
      let local: string | null = null;
      try {
        local = await AsyncStorage.getItem(key);
        const remote = await mobileApiClient.get<{
          progress: { journey: string; platform: string; status: string }[];
        }>('/api/onboarding/progress');
        const intro = remote.progress.find(
          (p) => p.journey === `intro-${introRole}` && p.platform === 'mobile'
        );
        if (active && !local && (!intro || intro.status === 'in_progress'))
          setVisibleAccount(accountId);
      } catch {
        if (active && !local) setVisibleAccount(accountId);
      } finally {
        if (active) setCheckedAccount(accountId);
      }
    })();
    return () => {
      active = false;
    };
  }, [key, userId, role, introRole]);
  const dismiss = useCallback(
    async (status: 'completed' | 'skipped' = 'skipped') => {
      if (!userId || !role) return;
      setVisibleAccount(null);
      try {
        // Maintain compatibility with the existing setup-gate ladder, but keep
        // this platform's learning outcome independent from that legacy flag.
        await mobileApiClient.post('/api/onboarding/complete', {});
        await mobileApiClient.put('/api/onboarding/progress', {
          journey: `intro-${introRole}`,
          platform: 'mobile',
          status,
          step: 0,
        });
        await AsyncStorage.setItem(key, status);
        await refreshUser();
      } catch (error) {
        logger.warn('Intro progress will be retried next session', { error });
      }
    },
    [key, userId, role, introRole, refreshUser]
  );
  return {
    ready: !!user && checkedAccount === user.id,
    shouldShow: !!user && visibleAccount === user.id,
    dismiss: () => dismiss('skipped'),
    complete: () => dismiss('completed'),
  };
}
