'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  calculateDraftQuotePricing,
  type DraftQuotePricing,
} from '@mintenance/shared';
import { useConfirm } from '@/components/ui/confirm-dialog';
import {
  QuotePricingFields,
  readQuotePricing,
  type EditableQuoteItem,
} from './QuotePricingFields';

export interface EditableQuote {
  id: string;
  job_id?: string | null;
  is_current?: boolean;
  quote_number?: string | null;
  title: string;
  client_name?: string | null;
  total_amount: number | string;
  status: string;
  updated_at: string | null;
  terms?: string | null;
  notes?: string | null;
  valid_until?: string | null;
  line_items?:
    | {
        description?: string;
        item_name?: string;
        quantity?: number;
        unitPrice?: number;
        unit_price?: number;
      }[]
    | null;
}

function responseError(data: unknown, fallback: string): string {
  const error = (data as { error?: string | { message?: string } } | null)
    ?.error;
  return typeof error === 'string' ? error : error?.message || fallback;
}

export function EditQuoteClient({ quote }: { quote: EditableQuote }) {
  return <DraftEditor key={quote.id} initialQuote={quote} />;
}

function DraftEditor({ initialQuote }: { initialQuote: EditableQuote }) {
  // Keep the loaded snapshot until leaving/reloading. A background refresh must
  // not give old edits a new version token and silently overwrite newer work.
  const [quote] = useState(initialQuote);
  const router = useRouter();
  const confirm = useConfirm();
  const [title, setTitle] = useState(quote.title);
  const [clientName, setClientName] = useState(quote.client_name || '');
  const [terms, setTerms] = useState(quote.terms || '');
  const [notes, setNotes] = useState(quote.notes || '');
  const [validUntil, setValidUntil] = useState(
    quote.valid_until?.slice(0, 10) || ''
  );
  const [pricingEnabled, setPricingEnabled] = useState(false);
  const [tax, setTax] = useState('');
  const [items, setItems] = useState<EditableQuoteItem[]>(() =>
    (quote.line_items ?? []).map((item, key) => ({
      key,
      description: item.description ?? item.item_name ?? '',
      quantity: String(item.quantity ?? ''),
      unitPrice: String(item.unitPrice ?? item.unit_price ?? ''),
    }))
  );
  const nextKey = useRef(items.length);
  const lock = useRef(false);
  const [busy, setBusy] = useState<'save' | 'delete' | null>(null);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [completed, setCompleted] = useState(false);
  const dirty =
    pricingEnabled ||
    title !== quote.title ||
    clientName !== (quote.client_name || '') ||
    terms !== (quote.terms || '') ||
    notes !== (quote.notes || '') ||
    validUntil !== (quote.valid_until?.slice(0, 10) || '');
  useEffect(() => {
    if (!dirty || completed) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty, completed]);
  let pricing: DraftQuotePricing | undefined;
  let preview: ReturnType<typeof calculateDraftQuotePricing> | undefined;
  let validation = '';
  if (pricingEnabled) {
    try {
      pricing = readQuotePricing(items, tax);
      preview = calculateDraftQuotePricing(pricing);
    } catch (cause) {
      validation =
        cause instanceof Error ? cause.message : 'Check the pricing.';
    }
  }
  const editable = quote.status === 'draft';
  const detailPath = `/contractor/quotes/${quote.id}`;
  const leave = async () => {
    if (lock.current) return;
    if (
      dirty &&
      !(await confirm({
        title: 'Discard unsaved edits?',
        confirmText: 'Discard edits',
      }))
    )
      return;
    setCompleted(true);
    router.push(detailPath);
    router.refresh();
  };
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (
      !editable ||
      lock.current ||
      conflict ||
      completed ||
      validation ||
      !dirty ||
      !title.trim() ||
      !clientName.trim()
    )
      return;
    lock.current = true;
    setBusy('save');
    setError('');
    try {
      const res = await fetch(`/api/contractor/quotes/${quote.id}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expected_status: 'draft',
          expected_updated_at: quote.updated_at,
          title: title.trim(),
          client_name: clientName.trim(),
          terms: terms.trim(),
          notes: notes.trim(),
          valid_until: validUntil || null,
          ...(pricingEnabled ? { pricing } : {}),
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setConflict(res.status === 409);
        throw new Error(responseError(data, 'Could not save quote.'));
      }
      if (data?.quote?.id !== quote.id)
        throw new Error(
          'The save could not be confirmed. Review the latest quote before trying again.'
        );
      setCompleted(true);
      toast.success('Quote updated');
      router.push(detailPath);
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not save quote.'
      );
    } finally {
      lock.current = false;
      setBusy(null);
    }
  };
  const remove = async () => {
    if (!editable || lock.current || conflict || completed) return;
    lock.current = true;
    setBusy('delete');
    setError('');
    try {
      if (
        !(await confirm({
          title: 'Delete draft quote?',
          description:
            'This deletes the saved draft and any unsaved edits. This cannot be undone.',
          confirmText: 'Delete draft',
          destructive: true,
        }))
      )
        return;
      const res = await fetch(`/api/contractor/quotes/${quote.id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expected_updated_at: quote.updated_at }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setConflict(res.status === 409);
        throw new Error(responseError(data, 'Could not delete quote.'));
      }
      if (data?.success !== true)
        throw new Error('Deletion could not be confirmed.');
      setCompleted(true);
      toast.success('Draft deleted');
      router.push('/contractor/quotes');
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not delete quote.'
      );
    } finally {
      lock.current = false;
      setBusy(null);
    }
  };
  if (!editable)
    return (
      <div className='mx-auto max-w-3xl p-6 space-y-4'>
        <h1 className='text-2xl font-semibold'>This quote is read-only</h1>
        <p>
          Only drafts can be edited. Sent and accepted quotes need a separate
          amendment workflow.
        </p>
        <Link href={detailPath}>View quote</Link>
      </div>
    );
  const fieldClass =
    'field w-full rounded-lg border border-slate-300 px-3 py-2';
  return (
    <div className='mx-auto max-w-3xl p-6 space-y-6'>
      <button
        type='button'
        className='min-h-11 underline'
        disabled={!!busy}
        onClick={leave}
      >
        Back to quote
      </button>
      <header>
        <h1 className='text-3xl font-semibold'>Edit draft quote</h1>
        <p>{quote.quote_number || quote.title}</p>
      </header>
      <form onSubmit={save} className='space-y-6'>
        <fieldset disabled={!!busy || completed} className='space-y-5'>
          <div>
            <label htmlFor='quote-title'>Title</label>
            <input
              id='quote-title'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={255}
              required
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor='quote-client'>Client name</label>
            <input
              id='quote-client'
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              maxLength={200}
              required
              className={fieldClass}
            />
          </div>
          <p>Current saved total: £{Number(quote.total_amount).toFixed(2)}</p>
          {!pricingEnabled ? (
            <button
              type='button'
              className='btn btn-secondary min-h-11'
              onClick={() => setPricingEnabled(true)}
            >
              Edit prices and items
            </button>
          ) : (
            <>
              <QuotePricingFields
                items={items}
                tax={tax}
                onItems={setItems}
                onTax={setTax}
                preview={preview}
                onAdd={() => {
                  const key = nextKey.current++;
                  setItems((current) => [
                    ...current,
                    { key, description: '', quantity: '1', unitPrice: '' },
                  ]);
                }}
              />
              {validation && (
                <p role='alert' className='text-red-700'>
                  {validation}
                </p>
              )}
              <button
                type='button'
                className='min-h-11 underline'
                onClick={() => setPricingEnabled(false)}
              >
                Keep saved pricing
              </button>
            </>
          )}
          <div>
            <label htmlFor='quote-valid-until'>Valid until</label>
            <input
              id='quote-valid-until'
              type='date'
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor='quote-terms'>Terms (optional)</label>
            <textarea
              id='quote-terms'
              value={terms}
              rows={3}
              onChange={(e) => setTerms(e.target.value)}
              maxLength={5000}
              className={fieldClass}
            />
          </div>
          <div>
            <label htmlFor='quote-notes'>Notes (optional)</label>
            <textarea
              id='quote-notes'
              value={notes}
              rows={3}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={5000}
              className={fieldClass}
            />
          </div>
        </fieldset>
        {error && (
          <div role='alert' className='text-red-700 space-y-2'>
            <p>{error}</p>
            <p>Your edits are kept here.</p>
          </div>
        )}
        {conflict && (
          <div className='space-y-2'>
            <p>
              This quote changed. Review the latest quote before editing again.
            </p>
            <button
              type='button'
              className='min-h-11 underline'
              onClick={leave}
            >
              Discard edits and review latest quote
            </button>
          </div>
        )}
        <div className='flex flex-wrap gap-3'>
          <button
            type='submit'
            className='btn btn-primary min-h-11'
            disabled={
              !!busy ||
              completed ||
              conflict ||
              !dirty ||
              !!validation ||
              !title.trim() ||
              !clientName.trim()
            }
          >
            {busy === 'save' ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type='button'
            className='btn btn-secondary min-h-11'
            disabled={!!busy}
            onClick={leave}
          >
            Cancel
          </button>
          <button
            type='button'
            className='min-h-11 text-red-700 underline'
            disabled={!!busy || completed || conflict}
            onClick={remove}
          >
            {busy === 'delete' ? 'Deleting…' : 'Delete draft'}
          </button>
        </div>
      </form>
    </div>
  );
}
