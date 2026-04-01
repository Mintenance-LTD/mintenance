'use client';

import React from 'react';
import Image from 'next/image';
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

interface EscrowReviewDetails {
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

interface EscrowReviewDetailModalProps {
  selectedReview: EscrowReviewDetails;
  actionLoading: boolean;
  approveDialog: boolean;
  rejectDialog: boolean;
  holdDialog: boolean;
  notes: string;
  reason: string;
  onSetApproveDialog: (open: boolean) => void;
  onSetRejectDialog: (open: boolean) => void;
  onSetHoldDialog: (open: boolean) => void;
  onSetNotes: (notes: string) => void;
  onSetReason: (reason: string) => void;
  onApprove: () => void;
  onReject: () => void;
  onHold: () => void;
}

export function EscrowReviewDetailModal({
  selectedReview,
  actionLoading,
  approveDialog,
  rejectDialog,
  holdDialog,
  notes,
  reason,
  onSetApproveDialog,
  onSetRejectDialog,
  onSetHoldDialog,
  onSetNotes,
  onSetReason,
  onApprove,
  onReject,
  onHold,
}: EscrowReviewDetailModalProps) {
  return (
    <>
      <Card style={{ padding: theme.spacing.lg }}>
        <h2
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.md,
          }}
        >
          Review Details: {selectedReview.jobTitle}
        </h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing.sm,
              }}
            >
              Before Photos
            </h3>
            {selectedReview.beforePhotos.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing.sm,
                }}
              >
                {selectedReview.beforePhotos.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      height: '200px',
                      overflow: 'hidden',
                      borderRadius: theme.borderRadius.md,
                    }}
                  >
                    <Image
                      src={url}
                      alt={`Before ${idx + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>
                No before photos
              </p>
            )}
          </div>

          <div>
            <h3
              style={{
                fontSize: theme.typography.fontSize.md,
                fontWeight: theme.typography.fontWeight.semibold,
                marginBottom: theme.spacing.sm,
              }}
            >
              After Photos
            </h3>
            {selectedReview.afterPhotos.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing.sm,
                }}
              >
                {selectedReview.afterPhotos.map((url, idx) => (
                  <div
                    key={idx}
                    style={{
                      position: 'relative',
                      height: '200px',
                      overflow: 'hidden',
                      borderRadius: theme.borderRadius.md,
                    }}
                  >
                    <Image
                      src={url}
                      alt={`After ${idx + 1}`}
                      fill
                      style={{ objectFit: 'cover' }}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>
                No after photos
              </p>
            )}
          </div>
        </div>

        <div style={{ marginBottom: theme.spacing.lg }}>
          <h3
            style={{
              fontSize: theme.typography.fontSize.md,
              fontWeight: theme.typography.fontWeight.semibold,
              marginBottom: theme.spacing.sm,
            }}
          >
            Verification Status
          </h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: theme.spacing.sm,
            }}
          >
            <div>
              Photo Quality:{' '}
              {selectedReview.photoQualityPassed ? '✓ Passed' : '✗ Failed'}
            </div>
            <div>
              Geolocation:{' '}
              {selectedReview.geolocationVerified
                ? '✓ Verified'
                : '✗ Not Verified'}
            </div>
            <div>
              Timestamp:{' '}
              {selectedReview.timestampVerified
                ? '✓ Verified'
                : '✗ Not Verified'}
            </div>
            <div>
              Before/After Score:{' '}
              {selectedReview.beforeAfterComparisonScore?.toFixed(2) || 'N/A'}
            </div>
            <div>
              Photo Verification Score:{' '}
              {selectedReview.photoVerificationScore?.toFixed(2) || 'N/A'}
            </div>
            <div>
              Trust Score: {selectedReview.trustScore?.toFixed(2) || 'N/A'}
            </div>
          </div>
        </div>

        {selectedReview.releaseBlockedReason && (
          <div
            style={{
              marginBottom: theme.spacing.lg,
              padding: theme.spacing.md,
              backgroundColor: theme.colors.warning + '20',
              borderRadius: theme.borderRadius.md,
            }}
          >
            <strong>Blocked Reason:</strong>{' '}
            {selectedReview.releaseBlockedReason}
          </div>
        )}

        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <Button
            onClick={() => onSetApproveDialog(true)}
            disabled={actionLoading}
          >
            Approve Release
          </Button>
          <Button
            variant='secondary'
            onClick={() => onSetRejectDialog(true)}
            disabled={actionLoading}
          >
            Reject
          </Button>
          <Button
            variant='outline'
            onClick={() => onSetHoldDialog(true)}
            disabled={actionLoading}
          >
            Hold for Review
          </Button>
        </div>
      </Card>

      {/* Approve Dialog */}
      <AlertDialog open={approveDialog} onOpenChange={onSetApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Escrow Release</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this escrow release? Funds will
              be released to the contractor.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder="Optional notes (e.g., 'Photos verified, homeowner approved')"
              value={notes}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSetNotes(e.target.value)
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={onApprove} disabled={actionLoading}>
              {actionLoading ? <Spinner size='sm' /> : 'Approve'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialog} onOpenChange={onSetRejectDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Escrow Release</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for rejecting this escrow release.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder='Reason for rejection (required)'
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSetReason(e.target.value)
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button
              onClick={onReject}
              disabled={!reason.trim() || actionLoading}
            >
              {actionLoading ? <Spinner size='sm' /> : 'Reject'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hold Dialog */}
      <AlertDialog open={holdDialog} onOpenChange={onSetHoldDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hold Escrow for Review</AlertDialogTitle>
            <AlertDialogDescription>
              Please provide a reason for holding this escrow.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginTop: theme.spacing.md }}>
            <Input
              placeholder='Reason for hold (required)'
              value={reason}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onSetReason(e.target.value)
              }
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={onHold} disabled={!reason.trim() || actionLoading}>
              {actionLoading ? <Spinner size='sm' /> : 'Hold'}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
