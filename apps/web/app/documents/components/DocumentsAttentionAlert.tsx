'use client';

/**
 * DocumentsAttentionAlert — amber banner shown above the document grid
 * when one or more documents need the homeowner's response.
 *
 * Computes a short, real summary of what's pending — e.g. "A contract
 * with Tomas R. is waiting for your signature, and a £275 bid from
 * Aisha P. is awaiting review." No fabricated data; pulls from the
 * actual document list.
 */

import React from 'react';
import { ShieldAlert } from 'lucide-react';
import type { DocumentItem } from './DocumentRow';

interface DocumentsAttentionAlertProps {
  documents: DocumentItem[];
  /** Called when the homeowner clicks "Review now" — typically scrolls
   *  to / filters the inbox to show only items that need attention. */
  onReviewNow: () => void;
}

function needsAttention(d: DocumentItem): boolean {
  if (d.type === 'contract' && d.status === 'pending_homeowner') return true;
  if (d.type === 'bid' && d.status === 'pending') return true;
  return false;
}

function buildSummary(items: DocumentItem[]): string {
  if (items.length === 0) return '';
  const parts: string[] = items.slice(0, 2).map((d) => {
    if (d.type === 'contract') {
      const who = d.contractor_name ? ` with ${d.contractor_name}` : '';
      return `A contract${who} is waiting for your signature`;
    }
    if (d.type === 'bid') {
      const amount = d.amount != null ? `£${d.amount} ` : '';
      const who = d.contractor_name ? ` from ${d.contractor_name}` : '';
      return `a ${amount}bid${who} is awaiting review`;
    }
    return 'an action is required';
  });
  // Sentence-case the first part, lowercase the rest, join with ", and"
  if (parts.length === 1) return `${parts[0]}.`;
  if (items.length > 2) {
    return `${parts[0]}, ${parts[1]}, plus ${items.length - 2} more.`;
  }
  return `${parts[0]}, and ${parts[1]}.`;
}

export function DocumentsAttentionAlert({
  documents,
  onReviewNow,
}: DocumentsAttentionAlertProps) {
  const items = documents.filter(needsAttention);
  if (items.length === 0) return null;

  const summary = buildSummary(items);

  return (
    <div
      role='status'
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr auto',
        gap: 14,
        alignItems: 'center',
        padding: '14px 18px',
        marginBottom: 18,
        background: 'var(--me-warn-bg)',
        border: '1px solid var(--me-warn-fg)',
        borderRadius: 'var(--me-radius-card, 14px)',
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          background: 'rgba(200, 149, 22, 0.18)',
          color: 'var(--me-warn-fg)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        aria-hidden='true'
      >
        <ShieldAlert size={18} strokeWidth={1.75} />
      </span>
      <div style={{ minWidth: 0 }}>
        <p
          className='t-h4'
          style={{
            margin: 0,
            fontSize: 15,
            color: 'var(--me-ink)',
          }}
        >
          {items.length} document{items.length === 1 ? '' : 's'} need
          {items.length === 1 ? 's' : ''} your attention
        </p>
        <p
          className='t-body'
          style={{
            margin: '2px 0 0',
            fontSize: 13,
            color: 'var(--me-ink-2)',
          }}
        >
          {summary}
        </p>
      </div>
      <button
        type='button'
        onClick={onReviewNow}
        className='btn btn-primary btn-sm'
      >
        Review now →
      </button>
    </div>
  );
}
