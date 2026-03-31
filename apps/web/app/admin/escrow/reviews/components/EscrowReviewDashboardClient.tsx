'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { EscrowReviewDetailModal } from './EscrowReviewDetailModal';
import { EscrowReviewStats } from './EscrowReviewStats';
import { EscrowBulkDialogs } from './EscrowBulkDialogs';
import { EscrowReviewTable } from './EscrowReviewTable';

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
  const [selectedReview, setSelectedReview] =
    useState<EscrowReviewDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [approveDialog, setApproveDialog] = useState(false);
  const [rejectDialog, setRejectDialog] = useState(false);
  const [holdDialog, setHoldDialog] = useState(false);
  const [notes, setNotes] = useState('');
  const [reason, setReason] = useState('');
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkApproveDialog, setBulkApproveDialog] = useState(false);
  const [bulkHoldDialog, setBulkHoldDialog] = useState(false);
  const [bulkReason, setBulkReason] = useState('');
  const [bulkNotes, setBulkNotes] = useState('');

  const fetchPendingReviews = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        '/api/admin/escrow/pending-reviews?limit=50'
      );
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
      const response = await fetch(
        `/api/admin/escrow/${escrowId}/review-details`
      );
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
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/escrow/approve', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
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
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/escrow/reject', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
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
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/escrow/hold', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
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
  const handleToggleSelect = (escrowId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(escrowId)) next.delete(escrowId);
      else next.add(escrowId);
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(reviews.map((r) => r.escrowId)));
    } else {
      setSelectedIds(new Set());
    }
  };
  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setActionLoading(true);
    let success = 0;
    let failed = 0;
    const csrfHeaders = await getCsrfHeaders();
    for (const escrowId of selectedIds) {
      try {
        const response = await fetch('/api/admin/escrow/approve', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          body: JSON.stringify({ escrowId, notes: bulkNotes || undefined }),
        });
        if (response.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setActionLoading(false);
    setBulkApproveDialog(false);
    setBulkNotes('');
    setSelectedIds(new Set());
    await fetchPendingReviews();
    if (failed > 0) {
      setErrorDialog({
        open: true,
        message: `Bulk approve: ${success} succeeded, ${failed} failed`,
      });
    }
  };

  const handleBulkHold = async () => {
    if (selectedIds.size === 0 || !bulkReason.trim()) return;
    setActionLoading(true);
    let success = 0;
    let failed = 0;
    const csrfHeaders = await getCsrfHeaders();
    for (const escrowId of selectedIds) {
      try {
        const response = await fetch('/api/admin/escrow/hold', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json', ...csrfHeaders },
          body: JSON.stringify({ escrowId, reason: bulkReason }),
        });
        if (response.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setActionLoading(false);
    setBulkHoldDialog(false);
    setBulkReason('');
    setSelectedIds(new Set());
    await fetchPendingReviews();
    if (failed > 0) {
      setErrorDialog({
        open: true,
        message: `Bulk hold: ${success} succeeded, ${failed} failed`,
      });
    }
  };

  const allSelected =
    reviews.length > 0 && reviews.every((r) => selectedIds.has(r.escrowId));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const pendingCount = reviews.filter(
    (r) => r.adminHoldStatus === 'pending_review'
  ).length;
  const heldCount = reviews.filter(
    (r) => r.adminHoldStatus === 'admin_hold'
  ).length;
  const totalAmount = reviews.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div
      style={{
        padding: theme.spacing[8],
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <EscrowReviewStats
        pendingCount={pendingCount}
        heldCount={heldCount}
        totalAmount={formatCurrency(totalAmount)}
        reviewCount={reviews.length}
        selectedCount={selectedIds.size}
        actionLoading={actionLoading}
        onBulkApprove={() => setBulkApproveDialog(true)}
        onBulkHold={() => setBulkHoldDialog(true)}
        onClearSelection={() => setSelectedIds(new Set())}
      />

      <EscrowReviewTable
        reviews={reviews}
        loading={loading}
        selectedIds={selectedIds}
        allSelected={allSelected}
        someSelected={someSelected}
        actionLoading={actionLoading}
        formatCurrency={formatCurrency}
        onSelectAll={handleSelectAll}
        onToggleSelect={handleToggleSelect}
        onReviewDetails={fetchReviewDetails}
      />

      {/* Review Details Modal */}
      {selectedReview && (
        <EscrowReviewDetailModal
          selectedReview={selectedReview}
          actionLoading={actionLoading}
          approveDialog={approveDialog}
          rejectDialog={rejectDialog}
          holdDialog={holdDialog}
          notes={notes}
          reason={reason}
          onSetApproveDialog={setApproveDialog}
          onSetRejectDialog={setRejectDialog}
          onSetHoldDialog={setHoldDialog}
          onSetNotes={setNotes}
          onSetReason={setReason}
          onApprove={handleApprove}
          onReject={handleReject}
          onHold={handleHold}
        />
      )}

      <EscrowBulkDialogs
        selectedCount={selectedIds.size}
        bulkApproveDialog={bulkApproveDialog}
        setBulkApproveDialog={setBulkApproveDialog}
        bulkHoldDialog={bulkHoldDialog}
        setBulkHoldDialog={setBulkHoldDialog}
        bulkNotes={bulkNotes}
        setBulkNotes={setBulkNotes}
        bulkReason={bulkReason}
        setBulkReason={setBulkReason}
        actionLoading={actionLoading}
        onBulkApprove={handleBulkApprove}
        onBulkHold={handleBulkHold}
        errorDialog={errorDialog}
        setErrorDialog={setErrorDialog}
      />
    </div>
  );
}
