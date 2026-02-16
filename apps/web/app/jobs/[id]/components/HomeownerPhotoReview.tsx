'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { Button } from '@/components/ui/Button';
import { CheckCircle, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchWithCsrf } from '@/lib/csrf-client';

interface PhotoRecord {
  id: string;
  photo_url: string;
}

interface HomeownerPhotoReviewProps {
  jobId: string;
  beforePhotos: PhotoRecord[];
  afterPhotos: PhotoRecord[];
  isConfirmed: boolean;
}

/**
 * HomeownerPhotoReview - Before/after comparison with approve/reject actions
 */
export function HomeownerPhotoReview({
  jobId,
  beforePhotos,
  afterPhotos,
  isConfirmed,
}: HomeownerPhotoReviewProps) {
  const router = useRouter();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showChangesForm, setShowChangesForm] = useState(false);
  const [comments, setComments] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApproved, setIsApproved] = useState(isConfirmed);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const pairCount = Math.min(beforePhotos.length, afterPhotos.length);
  const hasPhotoPairs = pairCount > 0;

  const handleApprove = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/jobs/${jobId}/confirm-completion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve');

      setIsApproved(true);
      setSuccessMessage('Work approved! Payment will be released to the contractor.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to approve work');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!comments.trim()) {
      setError('Please describe what changes are needed');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetchWithCsrf(`/api/jobs/${jobId}/request-changes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ comments: comments.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send request');

      setSuccessMessage('Change request sent to the contractor.');
      setShowChangesForm(false);
      setComments('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send request');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!hasPhotoPairs) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Review Completed Work</h3>

      {/* Approved banner */}
      {isApproved && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800">Work Approved</p>
            <p className="text-sm text-green-600">Payment is being processed for the contractor.</p>
          </div>
        </div>
      )}

      {/* Before/After slider */}
      <BeforeAfterSlider
        beforeImageUrl={beforePhotos[currentIndex]?.photo_url || ''}
        afterImageUrl={afterPhotos[currentIndex]?.photo_url || ''}
      />

      {/* Photo navigation (if multiple pairs) */}
      {pairCount > 1 && (
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <span className="text-sm text-gray-500">
            {currentIndex + 1} / {pairCount}
          </span>
          <button
            onClick={() => setCurrentIndex(i => Math.min(pairCount - 1, i + 1))}
            disabled={currentIndex === pairCount - 1}
            className="p-1.5 rounded-full hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
      )}

      {/* Action buttons (only when not yet approved) */}
      {!isApproved && !successMessage && (
        <>
          {!showChangesForm ? (
            <div className="flex gap-3">
              <Button
                onClick={handleApprove}
                disabled={isSubmitting}
                variant="primary"
                className="flex-1"
                size="lg"
              >
                <CheckCircle className="h-5 w-5 mr-2" />
                {isSubmitting ? 'Approving...' : 'Approve Work'}
              </Button>
              <Button
                onClick={() => setShowChangesForm(true)}
                disabled={isSubmitting}
                variant="outline"
                className="flex-1"
                size="lg"
              >
                <MessageSquare className="h-5 w-5 mr-2" />
                Request Changes
              </Button>
            </div>
          ) : (
            <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
              <p className="text-sm font-medium text-gray-700">
                What changes are needed?
              </p>
              <textarea
                value={comments}
                onChange={e => setComments(e.target.value)}
                placeholder="Describe what needs to be fixed or improved..."
                className="w-full h-24 px-3 py-2 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-3">
                <Button
                  onClick={handleRequestChanges}
                  disabled={isSubmitting || !comments.trim()}
                  variant="primary"
                  size="md"
                >
                  {isSubmitting ? 'Sending...' : 'Send Request'}
                </Button>
                <Button
                  onClick={() => { setShowChangesForm(false); setComments(''); }}
                  disabled={isSubmitting}
                  variant="outline"
                  size="md"
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
        <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
      )}
      {successMessage && !isApproved && (
        <div className="p-3 bg-green-50 text-green-700 text-sm rounded-lg">{successMessage}</div>
      )}
    </div>
  );
}
