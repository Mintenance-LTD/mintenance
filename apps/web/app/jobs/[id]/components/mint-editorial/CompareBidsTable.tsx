'use client';

/**
 * Canonical bid comparison table from
 * design-system/project/redesign-v2/job-detail.html lines 164-205.
 *
 * 5-column grid row per bid: avatar · name+meta · price · earliest
 * slot · actions. Selected bid gets `var(--me-brand-soft)` row tint,
 * "RECOMMENDED" chip + brand-coloured Shield "Verified" icon, and a
 * brand-primary "Accept →" instead of the secondary "View" button.
 */

import React from 'react';
import Link from 'next/link';
import { Shield, Star } from 'lucide-react';
import type { Bid } from '../BidCard';
import { formatGBP } from './MintEditorialJobCards';

interface Props {
  bids: Bid[];
  selectedId: string | null;
  recommendedId: string | null;
  onSelect: (id: string) => void;
  jobId: string;
}

function contractorName(b: Bid): string {
  return (
    b.contractor.company_name ||
    (b.contractor.first_name && b.contractor.last_name
      ? `${b.contractor.first_name} ${b.contractor.last_name}`
      : b.contractor.email || 'Contractor')
  );
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function bidEarliestSlot(b: Bid): string {
  // The current Bid shape doesn't carry an explicit "earliest slot"
  // field — surface the bid's `created_at` as a relative-time hint
  // until contractors start setting availability.
  const days = Math.round(
    (Date.now() - new Date(b.created_at).getTime()) / 86_400_000
  );
  if (days <= 0) return 'Available today';
  if (days === 1) return 'Submitted yesterday';
  if (days < 7) return `Submitted ${days}d ago`;
  return new Date(b.created_at).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export function CompareBidsTable({
  bids,
  selectedId,
  recommendedId,
  onSelect,
  jobId,
}: Props) {
  return (
    <div className='card' style={{ overflow: 'hidden' }}>
      <div
        className='between'
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <h2 className='t-h4'>Compare bids</h2>
        <span className='t-meta'>Sort · Best fit</span>
      </div>
      {bids.map((bid, i) => {
        const name = contractorName(bid);
        const isSelected = bid.id === selectedId;
        const isRecommended = bid.id === recommendedId;
        const verified = !!bid.contractor.admin_verified;
        const rating = bid.contractor.rating;
        return (
          <div
            key={bid.id}
            role='button'
            tabIndex={0}
            onClick={() => onSelect(bid.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(bid.id);
              }
            }}
            style={{
              display: 'grid',
              gridTemplateColumns: '44px 1fr 120px 140px 110px',
              alignItems: 'center',
              gap: 14,
              padding: '16px',
              borderTop: i === 0 ? 'none' : '1px solid var(--me-line-2)',
              background: isSelected ? 'var(--me-brand-soft)' : 'transparent',
              cursor: 'pointer',
            }}
          >
            {/* Avatar */}
            <span
              className='avatar avatar-md'
              style={
                isSelected
                  ? {
                      background: 'var(--me-brand)',
                      color: 'var(--me-on-brand)',
                    }
                  : undefined
              }
            >
              {getInitials(name)}
            </span>

            {/* Name + meta */}
            <div className='col' style={{ gap: 4, minWidth: 0 }}>
              <div
                className='row'
                style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}
              >
                <span style={{ fontWeight: 600, fontSize: 14 }}>{name}</span>
                {verified ? (
                  <Shield
                    size={12}
                    strokeWidth={1.75}
                    style={{ color: 'var(--me-brand)' }}
                    aria-label='Verified'
                  />
                ) : null}
                {isRecommended ? (
                  <span
                    style={{
                      background: 'var(--me-brand-soft)',
                      color: 'var(--me-brand)',
                      padding: '2px 6px',
                      borderRadius: 9999,
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: '0.04em',
                    }}
                  >
                    RECOMMENDED
                  </span>
                ) : null}
              </div>
              <div
                className='t-meta'
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {bid.contractor.company_name ? (
                  <>
                    {bid.contractor.company_name}
                    {' · '}
                  </>
                ) : null}
                {rating != null ? (
                  <>
                    <span className='stars' style={{ fontSize: 12 }}>
                      <Star size={11} strokeWidth={1.75} fill='currentColor' />
                      <span className='v'>{rating.toFixed(1)}</span>
                    </span>
                    {' · '}
                  </>
                ) : null}
                {bid.description ? `"${bid.description}"` : 'No note'}
              </div>
            </div>

            {/* Price */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--me-font-display)',
                  fontWeight: 400,
                  fontSize: 22,
                  color: 'var(--me-ink)',
                  lineHeight: 1,
                }}
              >
                {formatGBP(bid.amount)}
              </div>
              <div className='t-meta'>fixed price</div>
            </div>

            {/* Earliest slot */}
            <div>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                {bidEarliestSlot(bid)}
              </div>
              <div className='t-meta'>earliest slot</div>
            </div>

            {/* Actions */}
            <div
              className='col'
              style={{ gap: 6 }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              role='presentation'
            >
              {isSelected ? (
                <Link
                  href={`#bid-${bid.id}`}
                  className='btn btn-primary btn-sm'
                  style={{ justifyContent: 'center' }}
                >
                  Accept →
                </Link>
              ) : (
                <button
                  type='button'
                  className='btn btn-secondary btn-sm'
                  onClick={() => onSelect(bid.id)}
                  style={{ justifyContent: 'center' }}
                >
                  View
                </button>
              )}
              <Link
                href={`/messages?jobId=${jobId}`}
                className='btn btn-ghost btn-sm'
                style={{ justifyContent: 'center' }}
              >
                Message
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}
