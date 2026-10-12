'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCsrfHeaders } from '@/lib/csrf-client';
interface Attempt {
  id: string;
  status: string;
  created_at: string;
  device_count: number;
  review_note: string | null;
}
export function PushAttemptReview() {
  const client = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const query = useQuery({
    queryKey: ['admin', 'push-attempts'],
    enabled: open,
    queryFn: async () => {
      const response = await fetch('/api/admin/push-attempts', {
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('Could not load push attempts');
      return (await response.json()).attempts as Attempt[];
    },
  });
  const review = async (id: string) => {
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/admin/push-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(await getCsrfHeaders()),
        },
        body: JSON.stringify({ id, note: notes[id] ?? '' }),
      });
      if (!response.ok)
        throw new Error(
          'Review was not saved. Use at least 20 characters and retry.'
        );
      const result = await response.json();
      if (
        result.attempt?.id !== id ||
        result.attempt.status !== 'reviewed_unknown'
      )
        throw new Error(
          'The saved review could not be confirmed. Reload the list.'
        );
      await client.invalidateQueries({ queryKey: ['admin', 'push-attempts'] });
      await client.invalidateQueries({
        queryKey: ['admin', 'recovery-health'],
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save review');
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className='mt-4'>
      <button
        type='button'
        className='underline text-sm'
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Review uncertain push delivery
      </button>
      {open && (
        <div className='mt-3 space-y-3'>
          <p className='text-sm text-slate-600'>
            These attempts have no reliable delivery confirmation. Reviewing
            records the outcome as unknown. It does not resend the notification
            or mark it delivered.
          </p>
          {error && <p role='alert'>{error}</p>}
          {query.isError ? (
            <p role='alert'>
              Could not load attempts.{' '}
              <button onClick={() => query.refetch()}>Retry</button>
            </p>
          ) : query.isPending ? (
            <p>Loading attempts...</p>
          ) : (
            <>
              {!query.data?.length && <p>No uncertain attempts.</p>}
              {query.data?.map((a) => (
                <div key={a.id} className='rounded border p-3 text-sm'>
                  <p>
                    {new Date(a.created_at).toLocaleString('en-GB')} -{' '}
                    {a.device_count} device(s)
                  </p>
                  {a.status === 'reviewed_unknown' ? (
                    <p>Reviewed: delivery unknown. {a.review_note}</p>
                  ) : (
                    <>
                      <label>
                        Review note
                        <textarea
                          className='block w-full rounded border p-2'
                          aria-label={`Review note ${a.id}`}
                          value={notes[a.id] ?? ''}
                          onChange={(e) =>
                            setNotes({ ...notes, [a.id]: e.target.value })
                          }
                          maxLength={1000}
                        />
                      </label>
                      <button
                        className='mt-2 rounded border p-2'
                        disabled={
                          saving || (notes[a.id]?.trim().length ?? 0) < 20
                        }
                        onClick={() => review(a.id)}
                      >
                        Record review: delivery unknown
                      </button>
                    </>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
