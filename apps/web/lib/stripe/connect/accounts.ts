/**
 * Stripe Connect Express account management.
 * Creates, fetches, and mirrors capability status from Stripe to profiles.
 */
import { stripe } from '@/lib/stripe';
import { serverSupabase } from '@/lib/api/supabaseServer';
import { logger } from '@mintenance/shared';
import { EXPRESS_ACCOUNT_DEFAULTS } from './config';
import type { ConnectAccountStatus } from './types';

/**
 * Get or create a Stripe Connect Express account for a contractor.
 * Idempotent: if profile already has stripe_connect_account_id, returns it.
 */
export async function ensureConnectAccount(
  contractorId: string,
  email: string,
): Promise<string> {
  const { data: profile, error } = await serverSupabase
    .from('profiles')
    .select('stripe_connect_account_id, role')
    .eq('id', contractorId)
    .single();

  if (error || !profile) {
    throw new Error(`Contractor profile not found: ${contractorId}`);
  }

  if (profile.role !== 'contractor') {
    throw new Error('Connect accounts are only for contractors');
  }

  if (profile.stripe_connect_account_id) {
    return profile.stripe_connect_account_id;
  }

  // Create Express account. Metadata key `contractor_id` matches the existing
  // handleAccountUpdated webhook handler (see stripe-webhook/checkout-handlers.ts).
  const account = await stripe.accounts.create({
    ...EXPRESS_ACCOUNT_DEFAULTS,
    email,
    metadata: {
      contractor_id: contractorId,
    },
  });

  const { error: updateError } = await serverSupabase
    .from('profiles')
    .update({ stripe_connect_account_id: account.id })
    .eq('id', contractorId);

  if (updateError) {
    // Orphaned Stripe account — log for cleanup
    logger.error(
      'Failed to persist stripe_connect_account_id after account creation',
      updateError,
      {
        service: 'stripe-connect',
        contractorId,
        stripeAccountId: account.id,
      },
    );
    throw new Error('Failed to link Connect account to profile');
  }

  logger.info('Connect Express account created', {
    service: 'stripe-connect',
    contractorId,
    stripeAccountId: account.id,
  });

  return account.id;
}

/**
 * Fetch current account status from Stripe, mirror capabilities to profile.
 * Call this after onboarding completion and on-demand from UI.
 */
export async function syncAccountStatus(
  contractorId: string,
): Promise<ConnectAccountStatus> {
  const { data: profile } = await serverSupabase
    .from('profiles')
    .select('stripe_connect_account_id, stripe_onboarding_completed_at')
    .eq('id', contractorId)
    .single();

  if (!profile?.stripe_connect_account_id) {
    throw new Error('Contractor has no Connect account');
  }

  const account = await stripe.accounts.retrieve(
    profile.stripe_connect_account_id,
  );

  const chargesEnabled = account.charges_enabled;
  const payoutsEnabled = account.payouts_enabled;
  const detailsSubmitted = account.details_submitted;
  const transfersActive =
    account.capabilities?.transfers === 'active' || false;
  const requirementsPending = [
    ...(account.requirements?.currently_due ?? []),
    ...(account.requirements?.past_due ?? []),
  ];

  // First completion timestamp — do not overwrite
  const onboardingCompletedAt =
    profile.stripe_onboarding_completed_at ??
    (detailsSubmitted ? new Date().toISOString() : null);

  await serverSupabase
    .from('profiles')
    .update({
      stripe_charges_enabled: chargesEnabled,
      stripe_payouts_enabled: payoutsEnabled,
      stripe_transfers_active: transfersActive,
      stripe_details_submitted: detailsSubmitted,
      stripe_onboarding_completed_at: onboardingCompletedAt,
      stripe_requirements_pending: requirementsPending,
    })
    .eq('id', contractorId);

  return {
    accountId: account.id,
    chargesEnabled,
    payoutsEnabled,
    detailsSubmitted,
    transfersActive,
    requirementsPending,
    onboardingCompletedAt,
    canReceivePayouts: payoutsEnabled && transfersActive,
  };
}

/**
 * Get cached account status from profiles table (no Stripe API call).
 * Use for UI displays; use syncAccountStatus() after state changes.
 */
export async function getCachedAccountStatus(
  contractorId: string,
): Promise<ConnectAccountStatus | null> {
  const { data, error } = await serverSupabase
    .from('profiles')
    .select(
      'stripe_connect_account_id, stripe_charges_enabled, stripe_payouts_enabled, stripe_transfers_active, stripe_details_submitted, stripe_onboarding_completed_at, stripe_requirements_pending',
    )
    .eq('id', contractorId)
    .single();

  if (error || !data?.stripe_connect_account_id) return null;

  const requirementsPending = Array.isArray(data.stripe_requirements_pending)
    ? (data.stripe_requirements_pending as string[])
    : [];

  return {
    accountId: data.stripe_connect_account_id,
    chargesEnabled: !!data.stripe_charges_enabled,
    payoutsEnabled: !!data.stripe_payouts_enabled,
    detailsSubmitted: !!data.stripe_details_submitted,
    transfersActive: !!data.stripe_transfers_active,
    requirementsPending,
    onboardingCompletedAt: data.stripe_onboarding_completed_at ?? null,
    canReceivePayouts:
      !!data.stripe_payouts_enabled && !!data.stripe_transfers_active,
  };
}
