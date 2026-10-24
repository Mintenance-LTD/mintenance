import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { mobileApiClient } from '../utils/mobileApiClient';
export function useHomeownerSetupGate() {
  const { user } = useAuth();
  const userId = user?.id;
  const role = user?.role;
  const [account, setAccount] = useState<string | null>(null);
  const key = `homeowner_setup_dismissed:${user?.id}`;
  useEffect(() => {
    let active = true;
    setAccount(null);
    if (!userId || role !== 'homeowner') return;
    (async () => {
      try {
        const [dismissed, result] = await Promise.all([
          AsyncStorage.getItem(key),
          mobileApiClient.get<{
            profile: {
              settings?: {
                homeowner_setup_completed?: boolean;
                property_type?: unknown;
                concern_tags?: unknown;
              };
            };
          }>('/api/users/profile'),
        ]);
        const settings = result.profile.settings;
        const completed =
          settings?.homeowner_setup_completed ||
          (settings?.property_type != null &&
            Array.isArray(settings?.concern_tags));
        if (active && !dismissed && !completed) setAccount(userId);
      } catch {
        /* A temporary lookup error must not interrupt the current task. */
      }
    })();
    return () => {
      active = false;
    };
  }, [key, userId, role]);
  const dismiss = useCallback(async () => {
    setAccount(null);
    try {
      await AsyncStorage.setItem(key, '1');
    } catch {
      /* Retry on next session. */
    }
  }, [key]);
  return { shouldShow: !!user && account === user.id, dismiss };
}
