'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FollowupForm } from '../../../work-queue/FollowupForm';

export function RepairFollowup({
  propertyId,
  jobId,
}: {
  propertyId: string;
  jobId: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <button
        type='button'
        className='btn btn-outline'
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Manage follow-up
      </button>
      {open && (
        <FollowupForm
          propertyId={propertyId}
          kind='job'
          sourceId={jobId}
          onSaved={() => router.refresh()}
        />
      )}
    </>
  );
}
