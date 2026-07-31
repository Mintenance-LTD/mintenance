'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Check, Loader2, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { logger } from '@mintenance/shared';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface Quote {
  id: string;
  quote_number?: string | null;
  title: string;
  client_name?: string | null;
  total_amount: number | string;
  status: string;
  terms?: string | null;
  notes?: string | null;
  valid_until?: string | null;
}

interface EditQuoteClientProps {
  quote: Quote;
}

const EDITABLE_STATUSES: ReadonlyArray<{
  value: 'draft' | 'sent' | 'expired';
  label: string;
}> = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'expired', label: 'Expired' },
];

function toDateInput(value?: string | null): string {
  if (!value) return '';
  // Supabase returns YYYY-MM-DD for date columns; pass through.
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
}

export function EditQuoteClient({ quote }: EditQuoteClientProps) {
  const router = useRouter();
  const confirm = useConfirm();

  // Hydration-safe theme detection — match the rest of the contractor
  // surfaces (legacy vs. Mint Editorial). The form is light enough that
  // we apply canonical classes universally and let the cookie-scoped
  // theme repaint via the global CSS.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  const [title, setTitle] = useState(quote.title);
  const [totalAmount, setTotalAmount] = useState<string>(
    String(quote.total_amount ?? 0)
  );
  const [status, setStatus] = useState<string>(quote.status || 'draft');
  const [terms, setTerms] = useState(quote.terms || '');
  const [notes, setNotes] = useState(quote.notes || '');
  const [validUntil, setValidUntil] = useState(toDateInput(quote.valid_until));
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty =
    title !== quote.title ||
    Number(totalAmount) !== Number(quote.total_amount) ||
    status !== (quote.status || 'draft') ||
    terms !== (quote.terms || '') ||
    notes !== (quote.notes || '') ||
    validUntil !== toDateInput(quote.valid_until);

  const handleSave = async () => {
    if (saving) return;
    const totalNum = parseFloat(totalAmount);
    if (!Number.isFinite(totalNum) || totalNum < 0) {
      toast.error('Total amount must be a positive number');
      return;
    }
    if (!title.trim()) {
      toast.error('Title cannot be empty');
      return;
    }
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        total_amount: totalNum,
        status,
        terms: terms.trim() || undefined,
        notes: notes.trim() || undefined,
        valid_until: validUntil || undefined,
      };
      const res = await fetch(`/api/contractor/quotes/${quote.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save quote');
      }
      toast.success('Quote updated');
      router.push(`/contractor/quotes/${quote.id}`);
      router.refresh();
    } catch (err) {
      logger.error('Quote save failed', err, {
        service: 'quotes-edit',
        quoteId: quote.id,
      });
      toast.error(err instanceof Error ? err.message : 'Failed to save quote');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    const ok = await confirm({
      title: 'Delete quote?',
      description: `Delete quote ${quote.quote_number || quote.id}? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/contractor/quotes/${quote.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error || 'Failed to delete quote');
      }
      toast.success('Quote deleted');
      router.push('/contractor/quotes');
      router.refresh();
    } catch (err) {
      logger.error('Quote delete failed', err, {
        service: 'quotes-edit',
        quoteId: quote.id,
      });
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete quote'
      );
    } finally {
      setDeleting(false);
    }
  };

  const wrapperStyle: React.CSSProperties = isMintEditorial
    ? { padding: '20px 24px', maxWidth: 820, margin: '0 auto' }
    : { padding: '20px 24px', maxWidth: 820, margin: '0 auto' };

  return (
    <div style={wrapperStyle}>
      <Link
        href={`/contractor/quotes/${quote.id}`}
        className={isMintEditorial ? 'btn btn-ghost btn-sm' : ''}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 16,
          textDecoration: 'none',
          fontSize: 13,
        }}
      >
        <ArrowLeft size={13} strokeWidth={1.75} /> Back to quote
      </Link>

      <div className='col' style={{ gap: 4, marginBottom: 20 }}>
        <h1 className={isMintEditorial ? 't-h1' : 'text-3xl font-bold'}>
          Edit quote
        </h1>
        <p className={isMintEditorial ? 't-body' : 'text-gray-600 text-sm'}>
          {quote.quote_number ? `${quote.quote_number} · ` : ''}
          {quote.client_name || 'No client name'}
        </p>
      </div>

      <div className='card card-pad' style={{ marginBottom: 16 }}>
        <div className='col' style={{ gap: 16 }}>
          <div className='col' style={{ gap: 6 }}>
            <label
              htmlFor='quote-title'
              className='t-meta'
              style={{ fontWeight: 600 }}
            >
              Title
            </label>
            <input
              id='quote-title'
              type='text'
              className='field'
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={500}
              placeholder='Quote for kitchen tap replacement'
            />
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}
          >
            <div className='col' style={{ gap: 6 }}>
              <label
                htmlFor='quote-total'
                className='t-meta'
                style={{ fontWeight: 600 }}
              >
                Total amount (£)
              </label>
              <input
                id='quote-total'
                type='number'
                step='0.01'
                min='0'
                className='field'
                value={totalAmount}
                onChange={(e) => setTotalAmount(e.target.value)}
              />
            </div>

            <div className='col' style={{ gap: 6 }}>
              <label
                htmlFor='quote-status'
                className='t-meta'
                style={{ fontWeight: 600 }}
              >
                Status
              </label>
              <select
                id='quote-status'
                className='field'
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                {EDITABLE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className='col' style={{ gap: 6 }}>
              <label
                htmlFor='quote-valid-until'
                className='t-meta'
                style={{ fontWeight: 600 }}
              >
                Valid until
              </label>
              <input
                id='quote-valid-until'
                type='date'
                className='field'
                value={validUntil}
                onChange={(e) => setValidUntil(e.target.value)}
              />
            </div>
          </div>

          <div className='col' style={{ gap: 6 }}>
            <label
              htmlFor='quote-terms'
              className='t-meta'
              style={{ fontWeight: 600 }}
            >
              Terms (optional)
            </label>
            <textarea
              id='quote-terms'
              className='field'
              rows={3}
              maxLength={5000}
              value={terms}
              onChange={(e) => setTerms(e.target.value)}
              placeholder='Payment terms, scope notes, exclusions…'
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className='col' style={{ gap: 6 }}>
            <label
              htmlFor='quote-notes'
              className='t-meta'
              style={{ fontWeight: 600 }}
            >
              Notes (optional, internal)
            </label>
            <textarea
              id='quote-notes'
              className='field'
              rows={3}
              maxLength={5000}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder='Private notes, not visible to client'
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <p
            className='t-meta'
            style={{ fontSize: 12, color: 'var(--me-ink-3)' }}
          >
            Need to change line items, client details, or tax? Duplicate this
            quote on the quotes list and create a fresh version — keeps the
            audit trail of what was sent to your client.
          </p>
        </div>
      </div>

      <div
        className='between'
        style={{ alignItems: 'center', flexWrap: 'wrap', gap: 12 }}
      >
        <button
          type='button'
          onClick={handleDelete}
          disabled={deleting}
          className='btn btn-ghost btn-sm'
          style={{ color: 'var(--me-err)' }}
        >
          {deleting ? (
            <Loader2 size={13} strokeWidth={1.75} className='animate-spin' />
          ) : (
            <Trash2 size={13} strokeWidth={1.75} />
          )}
          Delete quote
        </button>

        <div className='row' style={{ gap: 8 }}>
          <Link
            href={`/contractor/quotes/${quote.id}`}
            className='btn btn-secondary btn-sm'
          >
            Cancel
          </Link>
          <button
            type='button'
            onClick={handleSave}
            disabled={saving || !dirty}
            className='btn btn-primary'
          >
            {saving ? (
              <Loader2 size={14} strokeWidth={1.75} className='animate-spin' />
            ) : (
              <Check size={14} strokeWidth={1.75} />
            )}
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
