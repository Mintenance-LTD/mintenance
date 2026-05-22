'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { HeroMock } from './HeroMock';

/**
 * Landing hero — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html `.hero`.
 *
 * 2026-05-13 design-system rebuild. Replaces the previous bespoke
 * emerald/slate hero. Left column: brand-soft eyebrow pill, Instrument
 * Serif headline with an italic brand-coloured emphasis, lede, two
 * CTAs, a trust line. Right column: the browser + phone device mock
 * (HeroMock). Scoped under `data-theme="mint-editorial"` so the
 * `--me-*` tokens resolve; styling is inline-token so it needs no
 * `.me-root` primitive layer.
 *
 * The vestigial `activeContractors` / `hasRealStats` / `statsLoading`
 * props are gone — page.tsx never wired them and the spec uses a
 * static trust line.
 */

const EASE_SMOOTH: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();

  const itemVariants = {
    hidden: { opacity: 0, y: prefersReducedMotion ? 0 : 14 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: EASE_SMOOTH },
    },
  };

  return (
    <section
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-bg)',
        color: 'var(--me-ink)',
        fontFamily: 'var(--me-font-body)',
        padding: '72px 32px 64px',
        overflow: 'hidden',
      }}
    >
      <div
        className='hero-grid'
        style={{
          maxWidth: 1280,
          margin: '0 auto',
          display: 'grid',
          gridTemplateColumns: '1fr 1.05fr',
          gap: 56,
          alignItems: 'center',
        }}
      >
        {/* ── Left column ─────────────────────────────────────── */}
        <motion.div
          initial='hidden'
          animate='visible'
          transition={{ staggerChildren: 0.08 }}
        >
          <motion.div
            variants={itemVariants}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 9999,
              background: 'var(--me-brand-soft)',
              color: 'var(--me-brand)',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 20,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: 9999,
                background: 'var(--me-brand)',
              }}
            />
            Serving the UK
          </motion.div>

          <motion.h1
            variants={itemVariants}
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              letterSpacing: '-0.02em',
              fontSize: 'clamp(48px, 6vw, 76px)',
              lineHeight: 1.04,
              margin: '0 0 18px',
              color: 'var(--me-ink)',
            }}
          >
            Home,{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--me-brand)' }}>
              taken care of.
            </em>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            style={{
              fontSize: 19,
              lineHeight: 1.55,
              color: 'var(--me-ink-2)',
              maxWidth: 520,
              margin: '0 0 32px',
            }}
          >
            Snap a photo of what&apos;s broken. Post a job once and get honest
            quotes from local tradespeople on the platform. Pay only when the
            job&apos;s done — properly.
          </motion.p>

          <motion.div
            variants={itemVariants}
            style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
          >
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
              Post your first job — free
            </Link>
            <a
              href='#how-it-works'
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px 22px',
                borderRadius: 'var(--me-radius-btn)',
                background: 'var(--me-surface)',
                color: 'var(--me-ink)',
                border: '1px solid var(--me-line)',
                fontSize: 15,
                fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              See how it works
            </a>
          </motion.div>

          <motion.div
            variants={itemVariants}
            style={{
              marginTop: 32,
              display: 'flex',
              gap: 14,
              alignItems: 'center',
              flexWrap: 'wrap',
              color: 'var(--me-ink-3)',
              fontSize: 12,
            }}
          >
            <span>
              <b style={{ color: 'var(--me-ink-2)', fontWeight: 600 }}>
                Reviewed
              </b>{' '}
              tradespeople
            </span>
            <span aria-hidden='true'>·</span>
            <span>
              <b style={{ color: 'var(--me-ink-2)', fontWeight: 600 }}>
                Escrow-protected
              </b>{' '}
              payments
            </span>
            <span aria-hidden='true'>·</span>
            <span>
              <b style={{ color: 'var(--me-ink-2)', fontWeight: 600 }}>
                Photo proof
              </b>{' '}
              before &amp; after
            </span>
          </motion.div>
        </motion.div>

        {/* ── Right column — device mock ──────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: EASE_SMOOTH, delay: 0.1 }}
        >
          <HeroMock />
        </motion.div>
      </div>

      {/* Responsive: single column below 1024px, mock hidden (it's a
          fixed-size desktop composition — the text hero stands alone
          on mobile). */}
      <style>{`
        @media (max-width: 1023px) {
          .hero-grid { grid-template-columns: 1fr !important; gap: 0 !important; }
          .hero-mock-wrap { display: none !important; }
        }
      `}</style>
    </section>
  );
}
