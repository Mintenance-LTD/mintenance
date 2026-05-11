'use client';

/**
 * Mint Editorial "Manage" tab for /properties/[id].
 *
 * Reuses every atomic feature component the legacy
 * PropertyDetailsClient surfaces — RoomPhotoGallery,
 * RecurringMaintenance, TenantContacts, TeamAccess, BulkOperations,
 * PropertyAssessments — so feature parity is automatic and any future
 * fix to those components benefits both layouts. The only thing this
 * file owns is the small inline "Tenant Reporting Links" card, which
 * needs its own state (fetched tokens) + three handlers (generate /
 * toggle / copy). The handlers are deliberately duplicated from the
 * legacy file (~70 lines) rather than refactored out into a shared
 * hook this session — extracting the legacy code is a separate
 * dedupe slice and would risk regressions in the legacy property
 * page. Comment-marker so the future shared hook lands cleanly:
 *
 *   TODO(mint-editorial): extract useReportTokens(propertyId) hook
 *   into apps/web/app/properties/[id]/components/ and share with
 *   PropertyDetailsClient.tsx.
 */

import React, { useCallback, useEffect, useState } from 'react';
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

  const fetchReportTokens = useCallback(async () => {
    try {
      const res = await fetch(`/api/properties/${propertyId}/report-token`);
      if (res.ok) {
        const data = await res.json();
        setReportTokens(data.tokens || []);
      }
    } catch {
      // Silently fail — tokens are a premium feature.
    }
  }, [propertyId]);

  useEffect(() => {
    fetchReportTokens();
  }, [fetchReportTokens]);

  const handleGenerateReportToken = async () => {
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
        setReportTokens((prev) => [data.token, ...prev]);
        toast.success('Report link generated');
      } else {
        toast.error('Failed to generate report link');
      }
    } catch {
      toast.error('Failed to generate report link');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  const handleToggleToken = async (tokenId: string, isActive: boolean) => {
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
      if (res.ok) {
        setReportTokens((prev) =>
          prev.map((t) =>
            t.id === tokenId ? { ...t, is_active: !isActive } : t
          )
        );
        toast.success(isActive ? 'Link deactivated' : 'Link activated');
      }
    } catch {
      toast.error('Failed to update link');
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
        disabled={isGeneratingToken}
        style={{ width: '100%', justifyContent: 'center', marginBottom: 10 }}
      >
        {isGeneratingToken ? 'Generating…' : 'Generate report link'}
      </button>
      {reportTokens.length > 0 ? (
        <div className='col' style={{ gap: 6 }}>
          {reportTokens.slice(0, 3).map((token) => (
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
                {token.is_active ? 'Active' : 'Inactive'}
              </span>
              <div style={{ flex: 1 }} />
              <button
                type='button'
                onClick={() => copyReportLink(token.id)}
                className='btn btn-ghost btn-sm'
                aria-label='Copy link'
                style={{ padding: '4px 6px' }}
              >
                <Copy size={12} strokeWidth={1.75} />
              </button>
              <button
                type='button'
                onClick={() => handleToggleToken(token.id, token.is_active)}
                className='btn btn-ghost btn-sm'
                style={{ padding: '4px 8px', fontSize: 12 }}
              >
                {token.is_active ? 'Disable' : 'Enable'}
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
        <h4 className='t-h4'>Portfolio analytics</h4>
      </div>
      <p className='t-meta' style={{ marginBottom: 12 }}>
        Detailed spend tracking and maintenance analytics across your homes.
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
    <div className='col' style={{ gap: 14 }}>
      <p className='t-body'>
        Premium tools for this property. Cards you can&rsquo;t open are gated by
        your subscription plan.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
          gap: 16,
        }}
      >
        <FeatureGateCard featureId='HOMEOWNER_ROOM_PHOTOS'>
          <RoomPhotoGallery propertyId={propertyId} />
        </FeatureGateCard>
        <FeatureGateCard featureId='HOMEOWNER_TENANT_REPORTING'>
          <TenantReportingCard
            propertyId={propertyId}
            propertyName={propertyName}
          />
        </FeatureGateCard>
        <FeatureGateCard featureId='HOMEOWNER_RECURRING_MAINTENANCE'>
          <RecurringMaintenance propertyId={propertyId} />
        </FeatureGateCard>
        <FeatureGateCard featureId='HOMEOWNER_TENANT_CONTACTS'>
          <TenantContacts propertyId={propertyId} />
        </FeatureGateCard>
        <FeatureGateCard featureId='HOMEOWNER_TEAM_ACCESS'>
          <TeamAccess propertyId={propertyId} />
        </FeatureGateCard>
        <FeatureGateCard featureId='HOMEOWNER_PORTFOLIO_ANALYTICS'>
          <PortfolioAnalyticsCard />
        </FeatureGateCard>
        <FeatureGateCard featureId='HOMEOWNER_BULK_OPERATIONS'>
          <BulkOperations propertyId={propertyId} jobs={jobs} />
        </FeatureGateCard>
      </div>
    </div>
  );
}
