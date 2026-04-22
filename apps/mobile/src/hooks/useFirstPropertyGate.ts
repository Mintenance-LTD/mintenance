/**
 * useFirstPropertyGate — decides whether to show the
 * FirstPropertyPromptModal (Phase 2 of the 2026-04-19
 * mobile-onboarding-audit plan, §5.2 step 2).
 *
 * Why this exists
 * ----------------
 * Today's homeowner flow (audit §3.1):
 *   "HomeownerDashboard relies on the Property picker inside
 *    QuickJobModal, but a brand-new homeowner has no Properties
 *    yet — the first job-post attempt becomes 'add a property,
 *    then pick it, then describe the job' with no guidance."
 *
 * The fix per the PDF is an explicit "Add your first property"
 * step between the onboarding swiper and the dashboard. This hook
 * powers a modal that prompts the homeowner AFTER the swiper
 * dismisses, checks whether they have any properties, and offers
 * "Add property" / "Skip for now".
 *
 * Non-forced: users can dismiss. Per PDF §4.1 principle:
 *   "Always give a visible skip. Hidden skips feel paternalistic
 *    and raise drop-off."
 *
 * Gate rules
 * ----------
 *   - User must be signed in.
 *   - user.role === 'homeowner'. Contractors have their own
 *     Tier 1 path (PDF §5.3) — not gated by this hook.
 *   - user.onboarding_completed must be true. Stacking this
 *     prompt ON TOP of the swiper would double-modal the user
 *     and look like two separate decisions instead of one flow.
 *   - Property count on `properties` filtered by owner_id must
 *     be 0. The moment they add one anywhere in the app, this
 *     gate goes dark permanently.
 *   - Local dismissal flag not set (AsyncStorage:
 *     `first_property_prompt_dismissed_at`). The flag is a
 *     timestamp — a future follow-up could re-nag users who
 *     skipped if they never come back to properties, but this
 *     commit treats the first dismiss as final.
 *
 * Coordination with other gates
 * ------------------------------
 * `usePushSoftAskGate` also gates on `onboarding_completed`, so
 * in principle both could fire at the same moment. The render
 * order chosen in AppNavigator is:
 *   1. OnboardingModal  (while shouldShow)
 *   2. FirstPropertyPromptModal  (homeowner path)
 *   3. PushSoftAskModal  (only when #2 not showing)
 * That ordering is enforced at the navigator, not here.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'first_property_prompt_dismissed_at';

export interface FirstPropertyGate {
  /** True when the modal should render. */
  shouldShow: boolean;
  /** True while the initial probe is in-flight (first mount only). */
  loading: boolean;
  /** Mark dismissed — won't re-fire on subsequent sessions. */
  dismiss: () => Promise<void>;
  /**
   * Re-probe the property count. Callers should run this after the
   * user returns from a successful AddPropertyScreen submission so
   * the modal auto-hides without a remount.
   */
  refresh: () => Promise<void>;
}

export function useFirstPropertyGate(): FirstPropertyGate {
  const { user } = useAuth();
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);

  const probe = useCallback(async () => {
    if (!user?.id) {
      setShouldShow(false);
      setLoading(false);
      return;
    }
    if (user.role !== 'homeowner') {
      setShouldShow(false);
      setLoading(false);
      return;
    }
    if (!user.onboarding_completed) {
      // Swiper is still pending — the outer modal wins. When the
      // user finishes the swiper the useAuth refresh will flip
      // onboarding_completed and this effect re-runs.
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

      const { count, error } = await supabase
        .from('properties')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', user.id);

      if (error) {
        logger.warn('useFirstPropertyGate: property count query failed', {
          error: error.message,
        });
        // Fail safe: don't block the user with a modal on a broken
        // query. Dashboard + FinishSetupCard still surface the
        // missing-property state.
        setShouldShow(false);
        setLoading(false);
        return;
      }

      setShouldShow((count ?? 0) === 0);
      setLoading(false);
    } catch (err) {
      logger.warn('useFirstPropertyGate: probe threw', {
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
      // Non-critical — the in-memory state is enough for this session;
      // worst case the modal shows again next launch.
      logger.warn('useFirstPropertyGate: dismiss persist failed', {
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
