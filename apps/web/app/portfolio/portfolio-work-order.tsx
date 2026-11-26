'use client';

import { useEffect, useId, useState } from 'react';
import type { FormEvent } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import {
  amountLabel,
  workOrderDraft,
  workOrderInput,
} from './work-order-model';
import type { WorkOrder } from './work-order-model';

const costFields = [
  { label: 'Quoted', amount: 'quotedPence', reference: undefined },
  {
    label: 'Approved',
    amount: 'approvedPence',
    reference: { key: 'approvalReference', label: 'Approval reference' },
  },
  {
    label: 'Invoiced',
    amount: 'invoicedPence',
    reference: { key: 'invoiceReference', label: 'Invoice reference' },
  },
  {
    label: 'Recorded as paid',
    amount: 'paidPence',
    reference: { key: 'paymentReference', label: 'Payment reference' },
  },
] as const;

const control =
  'mt-1 block min-h-11 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-700/30 sm:text-sm';

export function PortfolioWorkOrder({ ticketId }: { ticketId: string }) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <section
      aria-labelledby={id}
      className='rounded-xl border border-teal-200 bg-teal-50/50 p-4'
    >
      <h4 id={id} className='font-semibold text-slate-900'>
        Private work order
      </h4>
      <p className='mt-1 text-sm text-slate-700'>
        Record work with your own contractor, without posting a marketplace job
        or moving money.
      </p>
      <button
        aria-expanded={open}
        aria-controls={id + '-panel'}
        type='button'
        onClick={() => setOpen((current) => !current)}
        className='mt-2 inline-flex min-h-11 items-center rounded-lg border border-teal-700 bg-white px-3 text-sm font-semibold text-teal-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-teal-800'
      >
        {open ? 'Hide work order' : 'Open work order'}
      </button>
      <div id={id + '-panel'} hidden={!open}>
        {open && <WorkOrderEditor key={ticketId} ticketId={ticketId} />}
      </div>
    </section>
  );
}

function WorkOrderEditor({ ticketId }: { ticketId: string }) {
  const endpoint =
    '/api/portfolio/tickets/' + encodeURIComponent(ticketId) + '/work-order';
  const [saved, setSaved] = useState<WorkOrder | null>(null);
  const [draft, setDraft] = useState(() => workOrderDraft(null));
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [reload, setReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [conflict, setConflict] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setLoaded(false);
      setError('');
      setNotice('');
      try {
        const response = await fetch(endpoint, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok)
          throw new Error('Could not load the work order. Try again.');
        const { workOrder } = (await response.json()) as {
          workOrder: WorkOrder | null;
        };
        if (controller.signal.aborted) return;
        setSaved(workOrder);
        setDraft(workOrderDraft(workOrder));
        setConflict(false);
        setLoaded(true);
      } catch (err) {
        if (!controller.signal.aborted)
          setError(
            err instanceof Error
              ? err.message
              : 'Could not load the work order.'
          );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [endpoint, reload]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !loaded || conflict) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const body = workOrderInput(draft);
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify(body),
      });
      if (response.status === 409) {
        setConflict(true);
        throw new Error(
          'A teammate changed this record. Copy any unsaved details you need, then load the latest version.'
        );
      }
      const result = await response.json();
      if (!response.ok) {
        throw new Error(
          response.status === 400 && typeof result.message === 'string'
            ? result.message
            : 'Could not save the work order. No payments were made.'
        );
      }
      if (!result.workOrder)
        throw new Error(
          'Could not confirm the save. Reload before trying again.'
        );
      setSaved(result.workOrder);
      setDraft(workOrderDraft(result.workOrder));
      setNotice('Work order saved. No message or payment was sent.');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Could not save the work order.'
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className='mt-3'>
      {loading && (
        <p role='status' className='text-sm text-slate-700'>
          Loading work order…
        </p>
      )}
      {error && (
        <p
          role='alert'
          className='my-2 rounded-lg bg-red-50 p-3 text-sm text-red-800'
        >
          {error}
        </p>
      )}
      {((!loading && !loaded) || conflict) && (
        <button
          className='min-h-11 text-sm font-semibold text-teal-900 underline'
          type='button'
          onClick={() => setReload((value) => value + 1)}
        >
          {conflict ? 'Load latest and discard unsaved edits' : 'Try again'}
        </button>
      )}
      {loaded && (
        <>
          {saved && (
            <dl className='mb-4 grid grid-cols-2 gap-2 rounded-lg bg-white p-3 sm:grid-cols-4'>
              {costFields.map(({ label, amount }) => (
                <div key={amount} className='min-w-0'>
                  <dt className='text-xs text-slate-600'>{label}</dt>
                  <dd className='break-words text-sm font-semibold tabular-nums text-slate-900'>
                    {amountLabel(saved[amount])}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <form onSubmit={submit} className='space-y-4'>
            <fieldset disabled={saving} className='space-y-4'>
              <legend className='text-sm font-semibold text-slate-900'>
                Recording details
              </legend>
              <label className='block text-sm text-slate-800'>
                How was the work arranged?
                <select
                  className={control}
                  value={draft.arrangement}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      arrangement:
                        e.target.value === 'arranged_outside'
                          ? 'arranged_outside'
                          : 'agency_contractor',
                    })
                  }
                >
                  <option value='agency_contractor'>Our contractor</option>
                  <option value='arranged_outside'>
                    Arranged outside Mintenance
                  </option>
                </select>
              </label>
              <label className='block text-sm text-slate-800'>
                Contractor or company name
                <input
                  className={control}
                  value={draft.contractorName}
                  maxLength={160}
                  required
                  onChange={(e) =>
                    setDraft({ ...draft, contractorName: e.target.value })
                  }
                />
              </label>
              <div className='grid gap-3 sm:grid-cols-2'>
                {costFields.map(({ label, amount, reference }) => (
                  <div
                    key={amount}
                    className='space-y-2 rounded-lg border border-slate-200 bg-white p-3'
                  >
                    <label className='block text-sm text-slate-800'>
                      {label} (£)
                      <input
                        className={control}
                        inputMode='decimal'
                        placeholder='Not recorded'
                        value={draft[amount]}
                        onChange={(e) =>
                          setDraft({ ...draft, [amount]: e.target.value })
                        }
                      />
                    </label>
                    {reference && draft[amount].trim() !== '' && (
                      <label className='block text-sm text-slate-800'>
                        {reference.label}
                        <input
                          className={control}
                          maxLength={120}
                          value={draft[reference.key] ?? ''}
                          onChange={(e) =>
                            setDraft({
                              ...draft,
                              [reference.key]: e.target.value,
                            })
                          }
                        />
                      </label>
                    )}
                  </div>
                ))}
              </div>
              <label className='block text-sm text-slate-800'>
                Private completion note
                <textarea
                  className={control}
                  rows={3}
                  maxLength={3000}
                  value={draft.completionNote ?? ''}
                  onChange={(e) =>
                    setDraft({ ...draft, completionNote: e.target.value })
                  }
                />
              </label>
            </fieldset>
            <p className='text-xs text-slate-600'>
              Only record a payment once it has happened outside Mintenance. A
              quote or approval does not mark the work as paid.
            </p>
            <button
              type='submit'
              disabled={saving || conflict}
              className='min-h-11 rounded-lg bg-teal-800 px-4 text-sm font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-800 disabled:opacity-60'
            >
              {saving ? 'Saving…' : 'Save work order'}
            </button>
            {notice && (
              <p role='status' className='text-sm text-teal-900'>
                {notice}
              </p>
            )}
          </form>
        </>
      )}
    </div>
  );
}
