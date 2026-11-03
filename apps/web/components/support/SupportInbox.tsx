'use client';
import { useCallback, useEffect, useState } from 'react';
import { useCSRF } from '@/lib/hooks/useCSRF';
type Ticket = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  category: string;
  created_at: string;
};
type Reply = {
  id: string;
  body: string;
  created_at: string;
  author_id: string | null;
};
export function SupportInbox({ signedIn }: { signedIn: boolean }) {
  const { csrfToken } = useCSRF();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [category, setCategory] = useState('general');
  const [result, setResult] = useState('');
  const [busy, setBusy] = useState(false);
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const load = useCallback(async () => {
    if (!signedIn) return;
    const r = await fetch('/api/support/tickets');
    if (!r.ok) throw new Error('Could not load your cases');
    setTickets((await r.json()).tickets || []);
  }, [signedIn]);
  useEffect(() => {
    void load().catch((e) => setResult(e.message));
  }, [load]);
  useEffect(() => {
    if (!selected) return;
    const controller = new AbortController();
    const timer = setInterval(async () => {
      try {
        const response = await fetch(`/api/support/tickets/${selected}`, {signal:controller.signal});
        if(response.ok) setReplies((await response.json()).messages);
      } catch { /* Keep the draft and current conversation during a network interruption. */ }
    }, 15000);
    return () => { clearInterval(timer); controller.abort(); };
  }, [selected]);
  async function open(id: string) {
    try {
      const r = await fetch(`/api/support/tickets/${id}`);
      if (!r.ok) throw new Error('Could not load case');
      const d = await r.json();
      setSelected(id);
      setReplies(d.messages);
      setMessage('');
      setRequestId(crypto.randomUUID());
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Could not load case');
    }
  }
  async function send() {
    setBusy(true);
    setResult('');
    try {
      const path = selected
        ? `/api/support/tickets/${selected}/messages`
        : signedIn
          ? '/api/support/tickets'
          : '/api/support/contact';
      const body = selected
        ? { body: message, requestId }
        : {
            subject,
            message,
            category,
            requestId,
            ...(!signedIn ? { email } : {}),
          };
      const r = await fetch(path, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken || '',
        },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok)
        throw new Error(
          d.error?.message || d.error || 'Could not send message'
        );
      setResult(d.message || 'Reply saved.');
      setMessage('');
      setRequestId(crypto.randomUUID());
      if (!signedIn)
        setResult(
          `Request received. Keep reference ${d.id}. We will reply by email.`
        );
      else {
        await load();
        await open(selected || d.ticket.id);
      }
    } catch (e) {
      setResult(e instanceof Error ? e.message : 'Could not send message');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className='grid gap-6 md:grid-cols-[260px_1fr]'>
      <aside>
        <button
          className='btn-primary mb-4'
          onClick={() => {
            setSelected(null);
            setReplies([]);
            setMessage('');
            setRequestId(crypto.randomUUID());
          }}
        >
          New request
        </button>
        {tickets.map((t) => (
          <button
            key={t.id}
            className='block w-full rounded border p-3 text-left mb-2'
            onClick={() => void open(t.id)}
          >
            <strong>{t.subject}</strong>
            <span className='block text-sm'>
              {t.status} · {t.category}
            </span>
          </button>
        ))}
      </aside>
      <section className='rounded-xl border bg-white p-5 space-y-4'>
        {selected ? (
          <>
            <h2 className='text-xl font-semibold'>Your conversation</h2>
            <p className='text-xs'>Reference: {selected}</p>
            {replies.map((r) => (
              <article key={r.id} className='rounded bg-gray-50 p-3'>
                <p className='whitespace-pre-wrap'>{r.body}</p>
                <time className='text-xs'>
                  {new Date(r.created_at).toLocaleString('en-GB')}
                </time>
              </article>
            ))}
          </>
        ) : (
          <>
            <h2 className='text-xl font-semibold'>How can we help?</h2>
            {!signedIn && (
              <label className='block'>
                Your email
                <input
                  className='block w-full rounded border p-3'
                  type='email'
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
            )}
            <label className='block'>
              Subject
              <input
                className='block w-full rounded border p-3'
                maxLength={200}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
              />
            </label>
            <label className='block'>
              Topic
              <select
                className='block w-full rounded border p-3'
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {[
                  'general',
                  'account',
                  'payment',
                  'safety',
                  'cancellation',
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
          </>
        )}
        <label className='block'>
          Message
          <textarea
            className='block w-full rounded border p-3'
            rows={5}
            maxLength={5000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </label>
        <p className='text-sm'>
          Do not send passwords or full payment-card details. Replies appear
          here when you sign in, with an email notification.
        </p>
        <button
          className='btn-primary'
          disabled={
            busy ||
            !message.trim() ||
            (!selected && !subject.trim()) ||
            (!signedIn && !email.trim())
          }
          onClick={() => void send()}
        >
          {busy ? 'Saving…' : 'Send message'}
        </button>
        <p role='status'>{result}</p>
      </section>
    </div>
  );
}
