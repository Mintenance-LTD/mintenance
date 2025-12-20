'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { format, formatDistanceToNow } from 'date-fns';
import { logger } from '@mintenance/shared';

interface ApprovalData {
  escrowId: string;
  amount: number;
  jobTitle: string;
  homeownerApproval: boolean;
  autoApprovalDate: string | null;
  beforePhotos: Array<{ url: string; angleType?: string; qualityScore?: number }>;
  afterPhotos: Array<{ url: string; angleType?: string; qualityScore?: number }>;
}

export function HomeownerApprovalClient() {
  const searchParams = useSearchParams();
  const escrowId = searchParams.get('escrowId');

  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [inspectionCompleted, setInspectionCompleted] = useState(false);

  const fetchApprovalData = useCallback(async () => {
    if (!escrowId) return;

    setLoading(true);
    try {
      const response = await fetch(`/api/escrow/${escrowId}/homeowner/pending-approval`);
      if (!response.ok) {
        throw new Error('Failed to fetch approval data');
      }
      const data = await response.json();
      setApprovalData(data.data);
      setInspectionCompleted(false); // Reset inspection status
    } catch (error) {
      logger.error('Error fetching approval data:', error);
    } finally {
      setLoading(false);
    }
  }, [escrowId]);

  useEffect(() => {
    fetchApprovalData();
  }, [fetchApprovalData]);

  const handleApprove = async () => {
    if (!escrowId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/escrow/${escrowId}/homeowner/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comments || undefined }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve');
      }
      alert('Completion approved successfully! Funds will be released after a 48-hour cooling-off period.');
      await fetchApprovalData();
    } catch (error) {
      logger.error('Error approving:', error);
      alert('Failed to approve: ' + (error as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!escrowId || !rejectionReason.trim()) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/escrow/${escrowId}/homeowner/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject');
      }
      alert('Completion rejected. An admin will review.');
      setShowRejectDialog(false);
      setRejectionReason('');
      await fetchApprovalData();
    } catch (error) {
      logger.error('Error rejecting:', error);
      alert('Failed to reject: ' + (error as Error).message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleMarkInspection = async () => {
    if (!escrowId) return;
    setActionLoading(true);
    try {
      const response = await fetch(`/api/escrow/${escrowId}/homeowner/inspect`, {
        method: 'POST',
      });
      if (!response.ok) {
        throw new Error('Failed to mark inspection');
      }
      setInspectionCompleted(true);
    } catch (error) {
      logger.error('Error marking inspection:', error);
      alert('Failed to mark inspection');
    } finally {
      setActionLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  if (!escrowId) {
    return (
      <div style={{ padding: theme.spacing.xl }}>
        <Card style={{ padding: theme.spacing.lg }}>
          <p style={{ color: theme.colors.textSecondary }}>No escrow ID provided.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ padding: theme.spacing.xl, display: 'flex', justifyContent: 'center' }}>
        <Spinner size="lg" />
      </div>
    );
  }

  if (!approvalData) {
    return (
      <div style={{ padding: theme.spacing.xl }}>
        <Card style={{ padding: theme.spacing.lg }}>
          <p style={{ color: theme.colors.textSecondary }}>Approval data not found.</p>
        </Card>
      </div>
    );
  }

  if (approvalData.homeownerApproval) {
    return (
      <div style={{ padding: theme.spacing.xl }}>
        <Card style={{ padding: theme.spacing.lg }}>
          <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.md }}>
            Already Approved
          </h1>
          <p style={{ color: theme.colors.textSecondary }}>
            You have already approved this completion. Funds will be released after the cooling-off period.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ padding: theme.spacing.xl, maxWidth: '1200px', margin: '0 auto' }}>
      <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.lg }}>
        Review Completion: {approvalData.jobTitle}
      </h1>

      <Card style={{ padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
        <div style={{ marginBottom: theme.spacing.md }}>
          <strong>Escrow Amount:</strong> {formatCurrency(approvalData.amount)}
        </div>
        {approvalData.autoApprovalDate && (
          <div style={{ marginBottom: theme.spacing.md, color: theme.colors.warning }}>
            <strong>Auto-approval in:</strong> {formatDistanceToNow(new Date(approvalData.autoApprovalDate))}
            <br />
            <small>If you don't respond, payment will be automatically released.</small>
          </div>
        )}
      </Card>

      {/* Before/After Comparison */}
      <Card style={{ padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
        <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.md }}>
          Before & After Comparison
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg }}>
          <div>
            <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
              Before Photos
            </h3>
            {approvalData.beforePhotos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.sm }}>
                {approvalData.beforePhotos.map((photo, idx) => (
                  <div key={idx}>
                    <img src={photo.url} alt={`Before ${idx + 1}`} style={{ width: '100%', borderRadius: theme.borderRadius.md }} />
                    {photo.qualityScore && (
                      <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                        Quality: {(photo.qualityScore * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No before photos available</p>
            )}
          </div>

          <div>
            <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
              After Photos
            </h3>
            {approvalData.afterPhotos.length > 0 ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.sm }}>
                {approvalData.afterPhotos.map((photo, idx) => (
                  <div key={idx}>
                    <img src={photo.url} alt={`After ${idx + 1}`} style={{ width: '100%', borderRadius: theme.borderRadius.md }} />
                    {photo.qualityScore && (
                      <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                        Quality: {(photo.qualityScore * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>No after photos available</p>
            )}
          </div>
        </div>
      </Card>

      {/* Inspection Checklist */}
      <Card style={{ padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
        <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.md }}>
          Inspection Checklist
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.sm }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <input
              type="checkbox"
              checked={inspectionCompleted}
              onChange={(e) => setInspectionCompleted(e.target.checked)}
            />
            <span>I have inspected the completed work</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <input type="checkbox" />
            <span>The work matches what was agreed upon</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <input type="checkbox" />
            <span>The work area is clean and tidy</span>
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: theme.spacing.sm }}>
            <input type="checkbox" />
            <span>I am satisfied with the quality of work</span>
          </label>
        </div>
        <Button
          variant="outline"
          onClick={handleMarkInspection}
          disabled={actionLoading || inspectionCompleted}
          style={{ marginTop: theme.spacing.md }}
        >
          {inspectionCompleted ? 'Inspection Completed ✓' : 'Mark Inspection Completed'}
        </Button>
      </Card>

      {/* Approval Actions */}
      <Card style={{ padding: theme.spacing.lg }}>
        <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.md }}>
          Your Decision
        </h2>

        <div style={{ marginBottom: theme.spacing.md }}>
          <label style={{ display: 'block', marginBottom: theme.spacing.xs, fontWeight: theme.typography.fontWeight.medium }}>
            Comments (optional):
          </label>
          <Input
            placeholder="Add any comments about the completion..."
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <Button onClick={handleApprove} disabled={actionLoading || !inspectionCompleted}>
            {actionLoading ? <Spinner size="sm" /> : 'Approve Completion'}
          </Button>
          <Button variant="secondary" onClick={() => setShowRejectDialog(true)} disabled={actionLoading}>
            Reject Completion
          </Button>
        </div>

        {!inspectionCompleted && (
          <p style={{ marginTop: theme.spacing.md, color: theme.colors.warning, fontSize: theme.typography.fontSize.sm }}>
            Please mark inspection as completed before approving.
          </p>
        )}
      </Card>

      {/* Reject Dialog */}
      {showRejectDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <Card style={{ padding: theme.spacing.xl, maxWidth: '500px', width: '90%' }}>
            <h3 style={{ fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.md }}>
              Reject Completion
            </h3>
            <p style={{ marginBottom: theme.spacing.md, color: theme.colors.textSecondary }}>
              Please provide a reason for rejecting this completion. An admin will review your concerns.
            </p>
            <Input
              placeholder="Reason for rejection (required)"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              style={{ marginBottom: theme.spacing.md }}
            />
            <div style={{ display: 'flex', gap: theme.spacing.md }}>
              <Button variant="outline" onClick={() => { setShowRejectDialog(false); setRejectionReason(''); }}>
                Cancel
              </Button>
              <Button onClick={handleReject} disabled={!rejectionReason.trim() || actionLoading}>
                {actionLoading ? <Spinner size="sm" /> : 'Submit Rejection'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

