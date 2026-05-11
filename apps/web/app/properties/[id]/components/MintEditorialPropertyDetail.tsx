'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import PropertyAssessments from './PropertyAssessments';
import { MintEditorialPropertyManage } from './MintEditorialPropertyManage';
import {
  PhotoHero,
  PropertyDetailsCard,
  PropertyHeader,
  PropertyHealthCard,
  RecentJobsCard,
  type JobItem,
  type PropertyShape,
  type Stats,
} from './MintEditorialPropertyCards';

interface Props {
  property: PropertyShape;
  jobs: JobItem[];
  stats: Stats;
}

type Tab = 'overview' | 'assessments' | 'manage';

const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'assessments', label: 'Assessments' },
  { id: 'manage', label: 'Manage' },
];

export function MintEditorialPropertyDetail({ property, jobs, stats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  return (
    <HomeownerPageWrapper>
      <Link
        href='/properties'
        className='btn btn-ghost btn-sm'
        style={{ marginBottom: 14 }}
      >
        <ArrowLeft size={14} strokeWidth={1.75} /> Properties
      </Link>

      <PhotoHero property={property} />
      <PropertyHeader property={property} stats={stats} />

      <div className='me-tabs' role='tablist' aria-label='Property sections'>
        {TABS.map((t) => (
          <button
            key={t.id}
            type='button'
            role='tab'
            aria-selected={activeTab === t.id}
            className={'me-tab ' + (activeTab === t.id ? 'on' : '')}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {t.id === 'overview' ? (
              <span className='count'>· {jobs.length}</span>
            ) : null}
          </button>
        ))}
      </div>

      {activeTab === 'overview' ? (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
            gap: 18,
          }}
        >
          <div className='col' style={{ gap: 18 }}>
            <PropertyDetailsCard property={property} />
            <RecentJobsCard jobs={jobs} propertyId={property.id} />
          </div>
          <aside
            className='col'
            style={{
              gap: 18,
              position: 'sticky',
              top: 84,
              alignSelf: 'start',
            }}
          >
            <PropertyHealthCard property={property} jobs={jobs} stats={stats} />
          </aside>
        </div>
      ) : null}

      {activeTab === 'assessments' ? (
        <PropertyAssessments propertyId={property.id} />
      ) : null}

      {activeTab === 'manage' ? (
        <MintEditorialPropertyManage
          propertyId={property.id}
          propertyName={property.name}
          jobs={jobs}
        />
      ) : null}
    </HomeownerPageWrapper>
  );
}
