'use client';

import React, { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { fadeIn } from '@/lib/animations/variants';
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
    portfolioImages?: Array<{ url: string; title?: string; category?: string }>;
  };
}

interface BidSwipeViewProps {
  bids: Bid[];
  jobId: string;
  onAcceptBid: (bidId: string) => void;
  onRejectBid: (bidId: string) => void;
  processingBid: string | null;
}

const SWIPE_THRESHOLD = 100;
const SWIPE_VELOCITY_THRESHOLD = 500;

export function BidSwipeView(props: BidSwipeViewProps) {
  // Defensive prop destructuring with defaults to prevent test crashes
  const {
    bids = [],
    jobId = '',
    onAcceptBid = () => {},
    onRejectBid = () => {},
    processingBid = null,
  } = props || {};
  const [currentIndex, setCurrentIndex] = useState(0);
  const [exitDirection, setExitDirection] = useState<'left' | 'right' | null>(null);
  const [undoStack, setUndoStack] = useState<Array<{ bid: Bid; direction: 'left' | 'right' }>>([]);

  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 0, 200], [-25, 0, 25]);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.5, 1, 1, 1, 0.5]);

  // Filter out already accepted/rejected bids
  const pendingBids = bids.filter(bid => bid.status === 'pending');
  const currentBid = pendingBids[currentIndex];

  useEffect(() => {
    // Reset position when bid changes
    x.set(0);
    setExitDirection(null);
  }, [currentIndex, x]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const offset = info.offset.x;
    const velocity = info.velocity.x;

    // Determine if swipe was strong enough
    if (Math.abs(velocity) > SWIPE_VELOCITY_THRESHOLD || Math.abs(offset) > SWIPE_THRESHOLD) {
      if (offset > 0 || velocity > 0) {
        // Swipe right - Accept
        handleAccept();
      } else {
        // Swipe left - Reject
        handleReject();
      }
    } else {
      // Spring back to center
      x.set(0);
    }
  };

  const handleAccept = () => {
    if (!currentBid || processingBid) return;

    setExitDirection('right');
    setUndoStack([...undoStack, { bid: currentBid, direction: 'right' }]);

    setTimeout(() => {
      onAcceptBid(currentBid.id);
      if (currentIndex < pendingBids.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const handleReject = () => {
    if (!currentBid || processingBid) return;

    setExitDirection('left');
    setUndoStack([...undoStack, { bid: currentBid, direction: 'left' }]);

    setTimeout(() => {
      onRejectBid(currentBid.id);
      if (currentIndex < pendingBids.length - 1) {
        setCurrentIndex(currentIndex + 1);
      }
    }, 300);
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || processingBid) return;

    const lastAction = undoStack[undoStack.length - 1];
    setUndoStack(undoStack.slice(0, -1));

    // Move back to previous bid
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }

    // Note: In a real implementation, you'd need to call an API to revert the bid status
    // For now, this is a placeholder - you may need to add an undo endpoint
  };

  const getContractorName = (bid: Bid) => {
    return `${bid.contractor.first_name} ${bid.contractor.last_name}`;
  };

  const getInitials = (bid: Bid) => {
    return `${bid.contractor.first_name[0]}${bid.contractor.last_name[0]}`.toUpperCase();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (pendingBids.length === 0) {
    return (
      <MotionDiv
        className="flex flex-col items-center justify-center py-16"
        variants={fadeIn}
        initial="initial"
        animate="animate"
      >
        <div className="text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">All Done!</h3>
          <p className="text-gray-600 mb-6">
            You've reviewed all bids for this job.
          </p>
        </div>
      </MotionDiv>
    );
  }

  if (!currentBid) {
    return null;
  }

  return (
    <MotionDiv
      className="space-y-6"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header with Counter */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Review Bids</h2>
          <p className="text-sm text-gray-600 mt-1">
            Swipe right to accept, left to skip
          </p>
        </div>

        <div className="text-right">
          <div className="text-3xl font-bold text-teal-600">
            {currentIndex + 1} / {pendingBids.length}
          </div>
          <p className="text-xs text-gray-500 mt-1">Bids remaining</p>
        </div>
      </div>

      {/* Swipe Card Container */}
      <div className="relative w-full max-w-2xl mx-auto" style={{ height: '600px' }}>
        {/* Next card preview (if available) */}
        {pendingBids[currentIndex + 1] && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full max-w-md bg-white rounded-2xl border-2 border-gray-200 shadow-sm p-6 opacity-50 scale-95">
              {/* Simplified preview */}
            </div>
          </div>
        )}

        {/* Current Swipeable Card */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center cursor-grab active:cursor-grabbing"
          style={{
            x,
            rotate,
            opacity,
          }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.7}
          onDragEnd={handleDragEnd}
          animate={
            exitDirection === 'left'
              ? { x: -500, opacity: 0 }
              : exitDirection === 'right'
              ? { x: 500, opacity: 0 }
              : {}
          }
          transition={{ duration: 0.3 }}
        >
          <div className="w-full max-w-md bg-white rounded-2xl border-2 border-gray-200 shadow-xl p-6 select-none">
            {/* Swipe Indicators */}
            <div className="absolute top-8 left-8 right-8 flex justify-between pointer-events-none">
              <motion.div
                className="px-4 py-2 bg-emerald-500 text-white font-bold rounded-lg text-lg transform rotate-12"
                style={{
                  opacity: useTransform(x, [0, 100], [0, 1]),
                }}
              >
                ACCEPT
              </motion.div>
              <motion.div
                className="px-4 py-2 bg-red-500 text-white font-bold rounded-lg text-lg transform -rotate-12"
                style={{
                  opacity: useTransform(x, [-100, 0], [1, 0]),
                }}
              >
                SKIP
              </motion.div>
            </div>

            {/* Contractor Profile Photo */}
            <div className="flex justify-center mb-6 mt-8">
              {currentBid.contractor.profile_image_url ? (
                <img
                  src={currentBid.contractor.profile_image_url}
                  alt={getContractorName(currentBid)}
                  className="w-32 h-32 rounded-full object-cover border-4 border-teal-500 shadow-lg"
                />
              ) : (
                <div className="w-32 h-32 rounded-full bg-teal-100 flex items-center justify-center border-4 border-teal-500 shadow-lg">
                  <span className="text-teal-700 font-bold text-4xl">
                    {getInitials(currentBid)}
                  </span>
                </div>
              )}
            </div>

            {/* Contractor Name & Company */}
            <div className="text-center mb-4">
              <Link href={`/contractors/${currentBid.contractor.id}`}>
                <h3 className="text-2xl font-bold text-gray-900 hover:text-teal-600 transition-colors">
                  {getContractorName(currentBid)}
                </h3>
              </Link>
              {currentBid.contractor.company_name && (
                <p className="text-lg text-gray-600 mt-1">
                  {currentBid.contractor.company_name}
                </p>
              )}

              {/* Rating & Location */}
              <div className="flex items-center justify-center gap-4 mt-2 text-sm text-gray-500">
                {currentBid.contractor.rating && (
                  <span className="flex items-center gap-1 text-amber-600 font-semibold">
                    <span className="text-lg">⭐</span>
                    {currentBid.contractor.rating.toFixed(1)}
                  </span>
                )}
                {currentBid.contractor.city && (
                  <span className="flex items-center gap-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    {currentBid.contractor.city}
                  </span>
                )}
                {currentBid.contractor.completed_jobs !== undefined && (
                  <span>{currentBid.contractor.completed_jobs} jobs completed</span>
                )}
              </div>
            </div>

            {/* Bid Amount - Featured */}
            <div className="mb-6 p-6 bg-gradient-to-br from-teal-50 to-teal-100 rounded-xl border-2 border-teal-200">
              <div className="text-center">
                <div className="text-sm text-teal-700 font-semibold mb-1">Bid Amount</div>
                <div className="text-4xl font-bold text-teal-900">
                  £{currentBid.bid_amount.toLocaleString()}
                </div>
                {currentBid.estimated_hours && (
                  <div className="text-sm text-teal-600 mt-2">
                    Estimated {currentBid.estimated_hours} hours
                  </div>
                )}
              </div>
            </div>

            {/* Message from Contractor */}
            {currentBid.message && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div className="text-xs text-gray-500 font-semibold mb-2">MESSAGE</div>
                <p className="text-sm text-gray-700 italic line-clamp-4">
                  "{currentBid.message}"
                </p>
              </div>
            )}

            {/* Portfolio Images Preview */}
            {currentBid.contractor.portfolioImages && currentBid.contractor.portfolioImages.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-gray-500 font-semibold mb-2">RECENT WORK</div>
                <div className="grid grid-cols-3 gap-2">
                  {currentBid.contractor.portfolioImages.slice(0, 6).map((image, idx) => (
                    <div key={idx} className="aspect-square rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.title || 'Portfolio'}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Submission Date */}
            <div className="text-center text-xs text-gray-500 mb-4">
              Submitted {formatDate(currentBid.created_at)}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-center gap-4 max-w-2xl mx-auto">
        {/* Undo Button */}
        <MotionButton
          onClick={handleUndo}
          disabled={undoStack.length === 0 || processingBid !== null}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-gray-200 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </MotionButton>

        {/* Skip Button */}
        <MotionButton
          onClick={handleReject}
          disabled={processingBid !== null}
          className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-700 rounded-full font-bold text-lg hover:bg-gray-50 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Skip
        </MotionButton>

        {/* Accept Button */}
        <MotionButton
          onClick={handleAccept}
          disabled={processingBid !== null}
          className="px-8 py-4 bg-gradient-to-r from-teal-500 to-teal-600 text-white rounded-full font-bold text-lg hover:from-teal-600 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {processingBid === currentBid.id ? 'Processing...' : 'Accept'}
        </MotionButton>
      </div>

      {/* Swipe Hint (show on first card) */}
      {currentIndex === 0 && (
        <motion.div
          className="text-center text-sm text-gray-500 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <p>💡 Swipe or use the buttons below</p>
        </motion.div>
      )}
    </MotionDiv>
  );
}
