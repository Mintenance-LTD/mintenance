'use client';

/**
 * Mint Editorial "Open dispute" surface — canonical from
 * design-system/project/redesign-v2/dispute-flow.html lines 60-156.
 *
 * Stays self-contained inside the existing `/disputes/create/page.tsx`
 * theme branch. Mounts inside HomeownerPageWrapper (the parent
 * /disputes/layout.tsx already wraps in the universal shell).
 */

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, Plus, Loader2 } from 'lucide-react';
import { StepStrip } from '../components/StepStrip';

const REASONS: {
  id: string;
  apiValue: string;
  title: string;
  description: string;
}[] = [
  {
    id: 'quality',
    apiValue: 'poor_quality',
    title: 'Quality of work',
    description: "Result isn't up to standard or didn't last",
  },
  {
    id: 'incomplete',
    apiValue: 'incomplete_work',
    title: 'Job not finished',
    description: "Contractor didn't complete what was agreed",
  },
  {
    id: 'scope',
    apiValue: 'not_as_described',
    title: 'Wrong scope or extras charged',
    description: "Bill doesn't match the agreed bid",
  },
  {
    id: 'damage',
    apiValue: 'damage',
    title: 'Damage to property',
    description: 'Something was broken or marked',
  },
  {
    id: 'behaviour',
    apiValue: 'other',
    title: 'Behaviour or no-show',
    description: "Contractor was rude, late or didn't turn up",
  },
  {
    id: 'other',
    apiValue: 'other',
    title: 'Something else',
    description: "I'll explain in my own words",
  },
];

const OUTCOMES = [
  'Redo the work, no extra cost',
  'Partial refund',
  'Full refund',
  'Different contractor finishes it',
];

interface Props {
  escrowId: string | null;
  jobTitle?: string;
  escrowAmount?: number;
}

