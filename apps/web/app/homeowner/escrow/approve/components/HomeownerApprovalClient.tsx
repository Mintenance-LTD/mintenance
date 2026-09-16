'use client';

import React from 'react';
import { useCompletionReview } from './useCompletionReview';
import Image from 'next/image';
import { useSearchParams } from 'next/navigation';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { BeforeAfterSlider } from '@/components/ui/BeforeAfterSlider';
import { RejectCompletionDialog } from './RejectCompletionDialog';
import { InspectionChecklist } from './InspectionChecklist';
import { formatDistanceToNow } from 'date-fns';

export function HomeownerApprovalClient() {
  const searchParams = useSearchParams();
  const escrowId = searchParams.get('escrowId');
  const {
    approvalData,
    loading,
    loadError,
    actionLoading,
    comments,
    setComments,
    rejectionReason,
    setRejectionReason,
    showRejectDialog,
    setShowRejectDialog,
    inspectionCompleted,
    setInspectionCompleted,
    retry,
    handleApprove,
    handleReject,
    handleMarkInspection,
  } = useCompletionReview(escrowId);

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
          <p style={{ color: theme.colors.textSecondary }}>
            No payment reference provided.
          </p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          padding: theme.spacing.xl,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <Spinner size='lg' />
      </div>
    );
  }

  if (!approvalData) {
    return (
      <div style={{ padding: theme.spacing.xl }}>
        <Card style={{ padding: theme.spacing.lg }}>
          <p style={{ color: theme.colors.textSecondary }}>
            {loadError || 'Approval data not found.'}
          </p>
          <Button onClick={retry}>Retry</Button>
        </Card>
      </div>
    );
  }

  if (approvalData.homeownerApproval) {
    return (
      <div style={{ padding: theme.spacing.xl }}>
        <Card style={{ padding: theme.spacing.lg }}>
          <h1
            style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              marginBottom: theme.spacing.md,
            }}
          >
            Already Approved
          </h1>
          <p style={{ color: theme.colors.textSecondary }}>
            You have already approved this completion. Payment release remains
            subject to the cooling-off period and final checks.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: theme.spacing.xl,
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <h1
        style={{
          fontSize: theme.typography.fontSize['2xl'],
          fontWeight: theme.typography.fontWeight.bold,
          marginBottom: theme.spacing.lg,
        }}
      >
        Review Completion: {approvalData.jobTitle}
      </h1>

      <Card
        style={{ padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}
      >
        <div style={{ marginBottom: theme.spacing.md }}>
          <strong>Protected Payment:</strong>{' '}
          {formatCurrency(approvalData.amount)}
        </div>
        {approvalData.autoApprovalDate && (
          <div
            style={{
              marginBottom: theme.spacing.md,
              color: theme.colors.warning,
            }}
          >
            <strong>Review deadline:</strong>{' '}
            {formatDistanceToNow(new Date(approvalData.autoApprovalDate), {
              addSuffix: true,
            })}
            <br />
            <small>
              After this deadline, automatic approval may apply if all checks
              pass. Payment release remains subject to the cooling-off period
              and release checks.
            </small>
          </div>
        )}
      </Card>

      {/* Before/After Comparison */}
      <Card
        style={{ padding: theme.spacing.lg, marginBottom: theme.spacing.lg }}
      >
        <h2
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.md,
          }}
        >
          Before & After Comparison
        </h2>

        {/* Interactive overlay slider — pairs the first before/after photos.
            Homeowner drags the divider to compare. Mirrors the mobile UX. */}
        {approvalData.beforePhotos[0]?.url &&
          approvalData.afterPhotos[0]?.url && (
            <div style={{ marginBottom: theme.spacing.lg }}>
              <BeforeAfterSlider
                beforeUrl={approvalData.beforePhotos[0].url}
                afterUrl={approvalData.afterPhotos[0].url}
                height={360}
              />
              <p
                style={{
                  marginTop: theme.spacing.sm,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}
              >
                Drag the divider (or use arrow keys) to compare before and
                after.
              </p>
            </div>
          )}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.lg,
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
            {approvalData.beforePhotos.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing.sm,
                }}
              >
                {approvalData.beforePhotos.map((photo, idx) => (
                  <div key={idx}>
                    <div
                      style={{
                        position: 'relative',
                        height: '200px',
                        overflow: 'hidden',
                        borderRadius: theme.borderRadius.md,
                      }}
                    >
                      <Image
                        src={photo.url}
                        alt={`Before ${idx + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    {photo.qualityScore && (
                      <div
                        style={{
                          fontSize: theme.typography.fontSize.xs,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        Quality: {(photo.qualityScore * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>
                No before photos available
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
            {approvalData.afterPhotos.length > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: theme.spacing.sm,
                }}
              >
                {approvalData.afterPhotos.map((photo, idx) => (
                  <div key={idx}>
                    <div
                      style={{
                        position: 'relative',
                        height: '200px',
                        overflow: 'hidden',
                        borderRadius: theme.borderRadius.md,
                      }}
                    >
                      <Image
                        src={photo.url}
                        alt={`After ${idx + 1}`}
                        fill
                        style={{ objectFit: 'cover' }}
                      />
                    </div>
                    {photo.qualityScore && (
                      <div
                        style={{
                          fontSize: theme.typography.fontSize.xs,
                          color: theme.colors.textSecondary,
                        }}
                      >
                        Quality: {(photo.qualityScore * 100).toFixed(0)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: theme.colors.textSecondary }}>
                No after photos available
              </p>
            )}
          </div>
        </div>
      </Card>

      <InspectionChecklist
        completed={inspectionCompleted}
        actionLoading={actionLoading || !approvalData.canReview}
        onInspectionChange={setInspectionCompleted}
        onMarkCompleted={handleMarkInspection}
      />

      {!approvalData.canReview && (
        <p role='status'>
          This completion is not available for your review. The designated payer
          can act when work is completed and payment is available.
        </p>
      )}
      {/* Approval Actions */}
      <Card style={{ padding: theme.spacing.lg }}>
        <h2
          style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.semibold,
            marginBottom: theme.spacing.md,
          }}
        >
          Your Decision
        </h2>

        <div style={{ marginBottom: theme.spacing.md }}>
          <label
            style={{
              display: 'block',
              marginBottom: theme.spacing.xs,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            Comments (optional):
          </label>
          <Input
            aria-label='Completion comments'
            maxLength={5000}
            disabled={actionLoading || !approvalData.canReview}
            placeholder='Add any comments about the completion...'
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div style={{ display: 'flex', gap: theme.spacing.md }}>
          <Button
            onClick={handleApprove}
            disabled={
              actionLoading || !inspectionCompleted || !approvalData.canReview
            }
          >
            {actionLoading ? <Spinner size='sm' /> : 'Approve Completion'}
          </Button>
          <Button
            variant='secondary'
            onClick={() => setShowRejectDialog(true)}
            disabled={actionLoading || !approvalData.canReview}
          >
            Reject Completion
          </Button>
        </div>

        {!inspectionCompleted && (
          <p
            style={{
              marginTop: theme.spacing.md,
              color: theme.colors.warning,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Please mark inspection as completed before approving.
          </p>
        )}
      </Card>

      <RejectCompletionDialog
        open={showRejectDialog}
        rejectionReason={rejectionReason}
        actionLoading={actionLoading}
        onReasonChange={setRejectionReason}
        onCancel={() => {
          setShowRejectDialog(false);
          setRejectionReason('');
        }}
        onSubmit={handleReject}
      />
    </div>
  );
}
