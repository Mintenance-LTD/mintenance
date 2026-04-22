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
 * the contractor has no `profile_image_url` on their profile AND
 * they've already done identity + started the background check.
 * Earlier gates (identity, background check) have their own
 * `shouldShow` rules so this one waits for both to be non-
 * visible — handled at the OnboardingGateStack level rather than
 * replicated here.
 *
 * Source-of-truth gap
 * -------------------
 * The existing `profiles.profile_image_url` field accepts any
 * URL — library-picked photos are indistinguishable from
 * live-capture selfies at the DB layer. The PDF's anti-fraud
 * goal would ideally want a `profile_photo_is_selfie` boolean
 * column so we can distinguish a stock photo from a capture;
 * that migration is a follow-up. This commit gates on photo
 * presence only. The live-capture flow (SelfieCaptureScreen)
 * only accepts a fresh camera frame, so any photo uploaded
 * via this flow IS a selfie by construction, even if the DB
 * doesn't know it yet.
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
        .select('profile_image_url, verification_status')
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
        profile_image_url: string | null;
        verification_status: string | null;
      } | null;

      const identityDone =
        row && IDENTITY_DONE.has(row.verification_status ?? 'none');
      const photoMissing = row && !row.profile_image_url;

      setShouldShow(Boolean(identityDone && photoMissing));
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
