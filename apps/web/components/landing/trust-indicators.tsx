import React from 'react';

/**
 * Trust / certification band — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html `.logos` band.
 *
 * Replaced the old four-badge "Trusted & Secure" grid with the
 * spec's certification logo row. Static server component — the
 * spec band has no animation.
 */

const CERTIFICATIONS = [
  'Gas Safe',
  'NICEIC',
  'TrustMark',
  'FCA Reg.',
  'CHAS',
  'Trustpilot ★★★★★',
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
          Trusted &amp; certified by
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
          {CERTIFICATIONS.map((name) => (
            <span
              key={name}
              style={{
                fontSize: 14,
                fontWeight: 600,
                color: 'var(--me-ink-2)',
                whiteSpace: 'nowrap',
              }}
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
