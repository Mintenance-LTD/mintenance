import React from 'react';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Brand leaf mark — the real Mintenance logo, cropped from the app
 * icon PNG (public/assets/logo-mark.png).
 */
export function LeafMark({ size = 22 }: { size?: number }) {
  return (
    <Image
      src='/assets/logo-mark.png'
      alt='Mintenance'
      width={size}
      height={size}
      priority
      style={{ display: 'block', objectFit: 'contain' }}
    />
  );
}

/**
 * Left-hand brand panel for the /register split layout — Direction A ·
 * Mint Editorial. Source: redesign-v2/auth.html WebSignUp BrandPanel.
 * Hidden below 1024px via the `.register-brand-panel` class (the media
 * query lives in the page shell).
 */
export function RegisterBrandPanel() {
  return (
    <aside
      className='register-brand-panel'
      style={{
        flex: '0 0 46%',
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
          <LeafMark size={24} />
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
          One account,
          <br />
          both sides of the trade.
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
          Hire a tradesperson, list yourself as one, or do both. You can switch
          modes at any time.
        </p>
      </div>

      {/* What you can do — factual, no fabricated metrics */}
      <ul
        style={{
          position: 'relative',
          listStyle: 'none',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {[
          'Post jobs and hire verified tradespeople',
          'List your own services and bid for work',
          'Switch between hiring and trading any time',
        ].map((line) => (
          <li
            key={line}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              fontSize: 13.5,
              lineHeight: 1.5,
              color: 'rgba(255,255,255,0.9)',
            }}
          >
            <span
              aria-hidden='true'
              style={{
                flex: '0 0 auto',
                marginTop: 2,
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: 'rgba(255,255,255,0.18)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 11,
              }}
            >
              ✓
            </span>
            {line}
          </li>
        ))}
      </ul>
    </aside>
  );
}
