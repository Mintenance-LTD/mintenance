/**
 * useSilverMode — mobile bridge between profiles.settings.silverMode
 * (server truth), AsyncStorage (fast hydration on launch), and the
 * in-memory theme state (`silverModeState`).
 *
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md. Mirrors the web hook but
 * doesn't need localStorage — RN uses AsyncStorage.
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';
import {
  isSilverMode,
  setSilverModeEnabled,
  subscribeSilverMode,
} from '../theme/silverModeState';

const CACHE_KEY = 'mintenance.silverMode';

export function useSilverMode() {
  const { user } = useAuth();
  const currentAccount = useRef(user?.id);
  currentAccount.current = user?.id;
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const cacheKey = `${CACHE_KEY}:${user?.id ?? 'signed-out'}`;
  const [silverMode, setState] = useState<boolean>(isSilverMode());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = subscribeSilverMode(setState);
    return off;
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSilverModeEnabled(false);
    const controller = new AbortController();

    (async () => {
      // 1) Instant hydrate from AsyncStorage.
      try {
        const cached = await AsyncStorage.getItem(cacheKey);
        if (!cancelled) {
          setSilverModeEnabled(cached === '1');
        }
      } catch {
        // ignore
      }

      // 2) Authoritative fetch from /api/users/settings (canonical
      //    URL post audit step 8 consolidation; the singular
      //    /api/user/settings is now a kept-alive legacy alias).
      try {
        const body = await mobileApiClient.get<{ silverMode?: boolean }>(
          '/api/users/settings',
          { signal: controller.signal }
        );
        if (cancelled) return;
        const next = Boolean(body?.silverMode);
        setSilverModeEnabled(next);
        await AsyncStorage.setItem(cacheKey, next ? '1' : '0').catch(() => {
          // ignore
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            'Unable to load your saved accessibility setting. Please retry.'
          );
          logger.warn('silver-mode: server fetch failed', { err });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [cacheKey, attempt]);

  const setPersistent = useCallback(
    async (next: boolean) => {
      if (loading || saving || !user?.id) return;
      setSaving(true);
      try {
        await mobileApiClient.patch('/api/users/settings', {
          silverMode: next,
        });
        setSilverModeEnabled(next);
        await AsyncStorage.setItem(cacheKey, next ? '1' : '0').catch(() => {});
        setError(null);
      } catch (err) {
        setError(
          'Your change was not saved. Check your connection and try again.'
        );
        logger.warn('silver-mode: server save failed', { err });
      } finally {
        setSaving(false);
      }
    },
    [cacheKey, user?.id, loading, saving]
  );

  const toggle = useCallback(async () => {
    await setPersistent(!silverMode);
  }, [setPersistent, silverMode]);

  return {
    silverMode,
    toggle,
    setSilverMode: setPersistent,
    loading,
    saving,
    error,
    retry: () => setAttempt((value) => value + 1),
  };
}