export function MintEditorialDisputeCreate({
  escrowId,
  jobTitle,
  escrowAmount,
}: Props) {
  const router = useRouter();
  const [reasonId, setReasonId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState<string>(OUTCOMES[0]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const charCount = description.length;
  const charMax = 600;

  const handleSubmit = async () => {
    if (!escrowId) {
      setError(
        'Missing escrow reference. Open this page from a job to start a dispute.'
      );
      return;
    }
    const reason = REASONS.find((r) => r.id === reasonId);
    if (!reason || !description.trim()) {
      setError('Pick a reason and add your statement before submitting.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const res = await fetch('/api/disputes/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId,
          reason: reason.apiValue,
          // Stash the canonical outcome + display reason as a meta line
          // at the top of the free-text description so the dispute
          // detail page surfaces them. The API doesn't have dedicated
          // columns yet — follow-up to add `desired_outcome` enum to
          // the disputes schema.
          description: `[Outcome wanted: ${outcome}]\n[Issue: ${reason.title}]\n\n${description}`,
          evidence: [],
          priority: 'medium',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create dispute');
      router.push(`/disputes/${data.disputeId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create dispute');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: 1120, margin: '0 auto' }}>
      <Link
        href='/jobs'
        style={{
          fontSize: 12,
          color: 'var(--me-ink-3)',
          textDecoration: 'none',
        }}
      >
        ← Back to {jobTitle || 'job'}
      </Link>
      <h1
        className='t-h1'
        style={{ marginTop: 8, marginBottom: 6, fontSize: 36 }}
      >
        Something went <em style={{ color: 'var(--me-brand)' }}>wrong.</em> Tell
        us what.
      </h1>
      <p
        className='t-body'
        style={{ marginBottom: 22, maxWidth: 600, lineHeight: 1.55 }}
      >
        Funds for this job are still in escrow. Opening a dispute pauses the
        release while we look into it. Most resolve within 48 hours, no calls
        needed.
      </p>

      <StepStrip on={0} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)',
          gap: 22,
        }}
      >
        <div className='card card-pad-lg'>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 14 }}>
            What's the issue?
          </div>
          <div className='col' style={{ gap: 8 }}>
            {REASONS.map((r) => {
              const on = r.id === reasonId;
              return (
                <label
                  key={r.id}
                  style={{
                    display: 'flex',
                    gap: 12,
                    padding: 14,
                    border:
                      '1.5px solid ' +
                      (on ? 'var(--me-brand)' : 'var(--me-line)'),
                    borderRadius: 12,
                    cursor: 'pointer',
                    background: on
                      ? 'var(--me-brand-soft)'
                      : 'var(--me-surface)',
                  }}
                >
                  <input
                    type='radio'
                    name='reason'
                    checked={on}
                    onChange={() => setReasonId(r.id)}
                    style={{ display: 'none' }}
                  />
                  <div
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: 9999,
                      border:
                        '2px solid ' +
                        (on ? 'var(--me-brand)' : 'var(--me-line)'),
                      display: 'grid',
                      placeItems: 'center',
                      marginTop: 1,
                      flexShrink: 0,
                    }}
                  >
                    {on ? (
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: 9999,
                          background: 'var(--me-brand)',
                        }}
                      />
                    ) : null}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>
                      {r.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: 'var(--me-ink-2)',
                        marginTop: 2,
                      }}
                    >
                      {r.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ marginTop: 22 }}>
            <div
              className='row'
              style={{ alignItems: 'baseline', marginBottom: 8 }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                In your own words
              </div>
              <span className='t-meta' style={{ marginLeft: 'auto' }}>
                {charCount}/{charMax}
              </span>
            </div>
            <textarea
              className='field'
              rows={5}
              maxLength={charMax}
              placeholder='What happened? When did you notice the issue? What would resolve it?'
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              Photo evidence{' '}
              <span className='t-meta' style={{ fontWeight: 400 }}>
                · strongly recommended · coming soon
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: 8,
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className='placeholder-img'
                  style={{
                    height: 80,
                    background:
                      'repeating-linear-gradient(135deg, transparent 0 9px, rgba(0,0,0,0.04) 9px 10px), var(--me-bg-2)',
                    border: '1px solid var(--me-line)',
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--me-ink-3)',
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  EVID {n}
                </div>
              ))}
              <div
                style={{
                  height: 80,
                  border: '1.5px dashed var(--me-line)',
                  borderRadius: 10,
                  display: 'grid',
                  placeItems: 'center',
                  color: 'var(--me-ink-3)',
                  cursor: 'not-allowed',
                  opacity: 0.6,
                }}
                title='Photo evidence upload — coming soon'
              >
                <Plus size={20} strokeWidth={1.75} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: 22 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
              What outcome do you want?
            </div>
            <div className='row' style={{ gap: 6, flexWrap: 'wrap' }}>
              {OUTCOMES.map((o) => (
                <button
                  key={o}
                  type='button'
                  className={'chip ' + (outcome === o ? 'on' : '')}
                  onClick={() => setOutcome(o)}
                >
                  {o}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className='col' style={{ gap: 14 }}>
          <div
            className='card card-pad'
            style={{ borderColor: 'var(--me-brand)', borderWidth: 1.5 }}
          >
            <div className='row' style={{ marginBottom: 10 }}>
              <Sparkles
                size={18}
                strokeWidth={1.75}
                style={{ color: 'var(--me-brand)' }}
              />
              <div style={{ fontWeight: 600, fontSize: 14 }}>
                Mint AI: try mediation first
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                color: 'var(--me-ink-2)',
                lineHeight: 1.55,
                marginBottom: 12,
              }}
            >
              Most quality disputes resolve faster when the contractor offers a
              redo or partial refund — about 70% of similar issues close this
              way without ops involvement. Worth a message before opening a
              formal dispute.
            </div>
            <div className='col' style={{ gap: 6 }}>
              <Link
                href='/messages'
                className='btn btn-secondary btn-sm'
                style={{ justifyContent: 'center' }}
              >
                Message the contractor first
              </Link>
            </div>
          </div>

          <div className='card card-pad'>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              What happens next
            </div>
            <div
              className='col'
              style={{
                gap: 12,
                fontSize: 13,
                color: 'var(--me-ink-2)',
                lineHeight: 1.5,
              }}
            >
              {[
                [
                  escrowAmount
                    ? `£${escrowAmount.toLocaleString('en-GB')} stays in escrow`
                    : 'Funds stay in escrow',
                  'Nothing moves until this is resolved.',
                ],
                [
                  'Contractor has 48h to respond',
                  "They'll see your statement & photos.",
                ],
                [
                  'Mint ops mediates',
                  'Our trust team will reach out if needed.',
                ],
                [
                  'Decision within 5 days',
                  'Refund, redo, split — or fully released.',
                ],
              ].map(([h, b], i) => (
                <div
                  key={i}
                  className='row'
                  style={{ alignItems: 'flex-start', gap: 10 }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 9999,
                      background: 'var(--me-bg-2)',
                      display: 'grid',
                      placeItems: 'center',
                      fontSize: 11,
                      fontWeight: 700,
                      color: 'var(--me-ink-2)',
                      flexShrink: 0,
                    }}
                  >
                    {i + 1}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: 'var(--me-ink)' }}>
                      {h}
                    </div>
                    <div>{b}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {error ? (
            <div
              className='card card-pad'
              style={{
                borderColor: 'var(--me-err-fg)',
                background: 'var(--me-err-bg)',
                color: 'var(--me-err-fg)',
                fontSize: 13,
              }}
            >
              {error}
            </div>
          ) : null}

          <button
            type='button'
            className='btn btn-primary'
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              justifyContent: 'center',
              padding: '14px 0',
              fontSize: 15,
              width: '100%',
            }}
          >
            {submitting ? (
              <Loader2 size={16} strokeWidth={1.75} className='animate-spin' />
            ) : escrowAmount ? (
              `Open dispute · pause £${escrowAmount.toLocaleString('en-GB')}`
            ) : (
              'Open dispute'
            )}
          </button>
          <button
            type='button'
            className='btn btn-ghost'
            style={{ justifyContent: 'center', width: '100%' }}
            onClick={() => router.back()}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
