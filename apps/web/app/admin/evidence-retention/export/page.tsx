'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { fetchWithCsrf } from '@/lib/csrf-client';
import { MfaStepUpDialog } from '@/components/auth/MfaStepUpDialog';

type Request = {
  kind: string;
  recordId: string;
  subjectId: string;
  caseReference: string;
  identityVerified: boolean;
};
export default function RetainedEvidenceExportPage() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState<Request | null>(null);
  const lock = useRef(false);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);
  async function download(body: Request) {
    if (lock.current) return;
    lock.current = true;
    const abort = new AbortController();
    controller.current = abort;
    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetchWithCsrf(
        '/api/admin/evidence-retention/export',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: abort.signal,
        }
      );
      if (!response.ok) {
        const data = await response.json();
        if (response.status === 403 && data.requiresStepUp) {
          setPending(body);
          return;
        }
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || 'Export unavailable. Please retry.'
        );
      }
      const blob = await response.blob();
      if (abort.signal.aborted) return;
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `retained-${body.kind}-${body.recordId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage(
        'Review packet downloaded. Check external_references and privacy before any delivery. This is one record, not a complete account export.'
      );
    } catch (failure) {
      if (!abort.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : 'Export unavailable. Please retry.'
        );
    } finally {
      lock.current = false;
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  return (
    <main className='mx-auto max-w-3xl space-y-5 p-6'>
      <Link className='underline' href='/admin/evidence-retention'>
        Back to retention reviews
      </Link>
      <h1 className='text-2xl font-semibold'>Closed-account evidence export</h1>
      <p>
        Prepare a restricted staff review packet for one archived contract or
        dispute. Verify the requester outside the app and record the case
        reference first. The subject must be a recorded participant; a matching
        email is not enough.
      </p>
      <p>
        The packet may contain other parties’ personal data. Review and redact
        it before secure delivery. Recognised dispute files are embedded;
        unfamiliar references are listed for follow-up. Large records need an
        offline export.
      </p>
      {error && <p role='alert'>{error}</p>}
      {message && <p role='status'>{message}</p>}
      <form
        className='space-y-4 rounded-xl border p-5'
        onSubmit={(event) => {
          event.preventDefault();
          const fields = new FormData(event.currentTarget);
          void download({
            kind: String(fields.get('kind')),
            recordId: String(fields.get('recordId')).trim(),
            subjectId: String(fields.get('subjectId')).trim(),
            caseReference: String(fields.get('caseReference')).trim(),
            identityVerified: fields.get('identityVerified') === 'on',
          });
        }}
      >
        <fieldset disabled={busy || !!pending} className='space-y-4'>
          <label className='block'>
            Record type
            <select name='kind' className='ml-3 rounded border p-2'>
              <option value='contract'>Contract</option>
              <option value='dispute'>Dispute</option>
            </select>
          </label>
          <label className='block'>
            Archived record ID
            <input
              name='recordId'
              required
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='block'>
            Original account ID
            <input
              name='subjectId'
              required
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='block'>
            Verified request case reference
            <input
              name='caseReference'
              required
              minLength={5}
              maxLength={100}
              className='block w-full rounded border p-2'
            />
          </label>
          <label className='flex gap-2'>
            <input name='identityVerified' type='checkbox' required />I verified
            the requester’s identity and authority in this case.
          </label>
          <button type='submit' className='rounded border px-4 py-2'>
            {busy ? 'Preparing…' : 'Download staff review packet'}
          </button>
        </fieldset>
      </form>
      {pending && (
        <MfaStepUpDialog
          onCancel={() => setPending(null)}
          onSuccess={() => {
            const body = pending;
            setPending(null);
            void download(body);
          }}
        />
      )}
    </main>
  );
}
