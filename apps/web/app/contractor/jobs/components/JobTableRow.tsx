'use client';

import React from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/ui/figma';
import { Button } from '@/components/ui/Button';
import { Eye } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';

interface Job {
  id: string;
  title: string;
  status: 'posted' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  budget: number | null;
  created_at: string;
  updated_at: string;
  location: string | null;
  homeowner: {
    id: string;
    first_name: string;
    last_name: string;
    profile_image_url: string | null;
  } | null;
}

interface JobTableRowProps {
  job: Job;
}

export function JobTableRow({ job }: JobTableRowProps) {
  const homeownerName = job.homeowner
    ? `${job.homeowner.first_name} ${job.homeowner.last_name}`
    : 'Unknown';

  const homeownerInitials = job.homeowner
    ? `${job.homeowner.first_name[0]}${job.homeowner.last_name[0]}`.toUpperCase()
    : '??';

  const formattedDate = new Date(job.updated_at).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  // Map job status to StatusBadge variant
  const statusMap: Record<Job['status'], 'posted' | 'on_going' | 'completed' | 'delayed' | 'at_risk'> = {
    posted: 'posted',
    assigned: 'on_going',
    in_progress: 'on_going',
    completed: 'completed',
    cancelled: 'at_risk',
  };

  return (
    <tr className="hover:bg-gray-50 transition-colors duration-150">
      <td className="py-4 px-6">
        <Link
          href={`/contractor/jobs/${job.id}`}
          className="flex items-center gap-3 group"
        >
          {/* Avatar */}
          {job.homeowner?.profile_image_url ? (
            <img
              src={job.homeowner.profile_image_url}
              alt={homeownerName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center text-xs font-semibold text-blue-700">
              {homeownerInitials}
            </div>
          )}
          <div>
            <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
              {job.title}
            </div>
            <div className="text-xs text-gray-500">{homeownerName}</div>
          </div>
        </Link>
      </td>
      <td className="py-4 px-6">
        <StatusBadge status={statusMap[job.status] || 'posted'} />
      </td>
      <td className="py-4 px-6">
        <div className="text-sm text-gray-900">{formattedDate}</div>
        {job.budget && (
          <div className="text-xs text-gray-500">{formatMoney(job.budget)}</div>
        )}
      </td>
      <td className="py-4 px-6 text-right">
        <Link href={`/contractor/jobs/${job.id}`}>
          <Button variant="ghost" size="sm">
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
        </Link>
      </td>
    </tr>
  );
}

