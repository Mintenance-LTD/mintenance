'use client';
import { useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  emailReviewPage,
  emailReviewRequest,
  emailReviewResult,
  type EmailReviewRequest,
  type EmailReviewRow,
} from '@/lib/operations/quote-amendment-email-review';

const endpoint = '/api/admin/quote-amendment-emails';
const labels = {
  retry: 'Queue another attempt',
  confirm_accepted: 'Record provider acceptance',
  close_unknown: 'Close with delivery unknown',
};
export function QuoteAmendmentEmailReview() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'open' | 'reviewed'>('open');
  const [cursors, setCursors] = useState<(number | null)[]>([null]);
  const [selected, setSelected] = useState<EmailReviewRow | null>(null);
  const [action, setAction] =
    useState<EmailReviewRequest['action']>('close_unknown');
  const [evidence, setEvidence] =
    useState<EmailReviewRequest['evidence']>('unknown');
  const [note, setNote] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pending, setPending] = useState<EmailReviewRequest | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const lock = useRef(false);
  const before = cursors[cursors.length - 1];
  const query = useQuery({
    queryKey: ['admin', 'quote-amendment-emails', view, before],
    enabled: open,
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${endpoint}?view=${view}${before ? `&before=${before}` : ''}`,
        { signal, cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Email recovery could not be loaded.');
      return emailReviewPage.parse(await response.json());
    },
  });
  const history = useQuery({
    queryKey: [
      'admin',
      'quote-amendment-email-history',
      selected?.amendment_id,
      selected?.version,
      selected?.review_version,
    ],
    enabled: open && Boolean(selected),
    retry: false,
    queryFn: async ({ signal }) => {
      const response = await fetch(
        `${endpoint}?amendment_id=${selected!.amendment_id}&version=${selected!.version}`,
        { signal, cache: 'no-store' }
      );
      if (!response.ok) throw new Error('Review history unavailable.');
      return z
        .object({ reviews: z.array(emailReviewResult) })
        .parse(await response.json()).reviews;
    },
  });
  const reset = () => {
    setSelected(null);
    setPending(null);
    setBlocked(false);
    setNote('');
    setConfirmed(false);
    setError('');
    setMessage('');
  };
  const refresh = () => {
    if (lock.current) return;
    if (
      pending &&
      !blocked &&
      !window.confirm(
        'The review may already be saved. Reload the queue and inspect its history before submitting a new review?'
      )
    )
      return;
    reset();
    void query.refetch();
  };
  const save = async () => {
    if (lock.current || blocked || !selected) return;
    const input =
      pending ??
      emailReviewRequest.safeParse({
        request_id: crypto.randomUUID(),
        amendment_id: selected.amendment_id,
        version: selected.version,
        expected_review_version: selected.review_version,
        action,
        evidence,
        note,
        confirmed,
      });
    const body =
      pending ?? ('success' in input && input.success ? input.data : null);
    if (!body) {
      setError(
        'Confirm the action, matching evidence and a note of 20 to 2,000 characters.'
      );
      return;
    }
    lock.current = true;
    setSaving(true);
    setPending(body);
    setError('');
    setMessage('');
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if ([400, 401, 403, 404, 409].includes(response.status)) {
          setBlocked(true);
          throw new Error(
            'Review unavailable or changed. Refresh and check the current record before continuing.'
          );
        }
        throw new Error(
          'Save outcome is uncertain. Retry the same review or reload its history.'
        );
      }
      const parsed = emailReviewResult.safeParse(
        (await response.json()).review
      );
      if (!parsed.success)
        throw new Error(
          'Saved review could not be confirmed. Retry the same review.'
        );
      const result = parsed.data;
      if (
        result.request_id !== body.request_id ||
        result.amendment_id !== body.amendment_id ||
        result.version !== body.version ||
        result.action !== body.action ||
        result.evidence !== body.evidence ||
        result.note !== body.note ||
        result.result_status !==
          {
            retry: 'pending',
            confirm_accepted: 'reviewed_accepted',
            close_unknown: 'reviewed_unknown',
          }[body.action] ||
        result.review_version !== body.expected_review_version + 1
      )
        throw new Error(
          'Saved review could not be confirmed. Retry the same review.'
        );
      reset();
      setMessage(
        body.action === 'retry'
          ? 'Retry queued. The worker will recheck the recipient and preferences; no email was sent by this review.'
          : body.action === 'confirm_accepted'
            ? 'Provider acceptance recorded from your evidence. Inbox delivery is not established.'
            : 'Review recorded with delivery unknown. No email will be resent.'
      );
      // A failed refresh must not turn a committed review into a failed mutation.
      await Promise.allSettled([
        client.invalidateQueries({
          queryKey: ['admin', 'quote-amendment-emails'],
        }),
        client.invalidateQueries({
          queryKey: ['admin', 'quote-amendment-email-history'],
        }),
        client.invalidateQueries({ queryKey: ['admin', 'recovery-health'] }),
      ]);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Review could not be confirmed. Retry the same review.'
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  };
  const frozen = saving || Boolean(pending);
  return (
    <div className='mt-6 border-t border-slate-200 pt-4'>
      <button
        type='button'
        className='min-h-12 underline'
        aria-expanded={open}
        disabled={saving}
        onClick={() => setOpen(!open)}
      >
        Review quote amendment emails
      </button>
      {open && (
        <div className='space-y-4'>
          <p className='text-sm text-slate-700'>
            Review failed or uncertain sends using provider records. Acceptance
            is not inbox delivery. Never retry an uncertain send without
            evidence it was not accepted. Expired sending leases enter review
            when the worker recovers them.
          </p>
          <div className='flex flex-wrap gap-3'>
            <label>
              Queue{' '}
              <select
                aria-label='Email review queue'
                className='min-h-12 rounded border p-2'
                value={view}
                disabled={frozen}
                onChange={(e) => {
                  reset();
                  setView(e.target.value as typeof view);
                  setCursors([null]);
                }}
              >
                <option value='open'>Needs review</option>
                <option value='reviewed'>Reviewed events and retries</option>
              </select>
            </label>
            <button
              type='button'
              className='min-h-12 rounded border px-3'
              disabled={saving || query.isFetching}
              onClick={refresh}
            >
              Refresh email reviews
            </button>
          </div>
          {message && <p role='status'>{message}</p>}
          {error && (
            <p role='alert' className='text-red-700'>
              {error}
            </p>
          )}
          {query.isError ? (
            <p role='alert'>
              Email recovery could not be verified. Refresh to retry; older
              results cannot be used.
            </p>
          ) : query.isPending ? (
            <p role='status'>Loading email reviews…</p>
          ) : (
            <>
              {!query.data?.rows.length && <p>No emails in this queue.</p>}
              <ul className='space-y-3'>
                {query.data?.rows.map((row) => (
                  <li
                    key={`${row.amendment_id}:${row.version}`}
                    className='rounded border p-3 text-sm'
                  >
                    <p>
                      {row.action} · {row.status.replace(/_/g, ' ')} ·{' '}
                      {row.attempts} attempt(s) in this cycle
                    </p>
                    <p className='break-words'>
                      Amendment {row.amendment_id}, event {row.version}
                    </p>
                    <p>
                      {new Date(row.created_at).toLocaleString('en-GB')} ·{' '}
                      {row.error_code || 'No failure code'}
                    </p>
                    <button
                      type='button'
                      className='min-h-12 underline'
                      disabled={frozen}
                      onClick={() => {
                        setSelected(row);
                        setNote('');
                        setConfirmed(false);
                        setError('');
                        setAction('close_unknown');
                        setEvidence('unknown');
                      }}
                    >
                      Inspect email event {row.version}
                    </button>
                  </li>
                ))}
              </ul>
              <div className='flex gap-3'>
                <button
                  type='button'
                  className='min-h-12 rounded border px-3'
                  disabled={frozen || cursors.length === 1}
                  onClick={() => {
                    reset();
                    setCursors(cursors.slice(0, -1));
                  }}
                >
                  Previous page
                </button>
                <button
                  type='button'
                  className='min-h-12 rounded border px-3'
                  disabled={frozen || !query.data?.next_before}
                  onClick={() => {
                    reset();
                    setCursors([...cursors, query.data!.next_before]);
                  }}
                >
                  Older emails
                </button>
              </div>
            </>
          )}
          {selected && !query.isError && (
            <section
              aria-label='Selected email review'
              className='space-y-3 rounded border p-4'
            >
              <h3 className='font-semibold'>
                Email event {selected.version}: operator review
              </h3>
              <p className='break-words text-sm'>
                Job {selected.job_id}. Evidence references only; do not paste
                customer messages, addresses or financial details.
              </p>
              {history.isError ? (
                <p role='alert'>
                  Review history unavailable.{' '}
                  <button
                    className='min-h-12 underline'
                    onClick={() => void history.refetch()}
                  >
                    Retry history
                  </button>
                </p>
              ) : history.isPending ? (
                <p>Loading history…</p>
              ) : (
                <div>
                  <p className='text-sm'>Latest 20 reviews (newest first)</p>
                  {!history.data?.length && <p>No previous reviews.</p>}
                  {history.data?.map((r) => (
                    <p key={r.request_id} className='break-words text-sm'>
                      {new Date(r.created_at).toLocaleString('en-GB')} ·{' '}
                      {labels[r.action]} · {r.previous_attempts} previous
                      attempts · {r.note}
                    </p>
                  ))}
                </div>
              )}
              {['failed', 'needs_review'].includes(selected.status) && (
                <>
                  <label className='block'>
                    Review action
                    <select
                      aria-label='Review action'
                      className='block min-h-12 w-full rounded border p-2'
                      value={action}
                      disabled={frozen}
                      onChange={(e) => {
                        setAction(e.target.value as typeof action);
                        setConfirmed(false);
                      }}
                    >
                      {Object.entries(labels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className='block'>
                    Provider evidence
                    <select
                      aria-label='Provider evidence'
                      className='block min-h-12 w-full rounded border p-2'
                      value={evidence}
                      disabled={frozen}
                      onChange={(e) => {
                        setEvidence(e.target.value as typeof evidence);
                        setConfirmed(false);
                      }}
                    >
                      <option value='unknown'>Outcome remains unknown</option>
                      <option value='not_accepted'>
                        Not accepted or never submitted
                      </option>
                      <option value='accepted'>
                        Provider acceptance confirmed
                      </option>
                    </select>
                  </label>
                  <label className='block'>
                    Evidence reference and review note
                    <textarea
                      aria-label='Evidence reference and review note'
                      className='block min-h-24 w-full rounded border p-2'
                      maxLength={2000}
                      value={note}
                      disabled={frozen}
                      onChange={(e) => setNote(e.target.value)}
                    />
                  </label>
                  <label className='flex min-h-12 items-center gap-2'>
                    <input
                      type='checkbox'
                      checked={confirmed}
                      disabled={frozen}
                      onChange={(e) => setConfirmed(e.target.checked)}
                    />
                    I checked the evidence and confirm this review action.
                  </label>
                  <button
                    type='button'
                    className='min-h-12 rounded border px-4 disabled:opacity-50'
                    disabled={
                      saving ||
                      blocked ||
                      history.isError ||
                      history.isPending ||
                      (!pending && (!confirmed || note.trim().length < 20))
                    }
                    onClick={() => void save()}
                  >
                    {saving
                      ? 'Saving review…'
                      : pending
                        ? 'Retry same review'
                        : labels[action]}
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
