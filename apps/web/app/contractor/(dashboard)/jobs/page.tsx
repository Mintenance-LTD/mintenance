'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { ContractorPageWrapper } from '@/app/contractor/components/ContractorPageWrapper';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { LoadingSpinner } from '@/components/ui';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn, staggerContainer } from '@/lib/animations/variants';

import type { Job, JobsFilter, JobStats } from './types';
import {
  fetchJobsByFilter,
  fetchJobStats,
  logFetchError,
} from './utils/fetchJobs';
import { JobsHero } from './components/JobsHero';
import { JobsFilters } from './components/JobsFilters';
import { JobCard } from './components/JobCard';
import { MintEditorialContractorJobs } from './MintEditorialContractorJobs';

/**
 * /contractor/jobs — refactored 2026-05-09 (AUDIT_PUNCH_LIST P2 #42).
 * Was 633 lines. Page now owns just state + the two fetch effects;
 * the hero, filters, and per-card render live in `./components/`,
 * shared types in `./types.ts`, and the data fetchers in
 * `./utils/fetchJobs.ts`.
 */
export default function ContractorJobsPage2025() {
  const router = useRouter();
  const { user, loading: loadingUser } = useCurrentUser();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [filter, setFilter] = useState<JobsFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [allJobsStats, setAllJobsStats] = useState<JobStats>({
    active: 0,
    pending: 0,
    completed: 0,
    totalValue: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // Hydration-safe Mint Editorial detection — kept at the top of the
  // component above any early returns. Same rules-of-hooks pattern we
  // hit on /jobs/create + /messages earlier in the project.
  const [isMintEditorial, setIsMintEditorial] = useState(false);
  useEffect(() => {
    if (typeof document === 'undefined') return;
    setIsMintEditorial(
      document.documentElement.dataset.theme === 'mint-editorial'
    );
  }, []);

  // Fetch KPI stats (all jobs for contractor)
  useEffect(() => {
    if (!user) return;

    setLoadingStats(true);
    fetchJobStats()
      .then(setAllJobsStats)
      .catch((error) => logFetchError(error, 'fetch stats'))
      .finally(() => setLoadingStats(false));
  }, [user]);

  // Fetch contractor's jobs based on filter type
  useEffect(() => {
    if (!user) return;

    setLoadingJobs(true);
    fetchJobsByFilter(filter, categoryFilter)
      .then(setJobs)
      .catch((error) => {
        logFetchError(error, 'fetch jobs');
        toast.error(
          error instanceof Error ? error.message : 'Failed to load jobs'
        );
        setJobs([]);
      })
      .finally(() => setLoadingJobs(false));
  }, [user, filter, categoryFilter]);

  // Server-side gate already in `/contractor/layout.tsx`. This is
  // belt-and-braces for the brief client-hydration window.
  useEffect(() => {
    if (!loadingUser && (!user || user.role !== 'contractor')) {
      router.push('/login');
    }
  }, [user, loadingUser, router]);

  if (loadingUser) {
    return <LoadingSpinner fullScreen />;
  }

  if (!user) return null;

  if (isMintEditorial) {
    return (
      <MintEditorialContractorJobs
        filter={filter}
        setFilter={setFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        stats={allJobsStats}
        loadingStats={loadingStats}
        jobs={jobs}
        loadingJobs={loadingJobs}
      />
    );
  }

  return (
    <ContractorPageWrapper>
      <JobsHero loadingStats={loadingStats} stats={allJobsStats} />

      <div className='w-full space-y-6'>
        <div className='flex flex-col gap-6'>
          <JobsFilters
            filter={filter}
            setFilter={setFilter}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
          />

          {loadingJobs ? (
            <LoadingSpinner message='Loading jobs...' />
          ) : jobs.length === 0 ? (
            <MotionDiv
              className='bg-white rounded-2xl border border-gray-200 p-12 text-center'
              variants={fadeIn}
              initial='initial'
              animate='animate'
            >
              <div className='w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <svg
                  className='w-10 h-10 text-gray-400'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth={2}
                    d='M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
                  />
                </svg>
              </div>
              <h3 className='text-xl font-bold text-gray-900 mb-2'>
                No jobs available
              </h3>
              <p className='text-gray-600'>
                Check back later for new opportunities
              </p>
            </MotionDiv>
          ) : (
            <MotionDiv
              className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6'
              variants={staggerContainer}
              initial='initial'
              animate='animate'
            >
              <AnimatePresence mode='popLayout'>
                {jobs.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </AnimatePresence>
            </MotionDiv>
          )}
        </div>
      </div>
    </ContractorPageWrapper>
  );
}
