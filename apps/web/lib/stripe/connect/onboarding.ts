/**
 * Stripe Connect onboarding link generation.
 * Account links are short-lived (expire in ~5 minutes); we mint them
 * on demand each time the contractor clicks "Set up payouts".
 */
import { stripe } from '@/lib/stripe';
import { getAppUrl } from '@/lib/env';
import {
  getOnboardingReturnUrl,
  getOnboardingRefreshUrl,
} from './config';
import type { OnboardingLinkResponse } from './types';

/**
 * Generate an Account Link for Express onboarding.
 * Use type='account_onboarding' for the initial flow, or
 * 'account_update' if the account needs to re-submit info.
 */
export async function createOnboardingLink(
  stripeAccountId: string,
  options: { type?: 'account_onboarding' | 'account_update' } = {},
): Promise<OnboardingLinkResponse> {
  const appUrl = getAppUrl();

  const link = await stripe.accountLinks.create({
    account: stripeAccountId,
    type: options.type ?? 'account_onboarding',
    return_url: getOnboardingReturnUrl(appUrl),
    refresh_url: getOnboardingRefreshUrl(appUrl),
    collect: 'currently_due',
  });

  return {
    url: link.url,
    expiresAt: link.expires_at * 1000, // convert to ms
  };
}

/**
 * Create an Express Dashboard login link so contractors can view
 * their tax documents, update bank details, etc. after onboarding.
 */
export async function createDashboardLoginLink(
  stripeAccountId: string,
): Promise<{ url: string }> {
  const link = await stripe.accounts.createLoginLink(stripeAccountId);
  return { url: link.url };
}
