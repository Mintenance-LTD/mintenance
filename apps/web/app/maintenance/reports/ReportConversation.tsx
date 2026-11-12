'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  parseReportHistory,
  reportHistoryDate,
  reportStatusLabel,
  type ReportHistory,
} from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { ReportExtras } from './ReportExtras';
export function ReportConversation({ reportId }: { reportId: string }) {
  return <CaseConversation key={reportId} reportId={reportId} />;
}
function CaseConversation({ reportId }: { reportId: string }) {
  const mounted = useRef(true),
    sending = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const [latest, setLatest] = useState(false),
    [notice, setNotice] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null),
    [ready, setReady] = useState(false),
    [offset, setOffset] = useState(0),
    [attempt, setAttempt] = useState(0);
  const [data, setData] = useState<ReportHistory | null>(null),
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
    const timeout = setTimeout(() => {
      abort.abort();
      setError('Loading took too long. Refresh to retry.');
    }, 15000);
    fetch(
      `${endpoint}?reportId=${reportId}&offset=${offset}&latest=${latest}`,
      {
        headers: receipt ? { 'x-report-receipt': receipt } : {},
        signal: abort.signal,
        cache: 'no-store',
      }
    )
      .then(async (response) => {
        if (response.status === 403 && receipt)
          throw new Error(
            'This private link is no longer valid. Confirming an email link replaces the previous private link. Open the link from your latest confirmation, or recover access below.'
          );
        if (!response.ok)
          throw new Error(
            'Unable to open this conversation. Check your sign-in or private receipt link.'
          );
        return response.json();
      })
      .then((value) => {
        if (!abort.signal.aborted) setData(parseReportHistory(value));
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(reason.message);
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      clearTimeout(timeout);
      abort.abort();
    };
  }, [ready, receipt, endpoint, reportId, offset, attempt, latest]);
  async function send() {
    if (sending.current || !body.trim()) return;
    sending.current = true;
    setNotice('');
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
        signal: AbortSignal.timeout(15000),
      });
      if (!response.ok || (await response.json()).messageId !== message.id)
        throw new Error(
          'Message was not confirmed. Retry to send the same message.'
        );
      if (!mounted.current) return;
      setBody('');
      setPending(null);
      setNotice('Message sent. Showing latest updates.');
      setLatest(true);
      setAttempt((v) => v + 1);
    } catch (reason) {
      if (mounted.current)
        setError(reason instanceof Error ? reason.message : 'Unable to send');
    } finally {
      sending.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  return (
    <section className='space-y-4 rounded-xl border bg-white p-5'>
      <h1 className='text-xl font-semibold'>Tenant case history</h1>
      <p className='break-all text-sm'>Report reference: {reportId}</p>
      <p>
        Messages here are shared with the resident, property managers and the
        assigned contractor. Do not include door codes or payment details.
      </p>
      {receipt && (
        <p>
          Keep your private receipt link to return. It grants access to this
          issue only.
        </p>
      )}
      {notice && <p role='status'>{notice}</p>}
      {ready && !data && !error && <p role='status'>Loading case history…</p>}
      {error && (
        <div
          role='alert'
          className='space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4'
        >
          <p>{error}</p>
          {receipt ? (
            <a
              className='inline-block rounded-lg bg-[#2d6a5b] px-4 py-2 font-semibold text-white'
              href={`/maintenance/report-access?reportId=${reportId}`}
            >
              Recover access by email
            </a>
          ) : (
            <Link
              href={`/login?redirect=${encodeURIComponent(`/maintenance/reports/${reportId}`)}`}
            >
              Sign in to this report
            </Link>
          )}
        </div>
      )}
      <button onClick={() => setAttempt((v) => v + 1)} className='underline'>
        Refresh updates
      </button>
      {data && (
        <>
          {data.role === 'manager' && (
            <Link className='underline' href='/properties/work-queue'>
              Back to action queue
            </Link>
          )}
          {data.role === 'contractor' && (
            <Link className='underline' href='/contractor/jobs'>
              Back to jobs
            </Link>
          )}
          <p>Current status: {reportStatusLabel(data.status)}</p>
          {data.summary ? (
            <section
              aria-label='Original report'
              className='rounded-lg bg-slate-50 p-4'
            >
              <h2 className='font-semibold'>
                Original report · {data.summary.category.replace(/_/g, ' ')}
              </h2>
              <p>Submitted {reportHistoryDate(data.summary.created_at)}</p>
              <p className='whitespace-pre-wrap break-words'>
                {data.summary.description}
              </p>
            </section>
          ) : (
            <p>Original report summary unavailable. Refresh to retry.</p>
          )}
          <h2 className='font-semibold'>Recorded updates</h2>
          <p className='text-sm'>
            Oldest first within each page. Status changes appear as system
            updates; earlier unrecorded changes are not reconstructed.
          </p>
          {data.photos_unavailable && (
            <p role='status'>
              Photos could not be loaded. Refresh to try again.
            </p>
          )}
          <ReportExtras
            reportId={reportId}
            receipt={receipt}
            photos={data.photos}
            refresh={() => setAttempt((v) => v + 1)}
          />
          {data.messages.length === 0 && (
            <p>No recorded updates on this page.</p>
          )}
          <ul className='space-y-3'>
            {data.messages.map((message) => (
              <li key={message.id} className='border-b pb-3'>
                <strong>
                  {message.author_role === 'system'
                    ? 'Status update'
                    : message.author_role}
                </strong>
                <time className='ml-2' dateTime={message.created_at}>
                  {reportHistoryDate(message.created_at)}
                </time>
                <p className='whitespace-pre-wrap break-words'>
                  {message.body}
                </p>
              </li>
            ))}
          </ul>
          <nav
            aria-label='Case history pages'
            className='flex flex-wrap items-center gap-4'
          >
            <span>Page {Math.floor(data.pageOffset / 25) + 1}</span>
            <button
              disabled={data.pageOffset === 0}
              className='min-h-12'
              onClick={() => {
                setLatest(false);
                setOffset(Math.max(0, data.pageOffset - 25));
              }}
            >
              Older updates
            </button>
            <button
              disabled={!data.hasMore}
              className='min-h-12'
              onClick={() => {
                setLatest(false);
                setOffset(data.pageOffset + 25);
              }}
            >
              Newer updates
            </button>
            <button
              className='min-h-12'
              onClick={() => {
                setLatest(true);
                setAttempt((v) => v + 1);
              }}
            >
              Latest updates
            </button>
          </nav>
          <label className='block'>
            Message
            <textarea
              className='block w-full rounded border p-3'
              maxLength={5000}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              disabled={busy || !!pending}
            />
          </label>
          {pending && !busy && (
            <p>
              The previous send is unconfirmed. Retry sends the same message
              safely.
            </p>
          )}
          <button
            className='rounded border px-4 py-2'
            disabled={busy || !body.trim()}
            onClick={() => void send()}
          >
            {busy ? 'Sending…' : pending ? 'Retry message' : 'Send message'}
          </button>
        </>
      )}
    </section>
  );
}
