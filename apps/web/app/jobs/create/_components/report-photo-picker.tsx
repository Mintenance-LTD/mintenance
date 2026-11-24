'use client';

import { useEffect, useRef, useState } from 'react';
import type { ReportDraftPhoto } from '../hooks/useTenantJobSource';

export function ReportPhotoPicker({
  photos,
  filenames,
  addFiles,
  reload,
}: {
  photos: ReportDraftPhoto[] | null;
  filenames: string[];
  addFiles: (files: File[]) => boolean;
  reload: () => void;
}) {
  const [pending, setPending] = useState<number>();
  const [error, setError] = useState(false);
  const request = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => request.current?.abort(), []);

  async function addPhoto(photo: ReportDraftPhoto, filename: string) {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setPending(photo.slot);
    setError(false);
    try {
      const response = await fetch(photo.url, {
        signal: controller.signal,
        referrerPolicy: 'no-referrer',
      });
      if (!response.ok) throw new Error('Photo unavailable');
      const blob = await response.blob();
      if (!controller.signal.aborted)
        addFiles([new File([blob], filename, { type: 'image/jpeg' })]);
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      request.current = undefined;
      if (!controller.signal.aborted) setPending(undefined);
    }
  }

  if (photos?.length === 0) return null;
  return (
    <section className='my-5 space-y-3' aria-label='Resident photos'>
      <h3 className='font-semibold'>Resident photos</h3>
      <p>
        Choose which photos to include in the job brief. Review them for
        personal details before sharing.
      </p>
      {photos === null || error ? (
        <p role='status'>
          Some photos could not be loaded.{' '}
          <button
            type='button'
            className='underline'
            onClick={() => {
              setError(false);
              reload();
            }}
          >
            Reload resident photos
          </button>
        </p>
      ) : null}
      <ul className='grid gap-3 sm:grid-cols-2'>
        {photos?.map((photo) => {
          const filename = `resident-report-photo-${photo.slot}.jpg`;
          const included = filenames.includes(filename);
          return (
            <li key={photo.slot} className='space-y-2 rounded-lg border p-2'>
              {/* eslint-disable-next-line @next/next/no-img-element -- private short-lived signed photo, never cached through an optimizer */}
              <img
                src={photo.url}
                alt={`Resident photo ${photo.slot}`}
                referrerPolicy='no-referrer'
                className='h-32 w-full rounded object-contain'
              />
              <button
                type='button'
                className='btn btn-secondary btn-sm'
                disabled={included || pending !== undefined}
                onClick={() => void addPhoto(photo, filename)}
              >
                {included
                  ? `Photo ${photo.slot} added`
                  : pending === photo.slot
                    ? 'Adding photo…'
                    : `Add photo ${photo.slot}`}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
