'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { fetchWithCSRF } from '@/lib/hooks/useCSRF';

export function PublishQuoteAmendment({
  jobId,
  revisionId,
}: {
  jobId: string;
  revisionId: string;
}) {
  const confirm = useConfirm();
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [done, setDone] = useState(false);
  const publish = async () => {
    if (lock.current || done) return;
    lock.current = true;
    setBusy(true);
    setMessage('');
    try {
      if (
        !(await confirm({
          title: 'Submit for customer review?',
          description:
            'The customer will see this reason and complete pricing proposal on the job’s Quote amendments page. The accepted price will not change until approval and application.',
          confirmText: 'Submit for review',
        }))
      )
        return;
      const response = await fetchWithCSRF(
        `/api/jobs/${jobId}/quote-amendments/${revisionId}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'publish',
            expected_version: 0,
            confirmed: true,
          }),
        }
      );
      const data = await response.json();
      if (!response.ok || data.amendment?.id !== revisionId)
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ||
                'Could not confirm submission. Retry or check customer review.'
        );
      setDone(true);
      setMessage(
        'Available for customer review on the job. No email or push notification was sent.'
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Could not submit proposal.'
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <div className='space-y-2'>
      <button
        type='button'
        className='btn btn-secondary min-h-11'
        disabled={busy || done}
        onClick={() => void publish()}
      >
        {busy ? 'Submitting…' : 'Submit for customer review'}
      </button>
      {message && <p role='status'>{message}</p>}
      <Link className='block underline' href={`/jobs/${jobId}/amendments`}>
        View customer review and application status
      </Link>
    </div>
  );
}
