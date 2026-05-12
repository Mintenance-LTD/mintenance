'use client';

/**
 * Per-job Timeline for the Mint Editorial /jobs/[id] surface.
 *
 * Replaces the static "Timeline is being rebuilt" placeholder with
 * a real event list derived from data we already fetch in page.tsx
 * (no extra DB queries). Events are real-data only — if we don't
 * have a timestamp for a phase yet, we render nothing for it
 * rather than fabricating a placeholder.
 *
 * Event sources:
 *   - "Job posted"                ← job.created_at  (always)
 *   - "Bid received from X (£Y)"   ← each bid.created_at
 *   - "You accepted X's bid"      ← bid where status === 'accepted'
 *   - "Contract signed by you"    ← contract.homeowner_signed_at
 *   - "Contract signed by X"      ← contract.contractor_signed_at
 *   - "Payment held in escrow"    ← lifecycle.escrowStatus === 'held'
 *                                   (no timestamp; positioned after
 *                                   contract signing)
 *   - "Before photos uploaded"    ← beforePhotos[].created_at
 *   - "After photos uploaded"     ← afterPhotos[].created_at
 *   - "Job complete"              ← job.completed_at
 *   - "You approved the work"     ← completion_confirmed (no ts;
 *                                   positioned after completion)
 *   - "Payment released"          ← escrowStatus === 'released'
 *                                   /'completed' (no ts; bottom)
 */

