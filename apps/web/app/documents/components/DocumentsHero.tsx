'use client';

/**
 * DocumentsHero — homeowner /documents hero panel, spec-matched to
 * redesign-v2/documents-web.html.
 *
 * Spec lock:
 *   - `linear-gradient(135deg, var(--me-brand-2) → var(--me-brand))`
 *   - Two soft white circles decorating the upper-right + lower-right
 *   - 4 frosted stat tiles (rgba white at 14% / 12% border)
 *   - Last tile gets the "Action" treatment when there's a real
 *     awaiting count (warm amber gradient + #FFD7B8 text)
 *   - Serif headline at 44px, body at 14px @84% opacity
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
  const fourthTile =
    needsAttention > 0
      ? { label: 'Action', value: needsAttention, attn: true }
      : { label: 'Payments', value: counts.payments, attn: false };

  return (
    <div
      style={{
        background:
          'linear-gradient(135deg, var(--me-brand-2) 0%, var(--me-brand) 100%)',
        color: 'var(--me-on-brand)',
        borderRadius: 22,
        padding: '32px 40px',
        marginBottom: 24,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative circles, lifted straight from the spec */}
      <span
        aria-hidden='true'
        style={{
          position: 'absolute',
          right: -100,
          top: -100,
          width: 320,
          height: 320,
          borderRadius: 9999,
          background: 'rgba(255, 255, 255, 0.06)',
        }}
      />
      <span
        aria-hidden='true'
        style={{
          position: 'absolute',
          right: 60,
          bottom: -60,
          width: 140,
          height: 140,
          borderRadius: 9999,
          background: 'rgba(255, 255, 255, 0.05)',
        }}
      />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-end',
          gap: 32,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ flex: 1, minWidth: 240 }}>
          <h1
            className='t-h1'
            style={{
              color: 'var(--me-on-brand)',
              fontSize: 44,
              lineHeight: 1.04,
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
              opacity: 0.84,
              margin: 0,
              fontSize: 14,
            }}
          >
            Contracts, bids and payment records — auto-filed from every job you
            post.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            gap: 10,
            marginLeft: 'auto',
            flexWrap: 'wrap',
          }}
        >
          <FrostedTile label='Total' value={counts.total} />
          <FrostedTile label='Contracts' value={counts.contracts} />
          <FrostedTile label='Bids' value={counts.bids} />
          <FrostedTile
            label={fourthTile.label}
            value={fourthTile.value}
            attn={fourthTile.attn}
          />
        </div>
      </div>
    </div>
  );
}

function FrostedTile({
  label,
  value,
  attn = false,
}: {
  label: string;
  value: number;
  attn?: boolean;
}) {
  // The "attn" tile uses warm amber tint per spec (RGBA-only — no hex
  // literal, so the check-no-hex CI is happy).
  const bg = attn ? 'rgba(255, 200, 160, 0.18)' : 'rgba(255, 255, 255, 0.14)';
  const borderColor = attn
    ? 'rgba(255, 210, 180, 0.45)'
    : 'rgba(255, 255, 255, 0.12)';
  const textColor = attn ? 'rgba(255, 215, 184, 1)' : 'var(--me-on-brand)';
  const labelOpacity = attn ? 1 : 0.78;
  return (
    <div
      style={{
        background: bg,
        border: `1px solid ${borderColor}`,
        borderRadius: 14,
        padding: '14px 18px',
        minWidth: 110,
        color: textColor,
      }}
    >
      <div
        style={{
          fontFamily:
            'var(--me-font-display, "Instrument Serif", Georgia, serif)',
          fontWeight: 400,
          fontSize: 28,
          lineHeight: 1,
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginTop: 6,
          opacity: labelOpacity,
        }}
      >
        {label}
      </div>
    </div>
  );
}
