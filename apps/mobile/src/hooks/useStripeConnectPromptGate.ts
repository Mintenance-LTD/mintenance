/**
 * useStripeConnectPromptGate — Phase 3 (Tier 2) of the
 * 2026-04-19 mobile onboarding audit.
 *
 * Per PDF §5.3 Tier 2:
 *   "Stripe Connect onboarding. Already implemented via
 *    ContractorPayoutsScreen. Surface it inside the
 *    bid-acceptance moment ('You just won a job — let's set
 *    up where the money lands') rather than as a buried menu."
 *
 * This gate fires AFTER the contractor has won at least one bid
 * (so the money moment is imminent) AND their Stripe Connect
 * account is incomplete. It deliberately has NO
 * `onboarding_completed` pre-check: a contractor can win a bid
 * before dismissing the intro swiper, and we'd rather prompt
 * early than miss the money moment.
 *
 * Gate rules
 * ----------
 *   - user signed in AND role === 'contractor'
 *   - at least one bid WHERE contractor_id = user.id AND
 *     status IN ('accepted', 'won')
 *   - stripe_charges_enabled IS NOT true
 *     (the tightest "can actually accept money" signal —
 *      `stripe_connect_account_id` being present doesn't mean
 *      the account is cleared to take charges yet)
 *   - no AsyncStorage dismissal flag set
 *
 * Coordination with other Tier 1/2 gates
 * --------------------------------------
 * OnboardingGateStack renders this after PushSoftAskModal. It's
 * Tier 2 (post-first-win), so Tier 1 contractors (fresh signup,
 * no bids yet) never see it.
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../config/supabase';
import { mobileApiClient } from '../utils/mobileApiClient';
import { logger } from '../utils/logger';

const STORAGE_KEY = 'stripe_connect_prompt_dismissed_at';

const ACCEPTED_STATUSES = ['accepted', 'won'];

export interface StripeConnectPromptGate {
  shouldShow: boolean;
  loading: boolean;
  dismiss: () => Promise<void>;
  refresh: () => Promise<void>;
}

export function useStripeConnectPromptGate(): StripeConnectPromptGate {
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

    try {
      const dismissedAt = await AsyncStorage.getItem(STORAGE_KEY);
      if (dismissedAt) {
        setShouldShow(false);
        setLoading(false);
        return;
      }

      // stripe_charges_enabled is column-revoked from the authenticated role
      // (20260508100543 lockdown), so it must come from the server. The
      // canonical readiness endpoint reads the same profiles flags the Stripe
      // webhooks maintain. `status` is null when no Connect account exists —
      // which for this gate means "not enabled", i.e. show the prompt.
      const [connectResult, bidsResult] = await Promise.all([
        mobileApiClient
          .get<{
            success: boolean;
            status: { chargesEnabled?: boolean } | null;
          }>('/api/payments/stripe-connect/status')
          .then((res) => ({ ok: true as const, status: res.status }))
          .catch((err: unknown) => {
            logger.warn(
              'useStripeConnectPromptGate: connect status fetch failed',
              { error: err instanceof Error ? err.message : String(err) }
            );
            return { ok: false as const, status: null };
          }),
        supabase
          .from('bids')
          .select('id', { count: 'exact', head: true })
          .eq('contractor_id', user.id)
          .in('status', ACCEPTED_STATUSES),
      ]);

      if (!connectResult.ok) {
        setShouldShow(false);
        setLoading(false);
        return;
      }
      if (bidsResult.error) {
        logger.warn('useStripeConnectPromptGate: bids query failed', {
          error: bidsResult.error.message,
        });
        setShouldShow(false);
        setLoading(false);
        return;
      }

      const chargesEnabled = connectResult.status?.chargesEnabled === true;
      const winningBidCount = bidsResult.count ?? 0;

      setShouldShow(winningBidCount > 0 && !chargesEnabled);
      setLoading(false);
    } catch (err) {
      logger.warn('useStripeConnectPromptGate: probe threw', {
        error: err instanceof Error ? err.message : String(err),
      });
      setShouldShow(false);
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

  const dismiss = useCallback(async () => {
    setShouldShow(false);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, new Date().toISOString());
    } catch (err) {
      logger.warn('useStripeConnectPromptGate: dismiss persist failed', {
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
