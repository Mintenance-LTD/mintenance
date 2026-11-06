'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { calculateDraftQuotePricing } from '@mintenance/shared';
import { useConfirm } from '@/components/ui/confirm-dialog';
import type { EditableQuote } from '../edit/components/EditQuoteClient';
import {
  QuotePricingFields,
  readQuotePricing,
  type EditableQuoteItem,
} from '../edit/components/QuotePricingFields';

type Snapshot = {
  title?: string;
  description?: string | null;
  terms?: string | null;
  notes?: string | null;
  valid_until?: string | null;
  status?: string;
  subtotal?: number | null;
  tax_rate?: number | null;
  tax_amount?: number | null;
  total_amount?: number | null;
  line_items?:
    | {
        description?: string;
        item_name?: string;
        quantity?: number;
        unitPrice?: number;
        unit_price?: number;
        total?: number;
      }[]
    | null;
};
type Revision = {
  id: string;
  revision_number: number;
  kind: string;
  reason: string | null;
  actor_id: string | null;
  created_at: string;
  before_snapshot: Snapshot | null;
  after_snapshot: Snapshot | null;
};
const money = (value: number | string | null | undefined) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? 'Not recorded'
    : new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
      }).format(Number(value));
const message = (
  data: { error?: string | { message?: string } },
  fallback: string
) =>
  typeof data?.error === 'string'
    ? data.error
    : data?.error?.message || fallback;

function RecordedSnapshot({
  snapshot,
  label,
}: {
  snapshot: Snapshot | null;
  label: string;
}) {
  return (
    <section className='min-w-0 space-y-2'>
      <h4 className='font-semibold'>{label}</h4>
      {!snapshot ? (
        <p>Not recorded</p>
      ) : (
        <>
          <p>{snapshot.title}</p>
          <p className='whitespace-pre-wrap break-words'>
            {snapshot.description}
          </p>
          <p>Status: {snapshot.status || 'Not recorded'}</p>
          {Array.isArray(snapshot.line_items) &&
          snapshot.line_items.length > 0 ? (
            <ul className='space-y-2'>
              {snapshot.line_items.map((item, index) => (
                <li key={index} className='break-words'>
                  {item.description ||
                    item.item_name ||
                    'Description not recorded'}{' '}
                  — {item.quantity ?? 'Quantity not recorded'} ×{' '}
                  {money(item.unitPrice ?? item.unit_price)} ={' '}
                  {money(item.total)}
                </li>
              ))}
            </ul>
          ) : (
            <p>No item breakdown recorded.</p>
          )}
          <p>Subtotal: {money(snapshot.subtotal)}</p>
          <p>
            Tax: {money(snapshot.tax_amount)} (
            {snapshot.tax_rate ?? 'Not recorded'}%)
          </p>
          <p>Total: {money(snapshot.total_amount)}</p>
          <p className='whitespace-pre-wrap break-words'>
            Terms: {snapshot.terms || 'None recorded'}
          </p>
          <p className='whitespace-pre-wrap break-words'>
            Notes: {snapshot.notes || 'None recorded'}
          </p>
          <p>Valid until: {snapshot.valid_until || 'Not recorded'}</p>
        </>
      )}
    </section>
  );
}

