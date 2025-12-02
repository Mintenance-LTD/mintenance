'use client';

import React from 'react';

interface JobStatusBadgeProps {
  status: string;
  size?: 'sm' | 'md' | 'lg';
}

export function JobStatusBadge({ status, size = 'md' }: JobStatusBadgeProps) {
  const getStatusConfig = (status: string) => {
    const configs: Record<string, { label: string; color: string; icon: string }> = {
      posted: {
        label: 'Posted',
        color: 'bg-blue-100 text-blue-700 border-blue-200',
        icon: '📢',
      },
      assigned: {
        label: 'Assigned',
        color: 'bg-teal-100 text-teal-700 border-teal-200',
        icon: '👤',
      },
      in_progress: {
        label: 'In Progress',
        color: 'bg-amber-100 text-amber-700 border-amber-200',
        icon: '⚡',
      },
      review: {
        label: 'Under Review',
        color: 'bg-purple-100 text-purple-700 border-purple-200',
        icon: '👁',
      },
      completed: {
        label: 'Completed',
        color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
        icon: '✅',
      },
      cancelled: {
        label: 'Cancelled',
        color: 'bg-gray-100 text-gray-700 border-gray-200',
        icon: '❌',
      },
      draft: {
        label: 'Draft',
        color: 'bg-gray-100 text-gray-600 border-gray-200',
        icon: '📝',
      },
    };
    return configs[status] || configs.posted;
  };

  const config = getStatusConfig(status);

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold border ${config.color} ${sizeClasses[size]}`}
      role="status"
      aria-label={`Job status: ${config.label}`}
    >
      <span aria-hidden="true">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
