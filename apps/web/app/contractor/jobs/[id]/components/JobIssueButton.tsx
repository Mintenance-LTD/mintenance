'use client';

/**
 * JobIssueButton — sibling action to "Start work" / "I'm running
 * late" on the `/contractor/jobs/[id]` stage action card.
 *
 * Opens a small modal where the contractor picks an issue category
 * + writes a description. On submit:
 *   1. Posts a templated message to the job thread so the homeowner
 *      sees it in chat (with push notification via existing
 *      pipeline).
 *   2. If escrow is funded (i.e. dispute API is callable) and the
 *      issue is "blocker" severity, also POSTs to
 *      `/api/disputes/create` so the platform tracks it formally.
 *
 * For non-blocker issues (e.g. "Wrong access info", "Need to
 * reschedule") we keep it as a chat message — most are resolved
 * via conversation without needing the formal dispute machinery.
 */

import React, { useState } from 'react';
import { AlertOctagon, Loader2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';

interface JobIssueButtonProps {
  jobId: string;
  /**
   * Escrow ID to attach a formal dispute to. When present + the
   * selected reason is a "blocker" we'll create a dispute alongside
   * the chat message. When absent we just post the message.
   */
  escrowId?: string | null;
}

const REASONS = [
  { key: 'access', label: 'Can&apos;t access the property', blocker: false },
  {
    key: 'scope',
    label: 'Work scope is different from what was described',
    blocker: false,
  },
  { key: 'reschedule', label: 'Need to reschedule', blocker: false },
  {
    key: 'safety',
    label: 'Health & safety concern on site',
    blocker: true,
  },
  {
    key: 'payment',
    label: 'Payment / escrow issue',
    blocker: true,
  },
  { key: 'other', label: 'Something else', blocker: false },
] as const;

type ReasonKey = (typeof REASONS)[number]['key'];

export function JobIssueButton({ jobId, escrowId }: JobIssueButtonProps) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReasonKey>('access');
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (submitting) return;
    if (details.trim().length < 10) {
      toast.error('Please add a few details so the homeowner can help.');
      return;
    }
    setSubmitting(true);
    try {
      const selectedReason = REASONS.find((r) => r.key === reason)!;
      const heading = `Issue: ${selectedReason.label.replace(/&apos;/g, "'")}`;
      const lines = [heading, '', details.trim()];

      const csrf = await getCsrfHeaders();

      // Always post a message in the thread so the homeowner sees
      // it in chat. This is the most reliable channel.
      const msgRes = await fetch(`/api/messages/threads/${jobId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrf },
        credentials: 'include',
        body: JSON.stringify({
          content: lines.join('\n'),
          messageType: 'text',
        }),
      });
      if (!msgRes.ok) {
        const body = await msgRes.json().catch(() => ({ error: 'Failed' }));
        throw new Error(body.error || 'Failed to send message');
      }

      // For blocker-severity issues with escrow funded, also create
      // a formal dispute so support has a tracking record. Wrapped
      // in its own try so a dispute-API failure doesn't undo the
      // message we already posted.
      if (selectedReason.blocker && escrowId) {
        try {
          await fetch('/api/disputes/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...csrf },
            credentials: 'include',
            body: JSON.stringify({
              escrowId,
              reason: selectedReason.label.replace(/&apos;/g, "'"),
              description: details.trim(),
              priority: reason === 'safety' ? 'critical' : 'high',
            }),
          });
        } catch (err) {
          logger.error('Issue message posted but dispute creation failed', err);
          // Non-fatal — homeowner still sees the chat message.
        }
      }

      toast.success('Homeowner notified');
      setOpen(false);
      setDetails('');
    } catch (err) {
      logger.error('Error reporting job issue', err);
      toast.error(
        err instanceof Error ? err.message : 'Failed to report issue'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        type='button'
        onClick={() => setOpen(true)}
        className='btn btn-ghost btn-sm'
        style={{ color: 'var(--me-err)' }}
      >
        <AlertOctagon size={13} strokeWidth={1.75} />
        Issue with this job
      </button>

      {open ? (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 16,
          }}
          onClick={() => !submitting && setOpen(false)}
        >
          <div
            className='card card-pad'
            style={{ maxWidth: 480, width: '100%' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className='col' style={{ gap: 14 }}>
              <div className='between' style={{ alignItems: 'center' }}>
                <h3 className='t-h3' style={{ margin: 0 }}>
                  Report an issue
                </h3>
                <button
                  type='button'
                  className='btn btn-ghost btn-sm'
                  onClick={() => !submitting && setOpen(false)}
                  aria-label='Close'
                  disabled={submitting}
                >
                  <X size={14} strokeWidth={1.75} />
                </button>
              </div>

              <p className='t-body' style={{ fontSize: 13 }}>
                Tell the homeowner what&apos;s blocking you. Most issues resolve
                over chat. Safety + payment concerns also create a formal
                dispute so support can step in.
              </p>

              <div className='col' style={{ gap: 6 }}>
                <span className='t-meta' style={{ fontWeight: 600 }}>
                  What&apos;s the issue?
                </span>
                <div className='col' style={{ gap: 4 }}>
                  {REASONS.map((r) => (
                    <label
                      key={r.key}
                      className='row'
                      style={{
                        gap: 10,
                        alignItems: 'center',
                        cursor: 'pointer',
                        padding: '6px 8px',
                        borderRadius: 6,
                        background:
                          reason === r.key
                            ? 'var(--me-brand-soft)'
                            : 'transparent',
                      }}
                    >
                      <input
                        type='radio'
                        name='issue-reason'
                        value={r.key}
                        checked={reason === r.key}
                        onChange={() => setReason(r.key)}
                      />
                      <span style={{ fontSize: 13 }}>
                        {r.label.replace(/&apos;/g, "'")}
                      </span>
                      {r.blocker ? (
                        <span
                          className='badge badge-err'
                          style={{ marginLeft: 'auto' }}
                        >
                          Blocker
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>

              <div className='col' style={{ gap: 6 }}>
                <label
                  htmlFor='issue-details'
                  className='t-meta'
                  style={{ fontWeight: 600 }}
                >
                  Details (minimum 10 chars)
                </label>
                <textarea
                  id='issue-details'
                  className='field'
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder='Be specific — what happened, what do you need from the homeowner, when does it block your work?'
                  rows={4}
                  maxLength={2000}
                  style={{ resize: 'vertical', fontFamily: 'inherit' }}
                />
              </div>

              <div
                className='row'
                style={{ gap: 8, justifyContent: 'flex-end' }}
              >
                <button
                  type='button'
                  className='btn btn-secondary btn-sm'
                  onClick={() => setOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  className='btn btn-primary btn-sm'
                  onClick={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <Loader2
                      size={13}
                      strokeWidth={1.75}
                      className='animate-spin'
                    />
                  ) : null}
                  Send to homeowner
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
