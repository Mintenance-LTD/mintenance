'use client';

/**
 * Certificate capture form for the compliance dashboard.
 *
 * Until 2026-07-26 the dashboard's only "Upload Certificate" affordance was
 * a Link pointing at `/api/properties/[id]/compliance?action=upload` — a JSON
 * endpoint with no such query handling — so a landlord who clicked it landed
 * on raw JSON and no certificate could be created from the web at all.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { Loader2, X } from 'lucide-react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { CERT_LABELS } from './complianceHelpers';

/**
 * The API accepts 9 cert types (live `cert_type` CHECK) but the dashboard
 * only renders tiles for the 5 core ones. The extra four are labelled here
 * rather than in CERT_LABELS, because that map drives the per-property tile
 * grid — extending it would add four tiles to every property card.
 */
const ALL_CERT_LABELS: Record<string, string> = {
  ...CERT_LABELS,
  legionella: 'Legionella Risk Assessment',
  fire_safety: 'Fire Safety',
  asbestos: 'Asbestos Survey',
  pat_testing: 'PAT Testing',
};

interface ApiValidationError {
  field: string;
  message: string;
}

interface Props {
  propertyId: string;
  propertyName: string;
  initialCertType: string;
  onClose: () => void;
}

const EMPTY_FORM = {
  cert_type: '',
  certificate_number: '',
  issued_date: '',
  expiry_date: '',
  issuer_name: '',
  issuer_registration: '',
  document_url: '',
  notes: '',
};

type FormState = typeof EMPTY_FORM;

const inputClass =
  'w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent';
const labelClass = 'block text-xs font-medium text-gray-700 mb-1';

export function CertificateFormModal(props: Props) {
  return (
    <CertificateEditor
      key={`${props.propertyId}:${props.initialCertType}`}
      {...props}
    />
  );
}

