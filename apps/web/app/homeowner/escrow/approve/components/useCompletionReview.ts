'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { fetchWithCsrf } from '@/lib/csrf-client';

const photo = z.object({
  url: z.string(),
  angleType: z.string().nullish(),
  qualityScore: z.number().nullish(),
});
const dataSchema = z.object({
  escrowId: z.string(),
  amount: z.number(),
  jobTitle: z.string(),
  completedAt: z.string().nullable(),
  homeownerApproval: z.boolean().nullable(),
  inspectionCompleted: z.boolean().nullable(),
  canReview: z.boolean(),
  autoApprovalDate: z.string().nullable(),
  beforePhotos: z.array(photo),
  afterPhotos: z.array(photo),
});
type ApprovalData = z.infer<typeof dataSchema>;
async function confirmed(response: Response) {
  const body = await response.json();
  if (!response.ok || body?.success !== true)
    throw new Error(
      typeof body?.error === 'string'
        ? body.error
        : body?.error?.message || 'Unable to confirm the request. Please retry.'
    );
  return body;
}

export function useCompletionReview(escrowId: string | null) {
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [inspectionCompleted, setInspectionCompleted] = useState(false);
  const pending = useRef(false);
  const loadSequence = useRef(0);
  const currentEscrow = useRef(escrowId);
  currentEscrow.current = escrowId;

  const fetchApprovalData = useCallback(
    async (signal?: AbortSignal) => {
      if (!escrowId || currentEscrow.current !== escrowId) return;
      const sequence = ++loadSequence.current;
      setLoading(true);
      setLoadError(null);
      try {
        const result = await confirmed(
          await fetch(`/api/escrow/${escrowId}/homeowner/pending-approval`, {
            signal,
          })
        );
        const parsed = dataSchema.safeParse(result.data);
        if (!parsed.success || parsed.data.escrowId !== escrowId)
          throw new Error('Unable to load complete review information');
        if (
          signal?.aborted ||
          sequence !== loadSequence.current ||
          currentEscrow.current !== escrowId
        )
          return;
        setApprovalData(parsed.data);
        setInspectionCompleted(parsed.data.inspectionCompleted === true);
      } catch (error) {
        if (
          signal?.aborted ||
          sequence !== loadSequence.current ||
          currentEscrow.current !== escrowId
        )
          return;
        setApprovalData(null);
        setLoadError(
          error instanceof Error ? error.message : 'Unable to load review'
        );
      } finally {
        if (
          !signal?.aborted &&
          sequence === loadSequence.current &&
          currentEscrow.current === escrowId
        )
          setLoading(false);
      }
    },
    [escrowId]
  );
  useEffect(() => {
    const controller = new AbortController();
    void fetchApprovalData(controller.signal);
    return () => controller.abort();
  }, [fetchApprovalData]);

  const act = async (action: 'approve' | 'reject' | 'inspect') => {
    if (!escrowId || !approvalData?.canReview || pending.current) return;
    pending.current = true;
    setActionLoading(true);
    try {
      await confirmed(
        await fetchWithCsrf(`/api/escrow/${escrowId}/homeowner/${action}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completedAt: approvalData.completedAt,
            ...(action === 'approve'
              ? { comments: comments || undefined }
              : {}),
            ...(action === 'reject' ? { reason: rejectionReason.trim() } : {}),
          }),
        })
      );
      if (currentEscrow.current !== escrowId) return;
      if (action === 'inspect') setInspectionCompleted(true);
      else {
        toast.success(
          action === 'approve'
            ? 'Work approved. Payment release is subject to the cooling-off period and final checks.'
            : 'Completion rejected. Payment is on hold for review.'
        );
        if (action === 'reject') {
          setShowRejectDialog(false);
          setRejectionReason('');
        }
        await fetchApprovalData();
      }
    } catch (error) {
      if (currentEscrow.current === escrowId)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Unable to confirm the request'
        );
    } finally {
      pending.current = false;
      setActionLoading(false);
    }
  };
  return {
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
    retry: () => fetchApprovalData(),
    handleApprove: () => act('approve'),
    handleReject: () => act('reject'),
    handleMarkInspection: () => act('inspect'),
  };
}
