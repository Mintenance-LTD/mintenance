import React from 'react';

/**
 * Safeguards strip — landing page band between the hero and How It
 * Works. Direction A · Mint Editorial layout (small uppercase label
 * + horizontal items spaced out), but the content is factual
 * platform behaviour, not third-party endorsements.
 *
 * 2026-05-21: replaced the prior "Trusted & certified by" band that
 * listed Gas Safe / NICEIC / TrustMark / FCA Reg. / CHAS /
 * Trustpilot ★★★★★. Mintenance the platform isn't accredited by
 * any of those bodies — claiming so is misleading at best, and the
 * "FCA Reg." line in particular is a financial-promotions risk
 * under FSMA 2000 s.21 if untrue. Stripe Connect (used for
 * payouts) is FCA-authorised in its own right, but that's Stripe's
 * status, not Mintenance's, so we don't claim it here either.
 *
 * Every claim below is verifiable in code: escrow flows through
 * `escrow_transactions` + `EscrowAutoReleaseService`; photo gates
 * are enforced by `PhotoVerificationService`; approval is the
 * `completion_confirmed_by_homeowner` gate in
 * `/api/jobs/[id]/confirm-completion`; payouts use Stripe Connect
 * (`setup-contractor-payout` edge fn); currency is GBP-only per
 * the `check-edge-fn-currency` pre-commit guard; disputes route
 * through `DisputeWorkflowService` + `/api/disputes`.
 */

const SAFEGUARDS = [
  'Escrow-protected payments',
  'Photo proof before & after',
  'You approve before payment releases',
  'Stripe-powered payouts',
  'GBP only · UK-based',
  'Dispute support if work isn’t right',
];

export function TrustIndicators() {
  return (
    <section
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-bg)',
        borderTop: '1px solid var(--me-line)',
        borderBottom: '1px solid var(--me-line)',
        fontFamily: 'var(--me-font-body)',
        padding: '36px 32px',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '20px 40px',
        }}
      >
        <div
          style={{
            fontSize: 12,
            textTransform: 'uppercase',
            letterSpacing: '.12em',
            color: 'var(--me-ink-3)',
            fontWeight: 600,
          }}
        >
          Every job includes
        </div>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px 28px',
          }}
        >
          {SAFEGUARDS.map((line) => (
            <span
              key={line}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                whiteSpace: 'nowrap',
              }}
            >
              {line}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
