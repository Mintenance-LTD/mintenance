'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

export function OpenJobDispute({ jobId }: { jobId: string }) {
  const router = useRouter();
  const inFlight = useRef(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function openDispute() {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `/api/jobs/${encodeURIComponent(jobId)}/escrow`,
        {
          credentials: 'same-origin',
          cache: 'no-store',
        }
      );
      if (!response.ok)
        throw new Error('Unable to load this payment. Please retry.');
      const { escrow } = await response.json();
      if (
        !escrow ||
        escrow.jobId !== jobId ||
        typeof escrow.id !== 'string' ||
        !escrow.id
      ) {
        throw new Error(
          'No payment reference is available for this job. Please contact support.'
        );
      }
      router.push(`/disputes/create?escrowId=${encodeURIComponent(escrow.id)}`);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : 'Unable to open a dispute. Please retry.'
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type='button'
        className='btn btn-secondary'
        disabled={loading}
        onClick={openDispute}
      >
        {loading ? 'Loading payment…' : 'Open a dispute instead'}
      </button>
      {error ? <p role='alert'>{error}</p> : null}
    </>
  );
}
