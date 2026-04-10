/**
 * Shared types for Stripe Connect + Elements integration.
 */

export interface ConnectAccountStatus {
  accountId: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  transfersActive: boolean;
  /** Stripe-surfaced outstanding requirements (array of field ids) */
  requirementsPending: string[];
  /** Timestamp when onboarding was first marked as submitted */
  onboardingCompletedAt: string | null;
  /** True when account can receive payouts and is ready for payouts */
  canReceivePayouts: boolean;
}

export interface OnboardingLinkResponse {
  url: string;
  expiresAt: number; // unix ms
}

export interface PayoutBalance {
  contractorId: string;
  currency: string;
  pendingAmountMinor: number;
  lifetimePaidOutMinor: number;
  lastPayoutAt: string | null;
  lastPayoutTransferId: string | null;
  /** Minimum minor amount required before a transfer is initiated */
  threshold: number;
  /** True when pendingAmountMinor >= threshold */
  eligibleForPayout: boolean;
}

interface PayoutTransferRecord {
  id: string;
  contractorId: string;
  stripeTransferId: string;
  amountMinor: number;
  currency: string;
  status: 'pending' | 'paid' | 'failed' | 'reversed';
  relatedJobIds: string[];
  createdAt: string;
  paidAt: string | null;
  failureMessage: string | null;
}

export interface SetupIntentCreateResponse {
  clientSecret: string;
  setupIntentId: string;
  customerId: string;
}

export interface PaymentMethodSummary {
  id: string; // stripe payment_method id
  type: 'card' | 'bacs_debit';
  last4: string;
  brand?: string; // card only
  expMonth?: number; // card only
  expYear?: number; // card only
  sortCodeLast?: string; // bacs_debit only
  isDefault: boolean;
  createdAt: string;
}
