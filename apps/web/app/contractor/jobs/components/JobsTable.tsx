'use client';

import React from 'react';
import { StandardCard } from '@/components/ui/StandardCard';
import { JobTableRow } from './JobTableRow';
import { JobsTableFilters } from './JobsTableFilters';
import { Button } from '@/components/ui/Button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

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

interface JobsTableProps {
  jobs: Job[];
  currentPage: number;
  totalPages: number;
  currentStatus: string;
  currentSearch: string;
}

export function JobsTable({
  jobs,
  currentPage,
  totalPages,
  currentStatus,
  currentSearch,
}: JobsTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/contractor/jobs?${params.toString()}`);
  };

  if (jobs.length === 0) {
    return (
      <StandardCard>
        <div className="p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <p className="text-base font-semibold text-gray-900 mb-2">No jobs yet</p>
          <p className="text-sm text-gray-500 mb-4">Your jobs will appear here</p>
          <Link href="/contractor/jobs-near-you">
            <Button>Browse Available Jobs</Button>
          </Link>
        </div>
      </StandardCard>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <JobsTableFilters currentStatus={currentStatus} currentSearch={currentSearch} />

      {/* Table */}
      <StandardCard padding="none">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Name
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-left py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Date
                </th>
                <th className="text-right py-4 px-6 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {jobs.map((job) => (
                <JobTableRow key={job.id} job={job} />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage >= totalPages}
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </StandardCard>
    </div>
  );
}

