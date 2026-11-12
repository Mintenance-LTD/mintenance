'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  CalendarDays,
  Users,
  FolderOpen,
  ArrowRight,
  Wrench,
  Award,
  FileText,
} from 'lucide-react';
import { usePropertyView } from '@/hooks/usePropertyView';
import { showPropertyTool } from '@mintenance/shared';
import { FeatureGateCard } from '@/components/FeatureGateCard';
import { TenantReportingCard } from './TenantReportingCard';
import RecurringMaintenance from './RecurringMaintenance';
import TenantContacts from './TenantContacts';
import TeamAccess from './TeamAccess';
import BulkOperations from './BulkOperations';
import RoomPhotoGallery from './RoomPhotoGallery';
import TenancyInspections from './TenancyInspections';
import { PropertyWorkQueue } from './PropertyWorkQueue';
import type { PropertyCertificateRecord } from './MintEditorialPropertyDocuments';
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
  certificates?: PropertyCertificateRecord[];
  onOpenMaintenance?: () => void;
  onOpenDocuments?: () => void;
}
export function MintEditorialPropertyManage({
  propertyId,
  propertyName,
  jobs,
  certificates = [],
  onOpenMaintenance,
  onOpenDocuments,
}: Props) {
  const { view } = usePropertyView();
  const [section, setSection] = useState('work');
  const visibleSection =
    view === 'home' && section === 'people' ? 'records' : section;
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
    <div className='pw-stack'>
      <nav aria-label='Property management sections' className='pw-sections'>
        {sections
          .filter((item) => view !== 'home' || item.id !== 'people')
          .map(({ id, title, detail, icon: Icon }) => (
            <button
              key={id}
              type='button'
              className='pw-section'
              aria-pressed={visibleSection === id}
              aria-controls={'manage-' + id}
              onClick={() => setSection(id)}
            >
              <span className='pw-icon' aria-hidden='true'>
                <Icon size={24} strokeWidth={1.8} />
              </span>
              <div className='pw-section-copy'>
                <strong>{title}</strong>
                <span>{detail}</span>
              </div>
            </button>
          ))}
      </nav>
      <section
        hidden={visibleSection !== 'work'}
        id='manage-work'
        aria-labelledby='manage-work-title'
        className='pw-stack'
      >
        <div className='pw-between'>
          <div>
            <h2 id='manage-work-title'>Plan and coordinate work</h2>
            <p className='pw-muted' style={{ marginTop: 5 }}>
              Review due maintenance and arrange work at one or more properties.
            </p>
          </div>
          {onOpenMaintenance && (
            <button className='pw-btn' onClick={onOpenMaintenance}>
              Open maintenance plan <ArrowRight size={17} />
            </button>
          )}
        </div>
        <div className='pw-split'>
          <div className='pw-legacy'>
            <FeatureGateCard featureId='HOMEOWNER_RECURRING_MAINTENANCE'>
              <RecurringMaintenance propertyId={propertyId} />
            </FeatureGateCard>
          </div>
          {showPropertyTool(view, 'team') ? (
            <div className='pw-legacy'>
              <FeatureGateCard featureId='HOMEOWNER_BULK_OPERATIONS'>
                <BulkOperations propertyId={propertyId} jobs={jobs} />
              </FeatureGateCard>
            </div>
          ) : (
            <section className='pw-card'>
              <h3>Arrange work</h3>
              <Link
                className='pw-btn pw-btn-primary'
                href={'/jobs/create?property_id=' + propertyId}
              >
                Post a job for this property <ArrowRight size={18} />
              </Link>
            </section>
          )}
        </div>
        <PropertyWorkQueue jobs={jobs} />
      </section>
      <section
        hidden={visibleSection !== 'people'}
        id='manage-people'
        aria-labelledby='manage-people-title'
        className='pw-stack'
      >
        <h2 id='manage-people-title'>People and access</h2>
        <div className='pw-split'>
          <div className='pw-stack'>
            {showPropertyTool(view, 'rental') && (
              <div className='pw-legacy'>
                <FeatureGateCard featureId='HOMEOWNER_TENANT_CONTACTS'>
                  <TenantContacts propertyId={propertyId} />
                </FeatureGateCard>
              </div>
            )}
            {showPropertyTool(view, 'team') && (
              <div className='pw-legacy'>
                <FeatureGateCard featureId='HOMEOWNER_TEAM_ACCESS'>
                  <TeamAccess propertyId={propertyId} />
                </FeatureGateCard>
              </div>
            )}
          </div>
          <div className='pw-stack'>
            {showPropertyTool(view, 'rental') && (
              <div className='pw-legacy'>
                <FeatureGateCard featureId='HOMEOWNER_TENANT_REPORTING'>
                  <TenantReportingCard
                    propertyId={propertyId}
                    propertyName={propertyName}
                  />
                </FeatureGateCard>
              </div>
            )}
            <section className='pw-card'>
              <div className='pw-row'>
                <span className='pw-icon'>
                  <Wrench size={26} />
                </span>
                <div>
                  <h3>Tenant reports</h3>
                  <p className='pw-muted'>Review and assign reported issues.</p>
                </div>
              </div>
              <Link
                className='pw-btn'
                style={{ marginTop: 18 }}
                href='/landlord/reports'
              >
                View reports <ArrowRight size={16} />
              </Link>
            </section>
          </div>
        </div>
      </section>
      <section
        hidden={visibleSection !== 'records'}
        id='manage-records'
        aria-labelledby='manage-records-title'
        className='pw-stack'
      >
        <h2 id='manage-records-title'>Property records</h2>
        <div className='pw-split'>
          <div className='pw-stack'>
            {visibleSection === 'records' && (
              <div className='pw-legacy'>
                <TenancyInspections key={propertyId} propertyId={propertyId} />
              </div>
            )}
            <div className='pw-legacy'>
              <FeatureGateCard featureId='HOMEOWNER_ROOM_PHOTOS'>
                <RoomPhotoGallery propertyId={propertyId} />
              </FeatureGateCard>
            </div>
          </div>
          <aside className='pw-stack'>
            {showPropertyTool(view, 'rental') && (
              <FeatureGateCard featureId='HOMEOWNER_PORTFOLIO_ANALYTICS'>
                <section className='pw-card'>
                  <h3>Compliance records</h3>
                  <p className='pw-muted'>
                    Track certificates and expiry dates.
                  </p>
                  <div className='pw-empty'>
                    <span className='pw-icon'>
                      <Award size={32} />
                    </span>
                    <p>
                      {certificates.length
                        ? certificates.length + ' certificate records'
                        : 'No certificate records added'}
                    </p>
                    <Link
                      className='pw-btn pw-btn-primary'
                      href='/properties/compliance'
                    >
                      Add certificate
                    </Link>
                  </div>
                  <Link
                    className='pw-btn'
                    style={{ width: '100%' }}
                    href='/properties/compliance'
                  >
                    View compliance dashboard
                  </Link>
                </section>
              </FeatureGateCard>
            )}
            <section className='pw-card'>
              <div className='pw-row'>
                <FileText size={24} />
                <h3>Related documents</h3>
              </div>
              <p className='pw-muted' style={{ margin: '16px 0' }}>
                Find leases, warranties and supporting property files.
              </p>
              {onOpenDocuments ? (
                <button
                  className='pw-text-button pw-row'
                  onClick={onOpenDocuments}
                >
                  Open documents <ArrowRight size={17} />
                </button>
              ) : (
                <Link
                  className='pw-btn'
                  href={'/properties/' + propertyId + '?tab=documents'}
                >
                  Open documents
                </Link>
              )}
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}
