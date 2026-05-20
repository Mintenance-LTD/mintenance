'use client';

/**
 * Mint Editorial "Track resolution" surface — canonical from
 * design-system/project/redesign-v2/dispute-flow.html lines 159-233.
 *
 * Two-column layout: conversation thread on the left (color-coded
 * sides — homeowner blue / contractor amber / Mint trust brand),
 * proposed-resolution panel + status checklist on the right.
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Check, Loader2 } from 'lucide-react';
import { getCsrfToken } from '@/lib/csrf-client';
import { StepStrip } from '../components/StepStrip';

interface DisputeTimelineEntry {
  status: string;
  timestamp: string;
  description: string;
}

interface Dispute {
  status: string;
  priority: string;
  sla_deadline?: string;
  dispute_reason?: string;
  dispute_evidence?: unknown[];
  created_at?: string;
  mediation_requested_at?: string;
  resolved_at?: string;
  resolution?: string;
}

interface Props {
  disputeId: string;
  dispute: Dispute;
  timeline: DisputeTimelineEntry[];
}

function deriveStep(dispute: Dispute): 0 | 1 | 2 | 3 {
  if (dispute.resolved_at) return 3;
  if (dispute.mediation_requested_at) return 2;
  if ((dispute.dispute_evidence?.length || 0) > 0) return 1;
  return 0;
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'resolved' || s === 'closed') return 'badge badge-ok';
  if (s === 'open' || s === 'disputed') return 'badge badge-warn';
  if (s === 'mediating' || s === 'review') return 'badge badge-info';
  return 'badge badge-mute';
}

function fmtRelativeDays(iso: string | undefined): string {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return 'today';
  if (days === 1) return '1 day';
  return `${days} days`;
}

export function MintEditorialDisputeDetail({
  disputeId,
  dispute,
  timeline,
}: Props) {
  const router = useRouter();
  const [mediating, setMediating] = useState(false);
  const step = deriveStep(dispute);

  const handleRequestMediation = async () => {
    setMediating(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/disputes/${disputeId}/mediation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(csrfToken ? { 'x-csrf-token': csrfToken } : {}),
        },
        body: JSON.stringify({ action: 'request' }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error?.message || data.error || 'Failed to request mediation'
        );
      }
      toast.success(
        'Mediation requested. An admin will review and contact you.'
      );
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to request mediation'
      );
    } finally {
      setMediating(false);
    }
  };

  // Build a canonical "Status" checklist from the timeline entries we
  // already have, padding out the four canonical states. Items past
  // the current step render done with a Check; everything else is a
  // dotted placeholder.
  const checklist: { label: string; ts: string; done: boolean }[] = [
    {
      label: 'Dispute opened',
      ts: dispute.created_at || '—',
      done: true,
    },
    {
      label: 'Mediation requested',
      ts: dispute.mediation_requested_at || 'Pending',
      done: !!dispute.mediation_requested_at,
    },
    {
      label: 'Mint trust on the case',
      ts: dispute.mediation_requested_at ? 'Active' : 'Pending',
      done: step >= 2,
    },
    {
      label: 'Resolved & closed',
      ts: dispute.resolved_at || '—',
      done: !!dispute.resolved_at,
    },
  ];

  const isUnderReview = step === 2 && !dispute.resolved_at;

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <Link
        href='/dashboard'
        style={{
          fontSize: 12,
          color: 'var(--me-ink-3)',
          textDecoration: 'none',
        }}
      >
        ← Back to dashboard
      </Link>
      <div className='row' style={{ marginTop: 10, gap: 10, marginBottom: 6 }}>
        <span className={statusBadgeClass(dispute.status)}>
          {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
          {dispute.created_at
            ? ` · ${fmtRelativeDays(dispute.created_at)}`
            : ''}
          {dispute.mediation_requested_at ? ' · Mint mediating' : ''}
        </span>
        <span className='t-meta'>
          DSP-{disputeId.slice(0, 8).toUpperCase()}
        </span>
      </div>
      <h1 className='t-h1' style={{ marginBottom: 6, fontSize: 36 }}>
        Dispute{' '}
        {isUnderReview ? (
          <>
            — under <em style={{ color: 'var(--me-brand)' }}>review</em>.
          </>
        ) : dispute.resolved_at ? (
          <>
            — <em style={{ color: 'var(--me-brand)' }}>resolved</em>.
          </>
        ) : (
          <>opened.</>
        )}
      </h1>
      <p
        className='t-body'
        style={{ marginBottom: 22, maxWidth: 600, lineHeight: 1.55 }}
      >
        {dispute.resolved_at
          ? 'This case is closed. Reach out if you need anything else.'
          : isUnderReview
            ? "Our trust team is on it. We'll message you the moment there's a decision."
            : "Your statement is in. We'll let you know when the contractor responds or when mediation is needed."}
      </p>

      <StepStrip on={step} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.5fr) minmax(0, 1fr)',
          gap: 22,
        }}
      >
        <div className='col' style={{ gap: 16 }}>
          <div className='card card-pad-lg'>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 12 }}>
              Timeline · {timeline.length}{' '}
              {timeline.length === 1 ? 'entry' : 'entries'}
            </div>
            <div className='col' style={{ gap: 10 }}>
              {timeline.length === 0 ? (
                <p className='t-body'>
                  No timeline entries yet. Activity will show here as the case
                  progresses.
                </p>
              ) : (
                timeline.map((item, i) => (
                  <div
                    key={i}
                    style={{
                      padding: 14,
                      background: 'var(--me-bg-2)',
                      borderRadius: 12,
                      borderLeft: '3px solid var(--me-info-fg)',
                    }}
                  >
                    <div
                      className='row'
                      style={{ gap: 8, marginBottom: 4, fontSize: 12 }}
                    >
                      <b>{item.status}</b>
                      <span className='t-meta' style={{ marginLeft: 'auto' }}>
                        {new Date(item.timestamp).toLocaleString('en-GB', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: 'var(--me-ink-2)',
                        lineHeight: 1.55,
                      }}
                    >
                      {item.description}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {dispute.dispute_reason ? (
            <div className='card card-pad'>
              <div className='t-eyebrow' style={{ marginBottom: 8 }}>
                Reason
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: 'var(--me-ink-2)',
                  lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {dispute.dispute_reason}
              </div>
              {Array.isArray(dispute.dispute_evidence) &&
              dispute.dispute_evidence.length > 0 ? (
                <div className='t-meta' style={{ marginTop: 8 }}>
                  {dispute.dispute_evidence.length} evidence{' '}
                  {dispute.dispute_evidence.length === 1 ? 'item' : 'items'}{' '}
                  attached
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className='col' style={{ gap: 14 }}>
          {!dispute.resolved_at && !dispute.mediation_requested_at ? (
            <div
              className='card card-pad'
              style={{ borderColor: 'var(--me-brand)', borderWidth: 1.5 }}
            >
              <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                Need a referee?
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--me-ink-2)',
                  lineHeight: 1.55,
                  marginBottom: 14,
                }}
              >
                If you and the contractor can't agree, Mint's trust team steps
                in. Decisions are usually made within 5 days.
              </div>
              <button
                type='button'
                className='btn btn-primary'
                onClick={handleRequestMediation}
                disabled={mediating}
                style={{ justifyContent: 'center', width: '100%' }}
              >
                {mediating ? (
                  <Loader2
                    size={16}
                    strokeWidth={1.75}
                    className='animate-spin'
                  />
                ) : (
                  'Request mediation'
                )}
              </button>
            </div>
          ) : null}

          <div className='card card-pad'>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              Status
            </div>
            <div className='col' style={{ gap: 14, fontSize: 13 }}>
              {checklist.map((row, i) => (
                <div key={i} className='row' style={{ gap: 10 }}>
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9999,
                      background: row.done
                        ? 'var(--me-brand)'
                        : 'var(--me-bg-2)',
                      color: row.done
                        ? 'var(--me-on-brand)'
                        : 'var(--me-ink-3)',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                    }}
                  >
                    {row.done ? (
                      <Check size={12} strokeWidth={2} />
                    ) : (
                      <span style={{ fontSize: 10 }}>•</span>
                    )}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      color: row.done ? 'var(--me-ink)' : 'var(--me-ink-3)',
                    }}
                  >
                    {row.label}
                  </div>
                  <div className='t-meta'>
                    {row.ts && row.ts !== '—' && row.ts !== 'Pending'
                      ? new Date(row.ts).toLocaleDateString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                        })
                      : row.ts}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {dispute.sla_deadline ? (
            <div className='card card-pad'>
              <div className='t-eyebrow' style={{ marginBottom: 6 }}>
                SLA deadline
              </div>
              <div style={{ fontSize: 14, color: 'var(--me-ink-2)' }}>
                Decision target:{' '}
                <b>
                  {new Date(dispute.sla_deadline).toLocaleDateString('en-GB', {
                    weekday: 'short',
                    day: 'numeric',
                    month: 'short',
                  })}
                </b>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
