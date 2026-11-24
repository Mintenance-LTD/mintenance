import {
  formatPlatformFeePercent,
  PLATFORM_FEE_RATE_BY_TIER,
} from '@mintenance/shared';

export const MINTENANCE_PUBLIC_ORIGIN = 'https://www.mintenance.co.uk';
export const AGENCY_DEMO_PATH = '/contact?category=agency-demo';

export function publicShareCard(
  name: 'home' | 'homeowners' | 'tradespeople' | 'letting-agents',
  alt: string
) {
  return {
    url: `${MINTENANCE_PUBLIC_ORIGIN}/media/share/${name}.png`,
    width: 1200,
    height: 630,
    alt,
  };
}

export const PAYMENT_RELEASE_TIMING =
  'Approval usually starts a 48-hour hold. Release also depends on the job’s evidence, dispute and risk checks. Transfer to the contractor’s Stripe balance and arrival in their bank account are separate steps.';

export const CONTRACTOR_FEE_LABELS = {
  basic: formatPlatformFeePercent(PLATFORM_FEE_RATE_BY_TIER.basic),
  professional: formatPlatformFeePercent(
    PLATFORM_FEE_RATE_BY_TIER.professional
  ),
  business: formatPlatformFeePercent(PLATFORM_FEE_RATE_BY_TIER.enterprise),
};

export const CONTRACTOR_PLAN_FEES = `The standard platform fee is ${CONTRACTOR_FEE_LABELS.basic} on Basic, ${CONTRACTOR_FEE_LABELS.professional} on Professional and ${CONTRACTOR_FEE_LABELS.business} on Business. There’s a 50p minimum per payment, capped at the payment amount. Check the exact fee shown for your account before committing to work.`;
