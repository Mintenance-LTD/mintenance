'use client';

import { useState } from 'react';
import { BidComparisonTable2025 } from './BidComparisonTable2025';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { logger } from '@mintenance/shared';

interface Bid {
  id: string;
  bid_amount: number;
  estimated_hours?: number;
  message?: string;
  status: string;
  created_at: string;
  contractor: {
    id: string;
    first_name: string;
    last_name: string;
    company_name?: string;
    profile_image_url?: string;
    city?: string;
    rating?: number;
    completed_jobs?: number;
    portfolioImages?: Array<{ url: string; title?: string; category?: string }>;
  };
}

interface BidComparisonClientProps {
  bids: Bid[];
  jobId: string;
}

export function BidComparisonClient({ bids, jobId }: BidComparisonClientProps) {
  const [processingBid, setProcessingBid] = useState<string | null>(null);
  const router = useRouter();
  const { csrfToken } = useCSRF();

  const handleAcceptBid = async (bidId: string) => {
    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    setProcessingBid(bidId);

    try {
      const response = await fetch(`/api/jobs/${jobId}/bids/${bidId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept bid');
      }

      toast.success('Bid accepted successfully!');
      router.refresh();
    } catch (error) {
      logger.error('Error accepting bid:', error, { service: 'ui' });
      toast.error(error instanceof Error ? error.message : 'Failed to accept bid');
    } finally {
      setProcessingBid(null);
    }
  };

  const handleRejectBid = async (bidId: string) => {
    if (!csrfToken) {
      toast.error('Security token not available. Please refresh the page.');
      return;
    }

    setProcessingBid(bidId);

    try {
      const response = await fetch(`/api/jobs/${jobId}/bids/${bidId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reject bid');
      }

      toast.success('Bid declined');
      router.refresh();
    } catch (error) {
      logger.error('Error rejecting bid:', error, { service: 'ui' });
      toast.error(error instanceof Error ? error.message : 'Failed to reject bid');
    } finally {
      setProcessingBid(null);
    }
  };

  return (
    <BidComparisonTable2025
      bids={bids}
      jobId={jobId}
      onAcceptBid={handleAcceptBid}
      onRejectBid={handleRejectBid}
      processingBid={processingBid}
    />
  );
}
