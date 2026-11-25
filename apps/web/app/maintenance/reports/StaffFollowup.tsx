'use client';

import type { ReportStaffFollowup } from '@mintenance/shared';
import { FollowupForm } from '@/app/properties/work-queue/FollowupForm';

export function StaffFollowup({
  followup,
  reportId,
  onSaved,
}: {
  followup: ReportStaffFollowup;
  reportId: string;
  onSaved: (message: string, handedOff: boolean) => void;
}) {
  const responsible = followup.needsReassignment
    ? 'Needs reassignment'
    : (followup.assigneeName ?? 'Unassigned');

  return (
    <section
      aria-label='Property team follow-up'
      className='rounded-lg border bg-slate-50 p-4'
    >
      <p className='text-sm'>Responsible person</p>
      <p className='font-semibold'>{responsible}</p>
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
