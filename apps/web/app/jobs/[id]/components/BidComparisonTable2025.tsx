'use client';

import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';;
import { fadeIn, staggerContainer, staggerItem, cardHover } from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionButton, MotionDiv } from '@/components/ui/MotionDiv';

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
  };
}

interface BidComparisonTable2025Props {
  bids: Bid[];
  jobId: string;
  onAcceptBid: (bidId: string) => void;
  onRejectBid: (bidId: string) => void;
  processingBid: string | null;
}

export function BidComparisonTable2025({
  bids,
  jobId,
  onAcceptBid,
  onRejectBid,
  processingBid,
}: BidComparisonTable2025Props) {
  const [sortBy, setSortBy] = useState<'price' | 'rating' | 'date'>('price');
  const [selectedBid, setSelectedBid] = useState<string | null>(null);

  // Sort bids
  const sortedBids = [...bids].sort((a, b) => {
    switch (sortBy) {
      case 'price':
        return a.bid_amount - b.bid_amount;
      case 'rating':
        return (b.contractor.rating || 0) - (a.contractor.rating || 0);
      case 'date':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const getContractorName = (bid: Bid) => {
    return `${bid.contractor.first_name} ${bid.contractor.last_name}`;
  };

  const getInitials = (bid: Bid) => {
    return `${bid.contractor.first_name[0]}${bid.contractor.last_name[0]}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const lowestBid = Math.min(...bids.map((b) => b.bid_amount));
  const highestRating = Math.max(...bids.map((b) => b.contractor.rating || 0));

  return (
    <MotionDiv
      className="space-y-6"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compare Bids</h2>
          <p className="text-sm text-gray-600 mt-1">
            {bids.length} {bids.length === 1 ? 'bid' : 'bids'} received
          </p>
        </div>

        {/* Sort Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 mr-2">Sort by:</span>
          {(['price', 'rating', 'date'] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSortBy(option)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                sortBy === option
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {option.charAt(0).toUpperCase() + option.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Bids Grid */}
      <MotionDiv
        className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
        variants={staggerContainer}
        initial="initial"
        animate="animate"
      >
        <AnimatePresence>
          {sortedBids.map((bid, index) => {
            const isLowestBid = bid.bid_amount === lowestBid;
            const isHighestRated = bid.contractor.rating === highestRating;
            const isAccepted = bid.status === 'accepted';
            const isRejected = bid.status === 'rejected';

            return (
              <MotionDiv
                key={bid.id}
                variants={staggerItem}
                layout
                className={`relative bg-white rounded-2xl border-2 p-6 transition-all ${
                  isAccepted
                    ? 'border-emerald-500 bg-emerald-50'
                    : isRejected
                    ? 'border-gray-300 bg-gray-50 opacity-60'
                    : selectedBid === bid.id
                    ? 'border-teal-500 shadow-lg'
                    : 'border-gray-200 hover:border-teal-300 hover:shadow-md'
                }`}
                onClick={() => !isAccepted && !isRejected && setSelectedBid(bid.id)}
              >
                {/* Badges */}
                <div className="flex items-center gap-2 mb-4">
                  {isLowestBid && !isRejected && (
                    <span className="px-2 py-1 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full">
                      Lowest Bid
                    </span>
                  )}
                  {isHighestRated && !isRejected && (
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                      Top Rated
                    </span>
                  )}
                  {isAccepted && (
                    <span className="px-2 py-1 bg-emerald-600 text-white text-xs font-bold rounded-full">
                      ✓ Accepted
                    </span>
                  )}
                  {isRejected && (
                    <span className="px-2 py-1 bg-gray-400 text-white text-xs font-bold rounded-full">
                      Rejected
                    </span>
                  )}
                </div>

                {/* Contractor Info */}
                <div className="flex items-start gap-4 mb-4">
                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    {bid.contractor.profile_image_url ? (
                      <img
                        src={bid.contractor.profile_image_url}
                        alt={getContractorName(bid)}
                        className="w-14 h-14 rounded-full object-cover border-2 border-gray-200"
                      />
                    ) : (
                      <div className="w-14 h-14 rounded-full bg-teal-100 flex items-center justify-center border-2 border-gray-200">
                        <span className="text-teal-700 font-bold text-lg">
                          {getInitials(bid)}
                        </span>
                      </div>
                    )}
                    {bid.contractor.rating && (
                      <div className="absolute -bottom-1 -right-1 bg-amber-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                        {bid.contractor.rating.toFixed(1)}★
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/contractors/${bid.contractor.id}`}>
                      <h3 className="font-bold text-gray-900 hover:text-teal-600 transition-colors line-clamp-1">
                        {getContractorName(bid)}
                      </h3>
                    </Link>
                    {bid.contractor.company_name && (
                      <p className="text-sm text-gray-600 line-clamp-1">
                        {bid.contractor.company_name}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      {bid.contractor.city && (
                        <span className="flex items-center gap-1">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                          </svg>
                          {bid.contractor.city}
                        </span>
                      )}
                      {bid.contractor.completed_jobs !== undefined && (
                        <span>• {bid.contractor.completed_jobs} jobs</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bid Amount */}
                <div className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <div className="text-sm text-gray-600 mb-1">Bid Amount</div>
                  <div className="text-3xl font-bold text-gray-900">
                    ${bid.bid_amount.toLocaleString()}
                  </div>
                  {bid.estimated_hours && (
                    <div className="text-xs text-gray-500 mt-1">
                      ~{bid.estimated_hours} hours
                    </div>
                  )}
                </div>

                {/* Message Preview */}
                {bid.message && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-700 line-clamp-3">"{bid.message}"</p>
                  </div>
                )}

                {/* Date */}
                <div className="text-xs text-gray-500 mb-4">
                  Submitted {formatDate(bid.created_at)}
                </div>

                {/* Actions */}
                {!isAccepted && !isRejected && (
                  <div className="grid grid-cols-2 gap-3">
                    <MotionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcceptBid(bid.id);
                      }}
                      disabled={!!processingBid}
                      className="px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {processingBid === bid.id ? 'Processing...' : 'Accept'}
                    </MotionButton>
                    <MotionButton
                      onClick={(e) => {
                        e.stopPropagation();
                        onRejectBid(bid.id);
                      }}
                      disabled={!!processingBid}
                      className="px-4 py-2.5 bg-white border-2 border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      Decline
                    </MotionButton>
                  </div>
                )}
              </MotionDiv>
            );
          })}
        </AnimatePresence>
      </MotionDiv>
    </MotionDiv>
  );
}
