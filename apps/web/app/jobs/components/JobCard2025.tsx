'use client';

import React from 'react';
import { cardHover } from '@/lib/animations/variants';
import Link from 'next/link';
import { MotionArticle, MotionDiv } from '@/components/ui/MotionDiv';

interface JobCard2025Props {
  job: {
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
  };
  viewMode?: 'grid' | 'list';
}

export function JobCard2025({ job, viewMode = 'grid' }: JobCard2025Props) {
  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      posted: 'bg-blue-100 text-blue-700 border-blue-200',
      assigned: 'bg-teal-100 text-teal-700 border-teal-200',
      in_progress: 'bg-amber-100 text-amber-700 border-amber-200',
      review: 'bg-purple-100 text-purple-700 border-purple-200',
      completed: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      cancelled: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getPriorityColor = (priority?: string) => {
    if (!priority) return '';
    const colors: Record<string, string> = {
      low: 'text-blue-600',
      medium: 'text-amber-600',
      high: 'text-emerald-600',
      emergency: 'text-rose-600',
    };
    return colors[priority] || '';
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Link href={`/jobs/${job.id}`}>
      <MotionArticle
        className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden cursor-pointer ${
          viewMode === 'list' ? 'flex flex-row' : ''
        }`}
        variants={cardHover}
        initial="rest"
        whileHover="hover"
        whileTap="tap"
      >
        {/* Image Section */}
        {job.photos && job.photos.length > 0 && (
          <div className={`relative bg-gray-100 ${viewMode === 'list' ? 'w-48 h-full' : 'h-48'}`}>
            <img
              src={job.photos[0]}
              alt={job.title}
              className="w-full h-full object-cover"
            />
            {job.photos.length > 1 && (
              <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm text-white text-xs font-medium rounded-lg">
                +{job.photos.length - 1} more
              </div>
            )}
          </div>
        )}

        {/* Content */}
        <div className={`p-6 ${viewMode === 'list' ? 'flex-1' : ''}`}>
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-bold text-gray-900 mb-1 line-clamp-1">
                {job.title}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="truncate">{job.location}</span>
              </div>
            </div>

            {/* Budget */}
            <div className="text-right flex-shrink-0">
              <div className="text-2xl font-bold text-gray-900">
                ${job.budget.toLocaleString()}
              </div>
              <div className="text-xs text-gray-500">Budget</div>
            </div>
          </div>

          {/* Description */}
          <p className="text-sm text-gray-700 mb-4 line-clamp-2">
            {job.description}
          </p>

          {/* Badges Row */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(job.status)}`}>
              {job.status.replace('_', ' ').toUpperCase()}
            </span>

            {/* Category Badge */}
            {job.category && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-semibold">
                {job.category.charAt(0).toUpperCase() + job.category.slice(1)}
              </span>
            )}

            {/* Priority Badge */}
            {job.priority && (
              <span className={`px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold ${getPriorityColor(job.priority)}`}>
                {job.priority.charAt(0).toUpperCase() + job.priority.slice(1)} Priority
              </span>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              Posted {formatTimeAgo(job.created_at)}
            </span>

            <MotionDiv
              className="flex items-center gap-1 text-teal-600 font-medium text-sm"
              whileHover={{ x: 3 }}
            >
              <span>View Details</span>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </MotionDiv>
          </div>
        </div>
      </MotionArticle>
    </Link>
  );
}
