'use client';
import { useState } from 'react';
import { useCSRF } from '@/lib/hooks/useCSRF';
export function ContractCancellation({ contractId }: { contractId: string }) {
  const { csrfToken } = useCSRF();
  const [message, setMessage] = useState('');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [requestId] = useState(() => crypto.randomUUID());
  async function submit() {
    setBusy(true);
    try {
      const r = await fetch(`/api/contracts/${contractId}/cancellation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify({ message, requestId }),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(d.error?.message || d.error || 'Could not send notice');
      setResult(d.message);
      setSent(true);
      setMessage('');
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Could not send notice');
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className='rounded-xl border p-4 text-sm'>
      <summary>Cancellation and agreement records</summary>
      <p>
        <a href={`/api/contracts/${contractId}/consent?download=1`}>
          Download the agreement and recorded choices
        </a>
      </p>
      <p>
        Send a clear cancellation notice here, or notify the contractor and copy
        admin@mintenance.co.uk. Sending a notice does not itself confirm a
        refund or waive your rights.
      </p>
      <label>
        Cancellation notice
        <textarea
          className='block w-full rounded border p-3'
          maxLength={5000}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
      </label>
      <button
        type='button'
        className='btn-primary mt-3'
        disabled={sent || busy || !message.trim()}
        onClick={submit}
      >
        Send cancellation notice
      </button>
      <p role='status'>{result}</p>
    </details>
  );
}
