'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { logger } from '@mintenance/shared';
import {
  User,
  Shield,
} from 'lucide-react';
import { formatRelativeDate } from './JobDetailHelpers';
import type { Contractor } from './JobDetailHelpers';

/* ==========================================
   TYPE DEFINITIONS
   ========================================== */

export interface BidLineItem {
  type: 'labor' | 'material' | 'equipment';
  total: number;
}

export interface Bid {
  id: string;
  amount: number;
  description?: string;
  status: string;
  created_at: string;
  contractor: Contractor;
  lineItems?: BidLineItem[];
}

/* ==========================================
   BID CARD COMPONENT
   ========================================== */

export function BidCard({ bid, jobId }: { bid: Bid; jobId: string }) {
  const [accepting, setAccepting] = useState(false);

  const contractorName = bid.contractor.company_name ||
    (bid.contractor.first_name && bid.contractor.last_name
      ? `${bid.contractor.first_name} ${bid.contractor.last_name}`
      : bid.contractor.email);

  const handleAcceptBid = async () => {
    if (!confirm(`Are you sure you want to accept ${contractorName}'s bid of \u00A3${bid.amount.toLocaleString()}?`)) {
      return;
    }

    setAccepting(true);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const apiUrl = `/api/jobs/${jobId}/bids/${bid.id}/accept`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
      });

      if (!response.ok) {
        const data = await response.json();

        // Extract error message from API response (handles both { error: "string" } and { error: { message: "string" } })
        const errorMsg = typeof data.error === 'object' && data.error?.message
          ? data.error.message
          : typeof data.error === 'string'
            ? data.error
            : data.message || 'An unexpected error occurred. Please try again.';

        // Handle payment setup required (check error message content)
        if (errorMsg.includes('payment account setup') || errorMsg.includes('payment setup')) {
          const message = `Payment Setup Required\n\n` +
            `This contractor has not completed their payment account setup yet. ` +
            `They need to set up their Stripe Connect account to receive payments before you can accept their bid.\n\n` +
            `What to do:\n` +
            `- Contact the contractor and ask them to complete payment setup\n` +
            `- Or choose a different contractor who has completed payment setup\n\n` +
            `Once the contractor completes their payment setup, you'll be able to accept their bid.`;
          alert(message);
        } else if (response.status === 409) {
          alert('A bid has already been accepted for this job. Refreshing the page...');
          window.location.reload();
        } else if (response.status === 403) {
          alert(`Access denied: ${errorMsg}`);
        } else if (response.status === 404) {
          alert(`Error: ${errorMsg}`);
          window.location.reload();
        } else {
          alert(`Failed to accept bid: ${errorMsg}`);
        }

        setAccepting(false);
        return;
      }

      const result = await response.json();

      // Success - show confirmation and reload
      alert(`Bid accepted successfully! The contractor has been notified.`);
      window.location.reload(); // Refresh to show updated status
    } catch (error) {
      logger.error('Error accepting bid:', error, { service: 'ui' });
      alert(
        `Failed to accept bid: ${error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.'}\n\n` +
        `If this problem persists, please refresh the page and try again.`
      );
      setAccepting(false);
    }
  };

  return (
    <div className="p-6 border border-gray-200 rounded-xl hover:border-teal-300 hover:shadow-md transition-all">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="flex items-start gap-3 flex-1">
          {/* Avatar */}
          {bid.contractor.profile_image_url ? (
            <div className="relative w-12 h-12 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
              <Image
                src={bid.contractor.profile_image_url}
                alt={contractorName}
                fill
                className="object-cover"
                sizes="48px"
              />
            </div>
          ) : (
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center border-2 border-gray-200 flex-shrink-0">
              <User className="w-6 h-6 text-teal-600" />
            </div>
          )}

          {/* Contractor Info */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className="font-semibold text-gray-900">{contractorName}</h4>
              {bid.contractor.admin_verified && (
                <Shield className="w-4 h-4 text-teal-600" />
              )}
            </div>
            <p className="text-sm text-gray-600">
              Bid submitted {formatRelativeDate(bid.created_at)}
            </p>
          </div>
        </div>

        {/* Bid Amount */}
        <div className="text-right">
          <div className="text-2xl font-bold text-gray-900">
            £{bid.amount.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Description */}
      {bid.description &&
       !bid.description.toLowerCase().includes('ffff') &&
       !bid.description.toLowerCase().includes('lorem') &&
       bid.description.trim().length > 5 && (
        <p className="text-gray-700 text-sm mb-4 line-clamp-3">{bid.description}</p>
      )}
      {(!bid.description ||
        bid.description.toLowerCase().includes('ffff') ||
        bid.description.toLowerCase().includes('lorem') ||
        bid.description.trim().length <= 5) && (
        <p className="text-gray-500 text-sm mb-4 italic">No description provided</p>
      )}

      {/* Cost Breakdown - Labor vs Materials vs Equipment */}
      {bid.lineItems && bid.lineItems.length > 0 && (() => {
        const laborTotal = bid.lineItems
          .filter((item) => item.type === 'labor')
          .reduce((sum, item) => sum + item.total, 0);
        const materialTotal = bid.lineItems
          .filter((item) => item.type === 'material')
          .reduce((sum, item) => sum + item.total, 0);
        const equipmentTotal = bid.lineItems
          .filter((item) => item.type === 'equipment')
          .reduce((sum, item) => sum + item.total, 0);

        return (laborTotal > 0 || materialTotal > 0 || equipmentTotal > 0) ? (
          <div className="mb-4 flex gap-4 flex-wrap text-sm text-gray-600">
            {laborTotal > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span>Labor: £{laborTotal.toFixed(2)}</span>
              </div>
            )}
            {materialTotal > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Materials: £{materialTotal.toFixed(2)}</span>
              </div>
            )}
            {equipmentTotal > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Equipment: £{equipmentTotal.toFixed(2)}</span>
              </div>
            )}
          </div>
        ) : null;
      })()}

      {/* Actions */}
      <div className="flex gap-3">
        <Link
          href={`/contractors/${bid.contractor.id}?returnTo=job&jobId=${jobId}&bidId=${bid.id}&bidAmount=${bid.amount}`}
          className="btn-secondary text-sm flex-1"
        >
          View Profile
        </Link>
        {bid.status === 'pending' && (
          <button
            onClick={handleAcceptBid}
            disabled={accepting}
            className="btn-primary text-sm flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {accepting ? 'Accepting...' : 'Accept Bid'}
          </button>
        )}
      </div>
    </div>
  );
}
