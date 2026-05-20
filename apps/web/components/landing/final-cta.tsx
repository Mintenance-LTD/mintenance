import React from 'react';
import Link from 'next/link';

/**
 * Closing call-to-action — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html closer section —
 * a dark brand panel with a serif headline.
 */
export function FinalCTA() {
  return (
    <section
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-brand-2)',
        color: 'var(--me-on-brand)',
        fontFamily: 'var(--me-font-body)',
        padding: '96px 32px',
      }}
    >
      <div
        style={{
          maxWidth: 760,
          margin: '0 auto',
          textAlign: 'center',
        }}
      >
        <h2
          style={{
            fontFamily: 'var(--me-font-display)',
            fontWeight: 500,
            fontSize: 'clamp(40px, 5vw, 60px)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            margin: '0 0 18px',
          }}
        >
          Stop chasing tradespeople.{' '}
          <em
            style={{
              fontStyle: 'italic',
              color:
                'color-mix(in srgb, var(--me-on-brand) 80%, var(--me-brand))',
            }}
          >
            Start fixing things.
          </em>
        </h2>
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.82)',
            maxWidth: 560,
            margin: '0 auto 32px',
          }}
        >
          Post a job in 30 seconds. Free for homeowners, with payment held
          safely until you approve the work. Serving Greater London now, more of
          the UK through 2026.
        </p>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            justifyContent: 'center',
          }}
        >
          <Link
            href='/jobs/create'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px 26px',
              borderRadius: 'var(--me-radius-btn)',
              background: 'var(--me-surface)',
              color: 'var(--me-ink)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Post a job — free
          </Link>
          <Link
            href='/register?role=contractor'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '15px 26px',
              borderRadius: 'var(--me-radius-btn)',
              background: 'transparent',
              color: 'var(--me-on-brand)',
              border: '1px solid rgba(255,255,255,0.30)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Join as a tradesperson
          </Link>
        </div>
      </div>
    </section>
  );
}
