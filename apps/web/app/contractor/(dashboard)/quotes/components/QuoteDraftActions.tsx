'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export function QuoteDraftActions({
  id,
  version,
}: {
  id: string;
  version?: string | null;
}) {
  const router = useRouter();
  const lock = useRef(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  useEffect(() => {
    setBlocked(false);
    setError('');
  }, [id, version]);
  const send = async () => {
    if (lock.current || blocked) return;
    lock.current = true;
    setSending(true);
    setError('');
    try {
      const res = await fetch('/api/contractor/send-quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          quoteId: id,
          expected_updated_at: version ?? undefined,
        }),
      });
      const data = await res.json().catch(() => null);
      if (res.status === 409) {
        setBlocked(true);
        router.refresh();
        throw new Error(
          'Quote changed. Review the latest quote before sending.'
        );
      }
      if (!res.ok || data?.success !== true)
        throw new Error(
          typeof data?.error === 'string'
            ? data.error
            : data?.error?.message || 'Could not send quote.'
        );
      setBlocked(true);
      toast.success('Quote sent');
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not send quote.'
      );
    } finally {
      lock.current = false;
      setSending(false);
    }
  };
  return (
    <div className='flex flex-wrap gap-2'>
      <button
        type='button'
        className='btn btn-secondary min-h-11'
        disabled={sending || blocked}
        onClick={() => router.push(`/contractor/quotes/${id}/edit`)}
      >
        Edit draft
      </button>
      <button
        type='button'
        className='btn btn-secondary min-h-11'
        disabled={sending || blocked}
        onClick={send}
      >
        {sending ? 'Sending…' : 'Send to client'}
      </button>
      {error && (
        <p role='alert' className='w-full text-red-700'>
          {error}
        </p>
      )}
    </div>
  );
}
