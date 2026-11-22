'use client';

import Link from 'next/link';
import { ClipboardList } from 'lucide-react';
import { usePropertyView } from '@/hooks/usePropertyView';

export function AgencyDashboardStart() {
  const { enabled, ready, view } = usePropertyView();
  if (!enabled || !ready || view !== 'agency') return null;

  return (
    <section
      aria-labelledby='agency-start-title'
      className='mx-auto mb-5 max-w-7xl px-4 sm:px-6'
    >
      <div className='rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-slate-900'>
        <h2
          id='agency-start-title'
          className='flex items-center gap-2 text-lg font-semibold'
        >
          <ClipboardList size={20} aria-hidden='true' /> Portfolio action queue
        </h2>
        <p className='mt-2 text-sm'>
          Review priority work, unassigned follow-ups and upcoming maintenance
          across the properties you manage.
        </p>
        <div className='mt-4 flex flex-wrap items-center gap-4'>
          <Link
            href='/properties/work-queue'
            className='rounded-lg bg-emerald-800 px-4 py-2.5 font-semibold text-white'
          >
            Open action queue
          </Link>
          <Link href='/landlord/reports' className='font-semibold underline'>
            Tenant reports
          </Link>
          <Link href='/properties' className='font-semibold underline'>
            Properties
          </Link>
        </div>
        <p className='mt-3 text-sm'>
          To invite a colleague, open the property and choose Manage, then
          People and access.
        </p>
      </div>
    </section>
  );
}
