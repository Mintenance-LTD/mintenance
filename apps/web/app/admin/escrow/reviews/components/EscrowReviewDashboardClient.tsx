'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { logger } from '@mintenance/shared';

interface EscrowReview {
  id: string;
  escrowId: string;
  jobId: string;
  jobTitle: string;
  contractorId: string;
  contractorName: string;
  homeownerId: string;
  homeownerName: string;
  amount: number;
  adminHoldStatus: 'pending_review' | 'admin_hold' | 'admin_approved';
  adminHoldReason: string | null;
  adminHoldAt: string | null;
  photoVerificationStatus: string | null;
  homeownerApproval: boolean;
  createdAt: string;
}

interface EscrowReviewDetails extends EscrowReview {
  beforePhotos: string[];
  afterPhotos: string[];
  photoVerificationScore: number | null;
  beforeAfterComparisonScore: number | null;
  geolocationVerified: boolean;
  timestampVerified: boolean;
  photoQualityPassed: boolean;
  homeownerApprovalHistory: Array<{
    action: string;
    comments: string | null;
    createdAt: string;
  }>;
  trustScore: number | null;
  releaseBlockedReason: string | null;
  estimatedReleaseDate: string | null;
}

export function EscrowReviewDashboardClient() {
  const [reviews, setReviews] = useState<EscrowReview[]>([]);
  const [selectedReview, setSelectedReview] = useState<EscrowReviewDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [holdDialog, setHoldDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const fetchPendingReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/escrow/pending-reviews?limit=50');
      if (!response.ok) {
        throw new Error('Failed to fetch pending reviews');
      }
      const data = await response.json();
      setReviews(data.data || []);
    } catch (error) {
      logger.error('Error fetching pending reviews:', error);
      setErrorDialog({ open: true, message: 'Failed to load escrow reviews' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingReviews();
    const interval = setInterval(fetchPendingReviews, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingReviews]);

  const fetchReviewDetails = async (escrowId: string) => {
    try {
      const response = await fetch(`/api/admin/escrow/${escrowId}/review-details`);
      if (!response.ok) {
        throw new Error('Failed to fetch review details');
      }
      const data = await response.json();
      setSelectedReview(data.data);
    } catch (error) {
      logger.error('Error fetching review details:', error);
      setErrorDialog({ open: true, message: 'Failed to load review details' });
    }
  };

  const handleApprove = async () => {
    if (!selectedReview) return;
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/escrow/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId: selectedReview.escrowId,
          notes: notes || undefined,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to approve escrow');
      }
      setApproveDialog(false);
      setNotes('');
      setSelectedReview(null);
      await fetchPendingReviews();
    } catch (error) {
      logger.error('Error approving escrow:', error);
      setErrorDialog({ open: true, message: (error as Error).message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReview || !reason.trim()) return;
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/escrow/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId: selectedReview.escrowId,
          reason,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reject escrow');
      }
      setRejectDialog(false);
      setReason('');
      setSelectedReview(null);
      await fetchPendingReviews();
    } catch (error) {
      logger.error('Error rejecting escrow:', error);
      setErrorDialog({ open: true, message: (error as Error).message });
    } finally {
      setActionLoading(false);
    }
  };

  const handleHold = async () => {
    if (!selectedReview || !reason.trim()) return;
    setActionLoading(true);
    try {
      const response = await fetch('/api/admin/escrow/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escrowId: selectedReview.escrowId,
          reason,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to hold escrow');
      }
      setHoldDialog(false);
      setReason('');
      setSelectedReview(null);
      await fetchPendingReviews();
    } catch (error) {
      logger.error('Error holding escrow:', error);
      setErrorDialog({ open: true, message: (error as Error).message });
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

  return (
    <div style={{ padding: theme.spacing.xl }}>
      <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, marginBottom: theme.spacing.lg }}>
        Escrow Review Dashboard
      </h1>

      <Card style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.lg }}>
        <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.md }}>
          Pending Reviews ({reviews.length})
        </h2>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: theme.spacing.xl }}>
            <Spinner size="lg" />
          </div>
        ) : reviews.length === 0 ? (
          <p style={{ textAlign: 'center', color: theme.colors.textSecondary, padding: theme.spacing.xl }}>
            No escrows pending review.
          </p>
        ) : (
          <div style={{ border: `1px solid ${theme.colors.border}`, borderRadius: theme.borderRadius.md, overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: theme.colors.backgroundSecondary }}>
                  <th style={tableHeaderStyle}>Job</th>
                  <th style={tableHeaderStyle}>Contractor</th>
                  <th style={tableHeaderStyle}>Homeowner</th>
                  <th style={tableHeaderStyle}>Amount</th>
                  <th style={tableHeaderStyle}>Status</th>
                  <th style={tableHeaderStyle}>Homeowner Approved</th>
                  <th style={tableHeaderStyle}>Photo Verified</th>
                  <th style={tableHeaderStyle}>Created</th>
                  <th style={tableHeaderStyle}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <td style={tableCellStyle}>{review.jobTitle}</td>
                    <td style={tableCellStyle}>{review.contractorName}</td>
                    <td style={tableCellStyle}>{review.homeownerName}</td>
                    <td style={tableCellStyle}>{formatCurrency(review.amount)}</td>
                    <td style={tableCellStyle}>
                      <span style={{ color: getStatusColor(review.adminHoldStatus) }}>
                        {review.adminHoldStatus.replace('_', ' ')}
                      </span>
                    </td>
                    <td style={tableCellStyle}>
                      {review.homeownerApproval ? '✓ Yes' : '✗ No'}
                    </td>
                    <td style={tableCellStyle}>
                      {review.photoVerificationStatus === 'verified' ? '✓ Verified' : 'Pending'}
                    </td>
                    <td style={tableCellStyle}>{format(new Date(review.createdAt), 'MMM d, yyyy')}</td>
                    <td style={tableCellStyle}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => fetchReviewDetails(review.escrowId)}
                        disabled={actionLoading}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Review Details Modal */}
      {selectedReview && (
        <Card style={{ padding: theme.spacing.lg }}>
          <h2 style={{ fontSize: theme.typography.fontSize.xl, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.md }}>
            Review Details: {selectedReview.jobTitle}
          </h2>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: theme.spacing.lg, marginBottom: theme.spacing.lg }}>
            <div>
              <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
                Before Photos
              </h3>
              {selectedReview.beforePhotos.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.sm }}>
                  {selectedReview.beforePhotos.map((url, idx) => (
                    <img key={idx} src={url} alt={`Before ${idx + 1}`} style={{ width: '100%', borderRadius: theme.borderRadius.md }} />
                  ))}
                </div>
              ) : (
                <p style={{ color: theme.colors.textSecondary }}>No before photos</p>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
                After Photos
              </h3>
              {selectedReview.afterPhotos.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.sm }}>
                  {selectedReview.afterPhotos.map((url, idx) => (
                    <img key={idx} src={url} alt={`After ${idx + 1}`} style={{ width: '100%', borderRadius: theme.borderRadius.md }} />
                  ))}
                </div>
              ) : (
                <p style={{ color: theme.colors.textSecondary }}>No after photos</p>
              )}
            </div>
          </div>

          <div style={{ marginBottom: theme.spacing.lg }}>
            <h3 style={{ fontSize: theme.typography.fontSize.md, fontWeight: theme.typography.fontWeight.semibold, marginBottom: theme.spacing.sm }}>
              Verification Status
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: theme.spacing.sm }}>
              <div>Photo Quality: {selectedReview.photoQualityPassed ? '✓ Passed' : '✗ Failed'}</div>
              <div>Geolocation: {selectedReview.geolocationVerified ? '✓ Verified' : '✗ Not Verified'}</div>
              <div>Timestamp: {selectedReview.timestampVerified ? '✓ Verified' : '✗ Not Verified'}</div>
              <div>Before/After Score: {selectedReview.beforeAfterComparisonScore?.toFixed(2) || 'N/A'}</div>
              <div>Photo Verification Score: {selectedReview.photoVerificationScore?.toFixed(2) || 'N/A'}</div>
              <div>Trust Score: {selectedReview.trustScore?.toFixed(2) || 'N/A'}</div>
            </div>
          </div>

          {selectedReview.releaseBlockedReason && (
            <div style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md, backgroundColor: theme.colors.warning + '20', borderRadius: theme.borderRadius.md }}>
              <strong>Blocked Reason:</strong> {selectedReview.releaseBlockedReason}
            </div>
          )}

          <div style={{ display: 'flex', gap: theme.spacing.md }}>
            <Button onClick={() => setApproveDialog(true)} disabled={actionLoading}>
              Approve Release
            </Button>
            <Button variant="secondary" onClick={() => setRejectDialog(true)} disabled={actionLoading}>
              Reject
            </Button>
            <Button variant="outline" onClick={() => setHoldDialog(true)} disabled={actionLoading}>
              Hold for Review
            </Button>
          </div>
        </Card>
      )}

      {/* Approve Dialog */}
      <AlertDialog open={approveDialog} onOpenChange={setApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Escrow Release</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this escrow release? Funds will be released to the contractor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder="Optional notes (e.g., 'Photos verified, homeowner approved')"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleApprove} disabled={actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : 'Approve'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialog} onOpenChange={setRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Escrow Release</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this escrow release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder="Reason for rejection (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleReject} disabled={!reason.trim() || actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : 'Reject'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hold Dialog */}
      <AlertDialog open={holdDialog} onOpenChange={setHoldDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hold Escrow for Review</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for holding this escrow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder="Reason for hold (required)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleHold} disabled={!reason.trim() || actionLoading}>
              {actionLoading ? <Spinner size="sm" /> : 'Hold'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ ...errorDialog, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: theme.colors.error }}>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

const tableHeaderStyle: React.CSSProperties = {
  padding: theme.spacing.sm,
  textAlign: 'left',
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.textSecondary,
  fontWeight: theme.typography.fontWeight.semibold,
};

const tableCellStyle: React.CSSProperties = {
  padding: theme.spacing.sm,
  fontSize: theme.typography.fontSize.sm,
  color: theme.colors.text,
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending_review':
      return theme.colors.warning;
    case 'admin_hold':
      return theme.colors.error;
    case 'admin_approved':
      return theme.colors.success;
    default:
      return theme.colors.textSecondary;
  }
};