export function QuoteHistoryClient({
  quote: initialQuote,
}: {
  quote: EditableQuote;
}) {
  const [quote] = useState(initialQuote);
  const confirm = useConfirm();
  const router = useRouter();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [next, setNext] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const historyLock = useRef(false);
  const [editing, setEditing] = useState(false);
  const [reason, setReason] = useState('');
  const [tax, setTax] = useState('');
  const [items, setItems] = useState<EditableQuoteItem[]>(() =>
    (Array.isArray(quote.line_items) ? quote.line_items : []).map(
      (item, key) => ({
        key,
        description: item.description ?? item.item_name ?? '',
        quantity: String(item.quantity ?? ''),
        unitPrice: String(item.unitPrice ?? item.unit_price ?? ''),
      })
    )
  );
  const nextKey = useRef(items.length);
  const lock = useRef(false);
  const pending = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const endpoint = `/api/contractor/quotes/${encodeURIComponent(quote.id)}/revisions`;
  const load = useCallback(
    async (before?: number) => {
      if (historyLock.current) return;
      historyLock.current = true;
      setLoading(true);
      setHistoryError('');
      try {
        const response = await fetch(
          `${endpoint}${before ? `?before=${before}` : ''}`,
          { cache: 'no-store' }
        );
        const data = await response.json();
        if (!response.ok || !Array.isArray(data.revisions))
          throw new Error(message(data, 'Could not load history.'));
        setRevisions((current) =>
          before ? [...current, ...data.revisions] : data.revisions
        );
        setNext(data.next_before);
        setLoaded(true);
      } catch (err) {
        setHistoryError(
          err instanceof Error ? err.message : 'Could not load history.'
        );
      } finally {
        historyLock.current = false;
        setLoading(false);
      }
    },
    [endpoint]
  );
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (!editing) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [editing]);
  let preview;
  try {
    preview = calculateDraftQuotePricing(readQuotePricing(items, tax));
  } catch {
    /* Incomplete input is shown on save. */
  }

  const save = async () => {
    if (lock.current || conflict) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (!pending.current) {
        if (!reason.trim())
          throw new Error('Enter the reason for this amendment.');
        const pricing = readQuotePricing(items, tax);
        pending.current = JSON.stringify({
          request_id: crypto.randomUUID(),
          expected_updated_at: quote.updated_at,
          reason: reason.trim(),
          pricing,
        });
      }
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: pending.current,
      });
      const data = await response.json();
      if (response.status === 409) setConflict(true);
      if (response.status === 400) pending.current = null;
      if (!response.ok || !data.success || !data.revision?.id)
        throw new Error(
          message(
            data,
            'Could not confirm the saved proposal. Retry to check the same request.'
          )
        );
      pending.current = null;
      setRetrying(false);
      setEditing(false);
      setSaved(true);
      await load();
    } catch (err) {
      setRetrying(pending.current !== null);
      setError(err instanceof Error ? err.message : 'Could not save proposal.');
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };

  return (
    <main className='mx-auto max-w-5xl space-y-6 p-4 sm:p-6'>
      <Link
        href={`/contractor/quotes/${quote.id}`}
        className='underline'
        onClick={async (event) => {
          if (!editing) return;
          event.preventDefault();
          if (
            !busy &&
            (await confirm({
              title: 'Leave amendment?',
              description:
                'Unsaved inputs will be discarded. If a save was interrupted, review history before creating another proposal.',
              confirmText: 'Leave',
              cancelText: 'Stay',
            }))
          )
            router.push(`/contractor/quotes/${quote.id}`);
        }}
      >
        Back to quote
      </Link>
      <h1 className='text-2xl font-semibold'>Quote history and amendments</h1>
      <p>
        {quote.title} — Current recorded total: {money(quote.total_amount)}
      </p>
      <p>
        History records changes from when recording was enabled. Earlier edits
        may not be available. An amendment proposal is saved for review only: it
        is not sent, approved or applied to the accepted quote, bid, contract or
        payments.
      </p>
      {quote.status === 'accepted' && !editing && !saved && (
        <button
          type='button'
          className='btn btn-primary min-h-11'
          disabled={!loaded || loading || Boolean(historyError)}
          onClick={() => setEditing(true)}
        >
          Prepare amendment proposal
        </button>
      )}
      {saved && (
        <p role='status'>
          Amendment proposal saved. The accepted quote is unchanged. Customer
          approval and applying amendments are not yet available.
        </p>
      )}
      {editing && (
        <form
          className='space-y-4 rounded-lg border border-slate-300 p-4'
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <h2 className='text-xl font-semibold'>Prepare amendment proposal</h2>
          <fieldset
            disabled={busy || retrying || conflict}
            className='space-y-4'
          >
            <label htmlFor='amendment-reason'>Reason for amendment</label>
            <textarea
              id='amendment-reason'
              value={reason}
              maxLength={2000}
              onChange={(event) => setReason(event.target.value)}
              className='block w-full rounded border border-slate-300 p-3'
            />
            <QuotePricingFields
              amendment
              items={items}
              tax={tax}
              onItems={setItems}
              onTax={setTax}
              preview={preview}
              onAdd={() =>
                setItems((current) => [
                  ...current,
                  {
                    key: nextKey.current++,
                    description: '',
                    quantity: '1',
                    unitPrice: '',
                  },
                ])
              }
            />
          </fieldset>
          {error && <p role='alert'>{error}</p>}
          {conflict ? (
            <p>
              Return to the quote and review its latest history before starting
              another proposal.
            </p>
          ) : (
            <button
              type='submit'
              disabled={busy}
              className='btn btn-primary min-h-11'
            >
              {busy
                ? 'Saving…'
                : retrying
                  ? 'Retry same proposal'
                  : 'Save amendment proposal'}
            </button>
          )}
          {retrying && !conflict && (
            <p>
              The request may have been saved. Retry uses the same request to
              prevent a duplicate; inputs are retained.
            </p>
          )}
        </form>
      )}
      <section aria-label='Recorded quote history' className='space-y-4'>
        <h2 className='text-xl font-semibold'>Recorded history</h2>
        {loading && <p role='status'>Loading history…</p>}
        {historyError && (
          <div role='alert'>
            <p>{historyError}</p>
            <button
              type='button'
              className='underline min-h-11'
              disabled={loading || editing}
              onClick={() => void load(loaded && next ? next : undefined)}
            >
              Retry history
            </button>
          </div>
        )}
        {loaded && revisions.length === 0 && (
          <p>
            No revisions recorded since history recording was enabled. This does
            not establish that the quote was never changed.
          </p>
        )}
        {revisions.map((revision) => (
          <article
            key={revision.id}
            className='rounded-lg border border-slate-300 p-4 space-y-3'
          >
            <h3 className='font-semibold'>
              Revision {revision.revision_number}:{' '}
              {revision.kind === 'amendment_proposed'
                ? 'Amendment proposal — not applied'
                : `Quote ${revision.kind}`}
            </h3>
            <p>
              <time dateTime={revision.created_at}>
                {new Date(revision.created_at).toLocaleString('en-GB')}
              </time>{' '}
              —{' '}
              {revision.actor_id
                ? 'Saved by the contractor'
                : 'Recorded change; individual actor not captured'}
            </p>
            {revision.reason && (
              <p className='whitespace-pre-wrap break-words'>
                {revision.reason}
              </p>
            )}
            <details>
              <summary className='cursor-pointer min-h-11'>
                View recorded details
              </summary>
              <div className='grid gap-6 sm:grid-cols-2'>
                <RecordedSnapshot
                  snapshot={revision.before_snapshot}
                  label={
                    revision.kind === 'amendment_proposed'
                      ? 'Accepted quote'
                      : 'Before'
                  }
                />
                <RecordedSnapshot
                  snapshot={revision.after_snapshot}
                  label={
                    revision.kind === 'amendment_proposed'
                      ? 'Proposed pricing'
                      : 'After'
                  }
                />
              </div>
            </details>
          </article>
        ))}
        {next && !historyError && (
          <button
            type='button'
            disabled={loading || editing}
            className='underline min-h-11'
            onClick={() => void load(next)}
          >
            Load older revisions
          </button>
        )}
      </section>
    </main>
  );
}
