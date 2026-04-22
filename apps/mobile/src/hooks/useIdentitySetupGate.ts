/**
 * useIdentitySetupGate — Tier 1 step 5 of the 2026-04-19 mobile
 * onboarding audit (§5.3). Nudges a freshly-onboarded contractor
 * to complete their identity + business details so the background
 * check (step 6) has data to work with.
 *
 * Per PDF §5.3 step 5:
 *   "Legal name, DOB, UK address, company name (optional for sole
 *    traders), Companies House lookup if Ltd. Feeds background
 *    check."
 *
 * Scope of this gate
 * ------------------
 * The gate fires for contractors who haven't submitted the
 * existing ContractorVerificationScreen (verification_status IN
 * ('none', null)). It's an active nudge version of what the
 * FinishSetupCard already surfaces passively.
 *
 * The identity details the PDF calls out (legal name, DOB, UK
 * address) aren't all captured by today's ContractorVerificationScreen —
 * DOB in particular has no column on `profiles` yet. This commit
 * lands the PROMPT so contractors get pulled into the existing
 * verification flow; a follow-up commit adds a DOB + legal-name
 * step to the screen and the migration for the column.
 *
 * Gate rules
 * ----------
 *   - user signed in AND role === 'contractor'
 *   - user.onboarding_completed === true
 *   - verification_status NOT IN ('pending', 'verified', 'rejected')
 *     (i.e. 'none' or NULL — they haven't submitted anything yet)
 *   - no AsyncStorage dismissal flag
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'identity_setup_prompt_dismissed_at';

const ALREADY_SUBMITTED = new Set<string>([
  'pending',
  'verified',
  'rejected',
]);

export interface IdentitySetupGate {
  shouldShow: boolean;
  loading: boolean;
  dismiss: () => Promise<void>;
  /**
   * Re-probe after the user returns from the verification screen
   * so the modal auto-hides when they submit.
   */
  refresh: () => Promise<void>;
}

export function useIdentitySetupGate(): IdentitySetupGate {
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
        .select('verification_status')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        logger.warn(
          'useIdentitySetupGate: verification_status query failed',
          { error: error.message }
        );
        setShouldShow(false);
        setLoading(false);
        return;
      }

      const status = (data?.verification_status as string | null) ?? 'none';
      setShouldShow(!ALREADY_SUBMITTED.has(status));
      setLoading(false);
    } catch (err) {
      logger.warn('useIdentitySetupGate: probe threw', {
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
      logger.warn('useIdentitySetupGate: dismiss persist failed', {
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
