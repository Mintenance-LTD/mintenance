'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';

type Action =
  | {
      action: 'schedule';
      kind: string;
      id: string;
      revision: number;
      scheduledFor: string;
      reason: string;
      inventoryReference: string;
      classificationConfirmed: true;
    }
  | { action: 'cancel'; kind: string; id: string; requestId: string };
type Row = {
  id: string;
  record_kind: string;
  record_id: string;
  scheduled_for: string;
  status: string;
  outcome_code: string | null;
  inventory_reference: string;
};
export default function EvidenceDisposalPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [next, setNext] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<Action | null>(null);
  const lock = useRef(false);
  const loadingLock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const load = useCallback(async (after?: string) => {
    if (loadingLock.current) return;
    loadingLock.current = true;
    setLoading(true);
    setError('');
    const abort = new AbortController();
    controller.current = abort;
    try {
      const response = await fetch(
        `/api/admin/evidence-retention/disposal${after ? `?after=${encodeURIComponent(after)}` : ''}`,
        { signal: abort.signal }
      );
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.records))
        throw new Error('Unable to load disposal decisions. Retry below.');
      if (abort.signal.aborted) return;
      setRows((old) =>
        after
          ? [
              ...old,
              ...data.records.filter(
                (r: Row) => !old.some((o) => o.id === r.id)
              ),
            ]
          : data.records
      );
      setNext(typeof data.next === 'string' ? data.next : null);
    } catch (failure) {
      if (!abort.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Unable to load disposal decisions.'
        );
    } finally {
      if (controller.current === abort) loadingLock.current = false;
      if (!abort.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    return () => {
      controller.current?.abort();
      loadingLock.current = false;
    };
  }, [load]);
  async function save(action: Action) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchWithCsrf(
        '/api/admin/evidence-retention/disposal',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(action),
        }
      );
      const data = await response.json();
      if (response.status === 403 && data.requiresStepUp) {
        setPending(action);
        return;
      }
      if (!response.ok || data.success !== true)
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ||
                'Decision not confirmed. Reload before retrying.'
        );
      setMessage(
        action.action === 'schedule'
          ? 'Disposal scheduled. Evidence remains retained until the worker rechecks eligibility.'
          : 'Disposal cancelled. Evidence remains retained.'
      );
      await load();
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : 'Decision not confirmed.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <main className='mx-auto max-w-4xl space-y-5 p-6'>
      <Link className='underline' href='/admin/evidence-retention'>
        Back to retention reviews
      </Link>
      <h1 className='text-2xl font-semibold'>Evidence disposal decisions</h1>
      <p>
        Classify the retention obligation and complete an inventory before
        scheduling disposal. A review date alone does not authorize deletion.
        Allow at least 24 hours for cancellation.
      </p>
      <p>
        The worker removes eligible archived database evidence only. External
        files, unresolved disputes and active records require reconciliation.
        Backups and processor copies need separate documented handling.
      </p>
      {error && <p role='alert'>{error}</p>}
      {message && <p role='status'>{message}</p>}
      <form
        className='space-y-3 rounded-xl border p-4'
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          void save({
            action: 'schedule',
            kind: String(fields.get('kind')),
            id: String(fields.get('id')).trim(),
            revision: Number(fields.get('revision')),
            scheduledFor: new Date(String(fields.get('date'))).toISOString(),
            reason: String(fields.get('reason')),
            inventoryReference: String(fields.get('inventory')),
            classificationConfirmed: true,
          });
        }}
      >
        <h2 className='font-semibold'>Schedule a reviewed record</h2>
        <fieldset disabled={busy || !!pending || loading} className='space-y-3'>
          <label className='block'>
            Record type
            <select name='kind' className='ml-3 rounded border p-2'>
              <option value='contract'>Contract</option>
              <option value='dispute'>Dispute</option>
            </select>
          </label>
          <label className='block'>
            Archived record reference
            <input
              name='id'
              required
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='block'>
            Current review revision
            <input
              name='revision'
              type='number'
              min='1'
              step='1'
              required
              className='block rounded border p-2'
            />
          </label>
          <label className='block'>
            Earliest disposal (your local time)
            <input
              name='date'
              type='datetime-local'
              required
              className='block rounded border p-2'
            />
          </label>
          <label className='block'>
            Classification and inventory case reference
            <input
              name='inventory'
              required
              minLength={5}
              maxLength={200}
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='block'>
            Reason disposal is permitted
            <textarea
              name='reason'
              required
              minLength={10}
              maxLength={1000}
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='flex items-start gap-2'>
            <input type='checkbox' required className='mt-1' />I have classified
            the retention obligation, checked for holds and documented the
            evidence inventory.
          </label>
          <button className='rounded border px-4 py-2' type='submit'>
            {busy ? 'Saving decision…' : 'Schedule disposal'}
          </button>
        </fieldset>
      </form>
      <h2 className='text-xl font-semibold'>Decision queue</h2>
      <button
        className='underline'
        disabled={loading || busy || !!pending}
        onClick={() => void load()}
      >
        Reload decisions
      </button>
      {loading && <p role='status'>Loading decisions…</p>}
      {!loading && !error && !rows.length && <p>No disposal decisions.</p>}
      {rows.map((row) => (
        <article key={row.id} className='space-y-2 rounded-xl border p-4'>
          <h3 className='font-semibold'>
            {row.record_kind === 'contract' ? 'Contract' : 'Dispute'} —{' '}
            {row.status.replace(/_/g, ' ')}
          </h3>
          <p className='break-all'>Record: {row.record_id}</p>
          <p>Inventory: {row.inventory_reference}</p>
          <p>
            Earliest disposal:{' '}
            {new Date(row.scheduled_for).toLocaleString('en-GB')}
          </p>
          {row.outcome_code && (
            <p>Outcome: {row.outcome_code.replace(/_/g, ' ')}</p>
          )}
          {row.status === 'completed' && (
            <p>
              Archived database evidence removed. This does not confirm deletion
              from backups or processors.
            </p>
          )}
          {['scheduled', 'needs_reconciliation'].includes(row.status) && (
            <button
              className='rounded border px-4 py-2'
              disabled={busy || loading || !!pending}
              onClick={() =>
                void save({
                  action: 'cancel',
                  kind: row.record_kind,
                  id: row.record_id,
                  requestId: row.id,
                })
              }
            >
              Cancel disposal
            </button>
          )}
        </article>
      ))}
      {next && (
        <button
          className='rounded border px-4 py-2'
          disabled={loading || busy || !!pending}
          onClick={() => void load(next)}
        >
          Load more decisions
        </button>
      )}
      {pending && (
        <MfaStepUpDialog
          onCancel={() => setPending(null)}
          onSuccess={() => {
            const action = pending;
            setPending(null);
            void save(action);
          }}
        />
      )}
    </main>
  );
}
