'use client';

import Link from 'next/link';
import { useRef, useState, type FormEvent } from 'react';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { reportReturnLink } from '@/lib/reports/conversation-navigation';
import {
  reportHistoryDate,
  type ReportStaffFollowup,
} from '@mintenance/shared';
import { FollowupForm } from '@/app/properties/work-queue/FollowupForm';

const waitingMessage = {
  manager: 'Property team action',
  tenant: 'Tenant response',
  contractor: 'Contractor response',
  approval: 'Approval',
} as const;

export function StaffFollowup({
  followup,
  reportId,
  onSaved,
}: {
  followup: ReportStaffFollowup;
  reportId: string;
  onSaved: (message?: string) => void;
}) {
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  async function submitCompletion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      followup.completionRevision === undefined ||
      !note.trim() ||
      sending.current
    )
      return;
    sending.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(
        `/api/properties/${encodeURIComponent(followup.propertyId)}/followups`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await getCsrfHeaders()),
          },
          body: JSON.stringify({
            reportId,
            revision: followup.completionRevision,
            note: note.trim(),
          }),
          signal: AbortSignal.timeout(15000),
        }
      );
      if (response.status === 409) {
        setError(
          'This handover has changed. Copy your note and refresh the case before resubmitting.'
        );
        return;
      }
      if (!response.ok || (await response.json()).submitted !== true)
        throw new Error('Completion was not confirmed');
      setNote('');
      onSaved(
        'Completion sent to the owner for review. The report is still open.'
      );
    } catch {
      setError(
        'Completion was not confirmed. Your note is still here; try again.'
      );
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  const responsible = followup.needsReassignment
    ? 'Needs reassignment'
    : (followup.assigneeName ?? 'Unassigned');

  return (
    <section
      aria-label='Property team follow-up'
      className='rounded-lg border bg-slate-50 p-4'
    >
      <h2 className='font-semibold'>Property team handover</h2>
      <dl className='mt-2 space-y-2 text-sm'>
        <div>
          <dt>Responsible person</dt>
          <dd className='font-semibold'>{responsible}</dd>
        </div>
        {followup.waitingFor && (
          <div>
            <dt>Waiting for</dt>
            <dd>{waitingMessage[followup.waitingFor]}</dd>
          </div>
        )}
        {followup.dueAt && (
          <div>
            <dt>Follow-up due</dt>
            <dd>
              <time dateTime={followup.dueAt}>
                {reportHistoryDate(followup.dueAt)}
              </time>
            </dd>
          </div>
        )}
      </dl>
      <Link
        className='mt-3 inline-block text-sm font-semibold underline'
        href={`/properties/${encodeURIComponent(followup.propertyId)}?tab=manage&manage=records#manage-records`}
      >
        Open property inspections
      </Link>
      {followup.completion && (
        <div
          className='mt-4 rounded-md border bg-white p-3'
          aria-label='Internal completion'
        >
          <h3 className='font-semibold'>
            {followup.completion.awaitingReview
              ? 'Ready for owner review'
              : 'Last completion handover'}
          </h3>
          <p className='text-sm'>
            {followup.completion.submittedBy} ·{' '}
            {reportHistoryDate(followup.completion.submittedAt)}
          </p>
          <p className='mt-2 whitespace-pre-wrap break-words'>
            {followup.completion.note}
          </p>
          <p className='mt-2 text-sm'>
            This note is not shared with the resident.
          </p>
          {followup.canManage && followup.completion.awaitingReview && (
            <Link
              className='mt-2 inline-block font-semibold underline'
              href={reportReturnLink('tenant-reports', reportId).href}
            >
              Open report to review and close
            </Link>
          )}
        </div>
      )}
      {followup.completionRevision !== undefined && (
        <form className='mt-4 space-y-2' onSubmit={submitCompletion}>
          <label
            className='block font-semibold'
            htmlFor='staff-completion-note'
          >
            What work was completed?
          </label>
          <p id='staff-completion-hint' className='text-sm'>
            Only authorised property staff can see this note. Submitting it does
            not close the report or notify the resident.
          </p>
          <textarea
            key={reportId}
            id='staff-completion-note'
            aria-describedby='staff-completion-hint'
            className='block w-full rounded-md border bg-white p-2'
            rows={3}
            required
            maxLength={5000}
            value={note}
            disabled={busy}
            onChange={(event) => setNote(event.target.value)}
          />
          {error && <p role='alert'>{error}</p>}
          <button
            className='rounded-md bg-teal-800 px-3 py-2 font-semibold text-white disabled:opacity-50'
            disabled={busy || !note.trim()}
            type='submit'
          >
            {busy ? 'Submitting…' : 'Submit for owner review'}
          </button>
        </form>
      )}
      {followup.canManage && (
        <details className='mt-2' id='manage-follow-up'>
          <summary className='cursor-pointer font-semibold underline'>
            Manage follow-up
          </summary>
          <FollowupForm
            propertyId={followup.propertyId}
            kind='report'
            sourceId={reportId}
            onSaved={onSaved}
          />
        </details>
      )}
    </section>
  );
}
