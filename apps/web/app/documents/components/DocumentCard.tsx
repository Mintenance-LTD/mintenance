'use client';

/**
 * DocumentCard — Mint Editorial 2-column grid card for the homeowner
 * /documents inbox.
 *
 * Matches the mockup the user shared 2026-05-21:
 *   - Type-coloured left border (Contract = violet, Bid = rose,
 *     Payment = amber).
 *   - Soft tinted icon tile with PDF / BID / PDF label underneath.
 *   - Title with `Contract · Boiler service` shape (type · subject).
 *   - Status badge under the title (Awaiting you / Fully signed /
 *     Pending review / Declined / Accepted / Released / In escrow).
 *   - Counterparty + relative date row.
 *   - Right-aligned amount + chevron.
 *   - Action chips on awaiting items ("Review & sign →" / "Review bid →"
 *     + "Remind me later").
 *
 * Click anywhere on the card → routes to the linked record (existing
 * `doc.href` from the API).
 */

import React from 'react';
import Link from 'next/link';
import { ArrowRight, FileText, Wrench, Wallet } from 'lucide-react';
import type { DocumentItem } from './DocumentRow';
import { DocIcon } from '@/components/documents/DocIcon';

interface DocumentCardProps {
  doc: DocumentItem;
}

// ── Type styling ───────────────────────────────────────────────────

interface TypeStyle {
  borderColor: string;
  iconBg: string;
  iconText: string;
  fileLabel: string;
}

function styleForType(type: DocumentItem['type']): TypeStyle {
  // Pulls the spec-locked document palette from the design tokens
  // added in apps/web/styles/mint-editorial.css. The chat transcript
  // for redesign-v2 picked these specific hues:
  //   - Contract → deep purple
  //   - Bid      → magenta
  //   - Payment  → teal
  switch (type) {
    case 'contract':
      return {
        borderColor: 'var(--me-doc-contract-fg)',
        iconBg: 'var(--me-doc-contract-bg)',
        iconText: 'var(--me-doc-contract-fg)',
        fileLabel: 'PDF',
      };
    case 'bid':
      return {
        borderColor: 'var(--me-doc-bid-fg)',
        iconBg: 'var(--me-doc-bid-bg)',
        iconText: 'var(--me-doc-bid-fg)',
        fileLabel: 'BID',
      };
    case 'payment':
      return {
        borderColor: 'var(--me-doc-payment-fg)',
        iconBg: 'var(--me-doc-payment-bg)',
        iconText: 'var(--me-doc-payment-fg)',
        fileLabel: 'PDF',
      };
  }
}

// ── Status badge ───────────────────────────────────────────────────

interface BadgeStyle {
  label: string;
  bg: string;
  fg: string;
}

function statusBadge(
  type: DocumentItem['type'],
  status: string,
  contractorSigned?: boolean,
  homeownerSigned?: boolean
): BadgeStyle {
  if (type === 'contract') {
    if (status === 'accepted' || (contractorSigned && homeownerSigned)) {
      return {
        label: 'Fully signed',
        bg: 'var(--me-doc-cert-bg)',
        fg: 'var(--me-doc-cert-fg)',
      };
    }
    if (status === 'pending_homeowner') {
      return {
        label: 'Awaiting you',
        bg: 'var(--me-doc-payment-bg)',
        fg: 'var(--me-doc-payment-fg)',
      };
    }
    if (status === 'pending_contractor') {
      return {
        label: 'Awaiting contractor',
        bg: 'var(--me-doc-receipt-bg)',
        fg: 'var(--me-doc-receipt-fg)',
      };
    }
    if (status === 'rejected' || status === 'cancelled') {
      return {
        label: status === 'rejected' ? 'Rejected' : 'Cancelled',
        bg: 'var(--me-err-bg)',
        fg: 'var(--me-err-fg)',
      };
    }
    return { label: status, bg: 'var(--me-bg-2)', fg: 'var(--me-ink-2)' };
  }
  if (type === 'bid') {
    if (status === 'accepted') {
      return {
        label: 'Accepted',
        bg: 'var(--me-doc-cert-bg)',
        fg: 'var(--me-doc-cert-fg)',
      };
    }
    if (status === 'pending') {
      return {
        label: 'Pending review',
        bg: 'var(--me-doc-bid-bg)',
        fg: 'var(--me-doc-bid-fg)',
      };
    }
    if (status === 'rejected' || status === 'declined') {
      return {
        label: 'Declined',
        bg: 'var(--me-err-bg)',
        fg: 'var(--me-err-fg)',
      };
    }
    return { label: status, bg: 'var(--me-bg-2)', fg: 'var(--me-ink-2)' };
  }
  // Payment
  if (status === 'released' || status === 'completed') {
    return {
      label: 'Released',
      bg: 'var(--me-doc-cert-bg)',
      fg: 'var(--me-doc-cert-fg)',
    };
  }
  if (status === 'held' || status === 'in_escrow') {
    return {
      label: 'In escrow',
      bg: 'var(--me-doc-receipt-bg)',
      fg: 'var(--me-doc-receipt-fg)',
    };
  }
  return { label: status, bg: 'var(--me-bg-2)', fg: 'var(--me-ink-2)' };
}

