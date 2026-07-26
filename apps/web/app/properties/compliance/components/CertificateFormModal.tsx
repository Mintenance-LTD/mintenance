'use client';

/**
 * Certificate capture form for the compliance dashboard.
 *
 * Until 2026-07-26 the dashboard's only "Upload Certificate" affordance was
 * a Link pointing at `/api/properties/[id]/compliance?action=upload` — a JSON
 * endpoint with no such query handling — so a landlord who clicked it landed
 * on raw JSON and no certificate could be created from the web at all.
 */

import React, { useEffect, useState } from 'react';
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

export function CertificateFormModal({
  propertyId,
  propertyName,
  initialCertType,
  onClose,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState<FormState>({
    ...EMPTY_FORM,
    cert_type: initialCertType,
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

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
    setSaving(true);
    setFieldErrors({});

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

      const res = await fetch(`/api/properties/${propertyId}/compliance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        if (Array.isArray(data.errors)) {
          const mapped: Record<string, string> = {};
          (data.errors as ApiValidationError[]).forEach((err) => {
            mapped[err.field] = err.message;
          });
          setFieldErrors(mapped);
        }
        toast.error(data.error || 'Failed to save certificate');
        return;
      }

      toast.success('Certificate saved');
      onClose();
      // The dashboard is a server component — re-fetch so the new cert
      // replaces the "No certificate uploaded" tile.
      router.refresh();
    } catch {
      toast.error('Failed to save certificate');
    } finally {
      setSaving(false);
    }
  };

  const fieldError = (key: keyof FormState) =>
    fieldErrors[key] ? (
      <p className='mt-1 text-xs text-red-600'>{fieldErrors[key]}</p>
    ) : null;

  return (
    <div
      className='fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4'
      onClick={onClose}
    >
      <div
        role='dialog'
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
            onClick={onClose}
            aria-label='Close'
            className='p-1 text-gray-400 hover:text-gray-600 rounded'
          >
            <X className='w-4 h-4' />
          </button>
        </div>

        <form onSubmit={handleSubmit} className='px-5 py-4 space-y-4'>
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

          <div className='grid grid-cols-2 gap-3'>
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

          <div className='grid grid-cols-2 gap-3'>
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
              onClick={onClose}
              className='px-3 py-2 text-sm text-gray-600 hover:text-gray-800'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={saving}
              className='inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-60'
            >
              {saving && <Loader2 className='w-4 h-4 animate-spin' />}
              Save certificate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
