/**
 * useSilverMode — mobile bridge between profiles.settings.silverMode
 * (server truth), AsyncStorage (fast hydration on launch), and the
 * in-memory theme state (`silverModeState`).
 *
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md. Mirrors the web hook but
 * doesn't need localStorage — RN uses AsyncStorage.
 */

import { useCallback, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';
import {
  isSilverMode,
  setSilverModeEnabled,
  subscribeSilverMode,
} from '../theme/silverModeState';

const CACHE_KEY = 'mintenance.silverMode';

export function useSilverMode() {
  const [silverMode, setState] = useState<boolean>(isSilverMode());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const off = subscribeSilverMode(setState);
    return off;
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Instant hydrate from AsyncStorage.
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (!cancelled && cached === '1') {
          setSilverModeEnabled(true);
        }
      } catch {
        // ignore
      }

      // 2) Authoritative fetch from /api/user/settings.
      try {
        const body = await mobileApiClient.get<{ silverMode?: boolean }>(
          '/api/user/settings'
        );
        if (cancelled) return;
        const next = Boolean(body?.silverMode);
        setSilverModeEnabled(next);
        await AsyncStorage.setItem(CACHE_KEY, next ? '1' : '0').catch(() => {
          // ignore
        });
      } catch (err) {
        logger.warn('silver-mode: server fetch failed', { err });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setPersistent = useCallback(async (next: boolean) => {
    setSilverModeEnabled(next);
    try {
      await AsyncStorage.setItem(CACHE_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
    try {
      await mobileApiClient.patch('/api/user/settings', { silverMode: next });
    } catch (err) {
      logger.warn('silver-mode: server save failed', { err });
    }
  }, []);

  const toggle = useCallback(async () => {
    await setPersistent(!silverMode);
  }, [setPersistent, silverMode]);

  return { silverMode, toggle, setSilverMode: setPersistent, loading };
}
