/** Explanations shared by payment surfaces; eligibility is not a bank-payout promise. */
export const PAYMENT_RELEASE_COPY = {
  summary: 'Payments follow the job’s approval, evidence and dispute checks before release.',
  details: 'Normally, approval is followed by a 48-hour hold. Where enabled, automatic approval can become eligible after seven days, subject to completion, evidence, dispute and risk checks. Bank payout timing depends on Stripe and your bank.',
  compact: 'Release subject to approval and checks',
} as const;
