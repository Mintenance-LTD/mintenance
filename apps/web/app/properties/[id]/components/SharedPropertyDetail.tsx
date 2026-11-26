'use client';

import Link from 'next/link';
import './property-workspace.css';
import { PropertyFileHub } from './PropertyFileHub';
import { PROPERTY_JOB_STATUS_LABELS } from '@mintenance/shared';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import { TenantReportingCard } from './TenantReportingCard';
import TeamAccess from './TeamAccess';
import TenantContacts from './TenantContacts';
import RecurringMaintenance from './RecurringMaintenance';
import {
  MintEditorialPropertyDocuments,
  type PropertyCertificateRecord,
} from './MintEditorialPropertyDocuments';
import type { PropertySchedule } from './MintEditorialPropertyMaintenancePlan';
import TenancyInspections from './TenancyInspections';
import { propertyRepairHref } from '@/lib/properties/repair-navigation';

/** Shared members receive only this explicit read model, never owner access secrets. */
export function SharedPropertyDetail({
  property,
  role,
  canCreateJob,
  jobs,
  schedules,
  certificates,
}: {
  property: { id: string; name: string; address: string };
  role: 'admin' | 'manager' | 'viewer';
  canCreateJob: boolean;
  jobs: { id: string; title: string; status: string }[];
  schedules: PropertySchedule[];
  certificates: PropertyCertificateRecord[];
}) {
  return (
    <HomeownerPageWrapper>
      <div className='property-workspace'>
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
        <nav aria-label='Shared property sections' className='mb-4 flex flex-wrap gap-4'>
          <a href='#recorded-work' className='pw-back'>Recorded work</a>
          <a href='#manage-records' className='pw-back'>Tenancy & inspections</a>
          {role === 'admin' && <a href='#manage-people' className='pw-back'>People and access</a>}
        </nav>
        <div className='space-y-5'>
          {role !== 'viewer' && <PropertyFileHub propertyId={property.id} />}
          <section id='recorded-work' className='card card-pad'>
            <h2 className='t-h2'>Recorded work</h2>
            {canCreateJob && (
              <Link
                className='btn btn-primary'
                href={`/jobs/create?property_id=${encodeURIComponent(property.id)}`}
              >
                Post a job
              </Link>
            )}
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
                    <Link href={propertyRepairHref(property.id, job.id)} className='font-medium text-teal-800 underline'>
                      {job.title}
                    </Link>
                    <span>
                      {PROPERTY_JOB_STATUS_LABELS[job.status] || job.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <div id='manage-records'>
            <TenancyInspections propertyId={property.id} />
          </div>
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
              <TenantContacts propertyId={property.id} />
              {role === 'admin' && (
                <section id='manage-people' aria-label='People and access'>
                  <TeamAccess propertyId={property.id} />
                </section>
              )}
              <TenantReportingCard
                propertyId={property.id}
                propertyName={property.name}
              />
            </>
          )}
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}
