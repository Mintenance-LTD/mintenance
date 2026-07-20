'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/MotionDiv';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { useConfirm } from '@/components/ui/confirm-dialog';

interface JobCardQuickActionsProps {
  jobId: string;
  status: string;
  /** When set + status === 'completed', the menu surfaces a "Hire
   *  again" entry that deep-links to /jobs/create with prefilled
   *  fields + the previous contractor pre-selected via query
   *  string. Drives repeat business. */
  previousContractorId?: string | null;
  onRefresh?: () => void;
}

export function JobCardQuickActions({
  jobId,
  status,
  previousContractorId,
  onRefresh,
}: JobCardQuickActionsProps) {
  const isCompleted = status === 'completed';
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const confirm = useConfirm();

  const refreshData = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
    router.refresh();
  }, [onRefresh, router]);

  const handleEdit = () => {
    router.push(`/jobs/${jobId}/edit`);
  };

  /**
   * Hire-again deep-link to /jobs/create. The create page already
   * accepts title/description/category/location via query string
   * (see /jobs/create/utils/url-prefill.ts). We add
   * `preferredContractor` so the wizard can show "Hiring X again"
   * messaging and (when later wired) auto-route the job to that
   * contractor's bid inbox.
   */
  const handleHireAgain = useCallback(async () => {
    setShowMenu(false);
    try {
      const getRes = await fetch(`/api/jobs/${jobId}`);
      if (!getRes.ok) {
        throw new Error('Failed to fetch job details');
      }
      const { job } = await getRes.json();
      const params = new URLSearchParams();
      if (job.title) params.set('title', job.title);
      if (job.description) params.set('description', job.description);
      if (job.category) params.set('category', job.category);
      if (job.location) params.set('location', job.location);
      if (previousContractorId)
        params.set('preferredContractor', previousContractorId);
      router.push(`/jobs/create?${params.toString()}`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to start rebooking'
      );
    }
  }, [jobId, previousContractorId, router]);

  const handleDuplicate = useCallback(async () => {
    setIsLoading(true);
    setShowMenu(false);
    try {
      // Fetch current job data to duplicate
      const getRes = await fetch(`/api/jobs/${jobId}`);
      if (!getRes.ok) {
        throw new Error('Failed to fetch job details');
      }
      const { job } = await getRes.json();

      // Create a new job with the same core fields
      const csrfHeaders = await getCsrfHeaders();
      const createRes = await fetch('/api/jobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify({
          title: `${job.title} (Copy)`,
          description: job.description || undefined,
          category: job.category || undefined,
          budget: job.budget || undefined,
          budget_min: job.budget_min || undefined,
          budget_max: job.budget_max || undefined,
          location: job.location || undefined,
          latitude: job.latitude || undefined,
          longitude: job.longitude || undefined,
        }),
      });

      if (!createRes.ok) {
        const errorData = await createRes.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to duplicate job');
      }

      const { job: newJob } = await createRes.json();
      toast.success('Job duplicated successfully');
      refreshData();
      router.push(`/jobs/${newJob.id}/edit`);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to duplicate job'
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId, refreshData, router]);

  const handleArchive = useCallback(async () => {
    const ok = await confirm({
      title: 'Archive this job?',
      description: 'You can restore it later.',
      confirmText: 'Archive',
    });
    if (!ok) {
      setShowMenu(false);
      return;
    }
    setIsLoading(true);
    setShowMenu(false);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...csrfHeaders,
        },
        body: JSON.stringify({ status: 'cancelled' }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || 'Failed to archive job');
      }

      toast.success('Job archived successfully');
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to archive job'
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId, refreshData, confirm]);

  const handleDelete = useCallback(async () => {
    const ok = await confirm({
      title: 'Delete this job permanently?',
      description: 'This action cannot be undone.',
      confirmText: 'Delete',
      destructive: true,
    });
    if (!ok) {
      setShowMenu(false);
      return;
    }
    setIsLoading(true);
    setShowMenu(false);
    try {
      const csrfHeaders = await getCsrfHeaders();
      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
          ...csrfHeaders,
        },
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(
          errorData?.error || errorData?.message || 'Failed to delete job'
        );
      }

      toast.success('Job deleted successfully');
      refreshData();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to delete job'
      );
    } finally {
      setIsLoading(false);
    }
  }, [jobId, refreshData, confirm]);

  return (
    <div className='absolute top-4 right-4 z-10'>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!isLoading) setShowMenu(!showMenu);
        }}
        disabled={isLoading}
        className='w-8 h-8 rounded-full bg-white/90 backdrop-blur-sm border border-gray-200 flex items-center justify-center hover:bg-white transition-colors shadow-sm disabled:opacity-50'
        aria-label='Job actions'
        title='More actions'
      >
        <svg
          className='w-5 h-5 text-gray-700'
          fill='currentColor'
          viewBox='0 0 20 20'
        >
          <path d='M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z' />
        </svg>
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {showMenu && (
          <>
            {/* Backdrop to close menu */}
            <div
              className='fixed inset-0 z-10'
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(false);
              }}
            />
            <MotionDiv
              initial={{ opacity: 0, scale: 0.95, y: -10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className='absolute top-full right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden z-20'
              onClick={(e) => e.stopPropagation()}
            >
              {/* Hire again — top of menu for completed jobs to
                  surface the repeat-business path. */}
              {isCompleted && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleHireAgain();
                  }}
                  className='w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-teal-700 hover:bg-teal-50 transition-colors'
                >
                  <svg
                    className='w-4 h-4'
                    fill='none'
                    viewBox='0 0 24 24'
                    stroke='currentColor'
                  >
                    <path
                      strokeLinecap='round'
                      strokeLinejoin='round'
                      strokeWidth={2}
                      d='M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15'
                    />
                  </svg>
                  Hire again
                </button>
              )}

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleEdit();
                }}
                className='w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
                  />
                </svg>
                Edit Job
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDuplicate();
                }}
                className='w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z'
                  />
                </svg>
                Duplicate
              </button>

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleArchive();
                }}
                className='w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4'
                  />
                </svg>
                Archive
              </button>

              <div className='border-t border-gray-100' />

              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleDelete();
                }}
                className='w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors'
              >
                <svg
                  className='w-4 h-4'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16'
                  />
                </svg>
                Delete Job
              </button>
            </MotionDiv>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
