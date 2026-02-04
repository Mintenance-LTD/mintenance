'use client';

import React from 'react';
import { MotionDiv } from '@/components/ui/MotionDiv';

interface JobsStatsSectionProps {
  totalJobs: number;
  activeJobs: number;
  postedJobs: number;
  completedJobs: number;
  prefersReducedMotion?: boolean;
}

export function JobsStatsSection({
  totalJobs,
  activeJobs,
  postedJobs,
  completedJobs,
  prefersReducedMotion = false
}: JobsStatsSectionProps) {
  const stats = [
    {
      label: 'Total Jobs',
      value: totalJobs,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      bgGradient: 'from-blue-500 to-blue-600',
      lightBg: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      label: 'Active',
      value: activeJobs,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      bgGradient: 'from-amber-500 to-orange-600',
      lightBg: 'bg-amber-50',
      textColor: 'text-amber-700'
    },
    {
      label: 'Posted',
      value: postedJobs,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
        </svg>
      ),
      bgGradient: 'from-teal-500 to-emerald-600',
      lightBg: 'bg-teal-50',
      textColor: 'text-teal-700'
    },
    {
      label: 'Completed',
      value: completedJobs,
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      bgGradient: 'from-emerald-500 to-green-600',
      lightBg: 'bg-emerald-50',
      textColor: 'text-emerald-700'
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
      {stats.map((stat) => (
        <MotionDiv
          key={stat.label}
          className="relative bg-white rounded-xl border border-gray-200 overflow-hidden group hover:shadow-lg transition-shadow duration-300"
          whileHover={prefersReducedMotion ? {} : { y: -2 }}
          transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.2 }}
        >
          {/* Gradient accent bar */}
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${stat.bgGradient}`} />

          <div className="p-5">
            <div className="flex items-start justify-between mb-3">
              {/* Icon with gradient background */}
              <div className={`w-12 h-12 rounded-lg ${stat.lightBg} flex items-center justify-center ${stat.textColor} group-hover:scale-110 transition-transform duration-300`}>
                {stat.icon}
              </div>
            </div>

            {/* Value */}
            <div className="text-3xl font-bold text-gray-900 mb-1">
              {stat.value}
            </div>

            {/* Label */}
            <div className="text-sm font-medium text-gray-600">
              {stat.label}
            </div>
          </div>
        </MotionDiv>
      ))}
    </div>
  );
}