function CertificateEditor({
  propertyId,
  propertyName,
  initialCertType,
  onClose,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const mounted = useRef(true);
  const dialog = useRef<HTMLDivElement>(null);
  const closeCallback = useRef(onClose);
  useEffect(() => {
    closeCallback.current = onClose;
  }, [onClose]);
  const [error, setError] = useState('');
  const [needsReview, setNeedsReview] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    cert_type: initialCertType,
  });

  useEffect(() => {
    mounted.current = true;
    const previousFocus = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLSelectElement>('select')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingRef.current) closeCallback.current();
      if (e.key === 'Tab') {
        const fields = Array.from(
          dialog.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]'
          ) ?? []
        ).filter((field) => !field.closest('fieldset:disabled'));
        const first = fields[0];
        const last = fields[fields.length - 1];
        if (!first) {
          e.preventDefault();
          return;
        }
        if (
          e.shiftKey &&
          (document.activeElement === first ||
            !dialog.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          last.focus();
        } else if (
          !e.shiftKey &&
          (document.activeElement === last ||
            !dialog.current?.contains(document.activeElement))
        ) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      mounted.current = false;
      document.removeEventListener('keydown', onKey);
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, []);

  const close = () => {
    if (!savingRef.current) onClose();
  };

  const setField = (key: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (savingRef.current || needsReview) return;
    savingRef.current = true;
    setSaving(true);
    setError('');
    setFieldErrors({});
    let submitted = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;

    try {
      // Only send fields the user filled in. The schema is `.strict()` and
      // validates date/URL formats, so an empty string would be rejected
      // where an omitted key is simply stored as NULL.
      const payload: Record<string, string> = { cert_type: form.cert_type };
      (Object.keys(form) as (keyof FormState)[]).forEach((key) => {
        if (key !== 'cert_type' && form[key].trim()) {
          payload[key] = form[key].trim();
        }
      });

      const csrfHeaders = await Promise.race([
        getCsrfHeaders(),
        new Promise<never>((_resolve, reject) => {
          timer = setTimeout(
            () => reject(new Error('Save preparation timed out')),
            15000
          );
        }),
      ]);
      clearTimeout(timer);
      if (!mounted.current) return;
      timer = setTimeout(() => controller.abort(), 15000);
      submitted = true;
      const res = await fetch(`/api/properties/${propertyId}/compliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      const data = await res.json();
      if (!mounted.current) return;

      if (!res.ok) {
        if (Array.isArray(data.errors)) {
          const mapped: Record<string, string> = {};
          (data.errors as ApiValidationError[]).forEach((err) => {
            if (
              typeof err?.field === 'string' &&
              typeof err.message === 'string' &&
              err.field in EMPTY_FORM
            )
              mapped[err.field] = err.message;
          });
          setFieldErrors(mapped);
        }
        const message =
          typeof data.error === 'string' ? data.error : data.error?.message;
        setError(
          [401, 403, 404].includes(res.status)
            ? 'Access unavailable. Sign in again or ask the property owner, then review the saved records.'
            : typeof message === 'string'
              ? message
              : 'Failed to save certificate. Check the details and try again.'
        );
        setNeedsReview(![400, 402, 422].includes(res.status));
        return;
      }

      const cert = data.certificate;
      if (
        !cert ||
        typeof cert.id !== 'string' ||
        !cert.id ||
        cert.property_id !== propertyId ||
        cert.cert_type !== payload.cert_type ||
        Object.entries(payload).some(([key, value]) => cert[key] !== value)
      ) {
        throw new Error('Certificate save could not be confirmed.');
      }

      toast.success('Certificate saved');
      onClose();
      // The dashboard is a server component — re-fetch so the new cert
      // replaces the "No certificate uploaded" tile.
      router.refresh();
    } catch {
      if (!mounted.current) return;
      setError(
        submitted
          ? 'Certificate save could not be confirmed. Your draft is retained.'
          : 'Could not start the save. Your draft is retained; please retry.'
      );
      setNeedsReview(submitted);
    } finally {
      clearTimeout(timer);
      savingRef.current = false;
      if (mounted.current) setSaving(false);
    }
  };

  const fieldError = (key: keyof FormState) =>
    fieldErrors[key] ? (
      <p role='alert' className='mt-1 text-sm text-red-700'>
        {fieldErrors[key]}
      </p>
    ) : null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
      onClick={close}
    >
      <div
        role='dialog'
        ref={dialog}
        aria-modal='true'
        aria-labelledby='cert-modal-title'
        className='w-full max-w-lg max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl'
        onClick={(e) => e.stopPropagation()}
      >
        <div className='flex items-start justify-between px-5 py-4 border-b border-gray-100'>
          <div>
            <h2
              id='cert-modal-title'
              className='text-base font-semibold text-gray-900'
            >
              Add certificate
            </h2>
            <p className='text-xs text-gray-500 mt-0.5'>{propertyName}</p>
          </div>
          <button
            type='button'
            onClick={close}
            disabled={saving}
            aria-label='Close'
            className='min-h-11 min-w-11 p-2 text-gray-700 hover:text-gray-900 rounded disabled:opacity-50'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <form
          aria-label='Certificate details'
          onSubmit={handleSubmit}
          className='px-5 py-4'
        >
          <p className='mb-3 text-sm text-gray-700'>
            Saving replaces the whole-property record for the selected
            certificate type. Blank fields clear previously recorded details.
            Review the saved record before replacing it.
          </p>
          {error && (
            <p role='alert' className='mb-3 text-sm text-red-800'>
              {error}
            </p>
          )}
          {needsReview && (
            <div className='mb-3 text-sm text-amber-900'>
              <p>
                Review the saved certificate records before submitting again.
                This form will not automatically repeat an uncertain save.
              </p>
              <button
                type='button'
                className='min-h-11 underline'
                onClick={() => {
                  router.refresh();
                  close();
                }}
              >
                Close and review saved records
              </button>
            </div>
          )}
          <fieldset disabled={saving} className='min-w-0 space-y-4'>
            <div>
              <label className={labelClass} htmlFor='cert_type'>
                Certificate type
              </label>
              <select
                id='cert_type'
                value={form.cert_type}
                onChange={(e) => setField('cert_type', e.target.value)}
                className={inputClass}
                required
              >
                {Object.entries(ALL_CERT_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              {fieldError('cert_type')}
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className={labelClass} htmlFor='issued_date'>
                  Issued date
                </label>
                <input
                  id='issued_date'
                  type='date'
                  value={form.issued_date}
                  onChange={(e) => setField('issued_date', e.target.value)}
                  className={inputClass}
                />
                {fieldError('issued_date')}
              </div>
              <div>
                <label className={labelClass} htmlFor='expiry_date'>
                  Expiry date
                </label>
                <input
                  id='expiry_date'
                  type='date'
                  value={form.expiry_date}
                  onChange={(e) => setField('expiry_date', e.target.value)}
                  className={inputClass}
                />
                {fieldError('expiry_date')}
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor='certificate_number'>
                Certificate number
              </label>
              <input
                id='certificate_number'
                type='text'
                value={form.certificate_number}
                onChange={(e) => setField('certificate_number', e.target.value)}
                className={inputClass}
              />
              {fieldError('certificate_number')}
            </div>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <div>
                <label className={labelClass} htmlFor='issuer_name'>
                  Issuer
                </label>
                <input
                  id='issuer_name'
                  type='text'
                  value={form.issuer_name}
                  onChange={(e) => setField('issuer_name', e.target.value)}
                  className={inputClass}
                />
                {fieldError('issuer_name')}
              </div>
              <div>
                <label className={labelClass} htmlFor='issuer_registration'>
                  Registration no.
                </label>
                <input
                  id='issuer_registration'
                  type='text'
                  value={form.issuer_registration}
                  onChange={(e) =>
                    setField('issuer_registration', e.target.value)
                  }
                  className={inputClass}
                />
                {fieldError('issuer_registration')}
              </div>
            </div>

            <div>
              <label className={labelClass} htmlFor='document_url'>
                Document link
              </label>
              <input
                id='document_url'
                type='url'
                inputMode='url'
                placeholder='https://…'
                value={form.document_url}
                onChange={(e) => setField('document_url', e.target.value)}
                className={inputClass}
              />
              {fieldError('document_url')}
            </div>

            <div>
              <label className={labelClass} htmlFor='notes'>
                Notes
              </label>
              <textarea
                id='notes'
                rows={2}
                value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                className={inputClass}
              />
              {fieldError('notes')}
            </div>

            <div className='flex justify-end gap-2 pt-1'>
              <button
                type='button'
                onClick={close}
                className='px-3 py-2 text-sm text-gray-600 hover:text-gray-800'
              >
                Cancel
              </button>
              <button
                type='submit'
                disabled={saving || needsReview}
                className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60'
              >
                {saving && <Loader2 className='w-4 h-4 animate-spin' />}
                Save certificate
              </button>
            </div>
          </fieldset>
        </form>
      </div>
    </div>
  );
}
