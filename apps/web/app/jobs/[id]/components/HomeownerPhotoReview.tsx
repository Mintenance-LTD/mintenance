'use client';
import { useJobRework } from '@/lib/hooks/useJobRework';
import { ReworkHistory } from '@/components/jobs/ReworkHistory';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { PaymentReviewMilestones } from './PaymentReviewMilestones';
import { useRouter } from 'next/navigation';
// Audit P2 (2026-05-10): consolidated to the canonical shared component.
// Was importing a near-duplicate at './BeforeAfterSlider' (now deleted).
import { BeforeAfterSlider } from '@/components/ui/BeforeAfterSlider';
import { Button } from '@/components/ui/Button';
import {
  CheckCircle,
  MessageSquare,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface PhotoRecord {
  id: string;
  photo_url: string;
  created_at?: string | null;
}

interface HomeownerPhotoReviewProps {
  jobId: string;
  beforePhotos: PhotoRecord[];
  afterPhotos: PhotoRecord[];
  isConfirmed: boolean;
  paymentRefunded?: boolean;
  /** Completion revision used to reject stale approval/change requests. */
  completedAt?: string | null;
}

/**
 * HomeownerPhotoReview - Before/after comparison with approve/reject actions
 */
export function HomeownerPhotoReview({
  jobId,
  beforePhotos,
  afterPhotos: allAfterPhotos,
  isConfirmed,
  paymentRefunded = false,
  completedAt,
}: HomeownerPhotoReviewProps) {
  const router = useRouter();
  const rework = useJobRework(jobId, completedAt);
  const [showPrevious, setShowPrevious] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const afterPhotos =
    rework.latest && !showPrevious
      ? allAfterPhotos.filter(
          (photo) =>
            photo.created_at &&
            Date.parse(photo.created_at) > Date.parse(rework.latest.created_at)
        )
      : allAfterPhotos;
  useEffect(() => {
    setCurrentIndex(0);
    setShowPrevious(false);
  }, [rework.latest?.id, completedAt]);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(isConfirmed);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const reworkRequests = useRef(new Map<string, string>());
  const reworkInFlight = useRef(false);

  const pairCount = Math.max(beforePhotos.length, afterPhotos.length);
  const photoIndex = Math.min(currentIndex, Math.max(0, pairCount - 1));

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/jobs/${jobId}/confirm-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedAt }),
      });

      const data = await res.json();
      if (!res.ok || data.success !== true) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message || 'Unable to confirm approval. Please retry.'
        );
      }

      setIsApproved(true);
      setSuccessMessage(
        'Work approved. Payment release is subject to the cooling-off period and final checks.'
      );
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve work');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (reworkInFlight.current) return;
    if (!comments.trim()) {
      setError('Please describe what changes are needed');
      return;
    }

    reworkInFlight.current = true;
    setIsSubmitting(true);
    setError(null);

    try {
      // Reuse the request identity after a lost response, including when the
      // user edits the comments and then returns to the original feedback.
      const identity = JSON.stringify([jobId, completedAt, comments.trim()]);
      let requestKey = reworkRequests.current.get(identity);
      if (!requestKey) {
        requestKey = crypto.randomUUID();
        reworkRequests.current.set(identity, requestKey);
      }
      const res = await fetchWithCsrf(`/api/jobs/${jobId}/request-changes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': requestKey,
        },
        body: JSON.stringify({ comments: comments.trim(), completedAt }),
      });

      const data = await res.json();
      if (!res.ok || data.success !== true) {
        throw new Error(
          typeof data.error === 'string'
            ? data.error
            : data.error?.message ||
                'Unable to confirm the change request. Please retry.'
        );
      }

      setSuccessMessage('Change request sent to the contractor.');
      setShowChangesForm(false);
      setComments('');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      reworkInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  if (allAfterPhotos.length === 0 && beforePhotos.length === 0) return null;

  return (
    <div className='space-y-4'>
      <h3 className='text-lg font-semibold text-gray-900'>
        {paymentRefunded ? 'Completion evidence' : 'Review Completed Work'}
      </h3>

      {rework.loading && (
        <p role='status'>Loading the current completion cycle…</p>
      )}
      {rework.error && <p role='alert'>{rework.error}</p>}
      <ReworkHistory requests={rework.requests} />
      {rework.latest && (
        <div className='space-y-2'>
          <p className='font-medium'>
            {showPrevious
              ? 'All after photos — includes earlier cycles'
              : 'Current rework evidence'}
          </p>
          <p>
            {afterPhotos.length} after photos in this view. Earlier-cycle photos
            do not count towards this review.
          </p>
          <button
            type='button'
            className='underline'
            onClick={() => {
              setShowPrevious((value) => !value);
              setCurrentIndex(0);
            }}
          >
            {showPrevious
              ? 'Show current rework only'
              : 'Browse all photos including previous cycles'}
          </button>
          {!paymentRefunded &&
            !showPrevious &&
            afterPhotos.length > 0 &&
            afterPhotos.length < 3 && (
              <p>
                At least three fresh accepted after photos are required before
                this cycle can be approved.
              </p>
            )}
          {!paymentRefunded && !showPrevious && afterPhotos.length === 0 && (
            <p>
              No fresh after photos are available for this cycle. Request
              evidence before approving.
            </p>
          )}
        </div>
      )}
      {showPrevious && rework.latest && afterPhotos[photoIndex] && (
        <p className='font-medium'>
          {afterPhotos[photoIndex].created_at &&
          Date.parse(afterPhotos[photoIndex].created_at!) >
            Date.parse(rework.latest.created_at)
            ? 'Current cycle'
            : 'Previous cycle / date unavailable'}
        </p>
      )}
      {/* Approved banner */}
      {isApproved && (
        <div className='flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl'>
          <CheckCircle className='h-5 w-5 text-green-600 flex-shrink-0' />
          <div>
            <p className='text-sm font-medium text-green-800'>Work Approved</p>
            <p className='text-sm text-green-600'>
              {paymentRefunded
                ? 'Approval is retained in the job record. The payment was refunded.'
                : 'Payment release is subject to the cooling-off period and final checks.'}
            </p>
          </div>
        </div>
      )}

      {/* Before/After slider */}
      {pairCount > 0 &&
        (beforePhotos[photoIndex] && afterPhotos[photoIndex] ? (
          <BeforeAfterSlider
            beforeUrl={beforePhotos[photoIndex].photo_url}
            afterUrl={afterPhotos[photoIndex].photo_url}
          />
        ) : (
          <figure>
            <div className='relative h-80 w-full'>
              <Image
                src={
                  (afterPhotos[photoIndex] || beforePhotos[photoIndex])
                    .photo_url
                }
                alt={
                  afterPhotos[photoIndex]
                    ? 'Completed work photo'
                    : 'Before work photo'
                }
                fill
                sizes='(max-width: 768px) 100vw, 700px'
                className='object-contain'
              />
            </div>
            <figcaption className='text-sm text-gray-600'>
              {afterPhotos[photoIndex]
                ? 'After photo — no corresponding before photo supplied.'
                : 'Before photo — no corresponding after photo supplied.'}
            </figcaption>
          </figure>
        ))}
      <p className='text-sm text-gray-600'>
        {beforePhotos.length} before photos · {afterPhotos.length} after photos.
        Photos are shown in upload order; matching positions may show different
        views.
      </p>

      {/* Photo navigation (if multiple pairs) */}
      {pairCount > 1 && (
        <div className='flex items-center justify-center gap-4'>
          <button
            type='button'
            aria-label='Previous photo'
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={photoIndex === 0}
            className='p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed'
          >
            <ChevronLeft className='h-5 w-5 text-gray-600' />
          </button>
          <span className='text-sm text-gray-500'>
            {photoIndex + 1} / {pairCount}
          </span>
          <button
            type='button'
            aria-label='Next photo'
            onClick={() =>
              setCurrentIndex((i) => Math.min(pairCount - 1, i + 1))
            }
            disabled={photoIndex === pairCount - 1}
            className='p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed'
          >
            <ChevronRight className='h-5 w-5 text-gray-600' />
          </button>
        </div>
      )}

      {paymentRefunded ? (
        <p className='text-sm text-gray-600'>
          Payment was refunded. You can still view the evidence. Approval and
          change requests for this completion are closed.
        </p>
      ) : (
        <PaymentReviewMilestones jobId={jobId} approved={isApproved} />
      )}

      {/* Action buttons (only when not yet approved) */}
      {!paymentRefunded && !isApproved && !successMessage && (
        <>
          {!showChangesForm ? (
            <div className='flex gap-3'>
              <Button
                onClick={handleApprove}
                disabled={
                  isSubmitting ||
                  rework.loading ||
                  !!rework.error ||
                  !!(
                    rework.latest &&
                    allAfterPhotos.filter(
                      (photo) =>
                        photo.created_at &&
                        Date.parse(photo.created_at) >
                          Date.parse(rework.latest!.created_at)
                    ).length < 3
                  )
                }
                variant='primary'
                className='flex-1'
                size='lg'
              >
                <CheckCircle className='h-5 w-5 mr-2' />
                {isSubmitting ? 'Approving...' : 'Approve Work'}
              </Button>
              <Button
                onClick={() => setShowChangesForm(true)}
                disabled={isSubmitting}
                variant='outline'
                className='flex-1'
                size='lg'
              >
                <MessageSquare className='h-5 w-5 mr-2' />
                Request Changes
              </Button>
            </div>
          ) : (
            <div className='space-y-3 p-4 bg-gray-50 rounded-xl'>
              <p className='text-sm font-medium text-gray-700'>
                What changes are needed?
              </p>
              <textarea
                aria-label='Changes needed'
                maxLength={5000}
                disabled={isSubmitting}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder='Describe what needs to be fixed or improved...'
                className='w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent'
              />
              <div className='flex gap-3'>
                <Button
                  onClick={handleRequestChanges}
                  disabled={isSubmitting || !comments.trim()}
                  variant='primary'
                  size='md'
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </Button>
                <Button
                  onClick={() => {
                    setShowChangesForm(false);
                    setComments('');
                  }}
                  disabled={isSubmitting}
                  variant='outline'
                  size='md'
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Status messages */}
      {error && (
        <div className='p-3 bg-red-50 text-red-700 text-sm rounded-lg'>
          {error}
        </div>
      )}
      {successMessage && !isApproved && (
        <div className='p-3 bg-green-50 text-green-700 text-sm rounded-lg'>
          {successMessage}
        </div>
      )}
    </div>
  );
}
