'use client';

/**
 * Silver-mode accessibility toggle — web hook.
 *
 * R3 #5a of docs/RETENTION_ROADMAP_2026.md. Persists on
 * `profiles.settings.silverMode` via /api/user/settings, with an
 * immediate client fallback in localStorage so toggling feels instant.
 *
 * Silver mode multiplies the base font size by `SILVER_SCALE` and
 * raises the minimum CTA height. Screens opt in by consuming this hook
 * (or the helper `silverFontSize` function) — existing screens keep
 * the current fixed sizing until they migrate.
 */

import { useCallback, useEffect, useState } from 'react';

export const SILVER_SCALE = 1.35;
const LOCAL_KEY = 'mintenance.silverMode';

export function silverFontSize(base: number, isSilver: boolean): number {
  return isSilver ? Math.round(base * SILVER_SCALE) : base;
}

export interface UseSilverModeResult {
  silverMode: boolean;
  toggle: () => Promise<void>;
  setSilverMode: (v: boolean) => Promise<void>;
  loading: boolean;
}

export function useSilverMode(): UseSilverModeResult {
  const [silverMode, setState] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage first (instant), then reconcile with server.
  useEffect(() => {
    try {
      const cached = window.localStorage.getItem(LOCAL_KEY);
      if (cached === '1') setState(true);
    } catch {
      // ignore
    }

    (async () => {
      try {
        const res = await fetch('/api/user/settings', {
          credentials: 'include',
        });
        if (res.ok) {
          const body = (await res.json()) as { silverMode?: boolean };
          const next = Boolean(body?.silverMode);
          setState(next);
          try {
            window.localStorage.setItem(LOCAL_KEY, next ? '1' : '0');
          } catch {
            // ignore
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next: boolean) => {
    setState(next);
    try {
      window.localStorage.setItem(LOCAL_KEY, next ? '1' : '0');
    } catch {
      // ignore
    }
    await fetch('/api/user/settings', {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ silverMode: next }),
    }).catch(() => {
      // non-fatal — localStorage has the update
    });
  }, []);

  const toggle = useCallback(async () => {
    await persist(!silverMode);
  }, [persist, silverMode]);

  return { silverMode, toggle, setSilverMode: persist, loading };
}
