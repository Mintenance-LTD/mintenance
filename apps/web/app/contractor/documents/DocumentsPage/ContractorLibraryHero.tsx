'use client';

/**
 * ContractorLibraryHero — gradient mint hero for /contractor/documents.
 * Spec-matched to redesign-v2/documents-web.html:
 *   - `linear-gradient(135deg, brand-2 → brand)` background
 *   - Two soft-white decorative circles
 *   - 4 frosted stat tiles (rgba white at 14% / 12% border)
 *   - 4th tile gets the amber `.attn` treatment when there are
 *     documents within the renewal window
 */

import React from 'react';

interface ContractorLibraryHeroProps {
  fileCount: number;
  categoryCount: number;
  totalBytes: number;
  expiringCount: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0KB';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${Math.round(bytes / (1024 * 1024))}MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)}GB`;
}

export function ContractorLibraryHero({
  fileCount,
  categoryCount,
  totalBytes,
  expiringCount,
}: ContractorLibraryHeroProps) {
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
            Your library, certified.
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
            Contracts, photos, certs, insurance and templates — searchable,
            sortable, always to hand.
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
          <FrostedTile label='Files' value={fileCount.toString()} />
          <FrostedTile label='Categories' value={categoryCount.toString()} />
          <FrostedTile label='Stored' value={formatBytes(totalBytes)} />
          <FrostedTile
            label='Expiring'
            value={expiringCount.toString()}
            attn={expiringCount > 0}
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
  value: string;
  attn?: boolean;
}) {
  const bg = attn ? 'rgba(255, 200, 160, 0.18)' : 'rgba(255, 255, 255, 0.14)';
  const borderColor = attn
    ? 'rgba(255, 210, 180, 0.45)'
    : 'rgba(255, 255, 255, 0.12)';
  const textColor = attn ? 'rgba(255, 215, 184, 1)' : 'var(--me-on-brand)';
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
          opacity: attn ? 1 : 0.78,
        }}
      >
        {label}
      </div>
    </div>
  );
}
