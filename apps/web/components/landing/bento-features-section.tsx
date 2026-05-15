'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  BadgeCheck,
  ClipboardList,
  MessageSquareText,
  ShieldCheck,
  Sparkles,
  WalletCards,
} from 'lucide-react';

/**
 * Feature grid — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html services / feature
 * blocks. Six-card grid; the lead card is a dark brand panel.
 */

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const FEATURES = [
  {
    title: 'Verified tradespeople',
    description:
      'Profiles show insurance, credentials, ratings, and previous work before you choose who to hire.',
    icon: BadgeCheck,
  },
  {
    title: 'Clear job records',
    description:
      'Photos, messages, quotes, and approvals stay attached to the job so everyone knows what was agreed.',
    icon: ClipboardList,
  },
  {
    title: 'Protected payments',
    description:
      'Funds are held securely and released after the work is complete and approved.',
    icon: ShieldCheck,
  },
  {
    title: 'Quote comparison',
    description:
      'Compare bids by price, availability, rating, and contractor details without cold calling around.',
    icon: WalletCards,
  },
  {
    title: 'Direct communication',
    description:
      'Keep questions, updates, appointment notes, and evidence in one shared conversation.',
    icon: MessageSquareText,
  },
  {
    title: 'Mint AI guidance',
    description:
      'Photo assistance helps describe a problem and estimate a fair price. Final quotes still come from verified tradespeople.',
    icon: Sparkles,
  },
];

export function BentoFeaturesSection() {
  return (
    <section
      id='categories'
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-bg)',
        color: 'var(--me-ink)',
        fontFamily: 'var(--me-font-body)',
        padding: '88px 32px',
        overflow: 'hidden',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.1 }}
          transition={{ duration: 0.5 }}
          style={{ maxWidth: 720, marginBottom: 48 }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: 'uppercase',
              letterSpacing: '.12em',
              color: 'var(--me-brand)',
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Built for trust
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
            Whatever the house needs.
          </h2>
          <p
            style={{
              fontSize: 17,
              color: 'var(--me-ink-2)',
              lineHeight: 1.55,
              margin: 0,
            }}
          >
            Mintenance is designed around the parts of home maintenance that
            usually create stress — finding the right person, agreeing the work,
            protecting the money, and keeping proof of what happened.
          </p>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial='hidden'
          whileInView='visible'
          viewport={{ once: true, amount: 0.1 }}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 16,
          }}
        >
          {FEATURES.map((feature, index) => {
            const Icon = feature.icon;
            const isLead = index === 0;
            return (
              <motion.div
                key={feature.title}
                variants={itemVariants}
                style={{
                  borderRadius: 'var(--me-radius-card)',
                  padding: 24,
                  border: '1px solid var(--me-line)',
                  boxShadow: 'var(--me-shadow-card)',
                  background: isLead
                    ? 'var(--me-brand-2)'
                    : 'var(--me-surface)',
                  color: isLead ? 'var(--me-on-brand)' : 'var(--me-ink)',
                }}
              >
                <div
                  style={{
                    marginBottom: 18,
                    display: 'inline-flex',
                    width: 44,
                    height: 44,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 10,
                    background: isLead
                      ? 'rgba(255,255,255,0.14)'
                      : 'var(--me-brand-soft)',
                    color: isLead ? 'var(--me-on-brand)' : 'var(--me-brand)',
                  }}
                >
                  <Icon className='h-5 w-5' aria-hidden='true' />
                </div>
                <h3
                  style={{
                    fontFamily: 'var(--me-font-display)',
                    fontWeight: 500,
                    fontSize: 21,
                    letterSpacing: '-0.01em',
                    margin: '0 0 10px',
                  }}
                >
                  {feature.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    margin: 0,
                    color: isLead
                      ? 'rgba(255,255,255,0.78)'
                      : 'var(--me-ink-2)',
                  }}
                >
                  {feature.description}
                </p>
              </motion.div>
            );
          })}
        </motion.div>

        <div
          style={{
            marginTop: 40,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <Link
            href='/jobs/create'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '13px 22px',
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
          <Link
            href='/try-mint-ai'
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '13px 22px',
              borderRadius: 'var(--me-radius-btn)',
              background: 'var(--me-surface)',
              color: 'var(--me-ink)',
              border: '1px solid var(--me-line)',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
            }}
          >
            Try Mint AI
          </Link>
        </div>
      </div>
    </section>
  );
}
