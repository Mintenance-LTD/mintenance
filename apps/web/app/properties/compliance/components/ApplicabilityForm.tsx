'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfHeaders } from '@/lib/csrf-client';
export interface Applicability {
  decision: 'unknown' | 'applicable' | 'not_applicable';
  reason: string;
}
export function ApplicabilityForm({
  propertyId,
  certType,
  label,
  initial,
}: {
  propertyId: string;
  certType: string;
  label: string;
  initial?: Applicability;
}) {
  const router = useRouter();
  const [decision, setDecision] = useState(initial?.decision || 'unknown');
  const [reason, setReason] = useState(initial?.reason || '');
  const [saving, setSaving] = useState(false);
  const savingRef = useRef(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  return (
    <form
      className='mt-4 space-y-2 text-xs'
      onSubmit={async (event) => {
        event.preventDefault();
        if (savingRef.current) return;
        savingRef.current = true;
        setSaving(true);
        setMessage('');
        setError(false);
        try {
          const response = await fetch(
            `/api/properties/${propertyId}/compliance/applicability`,
            {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                ...(await getCsrfHeaders()),
              },
              body: JSON.stringify({ cert_type: certType, decision, reason }),
            }
          );
          if (!response.ok)
            throw new Error('Could not save. Check your entry and try again.');
          setMessage('Applicability saved.');
          router.refresh();
        } catch (error) {
          setError(true);
          setMessage(
            error instanceof Error
              ? error.message
              : 'Could not save. Please retry.'
          );
        } finally {
          savingRef.current = false;
          setSaving(false);
        }
      }}
    >
      <label className='block'>
        Applicability — {label}
        <select
          className='block w-full border rounded p-2'
          value={decision}
          disabled={saving}
          onChange={(event) =>
            setDecision(event.target.value as Applicability['decision'])
          }
        >
          <option value='unknown'>Not assessed</option>
          <option value='applicable'>Applies to this property</option>
          <option value='not_applicable'>Not applicable</option>
        </select>
      </label>
      <label className='block'>
        Reason / assessment notes
        <textarea
          className='block w-full border rounded p-2'
          value={reason}
          disabled={saving}
          maxLength={1000}
          required={decision === 'not_applicable'}
          minLength={decision === 'not_applicable' ? 5 : undefined}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button
        className='border rounded px-2 py-1'
        disabled={saving}
        type='submit'
      >
        {saving ? 'Saving…' : 'Save applicability'}
      </button>
      {message && <p role={error ? 'alert' : 'status'}>{message}</p>}
    </form>
  );
}
