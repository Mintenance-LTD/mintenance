'use client';

import Link from 'next/link';
import { PROPERTY_JOB_STATUS_LABELS } from '@mintenance/shared';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { TenantReportingCard } from './TenantReportingCard';
import RecurringMaintenance from './RecurringMaintenance';
import {
  MintEditorialPropertyDocuments,
  type PropertyCertificateRecord,
} from './MintEditorialPropertyDocuments';
import type { PropertySchedule } from './MintEditorialPropertyMaintenancePlan';

/** Shared members receive only this explicit read model, never owner access secrets. */
export function SharedPropertyDetail({
  property,
  role,
  jobs,
  schedules,
  certificates,
}: {
  property: { id: string; name: string; address: string };
  role: 'admin' | 'manager' | 'viewer';
  jobs: { id: string; title: string; status: string }[];
  schedules: PropertySchedule[];
  certificates: PropertyCertificateRecord[];
}) {
  return (
    <HomeownerPageWrapper>
      <Link href='/properties' className='btn btn-ghost'>
        Properties
      </Link>
      <header className='card card-pad my-4'>
        <h1 className='t-h1'>{property.name}</h1>
        <p>{property.address}</p>
        <p className='mt-2'>
          Shared property ·{' '}
          {role === 'admin'
            ? 'Team administrator'
            : role === 'manager'
              ? 'Manager'
              : 'Viewer'}
        </p>
      </header>
      <div className='space-y-5'>
        <section className='card card-pad'>
          <h2 className='t-h2'>Recorded work</h2>
          <p>
            Job records describe maintenance activity, not the physical
            condition or safety of the property.
          </p>
          {jobs.length === 0 ? (
            <p>No jobs recorded.</p>
          ) : (
            <ul className='divide-y divide-gray-200'>
              {jobs.map((job) => (
                <li
                  key={job.id}
                  className='flex flex-wrap justify-between gap-3 py-3'
                >
                  <span>{job.title}</span>
                  <span>
                    {PROPERTY_JOB_STATUS_LABELS[job.status] || job.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>
        <MintEditorialPropertyDocuments
          certificates={certificates}
          canManage={false}
        />
        {role === 'viewer' ? (
          <section className='card card-pad'>
            <h2 className='t-h2'>Recurring maintenance</h2>
            {schedules.length === 0 ? (
              <p>No schedules recorded.</p>
            ) : (
              <ul>
                {schedules.map((schedule) => (
                  <li key={schedule.id} className='py-2'>
                    {schedule.title} · {schedule.next_due_date} ·{' '}
                    {schedule.is_active ? 'Active' : 'Paused'}
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : (
          <>
            <RecurringMaintenance propertyId={property.id} />
            <TenantReportingCard
              propertyId={property.id}
              propertyName={property.name}
            />
          </>
        )}
      </div>
    </HomeownerPageWrapper>
  );
}
