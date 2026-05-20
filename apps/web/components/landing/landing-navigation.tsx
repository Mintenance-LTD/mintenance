'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';

/**
 * Landing top navigation — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html `.nav-fixed`.
 *
 * Self-contained: manages its own mobile menu state + escape-key
 * handler. Scoped under `data-theme="mint-editorial"` so the
 * `--me-*` tokens resolve.
 */

const NAV_LINKS = [
  { href: '#how-it-works', label: 'How it works' },
  { href: '/login?redirect=/dashboard', label: 'For homeowners' },
  {
    href: '/login?redirect=/contractor/dashboard-enhanced',
    label: 'For tradespeople',
  },
  { href: '/about', label: 'About' },
];

function LeafMark({ size = 22 }: { size?: number }) {
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

export function LandingNavigation() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  const linkStyle: React.CSSProperties = {
    color: 'var(--me-ink-2)',
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
  };

  return (
    <nav
      data-theme='mint-editorial'
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        background: 'color-mix(in srgb, var(--me-bg) 88%, transparent)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--me-line)',
        fontFamily: 'var(--me-font-body)',
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: 40,
        }}
      >
        {/* Logo */}
        <Link
          href='/'
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
            color: 'var(--me-ink)',
          }}
        >
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              background: 'var(--me-surface)',
              border: '1px solid var(--me-line)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <LeafMark />
          </span>
          <span
            style={{
              fontFamily: 'var(--me-font-display)',
              fontSize: 22,
              letterSpacing: '-0.02em',
            }}
          >
            Mintenance
          </span>
        </Link>

        {/* Desktop links */}
        <div
          className='landing-nav-links'
          style={{ display: 'flex', gap: 28, flex: 1 }}
        >
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} style={linkStyle}>
              {link.label}
            </Link>
          ))}
        </div>

        {/* Desktop CTAs */}
        <div
          className='landing-nav-cta'
          style={{ display: 'flex', gap: 8, alignItems: 'center' }}
        >
          <Link
            href='/login'
            style={{
              padding: '8px 14px',
              borderRadius: 'var(--me-radius-btn)',
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--me-ink-2)',
              textDecoration: 'none',
            }}
          >
            Sign in
          </Link>
          <Link
            href='/register'
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--me-radius-btn)',
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              boxShadow: 'var(--me-shadow-btn)',
            }}
          >
            Get started
          </Link>
        </div>

        {/* Mobile menu button */}
        <button
          type='button'
          className='landing-nav-burger'
          aria-label='Toggle navigation menu'
          aria-expanded={isMobileMenuOpen}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{
            display: 'none',
            padding: 8,
            borderRadius: 8,
            background: 'transparent',
            border: 0,
            cursor: 'pointer',
            color: 'var(--me-ink-2)',
          }}
        >
          <svg
            width='24'
            height='24'
            fill='none'
            stroke='currentColor'
            viewBox='0 0 24 24'
            aria-hidden='true'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d={
                isMobileMenuOpen
                  ? 'M6 18L18 6M6 6l12 12'
                  : 'M4 6h16M4 12h16M4 18h16'
              }
            />
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div
          className='landing-nav-mobile'
          style={{
            borderTop: '1px solid var(--me-line)',
            background: 'var(--me-surface)',
            padding: '12px 32px 20px',
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setIsMobileMenuOpen(false)}
              style={{
                ...linkStyle,
                display: 'block',
                padding: '10px 0',
              }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href='/register'
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              display: 'block',
              textAlign: 'center',
              marginTop: 10,
              padding: '12px 16px',
              borderRadius: 'var(--me-radius-btn)',
              background: 'var(--me-brand)',
              color: 'var(--me-on-brand)',
              fontSize: 14,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Get started
          </Link>
        </div>
      )}

      {/* Responsive: collapse desktop links/CTAs into the burger menu
          below 900px. */}
      <style>{`
        @media (max-width: 899px) {
          .landing-nav-links,
          .landing-nav-cta { display: none !important; }
          .landing-nav-burger { display: block !important; }
        }
      `}</style>
    </nav>
  );
}
