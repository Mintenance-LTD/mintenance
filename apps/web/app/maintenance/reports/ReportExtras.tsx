'use client';
import { useState } from 'react';

export function ReportExtras({
  reportId,
  receipt,
  photos = [],
  refresh,
}: {
  reportId: string;
  receipt?: string | null;
  photos?: { url: string; slot: number }[];
  refresh?: () => void;
}) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [slot, setSlot] = useState('1');
  async function email(action: 'request' | 'disable') {
    setBusy(true);
    setMessage('');
    try {
      const response = await fetch('/api/report-access', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-report-receipt': receipt!,
        },
        body: JSON.stringify({ reportId, action }),
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();
      setMessage(
        data.message ||
          data.error ||
          'Unable to update email preferences. Keep your private link.'
      );
    } catch {
      setMessage(
        'Email request could not be confirmed. Your report is saved. Keep your private link.'
      );
    } finally {
      setBusy(false);
    }
  }
  async function upload(file: File, slot: string) {
    if (
      file.size > 3 * 1024 * 1024 ||
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)
    ) {
      setMessage('Choose a JPEG, PNG or WebP photo smaller than 3 MB.');
      return;
    }
    setBusy(true);
    setMessage('');
    try {
      const body = new FormData();
      body.append('photo', file);
      const response = await fetch(
        `/api/report-photos?reportId=${reportId}&slot=${slot}`,
        {
          method: 'POST',
          headers: { 'x-report-receipt': receipt! },
          body,
          signal: AbortSignal.timeout(30000),
        }
      );
      if (!response.ok) throw new Error();
      setMessage('Photo saved.');
      refresh?.();
    } catch {
      setMessage(
        'Photo upload was not confirmed. Your report is saved. Retry the same photo slot.'
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className='my-6 space-y-4 rounded-xl border p-4'>
      <h2 className='text-lg font-semibold'>Photos and email updates</h2>
      <div className='flex flex-wrap gap-3'>
        {photos.map((photo) => (
          <a
            key={photo.slot}
            href={photo.url}
            target='_blank'
            rel='noreferrer'
            className='underline'
          >
            View photo {photo.slot}
          </a>
        ))}
      </div>
      {receipt && (
        <>
          <p className='text-sm'>
            Add up to five photos. JPEG, PNG or WebP, up to 3 MB each. Photos
            are shared with the people handling this report.
          </p>
          <div className='flex flex-wrap items-end gap-4'>
            <label className='text-sm'>
              Photo slot
              <select
                className='mt-1 block rounded border p-2'
                value={slot}
                disabled={busy}
                onChange={(e) => setSlot(e.target.value)}
              >
                {[1, 2, 3, 4, 5].map((value) => (
                  <option key={value} value={value}>
                    Photo {value}
                    {photos.some((p) => p.slot === value) ? ' (replace)' : ''}
                  </option>
                ))}
              </select>
            </label>
            <label className='min-w-0 flex-1 text-sm'>
              Choose photo
              <input
                className='mt-1 block w-full text-sm'
                type='file'
                accept='image/jpeg,image/png,image/webp'
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void upload(file, slot);
                  e.target.value = '';
                }}
              />
            </label>
          </div>
          <p className='text-sm'>
            If you supplied an email, confirm it to receive reply notifications
            and recover access later. Confirming an email link replaces your
            previous private link.
          </p>
          <div className='flex flex-wrap gap-3'>
            <button
              disabled={busy}
              onClick={() => void email('request')}
              className='rounded-lg border px-4 py-2'
            >
              Email me a verification link
            </button>
            <button
              disabled={busy}
              onClick={() => void email('disable')}
              className='underline'
            >
              Turn off reply emails
            </button>
          </div>
        </>
      )}
      <p role='status'>{busy ? 'Please wait...' : message}</p>
      <a
        className='underline'
        href={`/maintenance/report-access?reportId=${reportId}`}
      >
        Recover a lost private link
      </a>
    </section>
  );
}
