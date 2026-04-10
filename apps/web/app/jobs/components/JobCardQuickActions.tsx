'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/MotionDiv';
import toast from 'react-hot-toast';
import { getCsrfHeaders } from '@/lib/csrf-client';

interface JobCardQuickActionsProps {
  jobId: string;
  status: string;
  onRefresh?: () => void;
}

export function JobCardQuickActions({
  jobId,
  status,
  onRefresh,
}: JobCardQuickActionsProps) {
  const [showMenu, setShowMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const refreshData = useCallback(() => {
    if (onRefresh) {
      onRefresh();
    }
    router.refresh();
  }, [onRefresh, router]);

  const handleEdit = () => {
    router.push(`/jobs/${jobId}/edit`);
  };

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
    if (!confirm('Archive this job? You can restore it later.')) {
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
  }, [jobId, refreshData]);

  const handleDelete = useCallback(async () => {
    if (
      !confirm('Delete this job permanently? This action cannot be undone.')
    ) {
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
  }, [jobId, refreshData]);

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
