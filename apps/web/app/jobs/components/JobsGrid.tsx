'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { EmptyState } from '@/components/ui/EmptyState';
import { JobCardSkeleton } from '@/components/ui/skeletons';
import { JobCard2025 } from './JobCard2025';

interface Job {
  id: string;
  title: string;
  description: string;
  location: string;
  status: string;
  budget: number;
  category?: string;
  priority?: string;
  photos?: string[];
  created_at: string;
  view_count?: number;
  ai_assessment?: any;
}

interface JobsGridProps {
  jobs: Job[];
  allJobsCount: number;
  loading: boolean;
  viewMode: 'grid' | 'list';
  prefersReducedMotion?: boolean;
  selectionMode: boolean;
  selectedJobs: Set<string>;
  onToggleSelection: (jobId: string) => void;
  onClearFilters: () => void;
}

export function JobsGrid({
  jobs,
  allJobsCount,
  loading,
  viewMode,
  prefersReducedMotion = false,
  selectionMode,
  selectedJobs,
  onToggleSelection,
  onClearFilters
}: JobsGridProps) {
  const router = useRouter();

  if (loading) {
    return (
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6' : 'flex flex-col gap-4'}>
        <JobCardSkeleton count={6} />
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <MotionDiv
        variants={prefersReducedMotion ? {} : fadeIn}
        initial={prefersReducedMotion ? false : "initial"}
        animate={prefersReducedMotion ? false : "animate"}
      >
        {allJobsCount === 0 ? (
          <EmptyState
            variant="illustrated"
            icon="briefcase"
            title="Post your first maintenance job"
            description="Get matched with trusted, verified contractors in your area. Create a detailed job listing and receive competitive bids within 24 hours."
            actionLabel="Create Your First Job"
            onAction={() => router.push('/jobs/create')}
            secondaryActionLabel="Browse contractors"
            onSecondaryAction={() => router.push('/contractors')}
            nextSteps={[
              {
                title: 'Try Mint AI for instant assessment',
                description: 'Upload a photo and get AI-powered cost estimates, severity analysis, and contractor recommendations.',
                href: '/try-mint-ai',
              },
              {
                title: 'Explore job templates',
                description: 'Use pre-built templates for common maintenance tasks like plumbing, electrical work, or painting.',
                href: '/jobs/create',
              },
              {
                title: 'Learn how bidding works',
                description: 'Understand our transparent bidding process and how to choose the right contractor for your job.',
                href: '/how-it-works',
              },
            ]}
            supportLink={{ label: 'Need help getting started? Contact support', href: 'mailto:support@mintenance.co.uk' }}
          />
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No jobs match your filters</h3>
            <p className="text-gray-600 mb-6">Try adjusting your filters to see more results</p>
            <button
              onClick={onClearFilters}
              className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6' : 'flex flex-col gap-4'}
      variants={prefersReducedMotion ? {} : staggerContainer}
      initial={prefersReducedMotion ? false : "initial"}
      animate={prefersReducedMotion ? false : "animate"}
    >
      <AnimatePresence mode="popLayout">
        {jobs.map((job, index) => (
          <MotionDiv
            key={job.id}
            variants={prefersReducedMotion ? {} : staggerItem}
            layout={!prefersReducedMotion}
            initial={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={prefersReducedMotion ? false : { opacity: 1, scale: 1 }}
            exit={prefersReducedMotion ? false : { opacity: 0, scale: 0.9 }}
            transition={prefersReducedMotion ? { duration: 0 } : { delay: index * 0.05 }}
          >
            <JobCard2025
              job={job}
              viewMode={viewMode}
              prefersReducedMotion={prefersReducedMotion}
              selectionMode={selectionMode}
              isSelected={selectedJobs.has(job.id)}
              onToggleSelection={() => onToggleSelection(job.id)}
            />
          </MotionDiv>
        ))}
      </AnimatePresence>
    </MotionDiv>
  );
}
