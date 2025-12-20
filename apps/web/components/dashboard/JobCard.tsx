'use client';

import React from 'react';
import Link from 'next/link';
import { ProgressBar } from '@tremor/react';
import { staggerItem } from '@/lib/animations/variants';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { Calendar, DollarSign } from 'lucide-react';

export interface Job {
  id: string;
  title: string;
  status: string;
  budget?: number;
  scheduledDate?: string;
  contractorName?: string;
  category?: string;
  progress?: number;
}

interface JobCardProps {
  job: Job;
  variant?: 'default' | 'compact';
}

export function JobCard({ job, variant = 'default' }: JobCardProps) {
  const getStatusProgress = (status: string): number => {
    const statusMap: Record<string, number> = {
      'posted': 20,
      'assigned': 40,
      'in_progress': 60,
      'review': 80,
      'completed': 100,
    };
    return job.progress ?? statusMap[status] ?? 0;
  };

  const getStatusColor = (status: string): string => {
    const colorMap: Record<string, string> = {
      'posted': 'text-gray-700 bg-gray-100 border-gray-300',
      'assigned': 'text-blue-700 bg-blue-100 border-blue-300',
      'in_progress': 'text-teal-700 bg-teal-100 border-teal-300',
      'review': 'text-amber-700 bg-amber-100 border-amber-300',
      'completed': 'text-emerald-700 bg-emerald-100 border-emerald-300',
    };
    return colorMap[status] || 'text-gray-700 bg-gray-100 border-gray-300';
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const progress = getStatusProgress(job.status);
  const isCompact = variant === 'compact';

  return (
    <MotionDiv variants={staggerItem}>
      <Link href={`/jobs/${job.id}`}>
        <MotionDiv
          className={`${
            isCompact ? 'p-3' : 'p-4'
          } rounded-xl border border-gray-200 bg-white hover:border-teal-300 hover:bg-teal-50/30 transition-all duration-200 cursor-pointer`}
          whileHover={{ x: 4 }}
        >
          {/* Job Header */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1 min-w-0">
              <h3 className={`font-semibold text-gray-900 ${isCompact ? 'text-sm' : 'text-base'} mb-1 line-clamp-1`}>
                {job.title}
              </h3>
              {job.contractorName && (
                <p className="text-xs text-gray-500 truncate">
                  {job.contractorName}
                </p>
              )}
              {job.category && !job.contractorName && (
                <p className="text-xs text-gray-500 capitalize">
                  {job.category}
                </p>
              )}
            </div>
            <span
              className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-2 border ${getStatusColor(
                job.status
              )}`}
            >
              {job.status.replace('_', ' ')}
            </span>
          </div>

          {/* Progress Bar */}
          {!isCompact && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-500">Progress</span>
                <span className="text-xs font-medium text-gray-700">{Math.round(progress)}%</span>
              </div>
              <ProgressBar
                value={progress}
                color="teal"
                className="mt-1"
              />
            </div>
          )}

          {/* Job Footer */}
          <div className={`flex items-center ${isCompact ? 'justify-between' : 'justify-between'} text-xs text-gray-600`}>
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>{formatDate(job.scheduledDate)}</span>
            </div>
            {job.budget && (
              <div className="flex items-center gap-1 font-medium text-gray-900">
                <DollarSign className="w-3.5 h-3.5" />
                <span>{job.budget.toLocaleString()}</span>
              </div>
            )}
          </div>
        </MotionDiv>
      </Link>
    </MotionDiv>
  );
}
