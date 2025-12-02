'use client';

import React from 'react';
import Link from 'next/link';
import { fadeIn, staggerContainer, staggerItem } from '@/lib/animations/variants';
import { ProgressBar } from '@tremor/react';
import { MotionButton, MotionDiv, MotionSection } from '@/components/ui/MotionDiv';

interface Job {
  id: string;
  title: string;
  status: string;
  budget?: number;
  scheduled_date?: string;
  contractor_name?: string;
}

interface ActiveJobsWidget2025Props {
  jobs: Job[];
}

export function ActiveJobsWidget2025({ jobs }: ActiveJobsWidget2025Props) {
  const getStatusProgress = (status: string): number => {
    const statusMap: Record<string, number> = {
      'posted': 20,
      'assigned': 40,
      'in_progress': 60,
      'review': 80,
      'completed': 100,
    };
    return statusMap[status] || 0;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'posted': 'text-gray-600 bg-gray-100',
      'assigned': 'text-blue-600 bg-blue-100',
      'in_progress': 'text-teal-600 bg-teal-100',
      'review': 'text-amber-600 bg-amber-100',
      'completed': 'text-emerald-600 bg-emerald-100',
    };
    return colorMap[status] || 'text-gray-600 bg-gray-100';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <MotionSection
      className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm"
      variants={fadeIn}
      initial="initial"
      animate="animate"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Active Jobs</h2>
          <p className="text-sm text-gray-500 mt-1">
            {jobs.length} {jobs.length === 1 ? 'job' : 'jobs'} in progress
          </p>
        </div>
        <Link href="/jobs">
          <MotionButton
            className="text-sm font-medium text-teal-600 hover:text-teal-700 transition-colors"
            whileHover={{ x: 3 }}
          >
            View all →
          </MotionButton>
        </Link>
      </div>

      {/* Jobs List */}
      {jobs.length === 0 ? (
        <div className="py-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">No active jobs</p>
          <Link href="/jobs/create">
            <MotionButton
              className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.98 }}
            >
              Post Your First Job
            </MotionButton>
          </Link>
        </div>
      ) : (
        <MotionDiv
          className="space-y-4"
          variants={staggerContainer}
          initial="initial"
          animate="animate"
        >
          {jobs.slice(0, 3).map((job) => (
            <MotionDiv
              key={job.id}
              variants={staggerItem}
            >
              <Link href={`/jobs/${job.id}`}>
                <MotionDiv
                  className="p-4 rounded-xl border border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all duration-200 cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  {/* Job Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1 line-clamp-1">
                        {job.title}
                      </h3>
                      {job.contractor_name && (
                        <p className="text-xs text-gray-500">
                          Contractor: {job.contractor_name}
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 ${getStatusColor(
                        job.status
                      )}`}
                    >
                      {job.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Progress Bar */}
                  <div className="mb-3">
                    <ProgressBar
                      value={getStatusProgress(job.status)}
                      color="teal"
                      className="mt-2"
                    />
                  </div>

                  {/* Job Footer */}
                  <div className="flex items-center justify-between text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      {formatDate(job.scheduled_date)}
                    </div>
                    {job.budget && (
                      <div className="font-medium text-gray-900">
                        ${job.budget.toLocaleString()}
                      </div>
                    )}
                  </div>
                </MotionDiv>
              </Link>
            </MotionDiv>
          ))}
        </MotionDiv>
      )}
    </MotionSection>
  );
}
