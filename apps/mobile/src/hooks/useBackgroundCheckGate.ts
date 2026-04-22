/**
 * useBackgroundCheckGate — Tier 1 step 6 of the 2026-04-19 mobile
 * onboarding audit (§5.3). Nudges a freshly-verified contractor
 * to kick off the background check so the "Place a bid" gate
 * opens as soon as the ~48h SLA clears.
 *
 * Per PDF §5.3 step 6:
 *   "Kicks off a third-party check asynchronously (48h SLA).
 *    Blocks 'Place a bid' button until clear."
 *
 * Coordination with Tier 1 step 5
 * --------------------------------
 * This gate fires AFTER identity setup (step 5). Ordering rules:
 *
 *   - Step 5 gate is blocked by `verification_status NOT IN
 *     (pending, verified, rejected)` — so it hides itself once
 *     the contractor has submitted.
 *   - Step 6 gate is blocked by `background_check_status` being
 *     missing — it only shows once step 5 is done AND the
 *     background check hasn't been kicked off yet.
 *
 * The handshake between the two gates happens via the profiles
 * row: after the contractor submits step 5, verification_status
 * becomes 'pending', which flips step 5's gate off and makes
 * step 6's gate check happen on next mount.
 *
 * Gate rules
 * ----------
 *   - user signed in AND role === 'contractor'
 *   - user.onboarding_completed === true
 *   - verification_status IN ('pending', 'verified')
 *     (i.e. they've at least kicked off the identity review —
 *     no point pushing a background check on a contractor who
 *     hasn't told us who they are)
 *   - background_check_status IS NULL OR === 'not_requested'
 *   - no AsyncStorage dismissal flag
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'background_check_prompt_dismissed_at';

const IDENTITY_SUBMITTED = new Set<string>(['pending', 'verified']);
const CHECK_NOT_STARTED = new Set<string | null>([null, 'not_requested']);

export interface BackgroundCheckGate {
  shouldShow: boolean;
  loading: boolean;
  dismiss: () => Promise<void>;
  /**
   * Re-probe after the user initiates the check (or comes back
   * from a related screen) so the modal auto-hides.
   */
  refresh: () => Promise<void>;
}

export function useBackgroundCheckGate(): BackgroundCheckGate {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  const probe = useCallback(async () => {
    if (!user?.id) {
      setShouldShow(false);
      setLoading(false);
      return;
    }
    if (user.role !== 'contractor') {
      setShouldShow(false);
      setLoading(false);
      return;
    }
    if (!user.onboarding_completed) {
      setShouldShow(false);
      setLoading(false);
      return;
    }

    try {
      const dismissedAt = await AsyncStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        setShouldShow(false);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('profiles')
        .select('verification_status, background_check_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        logger.warn('useBackgroundCheckGate: profile query failed', {
          error: error.message,
        });
        setShouldShow(false);
        setLoading(false);
        return;
      }

      const row = data as {
        verification_status: string | null;
        background_check_status: string | null;
      } | null;

      const identityDone =
        row && IDENTITY_SUBMITTED.has(row.verification_status ?? 'none');
      const checkUnstarted =
        row && CHECK_NOT_STARTED.has(row.background_check_status);

      setShouldShow(Boolean(identityDone && checkUnstarted));
      setLoading(false);
    } catch (err) {
      logger.warn('useBackgroundCheckGate: probe threw', {
        error: err instanceof Error ? err.message : String(err),
      });
      setShouldShow(false);
      setLoading(false);
    }
  }, [user?.id, user?.role, user?.onboarding_completed]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (cancelled) return;
      await probe();
    })();
    return () => {
      cancelled = true;
    };
  }, [probe]);

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch (err) {
      logger.warn('useBackgroundCheckGate: dismiss persist failed', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }, []);

  return {
    shouldShow,
    loading,
    dismiss,
    refresh: probe,
  };
}
