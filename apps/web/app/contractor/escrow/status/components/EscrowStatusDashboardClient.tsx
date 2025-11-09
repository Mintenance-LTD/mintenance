'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { format, formatDistanceToNow } from 'date-fns';
import { logger } from '@mintenance/shared';

interface EscrowStatus {
  status: string;
  blockingReasons: string[];
  nextAction: string | null;
  estimatedReleaseDate: Date | null;
  canRelease: boolean;
  adminHoldStatus: string;
  homeownerApproval: boolean;
  photoVerificationStatus: string | null;
  coolingOffEndsAt: Date | null;
  autoApprovalDate: Date | null;
}

interface EscrowTransaction {
  id: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  status: string;
  createdAt: string;
}

export function EscrowStatusDashboardClient() {
  const [escrows, setEscrows] = useState<EscrowTransaction[]>([]);
  const [selectedEscrowId, setSelectedEscrowId] = useState<string | null>(null);
  const [escrowStatus, setEscrowStatus] = useState<EscrowStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusLoading, setStatusLoading] = useState(false);

  const fetchEscrows = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch contractor's escrows
      const response = await fetch('/api/contractor/escrows');
      if (!response.ok) {
        throw new Error('Failed to fetch escrows');
      }
      const data = await response.json();
      setEscrows(data.data || []);
    } catch (error) {
      logger.error('Error fetching escrows:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchEscrowStatus = useCallback(async (escrowId: string) => {
    setStatusLoading(true);
    try {
      const response = await fetch(`/api/escrow/${escrowId}/status`);
      if (!response.ok) {
        throw new Error('Failed to fetch status');
      }
      const data = await response.json();
      setEscrowStatus(data.data);
    } catch (error) {
      logger.error('Error fetching escrow status:', error);
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEscrows();
    const interval = setInterval(fetchEscrows, 30000);
    return () => clearInterval(interval);
  }, [fetchEscrows]);

  useEffect(() => {
    if (selectedEscrowId) {
      fetchEscrowStatus(selectedEscrowId);
      const interval = setInterval(() => fetchEscrowStatus(selectedEscrowId), 30000);
      return () => clearInterval(interval);
    }
  }, [selectedEscrowId, fetchEscrowStatus]);

  const handleRequestAdminReview = async (escrowId: string) => {
    try {
      const response = await fetch(`/api/escrow/${escrowId}/request-admin-review`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to request admin review');
      }
      await fetchEscrowStatus(escrowId);
      alert('Admin review requested successfully');
    } catch (error) {
      logger.error('Error requesting admin review:', error);
      alert('Failed to request admin review');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  return (
    <div style={{ padding: theme.spacing.xl }}>
      <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.lg }}>
        Escrow Status Dashboard
      </h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg }}>
        {/* Escrow List */}
        <Card style={{ padding: theme.spacing.lg }}>
          <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.md }}>
            Your Escrows ({escrows.length})
          </h2>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing.xl }}>
              <Spinner size="lg" />
            </div>
          ) : escrows.length === 0 ? (
            <p style={{ textAlign: 'center', color: theme.colors.textSecondary, padding: theme.spacing.xl }}>
              No escrows found.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
              {escrows.map((escrow) => (
                <div
                  key={escrow.id}
                  onClick={() => setSelectedEscrowId(escrow.id)}
                  style={{
                    padding: theme.spacing.md,
                    border: `1px solid ${selectedEscrowId === escrow.id ? theme.colors.primary : theme.colors.border}`,
                    borderRadius: theme.borderRadius.md,
                    cursor: 'pointer',
                    backgroundColor: selectedEscrowId === escrow.id ? theme.colors.primary + '10' : 'transparent',
                  }}
                >
                  <div style={{ fontWeight: theme.typography.fontWeight.semibold }}>{escrow.jobTitle}</div>
                  <div style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                    {formatCurrency(escrow.amount)} • {escrow.status}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Status Details */}
        <Card style={{ padding: theme.spacing.lg }}>
          {!selectedEscrowId ? (
            <p style={{ textAlign: 'center', color: theme.colors.textSecondary, padding: theme.spacing.xl }}>
              Select an escrow to view status
            </p>
          ) : statusLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing.xl }}>
              <Spinner size="lg" />
            </div>
          ) : escrowStatus ? (
            <>
              <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.md }}>
                Status Details
              </h2>

              <div style={{ marginBottom: theme.spacing.lg }}>
                <div style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.sm }}>
                  Status: {escrowStatus.status}
                </div>
                <div style={{ color: escrowStatus.canRelease ? theme.colors.success : theme.colors.warning }}>
                  {escrowStatus.canRelease ? 'Ready for release' : 'Release blocked'}
                </div>
              </div>

              {escrowStatus.blockingReasons.length > 0 && (
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
                    Blocking Reasons:
                  </h3>
                  <ul style={{ listStyle: 'disc', paddingLeft: theme.spacing.lg }}>
                    {escrowStatus.blockingReasons.map((reason, idx) => (
                      <li key={idx} style={{ marginBottom: theme.spacing.xs, color: theme.colors.textSecondary }}>
                        {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {escrowStatus.nextAction && (
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
                    Next Action:
                  </h3>
                  <p style={{ color: theme.colors.textSecondary }}>{escrowStatus.nextAction}</p>
                </div>
              )}

              {escrowStatus.estimatedReleaseDate && (
                <div style={{ marginBottom: theme.spacing.lg }}>
                  <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
                    Estimated Release Date:
                  </h3>
                  <p style={{ color: theme.colors.textSecondary }}>
                    {format(escrowStatus.estimatedReleaseDate, 'MMM d, yyyy HH:mm')} ({formatDistanceToNow(escrowStatus.estimatedReleaseDate)})
                  </p>
                </div>
              )}

              <div style={{ marginBottom: theme.spacing.lg }}>
                <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
                  Verification Status:
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.sm }}>
                  <div>Admin Hold: {escrowStatus.adminHoldStatus}</div>
                  <div>Homeowner Approval: {escrowStatus.homeownerApproval ? '✓ Yes' : '✗ No'}</div>
                  <div>Photo Verification: {escrowStatus.photoVerificationStatus || 'Pending'}</div>
                  {escrowStatus.coolingOffEndsAt && (
                    <div>
                      Cooling-off: {formatDistanceToNow(escrowStatus.coolingOffEndsAt)} remaining
                    </div>
                  )}
                  {escrowStatus.autoApprovalDate && !escrowStatus.homeownerApproval && (
                    <div>
                      Auto-approval: {formatDistanceToNow(escrowStatus.autoApprovalDate)}
                    </div>
                  )}
                </div>
              </div>

              {!escrowStatus.homeownerApproval && escrowStatus.autoApprovalDate && new Date(escrowStatus.autoApprovalDate) < new Date() && (
                <Button onClick={() => handleRequestAdminReview(selectedEscrowId)}>
                  Request Admin Review
                </Button>
              )}
            </>
          ) : (
            <p style={{ textAlign: 'center', color: theme.colors.textSecondary, padding: theme.spacing.xl }}>
              Failed to load status
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}