import React from 'react';
import {
  Briefcase,
  Clock,
  CheckCircle2,
  FileText,
  Camera,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import type { Bid } from '../BidCard';
import type { JobShape } from './MintEditorialJobCards';

interface PhotoRecord {
  id: string;
  photo_url: string;
  created_at?: string | null;
}

interface LifecycleInput {
  contractStatus?: string | null;
  contractContractorSignedAt?: string | null;
  contractHomeownerSignedAt?: string | null;
  escrowStatus?: string | null;
  completionConfirmed: boolean;
}

interface TimelineEvent {
  id: string;
  /** Sortable timestamp. For events without a real DB timestamp
   *  (e.g. "Payment held"), we use a tiny offset from the closest
   *  real event so the relative order is correct. */
  ts: number;
  /** True when the event has a real DB timestamp. Affects how the
   *  meta line renders (real date vs. "status update"). */
  hasRealTs: boolean;
  icon: React.ReactNode;
  title: string;
  meta?: string;
  tone: 'brand' | 'ok' | 'mute';
}

function formatEventDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function bidContractorName(bid: Bid): string {
  return (
    bid.contractor.company_name ||
    `${bid.contractor.first_name || ''} ${bid.contractor.last_name || ''}`.trim() ||
    'a contractor'
  );
}

interface Props {
  job: JobShape;
  allBids: Bid[];
  beforePhotos: PhotoRecord[];
  afterPhotos: PhotoRecord[];
  lifecycle: LifecycleInput;
}

export function MintEditorialJobTimeline({
  job,
  allBids,
  beforePhotos,
  afterPhotos,
  lifecycle,
}: Props) {
  const events: TimelineEvent[] = [];

  // 1. Job posted — always
  const postedTs = new Date(job.created_at).getTime();
  events.push({
    id: 'posted',
    ts: postedTs,
    hasRealTs: true,
    icon: <Briefcase size={14} strokeWidth={1.75} />,
    title: 'Job posted',
    meta: formatEventDate(job.created_at),
    tone: 'brand',
  });

  // 2. Bids received — one event per bid (in chronological order)
  for (const bid of allBids) {
    const ts = new Date(bid.created_at).getTime();
    if (Number.isNaN(ts)) continue;
    events.push({
      id: `bid-${bid.id}`,
      ts,
      hasRealTs: true,
      icon: <FileText size={14} strokeWidth={1.75} />,
      title: `Bid received from ${bidContractorName(bid)}`,
      meta: `£${bid.amount.toLocaleString('en-GB')} · ${formatEventDate(bid.created_at)}`,
      tone: 'mute',
    });
  }

  // 3. Bid accepted — use the accepted bid's own created_at as an
  // approximation when we don't have a separate `accepted_at`
  // column. Add a small offset so it sorts after the bid event.
  const accepted = allBids.find((b) => b.status === 'accepted');
  if (accepted) {
    const ts = new Date(accepted.created_at).getTime() + 1;
    events.push({
      id: 'bid-accepted',
      ts,
      hasRealTs: false,
      icon: <CheckCircle2 size={14} strokeWidth={1.75} />,
      title: `You accepted ${bidContractorName(accepted)}'s bid`,
      meta: `£${accepted.amount.toLocaleString('en-GB')} held in escrow`,
      tone: 'brand',
    });
  }

  // 4. Contract signing
  if (lifecycle.contractContractorSignedAt) {
    const ts = new Date(lifecycle.contractContractorSignedAt).getTime();
    if (!Number.isNaN(ts)) {
      events.push({
        id: 'contract-contractor',
        ts,
        hasRealTs: true,
        icon: <FileText size={14} strokeWidth={1.75} />,
        title: 'Contract signed by the contractor',
        meta: formatEventDate(lifecycle.contractContractorSignedAt),
        tone: 'mute',
      });
    }
  }
  if (lifecycle.contractHomeownerSignedAt) {
    const ts = new Date(lifecycle.contractHomeownerSignedAt).getTime();
    if (!Number.isNaN(ts)) {
      events.push({
        id: 'contract-homeowner',
        ts,
        hasRealTs: true,
        icon: <FileText size={14} strokeWidth={1.75} />,
        title: 'You signed the contract',
        meta: formatEventDate(lifecycle.contractHomeownerSignedAt),
        tone: 'brand',
      });
    }
  }

  // 5. Escrow held — no timestamp; render only if status is held
  // and not yet released. Positioned just after the latest contract
  // sign event by adding 1 ms.
  if (lifecycle.escrowStatus === 'held') {
    const latestSign = Math.max(
      lifecycle.contractContractorSignedAt
        ? new Date(lifecycle.contractContractorSignedAt).getTime()
        : 0,
      lifecycle.contractHomeownerSignedAt
        ? new Date(lifecycle.contractHomeownerSignedAt).getTime()
        : 0
    );
    events.push({
      id: 'escrow-held',
      ts: latestSign > 0 ? latestSign + 1 : postedTs + 1,
      hasRealTs: false,
      icon: <ShieldCheck size={14} strokeWidth={1.75} />,
      title: 'Payment held in escrow',
      meta: 'Released to the contractor once you approve the work.',
      tone: 'brand',
    });
  }

  // 6. Photo uploads — one event per real photo record
  for (const p of beforePhotos) {
    if (!p.created_at) continue;
    const ts = new Date(p.created_at).getTime();
    if (Number.isNaN(ts)) continue;
    events.push({
      id: `before-${p.id}`,
      ts,
      hasRealTs: true,
      icon: <Camera size={14} strokeWidth={1.75} />,
      title: 'Before photo uploaded',
      meta: formatEventDate(p.created_at),
      tone: 'mute',
    });
  }
  for (const p of afterPhotos) {
    if (!p.created_at) continue;
    const ts = new Date(p.created_at).getTime();
    if (Number.isNaN(ts)) continue;
    events.push({
      id: `after-${p.id}`,
      ts,
      hasRealTs: true,
      icon: <Camera size={14} strokeWidth={1.75} />,
      title: 'After photo uploaded',
      meta: formatEventDate(p.created_at),
      tone: 'ok',
    });
  }

  // 7. Job completion — real timestamp when set
  if (job.completed_at) {
    const ts = new Date(job.completed_at).getTime();
    if (!Number.isNaN(ts)) {
      events.push({
        id: 'completed',
        ts,
        hasRealTs: true,
        icon: <CheckCircle2 size={14} strokeWidth={1.75} />,
        title: 'Contractor marked the job complete',
        meta: formatEventDate(job.completed_at),
        tone: 'ok',
      });
    }
  }

  // 8. Homeowner approval — no timestamp; render only when set.
  // When job.completed_at exists we anchor right after it; otherwise
  // use a deterministic sentinel (postedTs + a large constant) so the
  // event sorts to the "current" position without calling Date.now()
  // (which would be an impure call during render).
  const NOW_SENTINEL = postedTs + 365 * 24 * 60 * 60 * 1000; // +1 year
  if (lifecycle.completionConfirmed) {
    const completedTs = job.completed_at
      ? new Date(job.completed_at).getTime()
      : NOW_SENTINEL;
    events.push({
      id: 'approved',
      ts: completedTs + 1,
      hasRealTs: false,
      icon: <Sparkles size={14} strokeWidth={1.75} />,
      title: 'You approved the work',
      meta: 'Payment will release within 24h.',
      tone: 'brand',
    });
  }

  // 9. Payment released — final event when escrow is settled
  if (
    lifecycle.escrowStatus === 'released' ||
    lifecycle.escrowStatus === 'completed'
  ) {
    const baseTs = job.completed_at
      ? new Date(job.completed_at).getTime() + 2
      : NOW_SENTINEL + 2;
    events.push({
      id: 'released',
      ts: baseTs,
      hasRealTs: false,
      icon: <ShieldCheck size={14} strokeWidth={1.75} />,
      title: 'Payment released to the contractor',
      meta: 'Funds delivered out of escrow.',
      tone: 'ok',
    });
  }

  // Sort chronologically — newest first so the latest event leads.
  events.sort((a, b) => b.ts - a.ts);

  return (
    <div className='card'>
      <div
        className='between'
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--me-line-2)',
        }}
      >
        <div className='col' style={{ gap: 2 }}>
          <h2 className='t-h3'>Timeline</h2>
          <span className='t-meta'>
            Everything that&apos;s happened on this job, newest first.
          </span>
        </div>
        <span className='badge badge-mute'>
          {events.length} {events.length === 1 ? 'event' : 'events'}
        </span>
      </div>
      <div>
        {events.map((e, i) => (
          <div
            key={e.id}
            className='row'
            style={{
              padding: '14px 20px',
              borderTop: i ? '1px solid var(--me-line-2)' : 0,
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            <span
              style={{
                width: 30,
                height: 30,
                borderRadius: 9,
                background:
                  e.tone === 'brand'
                    ? 'var(--me-brand-soft)'
                    : e.tone === 'ok'
                      ? 'var(--me-ok-bg)'
                      : 'var(--me-bg-2)',
                color:
                  e.tone === 'brand'
                    ? 'var(--me-brand)'
                    : e.tone === 'ok'
                      ? 'var(--me-ok-fg)'
                      : 'var(--me-ink-2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              {e.icon}
            </span>
            <div className='col' style={{ gap: 3, flex: 1, minWidth: 0 }}>
              <h3 className='t-h4' style={{ fontSize: 14, fontWeight: 600 }}>
                {e.title}
              </h3>
              {e.meta ? (
                <span className='t-meta' style={{ fontSize: 12 }}>
                  {e.meta}
                </span>
              ) : null}
            </div>
            {!e.hasRealTs ? (
              <span
                className='t-meta'
                style={{
                  fontSize: 11,
                  alignSelf: 'flex-start',
                  marginTop: 4,
                }}
                title='Derived from the current job state — no separate event timestamp'
              >
                <Clock size={11} strokeWidth={1.75} /> derived
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
