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
      // 2026-05-24 audit-25 P2: profiles.insurance_expiry +
      // profiles.dbs_expiry exist in the schema but nothing writes
      // to them. InsuranceScreen persists to `contractor_insurance`,
      // the DBS flow persists to `contractor_dbs_checks`. Reading
      // only the profile columns meant Insured / DBS-Checked badges
      // never turned on. Query the live record tables in parallel
      // and use their latest active expiry when the profile column
      // is null.
      const [profileRes, insuranceRes, dbsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select(SELECT_FIELDS)
          .eq('id', user.id)
          .maybeSingle(),
        supabase
          .from('contractor_insurance')
          .select('expiry_date, status')
          .eq('contractor_id', user.id)
          .eq('status', 'active')
          .order('expiry_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('contractor_dbs_checks')
          .select('expiry_date, status')
          .eq('contractor_id', user.id)
          .eq('status', 'active')
          .order('expiry_date', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      if (profileRes.error) {
        logger.warn('useContractorBadges: profile query failed', {
          error: profileRes.error.message,
        });
        setProfile(null);
        setLoading(false);
        return;
      }

      const profileData =
        (profileRes.data as ContractorBadgeInput | null) ?? null;
      if (!profileData) {
        setProfile(null);
        setLoading(false);
        return;
      }

      const insuranceExpiry =
        (profileData as { insurance_expiry?: string | null })
          .insurance_expiry ??
        (insuranceRes.data as { expiry_date?: string | null } | null)
          ?.expiry_date ??
        null;
      const dbsExpiry =
        (profileData as { dbs_expiry?: string | null }).dbs_expiry ??
        (dbsRes.data as { expiry_date?: string | null } | null)?.expiry_date ??
        null;

      setProfile({
        ...profileData,
        insurance_expiry: insuranceExpiry,
        dbs_expiry: dbsExpiry,
      } as ContractorBadgeInput);
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
