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
import {
  Shield,
  Brush,
  Calendar,
  X,
  Star,
  KeyRound,
  Lock,
  User as UserIcon,
  Info,
  Check,
} from 'lucide-react';
import type { Bid } from '../BidCard';
import { formatGBP, type PropertyShape } from './MintEditorialJobCards';

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
              <span className='stars'>
                <Star size={12} strokeWidth={1.75} fill='currentColor' />
                <span className='v'>{rating.toFixed(1)}</span>
              </span>
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

/**
 * AccessSharedCard — the homeowner's mirror of what the contractor
 * sees on `/contractor/jobs/[id]`. Shown once escrow is funded (the
 * lifecycle stage at which the contractor can actually see the
 * lock-box code), and falls back to a "Update access on the property"
 * link when the homeowner hasn't set anything yet.
 *
 * Why on the job detail (when we already have a Property page):
 *  1. Confidence — homeowner verifies what they shared at the moment
 *     the contractor is about to act on it.
 *  2. Audit — clear marker that the code IS being exposed now.
 *  3. Convenience — one click back to /properties/[id] to amend
 *     without losing job context.
 */
export function AccessSharedCard({
  property,
  canSeeCode,
}: {
  property: PropertyShape | null | undefined;
  /**
   * Authoritative "will the contractor see the code right now"
   * signal — computed by the caller via the shared
   * `canRevealKeySafeCode` helper so this card matches the
   * contractor page's 1h-before-scheduled-start rule (audit-63 P1
   * doc rule, audit-76 P1 propagation). The previous `jobStage`
   * prop derived the answer from escrow/job status and over-
   * promised: the homeowner saw "Visible to contractor now" when
   * the contractor page still masked the code with ••••.
   */
  canSeeCode: boolean;
}) {
  if (!property) return null;
  const hasAnyAccess =
    property.access_mode || property.access_notes || property.stopcock_location;

  const modeLabel = (() => {
    switch (property.access_mode) {
      case 'key_safe':
        return 'Key safe';
      case 'smart_lock':
        return 'Smart lock';
      case 'in_person':
        return "You'll be home";
      default:
        return 'Not set yet';
    }
  })();
  const ModeIcon =
    property.access_mode === 'smart_lock'
      ? Lock
      : property.access_mode === 'in_person'
        ? UserIcon
        : KeyRound;

  return (
    <div className='card card-pad'>
      <div className='col' style={{ gap: 10 }}>
        <div className='between' style={{ alignItems: 'center' }}>
          <div className='row' style={{ gap: 8, alignItems: 'center' }}>
            <Info
              size={14}
              strokeWidth={1.75}
              style={{ color: 'var(--me-brand)' }}
            />
            <h3 className='t-h3' style={{ margin: 0 }}>
              Access shared with contractor
            </h3>
          </div>
          {property.id ? (
            <Link
              href={`/properties/${property.id}?tab=access`}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: 'var(--me-brand)',
                textDecoration: 'underline',
              }}
            >
              Edit
            </Link>
          ) : null}
        </div>

        {!hasAnyAccess ? (
          <p className='t-body' style={{ fontSize: 13 }}>
            You haven&apos;t set default access for this property yet. The
            contractor will see a prompt to ask you in the message thread.
            {property.id ? (
              <>
                {' '}
                <Link
                  href={`/properties/${property.id}?tab=access`}
                  style={{
                    color: 'var(--me-brand)',
                    fontWeight: 600,
                    textDecoration: 'underline',
                  }}
                >
                  Set it up now →
                </Link>
              </>
            ) : null}
          </p>
        ) : (
          <>
            <div className='row' style={{ gap: 8, alignItems: 'center' }}>
              <ModeIcon
                size={14}
                strokeWidth={1.75}
                style={{ color: 'var(--me-ink-2)' }}
              />
              <span style={{ fontSize: 14, fontWeight: 600 }}>{modeLabel}</span>
            </div>

            {property.key_safe_code ? (
              <div className='col' style={{ gap: 4 }}>
                <span className='t-meta'>Lock-box code</span>
                <span
                  style={{
                    fontFamily: 'monospace',
                    fontSize: canSeeCode ? 16 : 14,
                    fontWeight: 700,
                    letterSpacing: '0.1em',
                    color: canSeeCode ? 'var(--me-brand)' : 'var(--me-ink-3)',
                  }}
                >
                  {canSeeCode ? property.key_safe_code : '••••'}
                </span>
                <span
                  className='t-meta'
                  style={{ fontSize: 11, color: 'var(--me-ink-3)' }}
                >
                  {canSeeCode ? (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                      }}
                    >
                      <Check size={12} aria-hidden='true' />
                      Visible to contractor now
                    </span>
                  ) : (
                    /* audit-76 P1: copy aligned with canRevealKeySafeCode —
                       reveal is "within 1h of scheduled start", not
                       "when escrow funds". */
                    'Reveals to contractor 1 hour before the scheduled start'
                  )}
                </span>
              </div>
            ) : null}

            {property.access_notes ? (
              <div className='col' style={{ gap: 4 }}>
                <span className='t-meta'>Notes</span>
                <p
                  className='t-body'
                  style={{
                    fontSize: 13,
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.5,
                  }}
                >
                  {property.access_notes}
                </p>
              </div>
            ) : null}

            {property.stopcock_location ||
            property.gas_isolator_location ||
            property.consumer_unit_location ? (
              <div
                className='col'
                style={{
                  gap: 6,
                  padding: 10,
                  borderRadius: 8,
                  background: 'var(--me-bg-2)',
                  marginTop: 4,
                }}
              >
                <span className='t-meta' style={{ fontWeight: 600 }}>
                  Stopcock & isolators
                </span>
                {property.stopcock_location ? (
                  <span style={{ fontSize: 12 }}>
                    Water stopcock: {property.stopcock_location}
                  </span>
                ) : null}
                {property.gas_isolator_location ? (
                  <span style={{ fontSize: 12 }}>
                    Gas isolator: {property.gas_isolator_location}
                  </span>
                ) : null}
                {property.consumer_unit_location ? (
                  <span style={{ fontSize: 12 }}>
                    Consumer unit: {property.consumer_unit_location}
                  </span>
                ) : null}
              </div>
            ) : null}
          </>
        )}
      </div>
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
  // 2026-05-27 audit-76 P2: previously step 1 said "You accept the
  // bid · £X held in escrow" — which conflates the actual two-step
  // sequence (accept → both sign → fund escrow). The canonical
  // helper at jobDetailHelpers.ts:151 already splits these: after
  // bid acceptance the next CTA is "Sign the contract", and only
  // after `contractStatus === 'accepted'` does the "Pay into
  // escrow" step appear. Card copy now matches that lifecycle.
  // Dispute is rendered as a footer note below the 4 numbered
  // steps so the numbered sequence reads as the actual flow.
  const steps = [
    'You accept the bid · contract drafted to sign',
    `Both sign · ${escrowDisplay} held in escrow before work starts`,
    'Work is done · you confirm completion in-app',
    `We release payment to ${contractorFirstName} within 24h`,
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
        {/* audit-76 P2: dispute path lives outside the numbered
            sequence — it's not a step everyone takes, just a
            safety-net assurance. */}
        <p
          className='t-meta'
          style={{
            margin: '8px 0 0',
            fontSize: 11,
            color: 'var(--me-ink-3)',
          }}
        >
          Dispute? Mintenance mediates free.
        </p>
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
