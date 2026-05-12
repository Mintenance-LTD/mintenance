'use client';

/**
 * Mint Editorial /properties/[id] orchestrator.
 *
 * Canonical mock (property-management.html "PROPERTY DETAIL — RICH"
 * lines 186-340) expects 6 sub-sections: Overview, Systems (rolled
 * into Overview as the Major Systems table), Documents, Timeline,
 * Access & contacts, plus the Assessments / Manage premium tabs.
 *
 * Each tab body lives in its own component to keep this file under
 * the 500-line MDC cap. Overview shows: photo hero → header → Mint
 * Says advice card → details + recent jobs → systems table → right
 * rail with health score.
 */

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import PropertyAssessments from './PropertyAssessments';
import { MintEditorialPropertyManage } from './MintEditorialPropertyManage';
import { MintEditorialPropertyMintSays } from './MintEditorialPropertyMintSays';
import { MintEditorialPropertySystemsTable } from './MintEditorialPropertySystemsTable';
import { MintEditorialPropertyDocuments } from './MintEditorialPropertyDocuments';
import { MintEditorialPropertyTimeline } from './MintEditorialPropertyTimeline';
import { MintEditorialPropertyAccess } from './MintEditorialPropertyAccess';
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

type Tab =
  | 'overview'
  | 'documents'
  | 'timeline'
  | 'access'
  | 'assessments'
  | 'manage';

interface TabDef {
  id: Tab;
  label: string;
  count?: number;
}

export function MintEditorialPropertyDetail({ property, jobs, stats }: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');

  const tabs: TabDef[] = [
    { id: 'overview', label: 'Overview', count: jobs.length },
    {
      id: 'documents',
      label: 'Documents',
      count: jobs.filter((j) => j.status === 'completed').length,
    },
    { id: 'timeline', label: 'Timeline' },
    { id: 'access', label: 'Access & contacts' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'manage', label: 'Manage' },
  ];

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
        {tabs.map((t) => (
          <button
            key={t.id}
            type='button'
            role='tab'
            aria-selected={activeTab === t.id}
            className={'me-tab ' + (activeTab === t.id ? 'on' : '')}
            onClick={() => setActiveTab(t.id)}
          >
            {t.label}
            {typeof t.count === 'number' ? (
              <span className='count'>· {t.count}</span>
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
            <MintEditorialPropertyMintSays property={property} jobs={jobs} />
            <PropertyDetailsCard property={property} />
            <MintEditorialPropertySystemsTable
              propertyId={property.id}
              jobs={jobs}
            />
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

      {activeTab === 'documents' ? (
        <MintEditorialPropertyDocuments propertyId={property.id} jobs={jobs} />
      ) : null}

      {activeTab === 'timeline' ? (
        <MintEditorialPropertyTimeline jobs={jobs} />
      ) : null}

      {activeTab === 'access' ? (
        <MintEditorialPropertyAccess propertyId={property.id} jobs={jobs} />
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
