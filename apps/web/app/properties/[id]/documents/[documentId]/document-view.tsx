'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileText } from 'lucide-react';

async function requestFile(
  propertyId: string,
  documentId: string,
  signal?: AbortSignal
) {
  const query = new URLSearchParams({ documentId, inline: '1' });
  const response = await fetch(
    `/api/properties/${encodeURIComponent(propertyId)}/documents?${query}`,
    { cache: 'no-store', signal }
  );
  if (response.status === 401) {
    throw new Error('Sign in to open this property file.');
  }
  if ([400, 403, 404].includes(response.status)) {
    throw new Error('This file is unavailable or you no longer have access.');
  }
  if (!response.ok)
    throw new Error('The file could not be opened. Please retry.');
  const result = await response.json().catch(() => null);
  if (
    result?.document?.id !== documentId ||
    typeof result.document.name !== 'string' ||
    typeof result.url !== 'string' ||
    !/^https?:\/\//.test(result.url)
  ) {
    throw new Error('The file could not be opened. Please retry.');
  }
  return { name: result.document.name as string, url: result.url as string };
}

export function PropertyDocumentView({
  propertyId,
  documentId,
}: {
  propertyId: string;
  documentId: string;
}) {
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const [opening, setOpening] = useState(false);
  const openingRequest = useRef<AbortController | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void requestFile(propertyId, documentId, controller.signal)
      .then((file) => {
        if (!controller.signal.aborted) setName(file.name);
      })
      .catch((reason: Error) => {
        if (!controller.signal.aborted) setError(reason.message);
      });
    return () => {
      controller.abort();
      openingRequest.current?.abort();
    };
  }, [propertyId, documentId, attempt]);

  async function openFile() {
    if (openingRequest.current) return;
    const controller = new AbortController();
    openingRequest.current = controller;
    setOpening(true);
    try {
      const { url } = await requestFile(
        propertyId,
        documentId,
        controller.signal
      );
      if (!controller.signal.aborted) window.location.assign(url);
    } catch (reason) {
      if (!controller.signal.aborted) {
        setName('');
        setError(
          reason instanceof Error
            ? reason.message
            : 'The file could not be opened.'
        );
      }
    } finally {
      openingRequest.current = null;
      if (!controller.signal.aborted) setOpening(false);
    }
  }

  return (
    <div className='mx-auto max-w-3xl p-6'>
      <Link
        href={`/properties/${encodeURIComponent(propertyId)}?tab=timeline`}
        className='btn btn-ghost mb-4'
      >
        <ArrowLeft size={16} aria-hidden='true' /> Property timeline
      </Link>
      <section className='card card-pad'>
        {error ? (
          <div role='alert'>
            <h1 className='t-h2'>Unable to open property file</h1>
            <p className='mt-2'>{error}</p>
            <button
              type='button'
              className='btn btn-secondary mt-4'
              onClick={() => {
                setError('');
                setAttempt((value) => value + 1);
              }}
            >
              Retry
            </button>
          </div>
        ) : name ? (
          <>
            <h1 className='t-h2 break-words'>{name}</h1>
            <button
              type='button'
              className='btn btn-primary mt-4'
              disabled={opening}
              onClick={openFile}
            >
              <FileText size={16} aria-hidden='true' />
              {opening ? 'Opening file…' : 'Open file'}
            </button>
          </>
        ) : (
          <p role='status'>Loading property file…</p>
        )}
      </section>
    </div>
  );
}
