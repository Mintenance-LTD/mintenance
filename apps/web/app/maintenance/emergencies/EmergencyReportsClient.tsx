'use client';

import { useState } from 'react';
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
}: {
  initialReports: EmergencyReport[];
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
      setReports((current) =>
        current.map((report) =>
          report.report_id === reportId ? { ...report, ...incident } : report
        )
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Acknowledgment failed'
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className='mx-auto max-w-3xl space-y-5 p-6'>
      <h1 className='text-3xl font-semibold'>Emergency reports</h1>
      <p>
        Acknowledging means you have seen the report and taken responsibility
        for arranging the next action. It does not book a repair or dispatch
        emergency services.
      </p>
      <p className='text-sm'>
        Unacknowledged reports escalate to an accepted property admin or manager
        after 15 minutes. This is an internal review target, not a response
        guarantee.
      </p>
      <a href='/maintenance/emergencies' className='inline-block underline'>
        Reload emergency inbox
      </a>
      {csrfError ? (
        <p role='alert'>
          Sign-in verification could not be loaded. Reload the inbox to retry
          acknowledgment.
        </p>
      ) : null}
      {error ? (
        <p role='alert' className='text-red-700'>
          {error}
        </p>
      ) : null}
      {reports.length === 0 ? (
        <p>
          No open emergency reports are assigned to you or properties you own.
        </p>
      ) : null}
      {reports.length === 100 ? (
        <p>Showing the first 100 reports, awaiting acknowledgment first.</p>
      ) : null}
      {reports.map((report) => (
        <article
          key={report.report_id}
          className='space-y-3 rounded-xl border p-5'
        >
          <h2 className='text-xl font-semibold'>
            {report.property_name || 'Property emergency'}
          </h2>
          <p className='whitespace-pre-wrap'>{report.description}</p>
          {!report.acknowledged_at ? (
            <p>Responsible: {report.assignee_name}</p>
          ) : null}
          {report.acknowledged_at ? (
            <p role='status'>Acknowledged — arrange the next action.</p>
          ) : (
            <>
              <p>
                {report.escalated_at
                  ? 'Escalated to fallback responder; awaiting acknowledgment.'
                  : 'Awaiting human acknowledgment.'}
              </p>
              {report.needs_attention ? (
                <p role='alert'>
                  Needs attention: no responder has acknowledged. An operator
                  alert has been queued. Contact your property team directly.
                </p>
              ) : null}
              <button
                type='button'
                disabled={!csrfToken || busy !== null}
                onClick={() => acknowledge(report.report_id)}
                className='rounded-lg bg-emerald-800 px-4 py-3 text-white disabled:opacity-50'
              >
                {busy === report.report_id
                  ? 'Confirming acknowledgment…'
                  : 'Acknowledge responsibility'}
              </button>
            </>
          )}
          <a
            href={`/properties/${report.property_id}`}
            className='block underline'
          >
            Open property and team contacts
          </a>
          <a
            href={reportConversationHref(report.report_id, 'emergencies')}
            className='block underline'
          >
            View report and reply to tenant
          </a>
        </article>
      ))}
    </main>
  );
}
