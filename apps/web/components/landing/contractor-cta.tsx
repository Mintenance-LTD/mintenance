import React from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';

/**
 * "For tradespeople" CTA — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html contractor block —
 * a dark brand panel.
 *
 * The old version embedded raw <img> product screenshots; replaced
 * with a clean token-styled "what you get" card so there's no
 * dependency on screenshot assets.
 */

const BENEFITS = [
  {
    title: 'Real jobs, not leads',
    description:
      'See real posted jobs with budgets and details — no credits, no guessing.',
  },
  {
    title: 'Guaranteed payment',
    description:
      "The homeowner's money is held safely before you pick up a tool. You will get paid.",
  },
  {
    title: 'Your work speaks for itself',
    description:
      'Before/after photos protect you from bad-faith disputes. Verified badges show your credentials from day one.',
  },
];

const PROMISES = [
  { label: 'No monthly fees', sub: 'You only pay when you win a job' },
  { label: 'No credit system', sub: 'See full job details before you bid' },
  { label: 'Payment protected', sub: 'Funds secured before work begins' },
];

export function ContractorCTA() {
  return (
    <section
      id='contractors'
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-brand-2)',
        color: 'var(--me-on-brand)',
        fontFamily: 'var(--me-font-body)',
        padding: '88px 32px',
      }}
    >
      <div
        style={{
          maxWidth: 1180,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: 48,
          alignItems: 'center',
        }}
      >
        {/* Left — pitch */}
        <div>
          <div
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              color: 'rgba(255,255,255,0.65)',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            For tradespeople
          </div>
          <h2
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(34px, 4.4vw, 52px)',
              lineHeight: 1.06,
              letterSpacing: '-0.02em',
              margin: '0 0 16px',
            }}
          >
            Work you can count on.
          </h2>
          <p
            style={{
              fontSize: 16,
              lineHeight: 1.6,
              color: 'rgba(255,255,255,0.82)',
              maxWidth: 460,
              margin: '0 0 28px',
            }}
          >
            You&apos;ve tried the others. Here&apos;s what&apos;s actually
            different: real jobs from real homeowners, payment secured before
            you start, and photo proof that protects your reputation.
          </p>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 18,
              marginBottom: 32,
            }}
          >
            {BENEFITS.map((b) => (
              <div
                key={b.title}
                style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}
              >
                <span
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: 9999,
                    background: 'rgba(255,255,255,0.14)',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  <Check className='w-3.5 h-3.5' />
                </span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 600 }}>{b.title}</div>
                  <div
                    style={{
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: 'rgba(255,255,255,0.72)',
                    }}
                  >
                    {b.description}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Link
            href='/register?role=contractor'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 24px',
              borderRadius: 'var(--me-radius-btn)',
              background: 'var(--me-surface)',
              color: 'var(--me-ink)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Join as a tradesperson
          </Link>
        </div>

        {/* Right — "what you get" card */}
        <div
          style={{
            background: 'var(--me-surface)',
            color: 'var(--me-ink)',
            borderRadius: 'var(--me-radius-card)',
            padding: 28,
            boxShadow: 'var(--me-shadow-pop)',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--me-font-display)',
              fontSize: 22,
              letterSpacing: '-0.01em',
              marginBottom: 4,
            }}
          >
            Every job, on fair terms
          </div>
          <div
            style={{
              fontSize: 13,
              color: 'var(--me-ink-3)',
              marginBottom: 18,
            }}
          >
            What you get on Mintenance
          </div>
          {PROMISES.map((p, i) => (
            <div
              key={p.label}
              style={{
                display: 'flex',
                gap: 12,
                alignItems: 'flex-start',
                padding: '14px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--me-line-2)',
              }}
            >
              <span
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 9999,
                  background: 'var(--me-brand-soft)',
                  color: 'var(--me-brand)',
                  display: 'grid',
                  placeItems: 'center',
                  flexShrink: 0,
                }}
              >
                <Check className='w-3.5 h-3.5' />
              </span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{p.label}</div>
                <div style={{ fontSize: 13, color: 'var(--me-ink-2)' }}>
                  {p.sub}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
