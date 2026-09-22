'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { BarChart2, Copy, Link2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { getCsrfToken } from '@/lib/csrf-client';
import { safeCopyToClipboard } from '@/lib/utils/clipboard';
import { FeatureGateCard } from '@/components/FeatureGateCard';
import RecurringMaintenance from './RecurringMaintenance';
import TenantContacts from './TenantContacts';
import TeamAccess from './TeamAccess';
import BulkOperations from './BulkOperations';
import RoomPhotoGallery from './RoomPhotoGallery';
import { PropertyWorkQueue } from './PropertyWorkQueue';

interface ReportToken {
  id: string;
  property_id: string;
  label: string | null;
  is_active: boolean;
  created_at: string;
}

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

function TenantReportingCard({
  propertyId,
  propertyName,
}: {
  propertyId: string;
  propertyName: string;
}) {
  const [reportTokens, setReportTokens] = useState<ReportToken[]>([]);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [updating, setUpdating] = useState<string | null>(null);
  const mutationPending = useRef(false);

  const fetchReportTokens = useCallback(async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch(`/api/properties/${propertyId}/report-token`);
      if (!res.ok) throw new Error('Failed to load reporting links');
      const data = await res.json();
      if (!Array.isArray(data.tokens))
        throw new Error('Incomplete reporting links');
      setReportTokens(data.tokens);
    } catch {
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [propertyId]);

  useEffect(() => {
    fetchReportTokens();
  }, [fetchReportTokens]);

  const handleGenerateReportToken = async () => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setIsGeneratingToken(true);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/report-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ label: `Report link for ${propertyName}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (!data.token?.id || data.token.property_id !== propertyId)
          throw new Error('Incomplete reporting link');
        setReportTokens((prev) => [data.token, ...prev]);
        toast.success('Report link generated');
      } else {
        toast.error('Failed to generate report link');
      }
    } catch {
      toast.error('Failed to generate report link');
    } finally {
      mutationPending.current = false;
      setIsGeneratingToken(false);
    }
  };

  const handleToggleToken = async (tokenId: string, isActive: boolean) => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    setUpdating(tokenId);
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`/api/properties/${propertyId}/report-token`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ token_id: tokenId, is_active: !isActive }),
      });
      if (!res.ok) throw new Error('Failed to update link');
      const data = await res.json();
      if (
        data.token?.id !== tokenId ||
        data.token.property_id !== propertyId ||
        data.token.is_active !== !isActive
      )
        throw new Error('Incomplete link update');
      {
        setReportTokens((prev) =>
          prev.map((t) =>
            t.id === tokenId ? { ...t, is_active: !isActive } : t
          )
        );
        toast.success(isActive ? 'Link deactivated' : 'Link activated');
      }
    } catch {
      toast.error('Failed to update link');
    } finally {
      mutationPending.current = false;
      setUpdating(null);
    }
  };

  const copyReportLink = async (tokenId: string) => {
    const url = `${window.location.origin}/report/${tokenId}`;
    const ok = await safeCopyToClipboard(url);
    if (ok) {
      toast.success('Link copied to clipboard');
    } else {
      toast.error('Failed to copy. Please copy the link manually.');
    }
  };

  return (
    <div className='card card-pad'>
      <div className='row' style={{ gap: 8, marginBottom: 8 }}>
        <Link2
          size={14}
          strokeWidth={1.75}
          style={{ color: 'var(--me-brand)' }}
        />
        <h4 className='t-h4'>Tenant reporting links</h4>
      </div>
      <p className='t-meta' style={{ marginBottom: 12 }}>
        Share a link with tenants so they can report maintenance without needing
        an account.
      </p>
      <button
        type='button'
        className='btn btn-primary btn-sm'
        onClick={handleGenerateReportToken}
        disabled={
          loading || loadError || isGeneratingToken || updating !== null
        }
        style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
      >
        {isGeneratingToken ? 'Generating…' : 'Generate report link'}
      </button>
      {loading && <p role='status'>Loading reporting links…</p>}
      {loadError && (
        <div role='alert'>
          <p>Reporting links could not be loaded.</p>
          <button
            type='button'
            className='btn btn-secondary btn-sm'
            onClick={fetchReportTokens}
          >
            Retry reporting links
          </button>
        </div>
      )}
      {!loading && !loadError && reportTokens.length === 0 && (
        <p>No reporting links yet.</p>
      )}
      {!loadError && reportTokens.length > 0 ? (
        <div className='col' style={{ gap: 6 }}>
          {reportTokens.map((token) => (
            <div
              key={token.id}
              className='row'
              style={{
                gap: 8,
                padding: '8px 10px',
                background: 'var(--me-bg-2)',
                borderRadius: 8,
                fontSize: 12,
              }}
            >
              <span
                style={{
                  fontWeight: 600,
                  color: token.is_active
                    ? 'var(--me-ok-fg)'
                    : 'var(--me-ink-3)',
                }}
              >
                {token.label || 'Tenant report link'} ·{' '}
                {token.is_active ? 'Active' : 'Inactive'}
              </span>
              <div style={{ flex: 1 }} />
              <button
                type='button'
                onClick={() => copyReportLink(token.id)}
                className='btn btn-ghost btn-sm'
                aria-label={`Copy ${token.label || 'reporting link'}`}
                style={{ padding: '4px 6px' }}
              >
                <Copy size={12} strokeWidth={1.75} />
              </button>
              <button
                type='button'
                disabled={isGeneratingToken || updating !== null}
                onClick={() => handleToggleToken(token.id, token.is_active)}
                className='btn btn-ghost btn-sm'
                style={{ padding: '4px 8px', fontSize: 12 }}
              >
                {updating === token.id
                  ? 'Saving…'
                  : token.is_active
                    ? 'Disable'
                    : 'Enable'}
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
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
          className='flex flex-wrap gap-3 mt-3'
        >
          <a className='btn btn-secondary btn-sm' href='#manage-work'>
            Plan work
          </a>
          <a className='btn btn-secondary btn-sm' href='#manage-people'>
            People and access
          </a>
          <a className='btn btn-secondary btn-sm' href='#manage-records'>
            Records and compliance
          </a>
        </nav>
      </header>
      <PropertyWorkQueue jobs={jobs} />
      <section
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
      </section>
      <section
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
        <div className='grid grid-cols-1 xl:grid-cols-3 gap-4 items-start'>
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
