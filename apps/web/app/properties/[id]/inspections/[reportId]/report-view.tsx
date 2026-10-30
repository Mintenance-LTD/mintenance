'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  INSPECTION_KINDS,
  uploadedPhotoLabel,
  inspectionReportPath,
  type InspectionDetail,
} from '@mintenance/shared';
import { inspectionRequest } from '@/lib/inspection-client';
export default function InspectionReportView({
  propertyId,
  reportId,
}: {
  propertyId: string;
  reportId: string;
}) {
  const [data, setData] = useState<InspectionDetail | null>(null);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const [copied, setCopied] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError('');
    void inspectionRequest<InspectionDetail>(
      '/api/properties/' + propertyId + '/inspections/' + reportId,
      undefined,
      controller.signal
    )
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e: Error) => {
        if (!controller.signal.aborted) setError(e.message);
      });
    return () => controller.abort();
  }, [propertyId, reportId, revision]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(
        window.location.origin + inspectionReportPath(propertyId, reportId)
      );
      setCopied('Link copied. Only current property members can open it.');
    } catch {
      setCopied(
        'Copy the address from your browser to share this report with property members.'
      );
    }
  }
  return (
    <main className='mx-auto max-w-4xl p-4 text-gray-900 sm:p-8'>
      <Link
        className='inline-flex min-h-11 items-center text-teal-900 underline'
        href={'/properties/' + propertyId}
      >
        Back to property
      </Link>
      {!data && !error && <p role='status'>Loading inspection report…</p>}
      {error && (
        <div role='alert'>
          <p>{error}</p>
          <button
            className='min-h-11 underline'
            onClick={() => setRevision((v) => v + 1)}
          >
            Retry
          </button>
          <Link
            className='ml-4 underline'
            href={
              '/login?redirect=' +
              encodeURIComponent(inspectionReportPath(propertyId, reportId))
            }
          >
            Sign in
          </Link>
        </div>
      )}
      {data && (
        <article className='mt-3 rounded-xl border bg-white p-5 sm:p-8'>
          <p className='text-sm text-gray-600'>
            {data.folder.label} · {data.folder.starts_on}
            {data.folder.ends_on ? ' – ' + data.folder.ends_on : ''}
          </p>
          <h1 className='mt-2 break-words text-2xl font-semibold'>
            {data.report.title}
          </h1>
          <p className='mt-2'>
            {INSPECTION_KINDS.find((k) => k.value === data.report.kind)?.label}{' '}
            · Inspection date {data.report.inspected_on}
          </p>
          <p className='mt-1 text-xs text-gray-600'>
            Inspection date entered by the report author. Saved{' '}
            {new Date(data.report.created_at).toLocaleString('en-GB', {
              timeZone: 'UTC',
            })}{' '}
            UTC.
          </p>
          <div className='my-4 flex flex-wrap gap-3 print:hidden'>
            <button
              onClick={() => void copy()}
              className='min-h-11 rounded-lg bg-teal-800 px-4 text-white'
            >
              Copy member-only link
            </button>
          </div>
          {copied && (
            <p role='status' className='mb-3 text-sm'>
              {copied}
            </p>
          )}
          <h2 className='mt-5 font-semibold'>Observations</h2>
          <p className='mt-2 whitespace-pre-wrap break-words'>
            {data.report.notes || 'No written observations recorded.'}
          </p>
          <h2 className='mt-6 font-semibold'>Room photos</h2>
          <p className='mt-1 text-sm text-gray-600'>
            Upload dates are recorded in UTC; capture dates are not verified.
            Photos remain linked to the original uploads.
          </p>
          {!data.photos.length && <p className='mt-3'>No photos attached.</p>}
          <div className='mt-4 grid gap-4 sm:grid-cols-2'>
            {data.photos.map((photo) => (
              <figure
                key={photo.id}
                className='overflow-hidden rounded-lg border'
              >
                {photo.available ? (
                  <ReportImage
                    src={
                      '/api/properties/' +
                      propertyId +
                      '/inspections/' +
                      reportId +
                      '/photos/' +
                      photo.id
                    }
                    name={photo.file_name}
                  />
                ) : (
                  <p className='p-5 text-sm'>
                    Original photo deleted or unavailable.
                  </p>
                )}
                <figcaption className='break-words p-3 text-sm'>
                  {photo.room_type.replace(/_/g, ' ')} · {photo.file_name}
                  <span className='block text-xs text-gray-600'>
                    {uploadedPhotoLabel(photo.uploaded_at)}
                  </span>
                </figcaption>
              </figure>
            ))}
          </div>
        </article>
      )}
    </main>
  );
}
function ReportImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className='p-5 text-sm'>
      Photo unavailable. Refresh the report to retry.
    </p>
  ) : (
    // This authenticated image route must not go through the public Next image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={name}
      onError={() => setFailed(true)}
      className='aspect-[4/3] w-full bg-gray-50 object-contain'
    />
  );
}