// ── Relative date ──────────────────────────────────────────────────

function relativeDate(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const day = 86_400_000;
  const days = Math.floor(diffMs / day);
  if (days < 1) return 'Today';
  if (days < 2) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
}

// ── Awaiting actions ───────────────────────────────────────────────

function awaitingPrimaryLabel(type: DocumentItem['type']): string | null {
  if (type === 'contract') return 'Review & sign →';
  if (type === 'bid') return 'Review bid →';
  return null;
}

function isAwaiting(d: DocumentItem): boolean {
  return (
    (d.type === 'contract' && d.status === 'pending_homeowner') ||
    (d.type === 'bid' && d.status === 'pending')
  );
}

// ── Component ──────────────────────────────────────────────────────

export function DocumentCard({ doc }: DocumentCardProps) {
  const t = styleForType(doc.type);
  const badge = statusBadge(
    doc.type,
    doc.status,
    doc.contractor_signed,
    doc.homeowner_signed
  );
  const awaiting = isAwaiting(doc);
  const primaryLabel = awaitingPrimaryLabel(doc.type);

  // Awaiting cards get the spec's `.attn` treatment — the entire
  // border switches to the brand colour + a soft brand shadow — so
  // they pop visibly from the rest of the grid. Non-awaiting cards
  // keep the type-coloured left border.
  const CenterIcon = (() => {
    if (doc.type === 'contract') return FileText;
    if (doc.type === 'bid') return Wrench;
    return Wallet;
  })();
  return (
    <Link
      href={doc.href}
      style={{
        display: 'block',
        position: 'relative',
        background: 'var(--me-surface)',
        borderRadius: 14,
        border: awaiting
          ? '1px solid var(--me-brand)'
          : '1px solid var(--me-line)',
        borderLeft: `4px solid ${awaiting ? 'var(--me-brand)' : t.borderColor}`,
        boxShadow: awaiting ? '0 2px 12px var(--me-brand-soft)' : undefined,
        padding: 18,
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr auto',
          gap: 16,
          alignItems: 'flex-start',
        }}
      >
        {/* Paper-shape icon tile per redesign-v2/documents-web spec
            (54×68 with extension chip in the bottom-right corner). */}
        <DocIcon color={t.iconText} bg={t.iconBg} ext={t.fileLabel}>
          <CenterIcon size={22} strokeWidth={1.75} />
        </DocIcon>

        {/* Body */}
        <div style={{ minWidth: 0 }}>
          <h3
            className='t-h4'
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: 'var(--me-ink)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {doc.name}
          </h3>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginTop: 6,
              flexWrap: 'wrap',
            }}
          >
            <span
              style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: 9999,
                background: badge.bg,
                color: badge.fg,
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              {badge.label}
            </span>
            <span
              style={{
                fontSize: 12,
                color: 'var(--me-ink-3)',
              }}
            >
              {doc.contractor_name ?? 'Unknown'} ·{' '}
              {relativeDate(doc.created_at)}
            </span>
          </div>
        </div>

        {/* Right rail — amount + chevron */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            color: 'var(--me-ink-2)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--me-font-display, "Inter", sans-serif)',
              fontSize: 22,
              color: 'var(--me-ink)',
              lineHeight: 1,
            }}
          >
            {doc.amount != null ? `£${doc.amount}` : '—'}
          </span>
          <ArrowRight size={16} strokeWidth={1.75} />
        </div>
      </div>

      {/* Awaiting action chips */}
      {awaiting && primaryLabel ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 14,
            paddingTop: 14,
            borderTop: '1px dashed var(--me-line-2)',
          }}
        >
          <span className='btn btn-primary btn-sm'>{primaryLabel}</span>
          <span
            className='btn btn-ghost btn-sm'
            style={{ color: 'var(--me-ink-2)' }}
          >
            Remind me later
          </span>
        </div>
      ) : null}
    </Link>
  );
}
