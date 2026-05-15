import React from 'react';
import Link from 'next/link';

/**
 * Brand leaf mark — matches the design-system logo. Inherits the
 * caller's text colour by default so callers don't pass raw hex.
 * Shared by the login brand panel and the mobile logo lockup.
 */
export function LeafMark({
  size = 22,
  color = 'currentColor',
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg
      viewBox='0 0 24 24'
      width={size}
      height={size}
      fill='none'
      stroke={color}
      strokeWidth='1.6'
      strokeLinecap='round'
      strokeLinejoin='round'
      aria-hidden='true'
    >
      <path d='M12 21c-2-5 1-12 9-13-1 7-4 11-9 13z' />
      <path d='M12 21c-1-3 1-7 5-9' />
    </svg>
  );
}

/**
 * Left-hand brand panel for the /login split layout — Direction A ·
 * Mint Editorial. Source: redesign-v2/auth.html WebSignIn BrandPanel.
 * Hidden below 1024px via the `.login-brand-panel` class (the media
 * query lives in the page shell).
 */
export function LoginBrandPanel() {
  return (
    <aside
      className='login-brand-panel'
      style={{
        flex: '0 0 46%',
        // Brand gradient — derived from the Mint Editorial tokens.
        // The lightest stop has no dedicated token, so it's mixed
        // from --me-brand toward white rather than a raw hex.
        background:
          'linear-gradient(170deg, var(--me-brand-2) 0%, var(--me-brand) 60%, color-mix(in srgb, var(--me-brand) 65%, white) 100%)',
        color: 'var(--me-on-brand)',
        padding: '44px 48px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Leaf watermark */}
      <svg
        viewBox='0 0 24 24'
        width='520'
        height='520'
        fill='none'
        stroke='rgba(255,255,255,0.06)'
        strokeWidth='0.6'
        aria-hidden='true'
        style={{
          position: 'absolute',
          right: -120,
          bottom: -160,
          transform: 'rotate(-12deg)',
        }}
      >
        <path d='M12 21c-2-5 1-12 9-13-1 7-4 11-9 13z' />
        <path d='M12 21c-1-3 1-7 5-9' />
      </svg>

      {/* Logo */}
      <Link
        href='/'
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          position: 'relative',
          textDecoration: 'none',
          color: 'var(--me-on-brand)',
        }}
      >
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: 'var(--me-surface)',
            display: 'grid',
            placeItems: 'center',
          }}
        >
          <LeafMark color='var(--me-brand)' />
        </span>
        <span
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 22,
            letterSpacing: '-0.01em',
          }}
        >
          Mintenance
        </span>
      </Link>

      {/* Headline */}
      <div style={{ position: 'relative' }}>
        <h1
          style={{
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontWeight: 400,
            fontSize: 48,
            lineHeight: 1.05,
            letterSpacing: '-0.012em',
            margin: '0 0 14px',
          }}
        >
          Hire trusted trades.
          <br />
          Pay only for proper work.
        </h1>
        <p
          style={{
            fontSize: 15,
            lineHeight: 1.55,
            color: 'rgba(255,255,255,0.84)',
            maxWidth: 380,
            margin: 0,
          }}
        >
          Mintenance is the modern home-maintenance platform built around real
          trust — verified people, fair prices, payments only released when
          you&apos;re happy.
        </p>
      </div>

      {/* Testimonial */}
      <figure
        style={{
          position: 'relative',
          margin: 0,
          padding: '16px 18px',
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 14,
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <blockquote
          style={{
            margin: '0 0 10px',
            fontSize: 13,
            lineHeight: 1.6,
            color: 'rgba(255,255,255,0.92)',
          }}
        >
          &ldquo;Saved me three weekends and a botched repair. The bid
          comparison alone is worth it.&rdquo;
        </blockquote>
        <figcaption style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span
            style={{
              width: 28,
              height: 28,
              borderRadius: 9999,
              background: 'rgba(255,255,255,0.2)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 600,
              fontSize: 12,
            }}
          >
            EM
          </span>
          <span style={{ fontSize: 12, opacity: 0.85 }}>
            Eleanor M. · Homeowner, SW18
          </span>
        </figcaption>
      </figure>
    </aside>
  );
}
