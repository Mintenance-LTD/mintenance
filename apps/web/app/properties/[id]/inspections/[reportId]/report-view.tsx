'use client';
import React, { useEffect, useRef, useState } from 'react';
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
  const [printing, setPrinting] = useState(false);
  const page = useRef<HTMLElement>(null);
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
        if (value?.report?.id !== reportId) {
          throw new Error('This inspection report is unavailable.');
        }
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
  const propertyPath = '/properties/' + encodeURIComponent(propertyId);
  const folderId = data?.report.folder_id || data?.folder.id;
  const folderPath = folderId
    ? propertyPath + '/tenancies/' + encodeURIComponent(folderId)
    : '';
  const correctedBy = data?.report.corrected_by_report_id;
  const corrects = data?.report.corrects_report_id;
  const outcome =
    data?.report.outcome === 'no_issues_found'
      ? 'No issues found.'
      : data?.report.outcome === 'evidence_free'
        ? 'Recorded without observations or photos.'
        : '';
  const observations =
    [outcome, data?.report.notes].filter(Boolean).join('\n\n') ||
    'No written observations recorded.';

  async function printReport() {
    if (printing || !page.current) return;
    setPrinting(true);
    try {
      const images = Array.from(page.current.querySelectorAll('img'));
      await Promise.allSettled(images.map((image) => image.decode()));
      window.print();
    } finally {
      setPrinting(false);
    }
  }

  return (
    <main ref={page} className={styles.page}>
      <div className={styles.container}>
        <Link
          className={`${styles.back} ${styles.noPrint}`}
          href={folderPath || propertyPath + '?tab=manage&manage=records'}
        >
          <ArrowLeft size={17} aria-hidden='true' />{' '}
          {folderId ? 'Back to tenancy folder' : 'Back to property records'}
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
              <div className={`${styles.actions} ${styles.noPrint}`}>
                {data.checkIn && (
                  <a href='#compare-check-in' className={styles.actionLink}>
                    Compare with check-in
                  </a>
                )}
                {data.canCreate && !correctedBy && (
                  <Link
                    href={
                      folderPath + '?corrects=' + encodeURIComponent(reportId)
                    }
                    className={styles.actionLink}
                  >
                    Correct this report
                  </Link>
                )}
                <button
                  type='button'
                  onClick={() => void printReport()}
                  disabled={printing}
                  className={styles.actionLink}
                >
                  {printing ? 'Preparing report…' : 'Print or save PDF'}
                </button>
                <button
                  type='button'
                  onClick={() => void copy()}
                  className={styles.primary}
                >
                  <Link2 size={18} aria-hidden='true' /> Copy member-only link
                </button>
              </div>
            </header>
            {copied && (
              <p
                role='status'
                className={`${styles.feedback} ${styles.noPrint}`}
              >
                {copied}
              </p>
            )}
            {correctedBy && (
              <p className={styles.feedback}>
                <strong>Corrected.</strong>{' '}
                <Link
                  className={styles.actionLink}
                  href={inspectionReportPath(propertyId, correctedBy)}
                >
                  View correction
                </Link>
              </p>
            )}
            {corrects && (
              <p className={styles.feedback}>
                This report is a correction.{' '}
                <Link
                  className={styles.actionLink}
                  href={inspectionReportPath(propertyId, corrects)}
                >
                  View previous version
                </Link>
              </p>
            )}
            {data.report.date_exception_reason && (
              <p className={styles.feedback}>
                <strong>Date exception</strong> ·{' '}
                {data.report.date_exception_reason}
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
                  <p className={styles.notes}>{observations}</p>
                </section>
                {data.checkIn && (
                  <section
                    id='compare-check-in'
                    className={`${styles.card} ${styles.noPrint}`}
                    aria-labelledby='comparison-heading'
                  >
                    <h2 id='comparison-heading'>Compare with check-in</h2>
                    <div className={styles.comparison}>
                      <div>
                        <h3>
                          Check-in · {formatDate(data.checkIn.inspected_on)}
                        </h3>
                        <p className={styles.notes}>
                          {data.checkIn.notes ||
                            'No written observations recorded.'}
                        </p>
                        <Link
                          className={styles.actionLink}
                          href={inspectionReportPath(
                            propertyId,
                            data.checkIn.id
                          )}
                        >
                          View check-in report and photos
                        </Link>
                      </div>
                      <div>
                        <h3>
                          Check-out · {formatDate(data.report.inspected_on)}
                        </h3>
                        <p className={styles.notes}>{observations}</p>
                      </div>
                    </div>
                  </section>
                )}
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
                    verified.
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
                  {data.report.tenancy_starts_on ? (
                    <p>
                      <strong>Tenancy dates when saved</strong>
                      <br />
                      {formatDate(data.report.tenancy_starts_on)} to{' '}
                      {data.report.tenancy_ends_on
                        ? formatDate(data.report.tenancy_ends_on)
                        : 'no end date set'}
                    </p>
                  ) : (
                    <p className={styles.caption}>
                      Tenancy dates at the time of saving are unavailable for
                      this report.
                    </p>
                  )}
                  <p>
                    <strong>Current tenancy dates</strong>
                    <br />
                    {formatDate(data.folder.starts_on)} to{' '}
                    {data.folder.ends_on
                      ? formatDate(data.folder.ends_on)
                      : 'no end date set'}
                  </p>
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
                      <dt>Recorded (UTC)</dt>
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
                    remain in the audit trail when corrected.
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
