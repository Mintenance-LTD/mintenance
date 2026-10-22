'use client';
import { useEffect, useState } from 'react';
export function ReportAccess() {
  const [reportId, setReportId] = useState(''),
    [token, setToken] = useState(''),
    [email, setEmail] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    const match = window.location.hash
      .slice(1)
      .match(/^([a-f0-9-]{36}):([a-f0-9]{64})$/);
    if (match) {
      setReportId(match[1]);
      setToken(match[2]);
    } else
      setReportId(
        new URLSearchParams(window.location.search).get('reportId') || ''
      );
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/report-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: token ? 'verify' : 'recover',
          reportId,
          email: token ? undefined : email,
          token: token || undefined,
        }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      if (
        response.ok &&
        typeof data.conversation_url === 'string' &&
        /^\/maintenance\/reports\/[a-f0-9-]{36}#[a-f0-9]{64}$/.test(
          data.conversation_url
        )
      ) {
        window.location.assign(data.conversation_url);
        return;
      }
      setMessage(
        data.message ||
          data.error ||
          'Unable to complete your request. Try again later.'
      );
    } catch {
      setMessage('Unable to confirm this request. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className='space-y-4'>
      {token ? (
        <p>
          Confirm your email to open this report and receive reply
          notifications. This replaces your previous private link.
        </p>
      ) : (
        <>
          <p>
            Enter the report reference and the email you previously registered
            for updates. We will send a short-lived verification link if they
            match.
          </p>
          <label className='block'>
            Report reference
            <input
              required
              value={reportId}
              onChange={(e) => setReportId(e.target.value.trim())}
              className='mt-2 block w-full rounded border p-3'
            />
          </label>
          <label className='block'>
            Email
            <input
              required
              type='email'
              maxLength={254}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='mt-2 block w-full rounded border p-3'
            />
          </label>
        </>
      )}
      <button
        disabled={busy}
        className='rounded-xl bg-[#2d6a5b] px-5 py-3 text-white'
      >
        {busy
          ? 'Please wait...'
          : token
            ? 'Confirm email and open report'
            : 'Send recovery email'}
      </button>
      {token && (
        <button
          type='button'
          onClick={() => {
            setToken('');
            history.replaceState(null, '', `?reportId=${reportId}`);
          }}
          className='ml-3 underline'
        >
          Request a new link
        </button>
      )}
      <p role='status'>{message}</p>
    </form>
  );
}
