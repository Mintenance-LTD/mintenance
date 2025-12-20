'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { UnifiedButton } from '../ui';
import { MotionDiv } from '../ui/MotionDiv';
import { fadeIn } from '@/lib/animations/variants';
import toast from 'react-hot-toast';

interface JobActionsProps {
  jobId: string;
  status: string;
  contractorId?: string;
  onEdit?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  className?: string;
}

export function JobActions({
  jobId,
  status,
  contractorId,
  onEdit,
  onDelete,
  onShare,
  className = '',
}: JobActionsProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleShare = async () => {
    const jobUrl = `${window.location.origin}/jobs/${jobId}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Check out this job',
          text: 'I found this maintenance job that might interest you',
          url: jobUrl,
        });
      } catch (error) {
        // User cancelled or error occurred
      }
    } else {
      // Fallback: Copy to clipboard
      await navigator.clipboard.writeText(jobUrl);
      toast.success('Job link copied to clipboard!');
    }

    if (onShare) onShare();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this job? This action cannot be undone.')) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete job');

      toast.success('Job deleted successfully');
      router.push('/jobs');
      router.refresh();
    } catch (error) {
      toast.error('Failed to delete job');
    } finally {
      setIsDeleting(false);
    }

    if (onDelete) onDelete();
  };

  const handleMessageContractor = () => {
    if (contractorId) {
      router.push(`/messages/${jobId}`);
    }
  };

  const handleLeaveReview = () => {
    router.push(`/jobs/${jobId}/review`);
  };

  return (
    <MotionDiv
      className={`bg-white rounded-2xl border border-gray-200 shadow-sm p-6 ${className}`}
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      <h3 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h3>

      <div className="space-y-3">
        {/* Message Contractor */}
        {contractorId && status !== 'posted' && (
          <UnifiedButton
            onClick={handleMessageContractor}
            variant="primary"
            size="md"
            fullWidth
            ariaLabel="Message contractor"
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          >
            Message Contractor
          </UnifiedButton>
        )}

        {/* Edit Job (only for posted status) */}
        {status === 'posted' && (
          <UnifiedButton
            onClick={onEdit || (() => router.push(`/jobs/${jobId}/edit`))}
            variant="outline"
            size="md"
            fullWidth
            ariaLabel="Edit job details"
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            }
          >
            Edit Job
          </UnifiedButton>
        )}

        {/* Leave Review (only for completed status) */}
        {status === 'completed' && contractorId && (
          <UnifiedButton
            onClick={handleLeaveReview}
            variant="outline"
            size="md"
            fullWidth
            ariaLabel="Leave review for contractor"
            leftIcon={
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
            }
          >
            Leave Review
          </UnifiedButton>
        )}

        {/* Share Job */}
        <UnifiedButton
          onClick={handleShare}
          variant="outline"
          size="md"
          fullWidth
          ariaLabel="Share job"
          leftIcon={
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          }
        >
          Share Job
        </UnifiedButton>

        {/* Delete Job (only for posted/draft status) */}
        {(status === 'posted' || status === 'draft') && (
          <>
            <div className="border-t border-gray-200 my-4" />
            <UnifiedButton
              onClick={handleDelete}
              variant="ghost"
              size="md"
              fullWidth
              loading={isDeleting}
              disabled={isDeleting}
              ariaLabel="Delete job"
              className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              leftIcon={
                !isDeleting && (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                )
              }
            >
              {isDeleting ? 'Deleting...' : 'Delete Job'}
            </UnifiedButton>
          </>
        )}
      </div>
    </MotionDiv>
  );
}
