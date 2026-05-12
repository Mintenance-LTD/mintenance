'use client';

/**
 * Canonical right rail from
 * design-system/project/redesign-v2/job-detail.html lines 236-291.
 *
 * Three stacked cards:
 *   1. "Currently selected" contractor card with Accept & schedule CTA
 *   2. "How payment works" 4-step trust panel
 *   3. Quick actions list (Edit / Change date / Withdraw)
 *
 * Imported by `MintEditorialJobDetail.tsx` and rendered alongside the
 * bid comparison table on the left. Renders sticky inside the main
 * grid so the action panel stays in view while the homeowner scans
 * the bid table.
 */

import React from 'react';
import Link from 'next/link';
import { Shield, Brush, Calendar, X, Star } from 'lucide-react';
import type { Bid } from '../BidCard';
import { formatGBP } from './MintEditorialJobCards';

interface SelectedCardProps {
  bid: Bid;
  jobId: string;
  onAccept: () => void;
  accepting: boolean;
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

export function SelectedContractorCard({
  bid,
  jobId,
  onAccept,
  accepting,
}: SelectedCardProps) {
  const name = contractorName(bid);
  const rating = bid.contractor.rating;

  return (
    <div className='card card-pad'>
      <div
        className='t-eyebrow'
        style={{ color: 'var(--me-brand)', marginBottom: 10 }}
      >
        Currently selected
      </div>
      <div className='row' style={{ gap: 12, marginBottom: 14 }}>
        <span
          className='avatar avatar-lg'
          style={{
            background: 'var(--me-brand)',
            color: 'var(--me-on-brand)',
          }}
        >
          {getInitials(name)}
        </span>
        <div className='col' style={{ gap: 2, minWidth: 0 }}>
          <h3 className='t-h4'>{name}</h3>
          {bid.contractor.company_name &&
          bid.contractor.first_name &&
          bid.contractor.last_name ? (
            <div className='t-meta'>
              {bid.contractor.first_name} {bid.contractor.last_name}
            </div>
          ) : bid.contractor.email ? (
            <div className='t-meta'>{bid.contractor.email}</div>
          ) : null}
        </div>
      </div>

      <div className='col' style={{ gap: 0 }}>
        <Row label='Price' value={formatGBP(bid.amount)} />
        <Row
          label='Submitted'
          value={new Date(bid.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
          })}
        />
        {rating != null ? (
          <Row
            label='Rating'
            value={
              <>
                <Star
                  size={11}
                  strokeWidth={1.75}
                  style={{
                    verticalAlign: '-1px',
                    color: 'var(--me-warm)',
                  }}
                />{' '}
                {rating.toFixed(1)}
              </>
            }
          />
        ) : null}
      </div>

      <button
        type='button'
        className='btn btn-primary btn-lg'
        onClick={onAccept}
        disabled={accepting}
        style={{
          width: '100%',
          justifyContent: 'center',
          marginTop: 14,
        }}
      >
        {accepting ? 'Accepting…' : 'Accept & schedule →'}
      </button>
      <Link
        href={`/messages?jobId=${jobId}`}
        className='btn btn-ghost btn-sm'
        style={{
          width: '100%',
          justifyContent: 'center',
          marginTop: 6,
        }}
      >
        Message {name.split(' ')[0]}
      </Link>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        padding: '8px 0',
        borderTop: '1px solid var(--me-line-2)',
        fontSize: 13,
      }}
    >
      <span style={{ color: 'var(--me-ink-3)' }}>{label}</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  );
}

export function HowPaymentWorksCard({
  escrowDisplay,
  contractorFirstName,
}: {
  escrowDisplay: string;
  contractorFirstName: string;
}) {
  const steps = [
    `You accept the bid · ${escrowDisplay} held in escrow`,
    'Work is done · you confirm completion in-app',
    `We release payment to ${contractorFirstName} within 24h`,
    'Dispute? Mintenance mediates free.',
  ];
  return (
    <div
      className='card card-pad'
      style={{
        background: 'var(--me-bg-2)',
        borderColor: 'transparent',
      }}
    >
      <div className='row' style={{ gap: 6, marginBottom: 10 }}>
        <Shield
          size={14}
          strokeWidth={1.75}
          style={{ color: 'var(--me-brand)' }}
        />
        <h3 className='t-h4'>How payment works</h3>
      </div>
      <div className='col' style={{ gap: 6 }}>
        {steps.map((text, i) => (
          <div
            key={i}
            className='row'
            style={{
              gap: 10,
              fontSize: 12,
              color: 'var(--me-ink-2)',
              padding: '5px 0',
              lineHeight: 1.45,
            }}
          >
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: 9999,
                background: 'var(--me-surface)',
                border: '1px solid var(--me-line)',
                color: 'var(--me-ink-3)',
                display: 'grid',
                placeItems: 'center',
                fontSize: 10,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              {i + 1}
            </div>
            <span>{text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function QuickActionsList({
  jobId,
  status,
}: {
  jobId: string;
  status?: string | null;
}) {
  const items = [
    {
      label: 'Edit job description',
      Icon: Brush,
      href: `/jobs/${jobId}/edit`,
    },
    {
      label: 'Change scheduled date',
      Icon: Calendar,
      href: `/jobs/${jobId}/edit#schedule`,
    },
    {
      label: 'Withdraw job posting',
      Icon: X,
      href: `/jobs/${jobId}/edit#withdraw`,
      hide: status === 'completed' || status === 'cancelled',
    },
  ].filter((x) => !x.hide);

  return (
    <>
      <div
        className='t-eyebrow'
        style={{ marginBottom: 6, color: 'var(--me-ink-3)' }}
      >
        Quick actions
      </div>
      <div className='col' style={{ gap: 6 }}>
        {items.map((a, i) => (
          <Link
            key={i}
            href={a.href}
            className='row'
            style={{
              gap: 10,
              padding: '10px 12px',
              background: 'var(--me-surface)',
              border: '1px solid var(--me-line)',
              borderRadius: 10,
              fontSize: 13,
              color: 'var(--me-ink-2)',
              textDecoration: 'none',
            }}
          >
            <a.Icon size={14} strokeWidth={1.75} /> {a.label}
          </Link>
        ))}
      </div>
    </>
  );
}
