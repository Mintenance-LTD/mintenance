/**
 * useSelfieCaptureGate — Tier 1 step 7 (final) of the 2026-04-19
 * mobile onboarding audit (§5.3). Nudges a contractor who has
 * kicked off the background check to finish their profile with
 * a live-capture selfie.
 *
 * Per PDF §5.3 step 7:
 *   "Selfie via camera (live capture, not library) to prevent
 *    stock-photo fraud. Required for profile visibility."
 *
 * Gate ordering
 * -------------
 * This is the LAST Tier 1 gate before push soft-ask. Fires when
 * the contractor's profile is missing a verified selfie capture
 * AND they've already done identity + started the background
 * check. Earlier gates (identity, background check) have their
 * own `shouldShow` rules so this one waits for both to be non-
 * visible — handled at the OnboardingGateStack level rather than
 * replicated here.
 *
 * Source of truth (2026-05-10, AUDIT_PUNCH_LIST P2 #38 closed)
 * ------------------------------------------------------------
 * The gate now reads `profiles.profile_photo_is_selfie` instead of
 * `profile_image_url` presence. The boolean is set TRUE only by
 * `SelfieCaptureScreen` (camera-only flow); `/api/users/avatar`
 * — which accepts library uploads — explicitly clears it to FALSE.
 * Pre-existing rows default to FALSE so the audit's anti-fraud
 * intent ("live capture, not library") is honoured for users who
 * uploaded a stock-photo avatar before the column existed. The
 * AsyncStorage dismissal handles the "already-onboarded contractor
 * with a real photo who doesn't want to redo it" case — gate fires
 * once, dismiss, never seen again on this device.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'selfie_capture_prompt_dismissed_at';

const IDENTITY_DONE = new Set<string>(['pending', 'verified']);

export interface SelfieCaptureGate {
  shouldShow: boolean;
  loading: boolean;
  dismiss: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useSelfieCaptureGate(): SelfieCaptureGate {
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
        .select('profile_photo_is_selfie, verification_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        logger.warn('useSelfieCaptureGate: profile query failed', {
          error: error.message,
        });
        setShouldShow(false);
        setLoading(false);
        return;
      }

      const row = data as {
        profile_photo_is_selfie: boolean | null;
        verification_status: string | null;
      } | null;

      const identityDone =
        row && IDENTITY_DONE.has(row.verification_status ?? 'none');
      // Gate on the verified-selfie flag, not photo presence.
      // Library-picked avatars now correctly read as "needs selfie"
      // (the column defaults to false; /api/users/avatar clears it
      // back to false on every upload).
      const needsSelfie = row && !row.profile_photo_is_selfie;

      setShouldShow(Boolean(identityDone && needsSelfie));
      setLoading(false);
    } catch (err) {
      logger.warn('useSelfieCaptureGate: probe threw', {
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
      logger.warn('useSelfieCaptureGate: dismiss persist failed', {
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
