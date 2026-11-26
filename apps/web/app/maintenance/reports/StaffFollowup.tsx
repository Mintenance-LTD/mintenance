'use client';

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
  onSaved: () => void;
}) {
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
