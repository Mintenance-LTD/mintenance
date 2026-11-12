'use client';
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  CalendarDays,
  Camera,
  ClipboardList,
  FolderOpen,
  Link2,
  LockKeyhole,
  FileText,
  ImageOff,
  ArrowUpRight,
} from 'lucide-react';
import styles from './report-view.module.css';
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
  const kind = INSPECTION_KINDS.find(
    (item) => item.value === data?.report.kind
  )?.label;
  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link
          className={styles.back}
          href={'/properties/' + propertyId + '?tab=manage'}
        >
          <ArrowLeft size={17} aria-hidden='true' /> Back to property
        </Link>
        {!data && !error && (
          <div className={styles.card} role='status'>
            Loading inspection report…
          </div>
        )}
        {error && (
          <div className={styles.card} role='alert'>
            <h1 className={styles.errorTitle}>Unable to open report</h1>
            <p>{error}</p>
            <div className={styles.actions}>
              <button
                className={styles.primary}
                onClick={() => setRevision((value) => value + 1)}
              >
                Retry
              </button>
              <Link
                className={styles.back}
                href={
                  '/login?redirect=' +
                  encodeURIComponent(inspectionReportPath(propertyId, reportId))
                }
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
        {data && (
          <>
            <header className={styles.header}>
              <div className={styles.heading}>
                <p className={styles.eyebrow}>
                  Property records / Inspection report
                </p>
                <h1>{data.report.title}</h1>
                <p className={styles.subtitle}>{data.folder.label}</p>
              </div>
              <button onClick={() => void copy()} className={styles.primary}>
                <Link2 size={18} aria-hidden='true' /> Copy member-only link
              </button>
            </header>
            {copied && (
              <p role='status' className={styles.feedback}>
                {copied}
              </p>
            )}
            <dl className={styles.summary}>
              <div>
                <span className={styles.icon}>
                  <ClipboardList size={23} aria-hidden='true' />
                </span>
                <div>
                  <dt>Inspection type</dt>
                  <dd>{kind}</dd>
                </div>
              </div>
              <div>
                <span className={styles.icon}>
                  <CalendarDays size={23} aria-hidden='true' />
                </span>
                <div>
                  <dt>Inspection date</dt>
                  <dd>
                    <time dateTime={data.report.inspected_on}>
                      {formatDate(data.report.inspected_on)}
                    </time>
                  </dd>
                </div>
              </div>
              <div>
                <span className={styles.icon}>
                  <Camera size={23} aria-hidden='true' />
                </span>
                <div>
                  <dt>Attached photos</dt>
                  <dd>{data.photos.length}</dd>
                </div>
              </div>
            </dl>
            <div className={styles.layout}>
              <article className={styles.content}>
                <section
                  className={styles.card}
                  aria-labelledby='observations-title'
                >
                  <h2 id='observations-title'>
                    <FileText size={21} aria-hidden='true' /> Observations
                  </h2>
                  <p className={styles.notes}>
                    {data.report.notes || 'No written observations recorded.'}
                  </p>
                </section>
                <section
                  className={styles.card}
                  aria-labelledby='report-photos-title'
                >
                  <div className={styles.sectionHeading}>
                    <h2 id='report-photos-title'>
                      <Camera size={21} aria-hidden='true' /> Room photos
                    </h2>
                    <span className={styles.badge}>
                      {data.photos.length} attached
                    </span>
                  </div>
                  <p className={styles.caption}>
                    Upload dates are recorded in UTC; capture dates are not
                    verified. Photos remain linked to the original uploads.
                  </p>
                  {!data.photos.length && (
                    <p className={styles.empty}>No photos attached.</p>
                  )}
                  <div className={styles.gallery}>
                    {data.photos.map((photo) => {
                      const src =
                        '/api/properties/' +
                        propertyId +
                        '/inspections/' +
                        reportId +
                        '/photos/' +
                        photo.id;
                      return (
                        <figure key={photo.id} className={styles.photo}>
                          {photo.available ? (
                            <ReportImage src={src} name={photo.file_name} />
                          ) : (
                            <p className={styles.empty}>
                              <ImageOff size={24} aria-hidden='true' /> Original
                              photo deleted or unavailable.
                            </p>
                          )}
                          <figcaption>
                            <strong className={styles.room}>
                              {photo.room_type.replace(/_/g, ' ')}
                            </strong>
                            <span className={styles.filename}>
                              {photo.file_name}
                            </span>
                            <span className={styles.caption}>
                              {uploadedPhotoLabel(photo.uploaded_at)}
                            </span>
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                </section>
              </article>
              <aside className={styles.content} aria-label='Report details'>
                <section className={styles.card}>
                  <h2>
                    <FolderOpen size={21} aria-hidden='true' /> Tenancy folder
                  </h2>
                  <p className={styles.folderName}>{data.folder.label}</p>
                  <dl className={styles.details}>
                    <div>
                      <dt>Starts</dt>
                      <dd>{formatDate(data.folder.starts_on)}</dd>
                    </div>
                    <div>
                      <dt>Ends</dt>
                      <dd>
                        {data.folder.ends_on
                          ? formatDate(data.folder.ends_on)
                          : 'Not specified'}
                      </dd>
                    </div>
                  </dl>
                </section>
                <section className={styles.card}>
                  <h2>
                    <LockKeyhole size={21} aria-hidden='true' /> Saved record
                  </h2>
                  <p className={styles.access}>
                    Available to current property members
                  </p>
                  <p className={styles.caption}>
                    Sharing the link does not grant access.
                  </p>
                  <dl className={styles.details}>
                    <div>
                      <dt>Saved (UTC)</dt>
                      <dd>
                        {new Date(data.report.created_at).toLocaleString(
                          'en-GB',
                          {
                            timeZone: 'UTC',
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          }
                        )}
                      </dd>
                    </div>
                  </dl>
                  <p className={styles.caption}>
                    The inspection date is entered by the author. Saved reports
                    cannot be edited; record corrections in a new report.
                  </p>
                </section>
              </aside>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
function formatDate(value: string) {
  return new Date(value + 'T00:00:00Z').toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function ReportImage({ src, name }: { src: string; name: string }) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <p className={styles.empty}>
      Photo unavailable. Refresh the report to retry.
    </p>
  ) : (
    <a
      className={styles.photoLink}
      href={src}
      target='_blank'
      rel='noopener noreferrer'
      aria-label={'Open photo: ' + name}
    >
      {/* This authenticated route must not use the public Next image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={name}
        onError={() => setFailed(true)}
        className={styles.image}
      />
      <span className={styles.openPhoto}>
        View full photo <ArrowUpRight size={15} aria-hidden='true' />
      </span>
    </a>
  );
}
