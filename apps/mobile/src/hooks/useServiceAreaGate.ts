/**
 * useServiceAreaGate — Tier 1 step 3 of the 2026-04-19 mobile
 * onboarding audit (§5.3). Nudges a freshly-onboarded contractor
 * to set up their service area so the nearby-jobs feed has a
 * geographic centre to bias on.
 *
 * Per PDF §5.3 step 3:
 *   "Trade categories (plumbing, electrics, roofing…), service
 *    radius from postcode. Required to show the jobs-near-me map."
 *
 * This hook only checks the service-area side of the picture —
 * skills are a separate concept (contractor_skills table) that
 * the existing contractor profile flow handles. The blocking
 * criterion for seeing nearby jobs is service area, not a
 * complete skills profile (a contractor with zero skills can
 * still browse; a contractor with zero service areas gets
 * nothing from the nearby-jobs query).
 *
 * Gate rules
 * ----------
 *   - user signed in AND role === 'contractor'
 *   - user.onboarding_completed === true (swiper dismissed)
 *   - service_areas.count WHERE contractor_id = user.id IS 0
 *   - no AsyncStorage dismissal flag set
 *
 * Coordination with other gates
 * ------------------------------
 * Sits AFTER LocationSoftAsk in the AppNavigator suppression
 * chain. The user can be shown this modal whether or not they
 * granted location — the service-area creation flow itself
 * handles the permission re-prompt when needed.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'service_area_prompt_dismissed_at';

export interface ServiceAreaGate {
  /** True when the modal should render. */
  shouldShow: boolean;
  /** True while the initial probe is in-flight. */
  loading: boolean;
  /** Mark dismissed — won't re-fire on subsequent sessions. */
  dismiss: () => Promise<void>;
  /**
   * Re-probe the service-area count. Wire this into the modal's
   * onAfterNavigate so the gate auto-hides after the user returns
   * from ServiceAreasScreen with a freshly created area.
   */
  refresh: () => Promise<void>;
}

export function useServiceAreaGate(): ServiceAreaGate {
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

      const { count, error } = await supabase
        .from('service_areas')
        .select('id', { count: 'exact', head: true })
        .eq('contractor_id', user.id);

      if (error) {
        logger.warn('useServiceAreaGate: service-area count query failed', {
          error: error.message,
        });
        // Fail safe — no modal on broken query.
        setShouldShow(false);
        setLoading(false);
        return;
      }

      setShouldShow((count ?? 0) === 0);
      setLoading(false);
    } catch (err) {
      logger.warn('useServiceAreaGate: probe threw', {
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
      logger.warn('useServiceAreaGate: dismiss persist failed', {
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
