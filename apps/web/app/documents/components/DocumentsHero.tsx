'use client';

/**
 * DocumentsHero — green mint-editorial hero panel for /documents.
 *
 * Matches the mockup the user shared 2026-05-21:
 *   - Serif headline + body copy
 *   - 4 stat tiles on the right (Total / Contracts / Bids / Action)
 *
 * The "Action" tile is highlighted (mint-soft background) when there
 * are documents awaiting the homeowner's response — otherwise it
 * shows the Payments count so the layout stays symmetrical.
 *
 * Pure presentational. Counts come from /api/documents → page.tsx.
 */

import React from 'react';

interface Counts {
  total: number;
  contracts: number;
  bids: number;
  payments: number;
}

interface DocumentsHeroProps {
  counts: Counts;
  needsAttention: number;
}

export function DocumentsHero({ counts, needsAttention }: DocumentsHeroProps) {
  // The Action tile is the only one that lights up — it's the only
  // value the user needs to act on. When zero, we surface Payments
  // count instead so the row still reads as four equal tiles.
  const fourthTile =
    needsAttention > 0
      ? { label: 'Action', value: needsAttention, highlighted: true }
      : { label: 'Payments', value: counts.payments, highlighted: false };

  return (
    <div
      style={{
        background: 'var(--me-brand)',
        color: 'var(--me-on-brand)',
        borderRadius: 'var(--me-radius-card, 16px)',
        padding: '28px 32px',
        marginBottom: 18,
        display: 'flex',
        gap: 24,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 280, flex: '1 1 auto' }}>
        <h1
          className='t-h1'
          style={{
            color: 'var(--me-on-brand)',
            margin: 0,
            marginBottom: 8,
          }}
        >
          Your paperwork, in one place.
        </h1>
        <p
          className='t-body'
          style={{
            color: 'var(--me-on-brand)',
            opacity: 0.85,
            margin: 0,
          }}
        >
          Contracts, bids and payment records — auto-filed from every job you
          post.
        </p>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, minmax(72px, 1fr))',
          gap: 10,
          flex: '0 0 auto',
        }}
      >
        <HeroTile label='Total' value={counts.total} />
        <HeroTile label='Contracts' value={counts.contracts} />
        <HeroTile label='Bids' value={counts.bids} />
        <HeroTile
          label={fourthTile.label}
          value={fourthTile.value}
          highlighted={fourthTile.highlighted}
        />
      </div>
    </div>
  );
}

function HeroTile({
  label,
  value,
  highlighted = false,
}: {
  label: string;
  value: number;
  highlighted?: boolean;
}) {
  return (
    <div
      style={{
        background: highlighted
          ? 'var(--me-brand-soft)'
          : 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: '14px 16px',
        textAlign: 'center',
        color: highlighted ? 'var(--me-ink)' : 'var(--me-on-brand)',
        minWidth: 72,
      }}
    >
      <div
        className='t-h2'
        style={{
          fontSize: 26,
          fontFamily:
            'var(--me-font-display, "Instrument Serif", Georgia, serif)',
          lineHeight: 1,
          margin: 0,
          color: highlighted ? 'var(--me-brand)' : 'var(--me-on-brand)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          marginTop: 4,
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          opacity: highlighted ? 1 : 0.8,
        }}
      >
        {label}
      </div>
    </div>
  );
}
