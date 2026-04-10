/**
 * Stripe Connect + payout configuration.
 *
 * Product decisions (locked in):
 *   - Express Connect accounts
 *   - Platform absorbs all Stripe fees
 *   - Weekly payout cadence with minimum-threshold hold
 *   - GBP primary currency
 *   - Cards + BACS Direct Debit supported for homeowners
 *   - Stripe Tax enabled (platform issues tax documents)
 */

/** Payout threshold: contractors accumulate earnings until this amount, then paid out. */
const PAYOUT_MIN_THRESHOLD_MINOR: Record<string, number> = {
  GBP: 5000, // £50.00
};

/** Weekly payout day (0 = Sunday, 1 = Monday, ..., 5 = Friday) */
const PAYOUT_DAY_OF_WEEK = 5; // Friday

/** Primary supported currency */
export const PRIMARY_CURRENCY = 'GBP';

/** Fallback allowed currencies */
const SUPPORTED_CURRENCIES = ['GBP'] as const;

type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

/**
 * Homeowner-facing payment methods. Cards are universal; BACS Direct Debit
 * is a UK-specific low-fee option that requires mandate collection.
 */
export const HOMEOWNER_PAYMENT_METHOD_TYPES = ['card', 'bacs_debit'] as const;

type HomeownerPaymentMethodType =
  (typeof HOMEOWNER_PAYMENT_METHOD_TYPES)[number];

/**
 * Express Connect account defaults for UK contractors.
 * Stripe Tax reporting is opted-in at the platform level.
 */
export const EXPRESS_ACCOUNT_DEFAULTS = {
  type: 'express' as const,
  country: 'GB',
  default_currency: 'gbp',
  capabilities: {
    card_payments: { requested: true },
    transfers: { requested: true },
    // Required for BACS Debit on charges, even though contractor is payee only:
    bacs_debit_payments: { requested: true },
  },
  business_type: 'individual' as const,
  // Stripe Tax capability — enables automated 1099/tax-document generation.
  // Contractors will see their tax forms in their Express dashboard.
  tos_acceptance: undefined, // Stripe-hosted onboarding collects this
} as const;

/** URL where contractors land after completing Connect onboarding */
export function getOnboardingReturnUrl(appUrl: string): string {
  return `${appUrl}/contractor/payouts/onboarding-complete`;
}

/** URL where contractors land if onboarding link expires mid-flow */
export function getOnboardingRefreshUrl(appUrl: string): string {
  return `${appUrl}/contractor/payouts/onboarding?refresh=true`;
}

/** Return URL after a SetupIntent completes (Elements flow) */
function getSetupIntentReturnUrl(appUrl: string): string {
  return `${appUrl}/account/payment-methods/return`;
}

/**
 * Minimum payout amount in MINOR units for a currency.
 * Returns 5000 (£50.00) as default if currency not in the map.
 */
export function getPayoutThreshold(currency: string): number {
  return PAYOUT_MIN_THRESHOLD_MINOR[currency.toUpperCase()] ?? 5000;
}
