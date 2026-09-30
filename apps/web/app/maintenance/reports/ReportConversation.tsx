'use client';
import { useEffect, useState } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
type Message = {
  id: string;
  author_role: string;
  body: string;
  created_at: string;
};
export function ReportConversation({ reportId }: { reportId: string }) {
  const [receipt, setReceipt] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [offset, setOffset] = useState(0),
    [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<{
      status: string;
      messages: Message[];
      hasMore: boolean;
    } | null>(null),
    [error, setError] = useState(''),
    [body, setBody] = useState(''),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState<{ id: string; body: string } | null>(null);
  useEffect(() => {
    const readReceipt = () => {
      const hash = window.location.hash.slice(1);
      // An accessibility anchor must not discard the receipt on a reload.
      // Keep it only in this browser tab, scoped to this specific report.
      const key = `report-receipt:${reportId}`;
      let value = /^[a-f0-9]{64}$/.test(hash) ? hash : null;
      try {
        if (value) sessionStorage.setItem(key, value);
        else if (!hash || hash === 'main-content')
          value = sessionStorage.getItem(key);
      } catch {
        /* Storage can be unavailable in private browser modes. */
      }
      setReceipt(value && /^[a-f0-9]{64}$/.test(value) ? value : null);
      setReady(true);
    };
    readReceipt();
    window.addEventListener('hashchange', readReceipt);
    return () => window.removeEventListener('hashchange', readReceipt);
  }, [reportId]);
  const endpoint = '/api/report-conversation' + (receipt ? '/receipt' : '');
  useEffect(() => {
    if (!ready) return;
    const abort = new AbortController();
    setError('');
    setData(null);
    fetch(`${endpoint}?reportId=${reportId}&offset=${offset}`, {
      headers: receipt ? { 'x-report-receipt': receipt } : {},
      signal: abort.signal,
      cache: 'no-store',
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            'Unable to open this conversation. Check your sign-in or private receipt link.'
          );
        return response.json();
      })
      .then(setData)
      .catch((reason) => {
        if (!abort.signal.aborted) setError(reason.message);
      });
    return () => abort.abort();
  }, [ready, receipt, endpoint, reportId, offset, attempt]);
  async function send() {
    if (busy || !body.trim()) return;
    setBusy(true);
    setError('');
    const message =
      pending?.body === body ? pending : { id: crypto.randomUUID(), body };
    setPending(message);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(receipt
            ? { 'x-report-receipt': receipt }
            : await getCsrfHeaders()),
        },
        body: JSON.stringify({
          reportId,
          messageId: message.id,
          body: message.body,
          offset,
        }),
      });
      if (!response.ok)
        throw new Error(
          'Message was not confirmed. Retry to send the same message.'
        );
      setBody('');
      setPending(null);
      setAttempt((v) => v + 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to send');
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className='space-y-4 rounded-xl border bg-white p-5'>
      <h2 className='text-xl font-semibold'>Issue conversation</h2>
      <p>
        Messages here are shared with the resident, property managers and the
        assigned contractor. Do not include door codes or payment details.
      </p>
      <p>
        Keep your private receipt link to return. It grants access to this issue
        only.
      </p>
      {error && <p role='alert'>{error}</p>}
      <button onClick={() => setAttempt((v) => v + 1)} className='underline'>
        Refresh updates
      </button>
      {data && (
        <>
          <p>Status: {data.status}</p>
          <ul className='space-y-3'>
            {data.messages.map((message) => (
              <li key={message.id} className='border-b pb-3'>
                <strong>{message.author_role}</strong>
                <time className='ml-2'>
                  {new Date(message.created_at).toLocaleString('en-GB')}
                </time>
                <p className='whitespace-pre-wrap'>{message.body}</p>
              </li>
            ))}
          </ul>
          <div className='flex gap-4'>
            <button
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - 25))}
            >
              Previous messages
            </button>
            <button
              disabled={!data.hasMore}
              onClick={() => setOffset(offset + 25)}
            >
              Next messages
            </button>
          </div>
          <label className='block'>
            Message
            <textarea
              className='block w-full rounded border p-3'
              maxLength={5000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={busy}
            />
          </label>
          <button
            className='rounded border px-4 py-2'
            disabled={busy || !body.trim()}
            onClick={() => void send()}
          >
            {busy ? 'Sending…' : 'Send message'}
          </button>
        </>
      )}
    </section>
  );
}
