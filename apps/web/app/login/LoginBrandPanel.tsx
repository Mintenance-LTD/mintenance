import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Check } from 'lucide-react';

/**
 * Brand leaf mark — the real Mintenance logo, cropped from the app
 * icon PNG (public/assets/logo-mark.png). Shared by the login brand
 * panel and the mobile logo lockup.
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
      {/* Leaf watermark — the brand mark, tinted white + faded */}
      <Image
        src='/assets/logo-mark.png'
        alt=''
        aria-hidden='true'
        width={520}
        height={520}
        style={{
          position: 'absolute',
          right: -120,
          bottom: -160,
          transform: 'rotate(-12deg)',
          opacity: 0.07,
          filter: 'brightness(0) invert(1)',
          pointerEvents: 'none',
        }}
      />

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

      {/* How it works — factual, no fabricated metrics */}
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
          'Post a job and compare bids from verified trades',
          'Payments held securely until you approve the work',
          'Photo proof before and after every job',
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
              }}
            >
              <Check size={11} strokeWidth={3} color='var(--me-on-brand)' />
            </span>
            {line}
          </li>
        ))}
      </ul>
    </aside>
  );
}
