'use client';
import { useEffect, useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';

type RecordReview = {
  kind: 'contract' | 'dispute';
  id: string;
  revision: number;
  legal_hold: boolean;
  reason: string;
  review_due_at: string;
};
type Decision = {
  kind: RecordReview['kind'];
  id: string;
  revision: number;
  legalHold: boolean;
  reason: string;
  reviewDueAt: string;
};
export default function EvidenceRetentionPage() {
  const [records, setRecords] = useState<RecordReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [pending, setPending] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [next, setNext] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const moreLock = useRef(false);
  const moreAbort = useRef<AbortController | null>(null);
  const lock = useRef(false);
  useEffect(() => () => moreAbort.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    fetch('/api/admin/evidence-retention', { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.records))
          throw new Error('Unable to load reviews.');
        if (controller.signal.aborted) return;
        setRecords(data.records);
        setNext(typeof data.next === 'string' ? data.next : null);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError('Unable to load reviews. Please retry.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [retry]);
  async function loadMore() {
    if (!next || moreLock.current || lock.current) return;
    moreLock.current = true;
    setLoadingMore(true);
    setError('');
    const controller = new AbortController();
    moreAbort.current = controller;
    try {
      const response = await fetch(`/api/admin/evidence-retention?${next}`, {
        signal: controller.signal,
      });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.records))
        throw new Error('Unable to load more reviews. Retry below.');
      if (controller.signal.aborted) return;
      setRecords((existing) => {
        const keys = new Set(existing.map((row) => `${row.kind}:${row.id}`));
        return [
          ...existing,
          ...data.records.filter(
            (row: RecordReview) => !keys.has(`${row.kind}:${row.id}`)
          ),
        ];
      });
      setNext(typeof data.next === 'string' ? data.next : null);
    } catch {
      if (!controller.signal.aborted)
        setError(
          'Unable to load more reviews. Your entered decisions are preserved. Retry below.'
        );
    } finally {
      moreLock.current = false;
      if (!controller.signal.aborted) setLoadingMore(false);
    }
  }
  async function save(decision: Decision) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchWithCsrf('/api/admin/evidence-retention', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(decision),
      });
      const data = await response.json();
      if (response.status === 403 && data.requiresStepUp) {
        setPending(decision);
        return;
      }
      if (!response.ok || data.success !== true)
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ||
                'Review not confirmed. Reload before retrying.'
        );
      setRecords((values) =>
        values.map((row) =>
          row.id === decision.id && row.kind === decision.kind
            ? {
                ...row,
                revision: data.revision,
                legal_hold: decision.legalHold,
                reason: decision.reason,
                review_due_at: decision.reviewDueAt,
              }
            : row
        )
      );
      setMessage('Review saved. Evidence remains retained.');
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Review not confirmed.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className='mx-auto max-w-4xl space-y-5 p-6'>
      <h1 className='text-2xl font-semibold'>Evidence retention reviews</h1>
      <p>
        Review retained contracts and dispute records. A hold records an
        obligation to preserve evidence. Review dates never trigger automatic
        deletion. Records are loaded oldest archive first, in batches of up to
        50 contracts and 50 disputes. Changing a review date does not move a
        record between batches.
      </p>
      <p>
        Include the purpose and case reference in your reason. Review holds
        within 90 days; other decisions within one year. Releasing a hold does
        not delete the record.
      </p>
      {error && <p role='alert'>{error}</p>}
      {message && <p role='status'>{message}</p>}
      <button
        className='underline'
        disabled={loading || loadingMore || busy || !!pending}
        onClick={() => setRetry((value) => value + 1)}
      >
        Reload reviews
      </button>
      {loading ? (
        <p role='status'>Loading reviews…</p>
      ) : !error && !records.length ? (
        <p>No retained records to review.</p>
      ) : (
        records.map((row) => (
          <form
            key={`${row.kind}:${row.id}:${row.revision}`}
            className='space-y-3 rounded-xl border p-4'
            onSubmit={(event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              void save({
                kind: row.kind,
                id: row.id,
                revision: row.revision,
                legalHold: fields.get('hold') === 'on',
                reason: String(fields.get('reason')),
                reviewDueAt: new Date(
                  `${fields.get('date')}T12:00:00Z`
                ).toISOString(),
              });
            }}
          >
            <h2 className='font-semibold'>
              {row.kind === 'contract' ? 'Contract' : 'Dispute'} record
            </h2>
            <p className='break-all text-sm'>Reference: {row.id}</p>
            <p>
              Review due:{' '}
              {new Date(row.review_due_at).toLocaleDateString('en-GB')} ·{' '}
              {row.revision ? 'Previously reviewed' : 'Not yet reviewed'}
            </p>
            <label className='block'>
              Reason for retention or hold
              <textarea
                className='block w-full rounded border p-2'
                name='reason'
                required
                minLength={10}
                maxLength={1000}
                defaultValue={row.reason}
              />
            </label>
            <label className='block'>
              Next review date
              <input
                className='ml-3 rounded border p-2'
                type='date'
                name='date'
                required
              />
            </label>
            <label className='block'>
              <input
                type='checkbox'
                name='hold'
                defaultChecked={row.legal_hold}
              />{' '}
              Preserve under a hold
            </label>
            <button
              className='rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50'
              disabled={busy || !!pending}
            >
              Save review
            </button>
          </form>
        ))
      )}
      {next && !loading && (
        <button
          className='rounded border px-4 py-2 disabled:opacity-50'
          disabled={loadingMore || busy || !!pending}
          onClick={() => void loadMore()}
        >
          {loadingMore ? 'Loading more reviews…' : 'Load more reviews'}
        </button>
      )}
      {pending && (
        <MfaStepUpDialog
          onCancel={() => setPending(null)}
          onSuccess={() => {
            const decision = pending;
            setPending(null);
            void save(decision);
          }}
        />
      )}
    </main>
  );
}
