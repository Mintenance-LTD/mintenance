'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { JobsStatsSection } from './JobsStatsSection';

interface JobsHeroHeaderProps {
  allJobsCount: number;
  activeJobsCount: number;
  postedJobsCount: number;
  completedJobsCount: number;
  prefersReducedMotion: boolean;
}

export function JobsHeroHeader({
  allJobsCount,
  activeJobsCount,
  postedJobsCount,
  completedJobsCount,
  prefersReducedMotion,
}: JobsHeroHeaderProps) {
  const router = useRouter();

  return (
    <>
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm mb-6" aria-label="Breadcrumb">
        <Link href="/dashboard" className="text-gray-600 hover:text-gray-900 transition-colors font-medium">
          Dashboard
        </Link>
        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-900 font-semibold">Your Jobs</span>
      </nav>

      {/* Hero Header */}
      <MotionDiv
        className="bg-gradient-to-br from-teal-50 via-white to-emerald-50 border border-gray-200 rounded-2xl p-8 mb-6 relative overflow-hidden"
        initial={prefersReducedMotion ? false : { opacity: 0, y: -20 }}
        animate={prefersReducedMotion ? false : { opacity: 1, y: 0 }}
      >
        {/* Background Pattern */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-teal-100/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-emerald-100/20 rounded-full blur-3xl" />

        <div className="max-w-full relative z-10">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <h1 className="text-4xl font-bold mb-2 text-gray-900">Your Jobs</h1>
              <p className="text-lg text-gray-600">
                Manage maintenance projects and track contractor progress
              </p>
            </div>

            <Button
              variant="primary"
              size="lg"
              onClick={() => router.push('/jobs/create')}
              className="bg-gradient-to-r from-teal-600 to-emerald-600 text-white hover:shadow-xl hover:scale-105 transition-all duration-300 rounded-xl px-8 py-4 font-semibold flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Post New Job
            </Button>
          </div>

          {/* Stats Summary */}
          <JobsStatsSection
            totalJobs={allJobsCount}
            activeJobs={activeJobsCount}
            postedJobs={postedJobsCount}
            completedJobs={completedJobsCount}
            prefersReducedMotion={prefersReducedMotion}
          />
        </div>
      </MotionDiv>
    </>
  );
}
