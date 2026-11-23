'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  Clock3,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import {
  EmergencyCoverage,
  type EmergencyCoverageRow,
} from './EmergencyCoverage';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { reportConversationHref } from '@/lib/reports/conversation-navigation';

interface EmergencyReport {
  report_id: string;
  property_id: string;
  property_name: string;
  description: string;
  assignee_name: string;
  due_at: string;
  escalated_at: string | null;
  needs_attention: boolean;
  acknowledged_at: string | null;
}

export function EmergencyReportsClient({
  initialReports,
  coverage,
}: {
  initialReports: EmergencyReport[] | null;
  coverage: EmergencyCoverageRow[] | null;
}) {
  const [reports, setReports] = useState(initialReports);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { csrfToken, getCsrfHeaders, error: csrfError } = useCSRF();

  async function acknowledge(reportId: string) {
    setBusy(reportId);
    setError(null);
    try {
      const response = await fetch('/api/landlord/emergency-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...getCsrfHeaders() },
        body: JSON.stringify({ report_id: reportId }),
      });
      if (!response.ok)
        throw new Error(
          'Acknowledgment could not be confirmed. Reload the inbox and try again.'
        );
      const { incident } = await response.json();
      if (!incident?.acknowledged_at || incident.report_id !== reportId)
        throw new Error(
          'Acknowledgment could not be confirmed. Reload the inbox and try again.'
        );
      setReports(
        (current) =>
          current?.map((report) =>
            report.report_id === reportId ? { ...report, ...incident } : report
          ) ?? null
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Acknowledgment failed'
      );
    } finally {
      setBusy(null);
    }
  }

  const openReports =
    reports?.filter((report) => !report.acknowledged_at) ?? [];
  const needsAttention = openReports.filter(
    (report) => report.needs_attention
  ).length;
  const acknowledged = reports ? reports.length - openReports.length : 0;

  return (
    <HomeownerPageWrapper>
      <div className='mx-auto max-w-6xl space-y-8 py-6 sm:py-10'>
        <Link
          className='inline-flex items-center gap-2 text-sm font-semibold text-teal-800 hover:underline'
          href='/landlord/reports'
        >
          <ArrowLeft size={16} aria-hidden='true' /> Tenant reports
        </Link>
        <header className='rounded-2xl border border-teal-100 bg-teal-50 p-5 sm:p-7'>
          <div className='flex flex-wrap items-start justify-between gap-4'>
            <div className='flex items-start gap-3'>
              <div className='rounded-xl bg-white p-2.5 text-teal-800'>
                <ShieldAlert size={23} aria-hidden='true' />
              </div>
              <div>
                <h1 className='text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl'>
                  Emergency reports
                </h1>
                <p className='mt-2 max-w-2xl text-sm text-slate-700'>
                  Acknowledge a report to take responsibility for arranging the
                  next action. Acknowledgment does not book a repair or dispatch
                  help.
                </p>
              </div>
            </div>
            <a
              href='/maintenance/emergencies'
              className='inline-flex min-h-11 items-center gap-2 rounded-lg border border-teal-200 bg-white px-3 text-sm font-semibold text-teal-900 hover:bg-teal-100'
            >
              <RefreshCw size={15} aria-hidden='true' /> Refresh inbox
            </a>
          </div>
          {reports && (
            <dl className='mt-5 grid gap-2 sm:grid-cols-3'>
              {[
                ['Awaiting acknowledgment', openReports.length],
                ['Needs operator attention', needsAttention],
                ['Acknowledged', acknowledged],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className='flex flex-col-reverse gap-1 rounded-xl bg-white px-4 py-3'
                >
                  <dt className='text-sm font-medium text-slate-600'>
                    {label}
                  </dt>
                  <dd className='text-2xl font-semibold tabular-nums text-slate-950'>
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </header>

        <section aria-labelledby='emergency-inbox-heading'>
          <h2
            id='emergency-inbox-heading'
            className='text-xl font-semibold text-slate-950'
          >
            Inbox
          </h2>
          {csrfError && (
            <p
              role='alert'
              className='mt-3 rounded-xl bg-amber-50 p-4 text-amber-950'
            >
              Sign-in verification could not be loaded. Refresh the inbox to
              retry acknowledgment.
            </p>
          )}
          {error && (
            <p
              role='alert'
              className='mt-3 rounded-xl bg-rose-50 p-4 text-rose-900'
            >
              {error}
            </p>
          )}
          {reports === null ? (
            <p
              role='alert'
              className='mt-3 rounded-xl bg-amber-50 p-4 text-amber-950'
            >
              The emergency inbox could not be loaded. Refresh to confirm
              whether reports are open.
            </p>
          ) : reports.length === 0 ? (
            <div className='mt-3 flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5'>
              <ShieldCheck
                size={22}
                className='shrink-0 text-teal-700'
                aria-hidden='true'
              />
              <div>
                <p className='font-semibold text-slate-950'>
                  No open emergency reports
                </p>
                <p className='mt-1 text-sm text-slate-600'>
                  Nothing is assigned to you or the properties you own.
                </p>
              </div>
            </div>
          ) : (
            <ul className='mt-3 space-y-3'>
              {reports.map((report) => (
                <li
                  key={report.report_id}
                  className='rounded-2xl border border-slate-200 bg-white p-5'
                >
                  <div className='flex flex-wrap items-start justify-between gap-2'>
                    <h3 className='text-lg font-semibold text-slate-950'>
                      {report.property_name || 'Property emergency'}
                    </h3>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${report.acknowledged_at ? 'bg-emerald-50 text-emerald-900' : 'bg-amber-50 text-amber-900'}`}
                    >
                      {report.acknowledged_at
                        ? 'Acknowledged'
                        : report.escalated_at
                          ? 'Escalated · awaiting acknowledgment'
                          : 'Awaiting acknowledgment'}
                    </span>
                  </div>
                  <p className='mt-2 whitespace-pre-wrap break-words text-sm text-slate-700'>
                    {report.description}
                  </p>
                  {report.acknowledged_at ? (
                    <p
                      role='status'
                      className='mt-3 text-sm font-medium text-teal-900'
                    >
                      Acknowledged. Arrange the next action.
                    </p>
                  ) : (
                    <div className='mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-700'>
                      <p>
                        Responsible person{' '}
                        <strong>{report.assignee_name}</strong>
                      </p>
                      <p className='inline-flex items-center gap-1.5'>
                        <Clock3 size={15} aria-hidden='true' /> Review due{' '}
                        <time dateTime={report.due_at}>
                          {reviewTime.format(new Date(report.due_at))}
                        </time>
                      </p>
                    </div>
                  )}
                  {report.needs_attention && !report.acknowledged_at && (
                    <p
                      role='alert'
                      className='mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-900'
                    >
                      No responder has acknowledged. An operator alert was
                      queued. Contact your property team directly.
                    </p>
                  )}
                  <div className='mt-4 flex flex-wrap items-center gap-3'>
                    {!report.acknowledged_at && (
                      <button
                        type='button'
                        disabled={!csrfToken || busy !== null}
                        onClick={() => void acknowledge(report.report_id)}
                        className='min-h-11 rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-50'
                      >
                        {busy === report.report_id
                          ? 'Confirming acknowledgment…'
                          : 'Acknowledge responsibility'}
                      </button>
                    )}
                    <Link
                      href={reportConversationHref(
                        report.report_id,
                        'emergencies'
                      )}
                      className='inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-teal-800 hover:underline'
                    >
                      View report and reply{' '}
                      <ArrowRight size={15} aria-hidden='true' />
                    </Link>
                    <Link
                      className='inline-flex min-h-11 items-center text-sm font-medium text-slate-700 hover:underline'
                      href={`/properties/${report.property_id}`}
                    >
                      Open property
                    </Link>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {reports?.length === 100 && (
            <p className='mt-3 text-sm text-slate-600'>
              Showing the first 100 open reports.
            </p>
          )}
        </section>
        <EmergencyCoverage properties={coverage} />
      </div>
    </HomeownerPageWrapper>
  );
}

const reviewTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/London',
  dateStyle: 'medium',
  timeStyle: 'short',
});
