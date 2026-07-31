'use client';

import Link from 'next/link';
import { Briefcase, Search, ArrowRight } from 'lucide-react';
import { formatMoney } from '@/lib/utils/currency';

interface Job {
  id: string;
  title: string;
  status: string;
  budget: number;
  progress: number;
  category?: string;
  priority?: string;
  homeowner: string;
  dueDate?: string;
}

interface ProfessionalJobsTableProps {
  recentJobs: Job[];
}

const STATUS_STYLES: Record<string, string> = {
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  assigned: 'bg-purple-50 text-purple-700 border-purple-200',
  posted: 'bg-gray-50 text-gray-700 border-gray-200',
};

function getStatusStyle(status: string) {
  return STATUS_STYLES[status] ?? STATUS_STYLES.posted;
}

function formatStatus(status: string) {
  return status
    .replace('_', ' ')
    .split(' ')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function ProfessionalJobsTable({
  recentJobs,
}: ProfessionalJobsTableProps) {
  return (
    <section className='bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden'>
      <div className='p-6 border-b border-slate-200'>
        <div className='flex items-center justify-between'>
          <div>
            <h2 className='text-xl font-bold text-slate-900 mb-1'>
              Active Jobs
            </h2>
            <p className='text-sm text-slate-600'>
              Manage your ongoing projects
            </p>
          </div>
          <Link
            href='/contractor/jobs'
            className='flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors'
          >
            View All
            <ArrowRight className='w-4 h-4' />
          </Link>
        </div>
      </div>

      {recentJobs.length === 0 ? (
        <div className='p-12 text-center'>
          <div className='w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4'>
            <Briefcase className='w-8 h-8 text-slate-400' />
          </div>
          <h3 className='text-lg font-semibold text-slate-900 mb-2'>
            No active jobs
          </h3>
          <p className='text-slate-600 mb-6 text-sm'>
            Start bidding to see your jobs here
          </p>
          <Link
            href='/contractor/jobs-near-you'
            className='inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors'
          >
            Browse Jobs
            <Search className='w-4 h-4' />
          </Link>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='w-full'>
            <thead className='bg-slate-50 border-b border-slate-200'>
              <tr>
                <th className='text-left py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider'>
                  Job
                </th>
                <th className='text-left py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider'>
                  Status
                </th>
                <th className='text-right py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider'>
                  Budget
                </th>
                <th className='text-right py-3 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider w-20' />
              </tr>
            </thead>
            <tbody className='divide-y divide-slate-100'>
              {recentJobs.map((job) => (
                <tr
                  key={job.id}
                  className='hover:bg-slate-50 transition-colors cursor-pointer'
                  onClick={() => {
                    window.location.href = `/contractor/jobs/${job.id}`;
                  }}
                >
                  <td className='py-4 px-6'>
                    <div className='font-semibold text-slate-900 text-sm'>
                      {job.title}
                    </div>
                    <div className='text-xs text-slate-400 mt-0.5'>
                      {[job.homeowner, job.category]
                        .filter(Boolean)
                        .join(' · ')}
                    </div>
                  </td>
                  <td className='py-4 px-6'>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border ${getStatusStyle(job.status)}`}
                    >
                      {formatStatus(job.status)}
                    </span>
                  </td>
                  <td className='py-4 px-6 text-right'>
                    <div className='text-sm font-semibold text-slate-900'>
                      {formatMoney(job.budget, 'GBP')}
                    </div>
                  </td>
                  <td className='py-4 px-6 text-right'>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/contractor/jobs/${job.id}`;
                      }}
                      className='inline-flex items-center gap-1 text-xs font-semibold text-teal-600 hover:text-teal-700 transition-colors'
                    >
                      View
                      <ArrowRight className='w-3.5 h-3.5' />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
