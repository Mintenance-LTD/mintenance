'use client';

import React, { useState } from 'react';
import { TenantReportingCard } from './TenantReportingCard';
import Link from 'next/link';
import { BarChart2, CalendarDays, Users, FolderOpen } from 'lucide-react';
import { FeatureGateCard } from '@/components/FeatureGateCard';
import RecurringMaintenance from './RecurringMaintenance';
import TenantContacts from './TenantContacts';
import TeamAccess from './TeamAccess';
import BulkOperations from './BulkOperations';
import RoomPhotoGallery from './RoomPhotoGallery';
import { PropertyWorkQueue } from './PropertyWorkQueue';

interface ManageJob {
  id: string;
  title: string;
  status: string;
  contractor?: string | null;
  amount: number;
  date: string;
  category: string;
}

interface Props {
  propertyId: string;
  propertyName: string;
  jobs: ManageJob[];
}

function PortfolioAnalyticsCard() {
  return (
    <div className='card card-pad'>
      <div className='row' style={{ gap: 8, marginBottom: 6 }}>
        <BarChart2
          size={14}
          strokeWidth={1.75}
          style={{ color: 'var(--me-brand)' }}
        />
        <h4 className='t-h4'>Compliance records</h4>
      </div>
      <p className='t-meta' style={{ marginBottom: 12 }}>
        Review saved certificates and their expiry dates across your properties.
      </p>
      <Link href='/properties/compliance' className='btn btn-secondary btn-sm'>
        View compliance dashboard
      </Link>
    </div>
  );
}

export function MintEditorialPropertyManage({
  propertyId,
  propertyName,
  jobs,
}: Props) {
  const [section, setSection] = useState('work');
  const sections = [
    {
      id: 'work',
      title: 'Maintenance',
      detail: 'Schedules and open jobs',
      icon: CalendarDays,
    },
    {
      id: 'people',
      title: 'People and access',
      detail: 'Tenants, reporting and your team',
      icon: Users,
    },
    {
      id: 'records',
      title: 'Property records',
      detail: 'Photos and compliance',
      icon: FolderOpen,
    },
  ];
  return (
    <div className='col me-legacy-fit' style={{ gap: 24 }}>
      <header>
        <h2 className='t-h2'>Manage this property</h2>
        <p className='t-body'>
          Plan maintenance, give people the right access, and keep property
          records together.
        </p>
        <nav
          aria-label='Property management sections'
          className='grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6'
        >
          {sections.map(({ id, title, detail, icon: Icon }) => (
            <button
              key={id}
              type='button'
              aria-pressed={section === id}
              aria-controls={`manage-${id}`}
              onClick={() => setSection(id)}
              className='rounded-2xl border p-5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4'
              style={{
                background: section === id ? 'var(--me-brand)' : 'white',
                color: section === id ? 'white' : 'var(--me-ink)',
                borderColor:
                  section === id ? 'var(--me-brand)' : 'var(--me-border)',
              }}
            >
              <Icon size={22} aria-hidden='true' className='mb-3' />
              <span className='block font-semibold'>{title}</span>
              <span className='block text-sm mt-1'>{detail}</span>
            </button>
          ))}
        </nav>
      </header>
      <section
        hidden={section !== 'work'}
        id='manage-work'
        aria-labelledby='manage-work-title'
        className='scroll-mt-24'
      >
        <h3 id='manage-work-title' className='t-h3 mb-2'>
          Plan work
        </h3>
        <p className='t-meta mb-4'>
          Review due maintenance and arrange work at one or more properties.
        </p>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>
          <FeatureGateCard featureId='HOMEOWNER_RECURRING_MAINTENANCE'>
            <RecurringMaintenance propertyId={propertyId} />
          </FeatureGateCard>
          <FeatureGateCard featureId='HOMEOWNER_BULK_OPERATIONS'>
            <BulkOperations propertyId={propertyId} jobs={jobs} />
          </FeatureGateCard>
        </div>
        <details className='mt-5 rounded-2xl border bg-white p-5'>
          <summary className='cursor-pointer font-semibold'>
            View and follow up property jobs
          </summary>
          <div className='mt-4'>
            <PropertyWorkQueue jobs={jobs} />
          </div>
        </details>
      </section>
      <section
        hidden={section !== 'people'}
        id='manage-people'
        aria-labelledby='manage-people-title'
        className='scroll-mt-24'
      >
        <h3 id='manage-people-title' className='t-h3 mb-2'>
          People and access
        </h3>
        <p className='t-meta mb-4'>
          Manage tenant reporting, contact records, and the people who can help
          manage this property.
        </p>
        <Link
          href='/landlord/reports'
          className='btn btn-secondary btn-sm mb-4'
        >
          Review tenant reports across your properties
        </Link>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5 items-start'>
          <FeatureGateCard featureId='HOMEOWNER_TENANT_REPORTING'>
            <TenantReportingCard
              propertyId={propertyId}
              propertyName={propertyName}
            />
          </FeatureGateCard>
          <FeatureGateCard featureId='HOMEOWNER_TENANT_CONTACTS'>
            <TenantContacts propertyId={propertyId} />
          </FeatureGateCard>
          <FeatureGateCard featureId='HOMEOWNER_TEAM_ACCESS'>
            <TeamAccess propertyId={propertyId} />
          </FeatureGateCard>
        </div>
      </section>
      <section
        hidden={section !== 'records'}
        id='manage-records'
        aria-labelledby='manage-records-title'
        className='scroll-mt-24'
      >
        <h3 id='manage-records-title' className='t-h3 mb-2'>
          Records and compliance
        </h3>
        <p className='t-meta mb-4'>
          Keep room photos and supporting records organised. Job history is not
          proof of compliance.
        </p>
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 items-start'>
          <FeatureGateCard featureId='HOMEOWNER_ROOM_PHOTOS'>
            <RoomPhotoGallery propertyId={propertyId} />
          </FeatureGateCard>
          <FeatureGateCard featureId='HOMEOWNER_PORTFOLIO_ANALYTICS'>
            <PortfolioAnalyticsCard />
          </FeatureGateCard>
        </div>
      </section>
    </div>
  );
}
