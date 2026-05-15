import React from 'react';
import Link from 'next/link';

/**
 * FAQ — Direction A · Mint Editorial.
 * Source of truth: redesign-v2/landing.html FAQ block.
 *
 * Native <details>/<summary> accordion — accessible by default, no
 * JS, so this is a server component (dropped the old framer-motion +
 * AccordionItem dependency).
 */

const FAQ_ITEMS = [
  {
    q: 'How does the protected payment system work?',
    a: "When you accept a contractor's bid, your payment is held securely by Mintenance. The contractor completes the work, you approve it, and then funds are released. If there's any issue, our mediation team steps in to resolve it fairly — protecting both homeowners and contractors.",
  },
  {
    q: 'Are all contractors verified and insured?',
    a: 'Yes. We verify contractor certifications (Gas Safe, NICEIC, and more), check insurance coverage, run background checks, and verify business registration. Only fully verified contractors can bid on jobs.',
  },
  {
    q: 'What fees does Mintenance charge?',
    a: 'Homeowners post jobs completely free. Contractors pay a small service fee only when they win a job — no monthly subscriptions, listing fees, or hidden costs. The exact fee is shown before accepting any job.',
  },
  {
    q: 'How long does it take to get quotes?',
    a: 'Most jobs receive competitive bids within 24–48 hours — often by the next morning. You can review profiles, ratings, past work and quotes before choosing.',
  },
  {
    q: 'Do I have to use Mint AI?',
    a: 'No. Mint AI photo guidance is optional — it can help describe a repair and estimate a fair price before posting. Contractor quotes, credentials, messages and protected payment are the core of the service.',
  },
  {
    q: "What if I'm not satisfied with the work?",
    a: 'We offer free dispute resolution. Contact support with details and evidence (photos, messages, contracts) and our mediation team will review the case and help reach a fair resolution. Your payment stays protected until the issue is resolved.',
  },
];

export function FAQSection() {
  return (
    <section
      data-theme='mint-editorial'
      style={{
        background: 'var(--me-bg)',
        color: 'var(--me-ink)',
        fontFamily: 'var(--me-font-body)',
        padding: '88px 32px',
      }}
    >
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
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
            Questions
          </div>
          <h2
            style={{
              fontFamily: 'var(--me-font-display)',
              fontWeight: 500,
              fontSize: 'clamp(34px, 4.4vw, 52px)',
              lineHeight: 1.06,
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Good to know.
          </h2>
        </div>

        <div
          style={{
            border: '1px solid var(--me-line)',
            borderRadius: 'var(--me-radius-card)',
            overflow: 'hidden',
            background: 'var(--me-surface)',
            boxShadow: 'var(--me-shadow-card)',
          }}
        >
          {FAQ_ITEMS.map((item, i) => (
            <details
              key={item.q}
              style={{
                borderTop: i === 0 ? 'none' : '1px solid var(--me-line-2)',
              }}
            >
              <summary
                style={{
                  cursor: 'pointer',
                  listStyle: 'none',
                  padding: '18px 20px',
                  fontSize: 15,
                  fontWeight: 600,
                  color: 'var(--me-ink)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  gap: 16,
                  alignItems: 'center',
                }}
              >
                {item.q}
                <span
                  aria-hidden='true'
                  style={{ color: 'var(--me-ink-3)', fontSize: 18 }}
                >
                  +
                </span>
              </summary>
              <p
                style={{
                  margin: 0,
                  padding: '0 20px 18px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--me-ink-2)',
                }}
              >
                {item.a}
              </p>
            </details>
          ))}
        </div>

        <div style={{ textAlign: 'center', marginTop: 28 }}>
          <Link
            href='/faq'
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: 'var(--me-brand)',
              textDecoration: 'none',
            }}
          >
            View all FAQs →
          </Link>
        </div>
      </div>
    </section>
  );
}
