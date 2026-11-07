'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { fetchWithCSRF } from '@/lib/hooks/useCSRF';
type Pricing = {
  line_items?: {
    description?: string;
    quantity?: number;
    unitPrice?: number;
    unit_price?: number;
    total?: number;
  }[];
  subtotal?: number;
  tax_rate?: number;
  tax_amount?: number;
  total_amount?: number;
  terms?: string;
};
type Amendment = {
  id: string;
  version: number;
  sequence: number;
  status: string;
  reason: string;
  before_snapshot: Pricing;
  after_snapshot: Pricing;
  applied_quote_id: string | null;
  events: {
    version: number;
    action: string;
    note: string;
    created_at: string;
  }[];
};
const money = (value: unknown) =>
  value === null || value === undefined || !Number.isFinite(Number(value))
    ? 'Not recorded'
    : new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
      }).format(Number(value));
const errorMessage = (
  data: { error?: string | { message?: string } },
  fallback: string
) =>
  typeof data?.error === 'string'
    ? data.error
    : data?.error?.message || fallback;
function Prices({ value, label }: { value: Pricing; label: string }) {
  return (
    <section className='min-w-0 space-y-2'>
      <h3 className='font-semibold'>{label}</h3>
      {Array.isArray(value.line_items) && value.line_items.length > 0 ? (
        <ul className='space-y-2'>
          {value.line_items.map((item, index) => (
            <li key={index} className='break-words'>
              {item.description || 'Description not recorded'}:{' '}
              {item.quantity ?? 'Not recorded'} ×{' '}
              {money(item.unitPrice ?? item.unit_price)} = {money(item.total)}
            </li>
          ))}
        </ul>
      ) : (
        <p>No item breakdown recorded.</p>
      )}
      <p>Subtotal: {money(value.subtotal)}</p>
      <p>
        Tax: {money(value.tax_amount)} ({value.tax_rate ?? 'Not recorded'}%)
      </p>
      <p className='font-semibold'>Total: {money(value.total_amount)}</p>
      <p className='whitespace-pre-wrap break-words'>
        Terms: {value.terms || 'None recorded'}
      </p>
    </section>
  );
}
function AmendmentCard({
  amendment: a,
  jobId,
  canApprove,
  isContractor,
  onChanged,
}: {
  amendment: Amendment;
  jobId: string;
  canApprove: boolean;
  isContractor: boolean;
  onChanged: () => Promise<void>;
}) {
  const [reviewed, setReviewed] = useState(false),
    [note, setNote] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [confirmed, setConfirmed] = useState('');
  const lock = useRef(false),
    pending = useRef<{ action: string; body: string } | null>(null);
  const [retry, setRetry] = useState(false);
  const act = async (action: string) => {
    if (lock.current || blocked || confirmed) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      if (!pending.current)
        pending.current = {
          action,
          body: JSON.stringify({
            action,
            expected_version: a.version,
            confirmed: true,
            note,
          }),
        };
      const response = await fetchWithCSRF(
        `/api/jobs/${jobId}/quote-amendments/${a.id}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: pending.current.body,
        }
      );
      const data = await response.json();
      if (response.status === 409 || response.status === 403) setBlocked(true);
      if (response.status === 400) pending.current = null;
      if (!response.ok || data.amendment?.id !== a.id)
        throw new Error(
          errorMessage(
            data,
            'Could not confirm the outcome. Retry the same action or refresh.'
          )
        );
      pending.current = null;
      setRetry(false);
      setConfirmed(
        `Recorded: ${data.amendment.status}.${data.warning ? ` ${data.warning}` : ''}`
      );
      await onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save action.');
      setRetry(Boolean(pending.current));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const customerAction = canApprove && a.status === 'published',
    contractorAction =
      isContractor && ['published', 'approved'].includes(a.status);
  return (
    <article className='rounded-lg border border-slate-300 p-4 space-y-4'>
      <h2 className='text-xl font-semibold'>
        Amendment {a.sequence} — {a.status}
      </h2>
      <p className='whitespace-pre-wrap break-words'>{a.reason}</p>
      <div className='grid gap-6 sm:grid-cols-2'>
        <Prices value={a.before_snapshot} label='Previously accepted pricing' />
        <Prices value={a.after_snapshot} label='Proposed pricing' />
      </div>
      {a.status === 'approved' && (
        <p>
          Customer approval is recorded. The original price remains in effect
          until the contractor applies this amendment.
        </p>
      )}
      {a.status === 'applied' && (
        <p>
          Pricing applied to a new quote and the unsigned contract. The contract
          is back in draft and must be reviewed and signed through the normal
          contract process.
        </p>
      )}
      {a.applied_quote_id && isContractor && (
        <Link
          href={`/contractor/quotes/${a.applied_quote_id}`}
          className='underline'
        >
          View applied quote
        </Link>
      )}
      {(customerAction || contractorAction) && !confirmed && (
        <fieldset disabled={busy || retry || blocked} className='space-y-3'>
          <label className='block'>
            <input
              type='checkbox'
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />{' '}
            I have reviewed the full pricing and understand this does not sign a
            contract or move money.
          </label>
          <label className='block'>
            Decision note (optional)
            <textarea
              value={note}
              maxLength={2000}
              onChange={(e) => setNote(e.target.value)}
              className='block w-full rounded border border-slate-300 p-2'
            />
          </label>
          <div className='flex flex-wrap gap-3'>
            {customerAction && (
              <>
                <button
                  type='button'
                  className='btn btn-primary min-h-11'
                  disabled={!reviewed}
                  onClick={() => void act('approve')}
                >
                  Approve proposal
                </button>
                <button
                  type='button'
                  className='btn btn-secondary min-h-11'
                  disabled={!reviewed}
                  onClick={() => void act('reject')}
                >
                  Reject proposal
                </button>
              </>
            )}
            {isContractor && a.status === 'approved' && (
              <button
                type='button'
                className='btn btn-primary min-h-11'
                disabled={!reviewed}
                onClick={() => void act('apply')}
              >
                Apply approved pricing
              </button>
            )}
            {contractorAction && (
              <button
                type='button'
                className='btn btn-secondary min-h-11'
                disabled={!reviewed}
                onClick={() => void act('withdraw')}
              >
                Withdraw proposal
              </button>
            )}
          </div>
        </fieldset>
      )}
      {busy && <p role='status'>Saving action…</p>}
      {confirmed && <p role='status'>{confirmed}</p>}
      {error && <p role='alert'>{error}</p>}
      {retry && !blocked && (
        <button
          type='button'
          className='btn btn-secondary min-h-11'
          disabled={busy}
          onClick={() => void act(pending.current!.action)}
        >
          Retry same action
        </button>
      )}
      {blocked && (
        <p>
          Refresh the review before continuing. Signed or funded work cannot be
          applied here.
        </p>
      )}
      <details>
        <summary className='min-h-11 cursor-pointer'>Decision history</summary>
        <ol className='space-y-2'>
          {a.events.map((event) => (
            <li key={event.version}>
              {event.action} —{' '}
              <time dateTime={event.created_at}>
                {new Date(event.created_at).toLocaleString('en-GB')}
              </time>
              <p className='whitespace-pre-wrap break-words'>{event.note}</p>
            </li>
          ))}
        </ol>
      </details>
    </article>
  );
}
export function QuoteAmendmentReview({ jobId }: { jobId: string }) {
  const [reviewEpoch, setReviewEpoch] = useState(0);
  const [data, setData] = useState<{
    amendments: Amendment[];
    can_approve: boolean;
    is_contractor: boolean;
    next_before: number | null;
  } | null>(null);
  const [error, setError] = useState(''),
    [loading, setLoading] = useState(false);
  const lock = useRef(false);
  const load = useCallback(
    async (before?: number) => {
      if (lock.current) return;
      lock.current = true;
      setLoading(true);
      setError('');
      try {
        const response = await fetch(
          `/api/jobs/${jobId}/quote-amendments${before ? `?before=${before}` : ''}`,
          { cache: 'no-store' }
        );
        const body = await response.json();
        if (!response.ok || !Array.isArray(body.amendments))
          throw new Error(errorMessage(body, 'Could not load amendments.'));
        setData((current) => ({
          ...body,
          amendments: before
            ? [...(current?.amendments ?? []), ...body.amendments]
            : body.amendments,
        }));
        if (!before) setReviewEpoch((value) => value + 1);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Could not load amendments.'
        );
      } finally {
        lock.current = false;
        setLoading(false);
      }
    },
    [jobId]
  );
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <main className='mx-auto max-w-5xl space-y-6 p-4 sm:p-6'>
      <Link
        className='underline'
        href={
          data?.is_contractor ? `/contractor/jobs/${jobId}` : `/jobs/${jobId}`
        }
      >
        Back to job
      </Link>
      <h1 className='text-2xl font-semibold'>Quote amendments</h1>
      <p>
        Review the complete replacement pricing before approving. Approval
        records your decision; it does not sign a contract, charge a card or
        issue a refund. Application is available only before signatures, consent
        evidence or funding, and returns the contract to draft for review.
      </p>
      <button
        type='button'
        className='underline min-h-11'
        disabled={loading}
        onClick={() => void load()}
      >
        Refresh review
      </button>
      {loading && <p role='status'>Loading amendments…</p>}
      {error && <p role='alert'>{error}</p>}
      {data?.amendments.length === 0 && (
        <p>No proposals have been submitted for customer review.</p>
      )}
      {data?.amendments.map((a) => (
        <AmendmentCard
          key={`${a.id}:${a.version}:${reviewEpoch}`}
          amendment={a}
          jobId={jobId}
          canApprove={data.can_approve && !loading && !error}
          isContractor={data.is_contractor && !loading && !error}
          onChanged={load}
        />
      ))}
      {data?.next_before && (
        <button
          type='button'
          className='underline min-h-11'
          disabled={loading}
          onClick={() => void load(data.next_before!)}
        >
          Load older amendments
        </button>
      )}
    </main>
  );
}
