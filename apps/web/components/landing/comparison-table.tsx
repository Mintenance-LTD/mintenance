import React from 'react';
import Link from 'next/link';
import { Check, X } from 'lucide-react';

/**
 * Mintenance-vs-traditional comparison — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html comparison table
 * (Feature / Traditional / Mintenance, brand-highlighted column).
 */

const COMPARISON_ROWS = [
  {
    feature: 'Finding someone available',
    traditional: 'Search directories and chase callbacks',
    mintenance: 'Post once and receive bids from local pros',
  },
  {
    feature: 'Comparing quotes',
    traditional: 'Hard to compare scope, timing and price',
    mintenance: 'Review bids, profiles and messages together',
  },
  {
    feature: 'Contractor credentials',
    traditional: 'You chase insurance and credentials yourself',
    mintenance:
      'Self-declared business, licence and insurance info visible before you hire',
  },
  {
    feature: 'Payment protection',
    traditional: 'Pay up front — and hope',
    mintenance: 'Held safely until you approve the work',
  },
];

export function ComparisonTable() {
  return (
    <section
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-surface)',
        color: 'var(--me-ink)',
        fontFamily: 'var(--me-font-body)',
        padding: '88px 32px',
      }}
    >
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <h2
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(34px, 4.4vw, 52px)',
              lineHeight: 1.06,
              letterSpacing: '-0.02em',
              margin: '0 auto 16px',
              maxWidth: 720,
            }}
          >
            A calmer way to get repairs done.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: 'var(--me-ink-2)',
              lineHeight: 1.55,
              maxWidth: 560,
              margin: '0 auto',
            }}
          >
            Less chasing, clearer quotes, and better protection from first
            message to final payment.
          </p>
        </div>

        <div
          style={{
            border: '1px solid var(--me-line)',
            borderRadius: 'var(--me-radius-card)',
            overflow: 'hidden',
            boxShadow: 'var(--me-shadow-card)',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.1fr 1fr 1fr',
              background: 'var(--me-bg-2)',
              borderBottom: '1px solid var(--me-line)',
            }}
          >
            <div style={cellHeadStyle}>What you&apos;re comparing</div>
            <div style={cellHeadStyle}>The old way</div>
            <div
              style={{
                ...cellHeadStyle,
                background: 'var(--me-brand-soft)',
                color: 'var(--me-brand)',
              }}
            >
              With Mintenance
            </div>
          </div>

          {/* Rows */}
          {COMPARISON_ROWS.map((row, i) => (
            <div
              key={row.feature}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.1fr 1fr 1fr',
                borderTop: i === 0 ? 'none' : '1px solid var(--me-line-2)',
              }}
            >
              <div
                style={{
                  ...cellStyle,
                  fontWeight: 600,
                  color: 'var(--me-ink)',
                }}
              >
                {row.feature}
              </div>
              <div style={{ ...cellStyle, color: 'var(--me-ink-2)' }}>
                <span style={iconWrap}>
                  <X
                    className='w-4 h-4'
                    style={{ color: 'var(--me-err-fg)', flexShrink: 0 }}
                  />
                  {row.traditional}
                </span>
              </div>
              <div
                style={{
                  ...cellStyle,
                  background: 'var(--me-brand-soft)',
                  fontWeight: 600,
                  color: 'var(--me-brand-2)',
                }}
              >
                <span style={iconWrap}>
                  <Check
                    className='w-4 h-4'
                    style={{ color: 'var(--me-brand)', flexShrink: 0 }}
                  />
                  {row.mintenance}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 40 }}>
          <Link
            href='/jobs/create'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '14px 22px',
              borderRadius: 'var(--me-radius-btn)',
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: 'var(--me-shadow-btn)',
            }}
          >
            Post a job
          </Link>
        </div>
      </div>
    </section>
  );
}

const cellHeadStyle: React.CSSProperties = {
  padding: '14px 18px',
  fontSize: 13,
  fontWeight: 600,
  color: 'var(--me-ink-2)',
};

const cellStyle: React.CSSProperties = {
  padding: '16px 18px',
  fontSize: 14,
  lineHeight: 1.5,
};

const iconWrap: React.CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
};
