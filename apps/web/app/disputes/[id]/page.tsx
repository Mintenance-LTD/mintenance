'use client';

import { DisputeEvidenceLinks } from '@/components/disputes/DisputeEvidenceLinks';
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui';

import { theme } from '@/lib/theme';
import { PageLoader } from '@/components/LoadingButton';
import { useMediationRequest } from '../components/useMediationRequest';
import { MintEditorialDisputeDetail } from './MintEditorialDisputeDetail';

interface DisputeTimeline {
  status: string;
  timestamp: string;
  description: string;
}

export default function DisputeDetailPage() {
  const params = useParams();
  const disputeId = params.id as string;
  const { loading } = useCurrentUser();
  const [dispute, setDispute] = useState<{
    status: string;
    priority: string;
    sla_deadline?: string;
    dispute_reason?: string;
    dispute_evidence?: unknown[];
    created_at?: string;
    mediation_requested_at?: string;
    mediation_status?: string;
    resolved_at?: string;
    resolution?: string;
  } | null>(null);
  const [timeline, setTimeline] = useState<DisputeTimeline[]>([]);
  const [loadingDispute, setLoadingDispute] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reload, setReload] = useState(0);
  const refresh = () => setReload((value) => value + 1);
  const mediation = useMediationRequest(disputeId, refresh);

  // Mint Editorial theme detection — swap the entire detail surface
  // for the canonical "Track resolution" layout when active.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingDispute(true);
    setLoadError(null);
    fetch('/api/disputes/' + encodeURIComponent(disputeId))
      .then(async (response) => {
        const data = await response.json().catch(() => null);
        if (
          !response.ok ||
          !data ||
          data.id !== disputeId ||
          typeof data.status !== 'string'
        ) {
          throw new Error(
            typeof data?.error === 'string'
              ? data.error
              : data?.error?.message ||
                  'Unable to load dispute details. Please retry.'
          );
        }
        if (!active) return;
        setDispute(data);
        const entries: DisputeTimeline[] = [];
        if (data.created_at)
          entries.push({
            status: 'Created',
            timestamp: data.created_at,
            description: 'Dispute was created',
          });
        if (data.mediation_requested_at)
          entries.push({
            status: 'Mediation Requested',
            timestamp: data.mediation_requested_at,
            description: 'Mediation was requested',
          });
        if (data.resolved_at)
          entries.push({
            status: 'Resolved',
            timestamp: data.resolved_at,
            description: data.resolution || 'Dispute was resolved',
          });
        setTimeline(entries);
      })
      .catch((error) => {
        if (active) {
          setDispute(null);
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load dispute details.'
          );
        }
      })
      .finally(() => {
        if (active) setLoadingDispute(false);
      });
    return () => {
      active = false;
    };
  }, [disputeId, reload]);

  if (loading || loadingDispute) {
    return <PageLoader message='Loading dispute details' />;
  }

  if (loadError || !dispute) {
    return (
      <div role='alert' className='card card-pad'>
        <p>{loadError || 'Dispute not found'}</p>
        <Button onClick={refresh}>Retry</Button>
      </div>
    );
  }

  if (isMintEditorial) {
    return (
      <MintEditorialDisputeDetail
        key={disputeId}
        onMediationUpdated={refresh}
        disputeId={disputeId}
        dispute={dispute}
        timeline={timeline}
      />
    );
  }

  return (
    <div
      style={{
        maxWidth: '1000px',
        margin: '0 auto',
        padding: theme.spacing[6],
      }}
    >
      <h1
        style={{
          fontSize: theme.typography.fontSize['3xl'],
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing[6],
        }}
      >
        Dispute Details
      </h1>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: theme.spacing[6],
        }}
      >
        {/* Status Card */}
        <Card style={{ padding: theme.spacing[6] }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <h2
                style={{
                  fontSize: theme.typography.fontSize.xl,
                  fontWeight: theme.typography.fontWeight.semibold,
                  marginBottom: theme.spacing[2],
                }}
              >
                Status: {dispute.status}
              </h2>
              <p style={{ color: theme.colors.textSecondary }}>
                Priority: {dispute.priority} • Estimated resolution:{' '}
                {dispute.sla_deadline
                  ? new Date(dispute.sla_deadline).toLocaleDateString('en-GB')
                  : 'N/A'}
              </p>
            </div>
            {dispute.status === 'disputed' &&
              !dispute.mediation_requested_at && (
                <Button
                  variant='secondary'
                  onClick={mediation.request}
                  disabled={mediation.pending}
                >
                  {mediation.pending ? 'Saving request…' : 'Request Mediation'}
                </Button>
              )}
          </div>
        </Card>

        {mediation.error && <p role='alert'>{mediation.error}</p>}
        {/* Timeline */}
        <Card style={{ padding: theme.spacing[6] }}>
          <h2
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[4],
            }}
          >
            Timeline
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[4],
            }}
          >
            {timeline.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: theme.spacing[4],
                  paddingLeft: theme.spacing[4],
                  borderLeft: '2px solid #E5E7EB',
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: '#3B82F6',
                    marginTop: '4px',
                    marginLeft: '-19px',
                  }}
                />
                <div>
                  <p
                    style={{
                      fontWeight: theme.typography.fontWeight.semibold,
                      marginBottom: theme.spacing[1],
                    }}
                  >
                    {item.status}
                  </p>
                  <p
                    style={{
                      fontSize: theme.typography.fontSize.sm,
                      color: theme.colors.textSecondary,
                      marginBottom: theme.spacing[1],
                    }}
                  >
                    {item.description}
                  </p>
                  <p
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.textTertiary,
                    }}
                  >
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Dispute Details */}
        <Card style={{ padding: theme.spacing[6] }}>
          <h2
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing[4],
            }}
          >
            Dispute Information
          </h2>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: theme.spacing[3],
            }}
          >
            <div>
              <strong>Reason:</strong> {dispute.dispute_reason}
            </div>
            <DisputeEvidenceLinks items={dispute.dispute_evidence} />
          </div>
        </Card>
      </div>
    </div>
  );
}
