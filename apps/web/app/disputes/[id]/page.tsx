'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui';
import { Icon } from '@/components/ui/Icon';
import { theme } from '@/lib/theme';

interface DisputeTimeline {
  status: string;
  timestamp: string;
  description: string;
}

export default function DisputeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const disputeId = params.id as string;
  const { user, loading } = useCurrentUser();
  const [dispute, setDispute] = useState<any>(null);
  const [timeline, setTimeline] = useState<DisputeTimeline[]>([]);
  const [loadingDispute, setLoadingDispute] = useState(true);

  useEffect(() => {
    if (disputeId) {
      fetch(`/api/disputes/${disputeId}`)
        .then(res => res.json())
        .then(data => {
          setDispute(data);
          // Build timeline
          const timelineData: DisputeTimeline[] = [
            {
              status: 'Created',
              timestamp: data.created_at,
              description: 'Dispute was created',
            },
          ];
          if (data.mediation_requested_at) {
            timelineData.push({
              status: 'Mediation Requested',
              timestamp: data.mediation_requested_at,
              description: 'Mediation was requested',
            });
          }
          if (data.resolved_at) {
            timelineData.push({
              status: 'Resolved',
              timestamp: data.resolved_at,
              description: data.resolution || 'Dispute was resolved',
            });
          }
          setTimeline(timelineData);
        })
        .catch(() => {})
        .finally(() => setLoadingDispute(false));
    }
  }, [disputeId]);

  if (loading || loadingDispute) {
    return <div>Loading...</div>;
  }

  if (!dispute) {
    return <div>Dispute not found</div>;
  }

  return (
    <div style={{
      maxWidth: '1000px',
      margin: '0 auto',
      padding: theme.spacing[6],
    }}>
      <h1 style={{
        fontSize: theme.typography.fontSize['3xl'],
        fontWeight: theme.typography.fontWeight.bold,
        marginBottom: theme.spacing[6],
      }}>
        Dispute Details
      </h1>

      <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
        {/* Status Card */}
        <Card style={{ padding: theme.spacing[6] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing[2],
              }}>
                Status: {dispute.status}
              </h2>
              <p style={{ color: theme.colors.textSecondary }}>
                Priority: {dispute.priority} • Estimated resolution: {dispute.sla_deadline ? new Date(dispute.sla_deadline).toLocaleDateString() : 'N/A'}
              </p>
            </div>
            {dispute.status === 'disputed' && (
              <Button
                variant="secondary"
                onClick={() => router.push(`/disputes/${disputeId}/mediation`)}
              >
                Request Mediation
              </Button>
            )}
          </div>
        </Card>

        {/* Timeline */}
        <Card style={{ padding: theme.spacing[6] }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing[4],
          }}>
            Timeline
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
            {timeline.map((item, index) => (
              <div key={index} style={{
                display: 'flex',
                gap: theme.spacing[4],
                paddingLeft: theme.spacing[4],
                borderLeft: '2px solid #E5E7EB',
              }}>
                <div style={{
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#3B82F6',
                  marginTop: '4px',
                  marginLeft: '-19px',
                }} />
                <div>
                  <p style={{
                    fontWeight: theme.typography.fontWeight.semibold,
                    marginBottom: theme.spacing[1],
                  }}>
                    {item.status}
                  </p>
                  <p style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textSecondary,
                    marginBottom: theme.spacing[1],
                  }}>
                    {item.description}
                  </p>
                  <p style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textTertiary,
                  }}>
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Dispute Details */}
        <Card style={{ padding: theme.spacing[6] }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing[4],
          }}>
            Dispute Information
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
            <div>
              <strong>Reason:</strong> {dispute.dispute_reason}
            </div>
            {dispute.dispute_evidence && (
              <div>
                <strong>Evidence:</strong> {Array.isArray(dispute.dispute_evidence) ? dispute.dispute_evidence.length : 0} items
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

