/**
 * useContractorBadges — fetch the contractor's profile columns
 * that feed the trust-badge ladder, then hand them to the pure
 * computeContractorBadges() utility.
 *
 * Phase 3 of the 2026-04-19 mobile onboarding audit. Lets any
 * mobile surface (dashboard, profile screen, bid card...)
 * render the badge stack without re-writing the query.
 *
 * Refresh semantics
 * -----------------
 * Probe on mount, again whenever user.id changes. Callers that
 * update a gating field (e.g. the SelfieCaptureScreen updating
 * profile_image_url, or the BackgroundCheckPromptModal
 * initiating) can call refresh() to force a re-read. The gate
 * stack screens already do this for their own refresh flows;
 * this hook is parallel and decoupled so a badge render isn't
 * tied to any one gate's lifecycle.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { logger } from '../utils/logger';
import {
  computeContractorBadges,
  nextUnearnedBadge,
  type ContractorBadgeDef,
  type ContractorBadgeInput,
} from '../utils/contractorBadges';

export interface ContractorBadgesResult {
  badges: ContractorBadgeDef[];
  /** The next badge on the ladder the contractor hasn't earned. */
  next: ContractorBadgeDef | null;
  loading: boolean;
  /** Re-run the profile probe. Safe to call from event handlers. */
  refresh: () => Promise<void>;
}

const SELECT_FIELDS =
  'admin_verified, verification_status, background_check_status, ' +
  'license_type, license_expiry, rating, total_jobs_completed, ' +
  // Added 2026-04-22 by the Phase 3 migration that landed these
  // columns (20260422000001_contractor_insurance_dbs_badge_fields).
  // The utility already reads them — fetching them here flips the
  // Insured + DBS Checked badges on once data arrives.
  'insurance_expiry, dbs_expiry';

export function useContractorBadges(): ContractorBadgesResult {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ContractorBadgeInput | null>(null);
  const [loading, setLoading] = useState(true);

  const probe = useCallback(async () => {
    if (!user?.id || user.role !== 'contractor') {
      setProfile(null);
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(SELECT_FIELDS)
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        logger.warn('useContractorBadges: profile query failed', {
          error: error.message,
        });
        setProfile(null);
        setLoading(false);
        return;
      }

      // insurance_expiry + dbs_expiry are absent from SELECT_FIELDS
      // today because the columns don't exist yet. Once the
      // follow-up migration lands, extend SELECT_FIELDS — no
      // component change required; the utility already reads them
      // as optional.
      setProfile((data as ContractorBadgeInput | null) ?? null);
      setLoading(false);
    } catch (err) {
      logger.warn('useContractorBadges: probe threw', {
        error: err instanceof Error ? err.message : String(err),
      });
      setProfile(null);
      setLoading(false);
    }
  }, [user?.id, user?.role]);

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

  if (!profile) {
    return { badges: [], next: null, loading, refresh: probe };
  }
  return {
    badges: computeContractorBadges(profile),
    next: nextUnearnedBadge(profile),
    loading,
    refresh: probe,
  };
}
