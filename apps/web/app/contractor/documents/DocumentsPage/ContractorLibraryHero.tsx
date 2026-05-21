'use client';

/**
 * ContractorLibraryHero — green mint-editorial hero for the
 * /contractor/documents library, matching the mockup the user shared
 * 2026-05-21.
 *
 * Stats are derived from the real document list — no fabricated
 * placeholder values:
 *   - FILES: documents.length
 *   - CATEGORIES: distinct categories present
 *   - STORED: total size_bytes rolled up to MB / GB
 *   - EXPIRING: count of items with a future expiry within 90 days.
 *     Today no `expiry_date` lives on the contractor `documents`
 *     surface, so this stays at 0 unless the parent passes one in.
 *     The renewal banner below the hero self-hides when the count
 *     is zero (see ContractorLibraryRenewalAlert).
 */

import React from 'react';

interface ContractorLibraryHeroProps {
  fileCount: number;
  categoryCount: number;
  /** Total size of all documents in bytes. */
  totalBytes: number;
  /** How many docs are within the renewal window — pass 0 to hide
   *  that tile from looking active. */
  expiringCount: number;
}

function formatBytes(bytes: number): { value: string; unit: string } {
  if (bytes === 0) return { value: '0', unit: 'KB' };
  if (bytes < 1024 * 1024) {
    return { value: Math.round(bytes / 1024).toString(), unit: 'KB' };
  }
  if (bytes < 1024 * 1024 * 1024) {
    return {
      value: Math.round(bytes / (1024 * 1024)).toString(),
      unit: 'MB',
    };
  }
  return {
    value: (bytes / (1024 * 1024 * 1024)).toFixed(1),
    unit: 'GB',
  };
}

export function ContractorLibraryHero({
  fileCount,
  categoryCount,
  totalBytes,
  expiringCount,
}: ContractorLibraryHeroProps) {
  const size = formatBytes(totalBytes);
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
          Your library, certified.
        </h1>
        <p
          className='t-body'
          style={{
            color: 'var(--me-on-brand)',
            opacity: 0.85,
            margin: 0,
          }}
        >
          Contracts, photos, certs, insurance and templates — searchable,
          sortable, always to hand.
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
        <Tile value={fileCount.toString()} label='Files' />
        <Tile value={categoryCount.toString()} label='Categories' />
        <Tile value={`${size.value}${size.unit}`} label='Stored' />
        <Tile
          value={expiringCount.toString()}
          label='Expiring'
          highlighted={expiringCount > 0}
        />
      </div>
    </div>
  );
}

function Tile({
  value,
  label,
  highlighted = false,
}: {
  value: string;
  label: string;
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
        style={{
          fontSize: 22,
          fontFamily:
            'var(--me-font-display, "Instrument Serif", Georgia, serif)',
          lineHeight: 1,
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
