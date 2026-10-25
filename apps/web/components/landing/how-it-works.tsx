import React from 'react';
import Link from 'next/link';

/**
 * "How it works" — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html #how.
 */

const STEPS = [
  {
    number: 1,
    title: 'Post your job',
    description:
      'Add photos, describe what needs doing and set your budget and preferred timing.',
  },
  {
    number: 2,
    title: 'Compare bids',
    description:
      'Review proposals from interested tradespeople. Compare the scope, price, availability and profile details.',
  },
  {
    number: 3,
    title: 'Hire & approve',
    description:
      "Pick your tradesperson. Payment is held safely and only released once you're happy with the work.",
  },
];

export function HowItWorks() {
  return (
    <section
      id='how-it-works'
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-surface)',
        fontFamily: 'var(--me-font-body)',
        color: 'var(--me-ink)',
        padding: '88px 32px',
      }}
    >
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
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
            How it works
          </div>
          <h2
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(36px, 4.5vw, 56px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              margin: '0 auto 18px',
              maxWidth: 760,
            }}
          >
            Three steps.{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--me-brand)' }}>
              No phone tag.
            </em>
          </h2>
          <p
            style={{
              fontSize: 17,
              color: 'var(--me-ink-2)',
              maxWidth: 600,
              lineHeight: 1.55,
              margin: '0 auto',
            }}
          >
            From describing the problem to reviewing the finished work, keep the
            details together.
          </p>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 32,
          }}
        >
          {STEPS.map((step) => (
            <div key={step.number} style={{ textAlign: 'center' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 64,
                  height: 64,
                  borderRadius: 16,
                  background: 'var(--me-brand-soft)',
                  color: 'var(--me-brand)',
                  fontFamily: 'var(--me-font-display)',
                  fontSize: 32,
                  marginBottom: 20,
                }}
              >
                {step.number}
              </div>
              <h3
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 500,
                  fontSize: 22,
                  letterSpacing: '-0.01em',
                  margin: '0 0 10px',
                }}
              >
                {step.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: 'var(--me-ink-2)',
                  lineHeight: 1.6,
                  margin: '0 auto',
                  maxWidth: 320,
                }}
              >
                {step.description}
              </p>
            </div>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 48 }}>
          <Link
            href='/how-it-works'
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
            Explore each step
          </Link>
        </div>
      </div>
    </section>
  );
}
