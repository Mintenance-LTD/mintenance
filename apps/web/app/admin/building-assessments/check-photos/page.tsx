'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getCsrfHeaders } from '@/lib/csrf-client';

export default function CheckPhotosPage() {
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [assessmentId, setAssessmentId] = useState<string | null>(null);
  async function assess(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !files.length) return;
    setBusy(true);
    setMessage('Uploading photos…');
    setAssessmentId(null);
    try {
      const headers = await getCsrfHeaders();
      const form = new FormData();
      for (const file of files) form.append('photos', file);
      const upload = await fetch('/api/assessments/photo-upload', {
        method: 'POST',
        headers,
        body: form,
      });
      const uploaded = await upload.json();
      if (!upload.ok || uploaded.urls?.length !== files.length)
        throw new Error(
          'Some photos could not be uploaded. Check the files and try again.'
        );
      setMessage('Checking photos and assessing visible evidence…');
      const response = await fetch('/api/building-surveyor/assess', {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: uploaded.urls, domain: 'building' }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          typeof result.message === 'string'
            ? result.message
            : 'The assessment could not complete. Please try again.'
        );
      setAssessmentId(result.assessmentId ?? null);
      setMessage('Assessment complete. Review the result before using it.');
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'Unable to assess the photos.'
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className='mx-auto max-w-3xl p-6 space-y-4'>
      <Link
        href='/admin/building-assessments/review-queue'
        className='underline'
      >
        Photo review queue
      </Link>
      <h1 className='text-2xl font-semibold'>Check assessment photos</h1>
      <p>
        Choose up to four original photos. Include an overview and a clear
        close-up. Photos are saved privately; the assessment is a visual aid and
        does not certify that a building is safe.
      </p>
      <form onSubmit={assess} className='space-y-4'>
        <label className='block'>
          Photos to assess
          <input
            className='mt-2 block'
            type='file'
            accept='image/jpeg,image/png,image/webp'
            multiple
            disabled={busy}
            onChange={(event) => {
              const chosen = Array.from(event.target.files ?? []);
              setFiles(chosen);
              setMessage('');
              setAssessmentId(null);
            }}
          />
        </label>
        {files.length > 4 && (
          <p role='alert'>Choose no more than four photos.</p>
        )}
        <button
          className='rounded bg-emerald-800 px-4 py-2 text-white disabled:opacity-50'
          disabled={busy || !files.length || files.length > 4}
        >
          {busy ? 'Checking…' : 'Upload and assess'}
        </button>
      </form>
      <p role='status' aria-live='polite'>
        {message}
      </p>
      {assessmentId && (
        <Link
          href={`/building-assessments/${assessmentId}`}
          className='underline'
        >
          View saved assessment
        </Link>
      )}
    </main>
  );
}
