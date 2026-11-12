'use client';
import { PropertyFileHub } from './PropertyFileHub';
import './property-workspace.css';
import { PropertyMaintenanceWorkspace } from './PropertyMaintenanceWorkspace';

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

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { HomeownerPageWrapper } from '@/app/dashboard/components/HomeownerPageWrapper';
import PropertyAssessments from './PropertyAssessments';
import { MintEditorialPropertyManage } from './MintEditorialPropertyManage';
import { MintEditorialPropertyMintSays } from './MintEditorialPropertyMintSays';
import { MintEditorialPropertySystemsTable } from './MintEditorialPropertySystemsTable';
import {
  MintEditorialPropertyDocuments,
  type PropertyCertificateRecord,
} from './MintEditorialPropertyDocuments';
import { MintEditorialPropertyTimeline } from './MintEditorialPropertyTimeline';
import { MintEditorialPropertyAccess } from './MintEditorialPropertyAccess';
import { type PropertySchedule } from './MintEditorialPropertyMaintenancePlan';
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
  /** Per-property recurring schedules fed into the Maintenance tab.
   *  Empty array renders the empty-state CTA. */
  schedules?: PropertySchedule[];
  certificates?: PropertyCertificateRecord[];
}

type Tab =
  | 'overview'
  | 'maintenance'
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

// 2026-05-23 audit: read initial tab from ?tab= so deep-links from
// the job-detail Right-Rail "Edit access" CTA actually land on the
// Access tab instead of dropping the user on Overview. Validates
// the value against the Tab union so an unknown / stale tab key
// silently falls back to 'overview' rather than rendering an empty
// pane. Lives in a static lookup outside the component so successive
// renders don't recompute the set.
const VALID_TABS = new Set<Tab>([
  'overview',
  'maintenance',
  'documents',
  'timeline',
  'access',
  'assessments',
  'manage',
]);

function initialTabFromUrl(): Tab {
  if (typeof window === 'undefined') return 'overview';
  const raw = new URL(window.location.href).searchParams.get('tab');
  if (raw && (VALID_TABS as Set<string>).has(raw)) return raw as Tab;
  return 'overview';
}

export function MintEditorialPropertyDetail({
  property,
  jobs,
  stats,
  certificates = [],
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  useEffect(() => {
    setActiveTab(initialTabFromUrl());
    const onBack = () => setActiveTab(initialTabFromUrl());
    window.addEventListener('popstate', onBack);
    return () => window.removeEventListener('popstate', onBack);
  }, []);
  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set('tab', tab);
    window.history.pushState(null, '', url);
  };

  const tabs: TabDef[] = [
    { id: 'overview', label: 'Overview' },
    {
      id: 'maintenance',
      label: 'Maintenance',
    },
    {
      id: 'documents',
      label: 'Documents',
    },
    { id: 'timeline', label: 'Timeline' },
    { id: 'access', label: 'Access & contacts' },
    { id: 'assessments', label: 'Assessments' },
    { id: 'manage', label: 'Manage' },
  ];

  return (
    <HomeownerPageWrapper>
      <div className='property-workspace'>
        <Link href='/properties' className='pw-back'>
          <ArrowLeft size={14} strokeWidth={1.75} /> Properties
        </Link>

        <div className='pw-tabs' role='tablist' aria-label='Property sections'>
          {tabs.map((t) => (
            <button
              key={t.id}
              type='button'
              role='tab'
              aria-selected={activeTab === t.id}
              id={`property-tab-${t.id}`}
              aria-controls={`property-panel-${t.id}`}
              tabIndex={activeTab === t.id ? 0 : -1}
              onKeyDown={(event) => {
                const index = tabs.findIndex((item) => item.id === t.id);
                const next =
                  event.key === 'ArrowRight'
                    ? (index + 1) % tabs.length
                    : event.key === 'ArrowLeft'
                      ? (index - 1 + tabs.length) % tabs.length
                      : event.key === 'Home'
                        ? 0
                        : event.key === 'End'
                          ? tabs.length - 1
                          : -1;
                if (next >= 0) {
                  event.preventDefault();
                  selectTab(tabs[next].id);
                  document
                    .getElementById(`property-tab-${tabs[next].id}`)
                    ?.focus();
                }
              }}
              onClick={() => selectTab(t.id)}
            >
              {t.label}
              {typeof t.count === 'number' ? (
                <span className='count'>· {t.count}</span>
              ) : null}
            </button>
          ))}
        </div>
        {activeTab !== 'overview' && (
          <header className='pw-heading'>
            <h1>
              {
                {
                  maintenance: 'Maintenance plan',
                  documents: 'Documents',
                  timeline: 'Property timeline',
                  access: 'Access & contacts',
                  assessments: 'Assessments',
                  manage: 'Manage this property',
                }[activeTab]
              }
            </h1>
            <p>
              {property.name} ·{' '}
              {[property.address, property.city].filter(Boolean).join(', ')}
            </p>
          </header>
        )}
        <div
          role='tabpanel'
          id={`property-panel-${activeTab}`}
          aria-labelledby={`property-tab-${activeTab}`}
        >
          {activeTab === 'overview' && (
            <>
              <PhotoHero property={property} />
              <PropertyHeader property={property} stats={stats} />
            </>
          )}

          {activeTab === 'overview' ? (
            <div
              className='me-prop-overview'
              style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)',
                gap: 18,
              }}
            >
              <div className='col' style={{ gap: 18 }}>
                <MintEditorialPropertyMintSays
                  property={property}
                  jobs={jobs}
                />
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
                <PropertyHealthCard
                  property={property}
                  jobs={jobs}
                  stats={stats}
                />
              </aside>
            </div>
          ) : null}

          {activeTab === 'maintenance' ? (
            <PropertyMaintenanceWorkspace
              propertyId={property.id}
              jobs={jobs}
            />
          ) : null}

          {activeTab === 'documents' ? (
            <div style={{ display: 'grid', gap: 24 }}>
              <PropertyFileHub
                propertyId={property.id}
                certificateCount={certificates.length}
              />
              <MintEditorialPropertyDocuments certificates={certificates} />
            </div>
          ) : null}

          {activeTab === 'timeline' ? (
            <MintEditorialPropertyTimeline jobs={jobs} />
          ) : null}

          {activeTab === 'access' ? (
            <MintEditorialPropertyAccess
              propertyId={property.id}
              jobs={jobs}
              entrySecretUnavailable={property.entry_secret_unavailable}
              initialAccess={{
                access_mode: property.access_mode ?? null,
                key_safe_code: property.key_safe_code ?? null,
                access_notes: property.access_notes ?? null,
                stopcock_location: property.stopcock_location ?? null,
                gas_isolator_location: property.gas_isolator_location ?? null,
                consumer_unit_location: property.consumer_unit_location ?? null,
              }}
            />
          ) : null}

          {activeTab === 'assessments' ? (
            <PropertyAssessments propertyId={property.id} />
          ) : null}

          {activeTab === 'manage' ? (
            <MintEditorialPropertyManage
              propertyId={property.id}
              propertyName={property.name}
              jobs={jobs}
              certificates={certificates}
              onOpenMaintenance={() => selectTab('maintenance')}
              onOpenDocuments={() => selectTab('documents')}
            />
          ) : null}
        </div>
      </div>
    </HomeownerPageWrapper>
  );
}
