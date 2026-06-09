import { useEffect, useState } from 'react';
import { supabase } from '../../../config/supabase';
import { mobileApiClient } from '../../../utils/mobileApiClient';
import { logger } from '../../../utils/logger';

export interface ContractorVerificationState {
  identityVerified: boolean;
  licenseVerified: boolean;
  paymentMethodLinked: boolean;
  phoneVerified: boolean;
}

const DEFAULT_STATE: ContractorVerificationState = {
  identityVerified: false,
  licenseVerified: false,
  paymentMethodLinked: false,
  phoneVerified: false,
};

interface AuthUser {
  id: string;
  role?: string;
}

/**
 * Fetches the four verification flags consumed by the contractor
 * profile "Verification Status" block. Source columns live on
 * public.profiles; every badge was previously hardcoded `verified`.
 *
 * Runs at most once per `user.id` — no realtime subscription is
 * needed since verification toggles are rare admin-gated events.
 */
export function useContractorVerification(
  user: AuthUser | null
): ContractorVerificationState {
  const [state, setState] =
    useState<ContractorVerificationState>(DEFAULT_STATE);

  useEffect(() => {
    if (!user?.id || user.role !== 'contractor') return;
    let cancelled = false;
    (async () => {
      try {
        // stripe_customer_id is column-revoked from the authenticated role
        // (20260508100543 lockdown) — including it failed the WHOLE select
        // with "permission denied" and left every badge stuck on "Pending".
        // The payment badge now reads the contractor's Stripe Connect
        // account (where job money actually lands) from the canonical
        // server endpoint instead of the billing customer id.
        const [profileResult, connectStatus] = await Promise.all([
          supabase
            .from('profiles')
            .select('admin_verified, phone_verified, verification_status')
            .eq('id', user.id)
            .maybeSingle(),
          mobileApiClient
            .get<{
              success: boolean;
              status: { accountId?: string | null } | null;
            }>('/api/payments/stripe-connect/status')
            .then((res) => res.status)
            .catch((err: unknown) => {
              logger.warn(
                'useContractorVerification: connect status fetch failed',
                { error: err instanceof Error ? err.message : String(err) }
              );
              return null;
            }),
        ]);
        if (cancelled || !profileResult.data) return;
        const row = profileResult.data as Record<string, unknown>;
        setState({
          identityVerified: row.admin_verified === true,
          licenseVerified: row.verification_status === 'verified',
          paymentMethodLinked:
            typeof connectStatus?.accountId === 'string' &&
            connectStatus.accountId.length > 0,
          phoneVerified: row.phone_verified === true,
        });
      } catch (err) {
        // Non-fatal — the UI just keeps the default all-false state
        // (which correctly renders as "Pending" badges).
        logger.warn('useContractorVerification: fetch failed', {
          userId: user.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.role]);

  return state;
}
