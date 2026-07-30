'use client';

import { MotionDiv } from '@/components/ui/MotionDiv';
import { staggerItem } from '@/lib/animations/variants';
import type { JobStats } from '../types';

interface Props {
  loadingStats: boolean;
  stats: JobStats;
}

/**
 * Hero header + 4-stat KPI grid for /contractor/jobs. Extracted
 * from `page.tsx` on 2026-05-09 (AUDIT_PUNCH_LIST P2 #42).
 */
export function JobsHero({ loadingStats, stats }: Props) {
  const kpis = [
    { label: 'Active Jobs', value: loadingStats ? '...' : stats.active },
    { label: 'Pending Bids', value: loadingStats ? '...' : stats.pending },
    { label: 'Completed', value: loadingStats ? '...' : stats.completed },
    {
      label: 'Total Value',
      value: loadingStats ? '...' : `£${stats.totalValue.toFixed(0)}`,
    },
  ];

  return (
    <MotionDiv
      className='bg-white border border-gray-200 rounded-xl p-8 mb-6'
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className='flex items-center gap-4 mb-6'>
        <div className='w-16 h-16 bg-teal-50 rounded-2xl flex items-center justify-center'>
          <svg
            className='w-9 h-9 text-teal-600'
            fill='none'
            viewBox='0 0 24 24'
            stroke='currentColor'
          >
            <path
              strokeLinecap='round'
              strokeLinejoin='round'
              strokeWidth={2}
              d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01'
            />
          </svg>
        </div>
        <div className='flex-1'>
          <h1 className='text-3xl font-bold text-gray-900 mb-1'>My Jobs</h1>
          <p className='text-gray-600 text-base'>
            Manage your active projects and bids
          </p>
        </div>
      </div>

      <div className='grid grid-cols-4 gap-4'>
        {kpis.map((stat) => (
          <MotionDiv
            key={stat.label}
            className='bg-gray-50 rounded-xl p-4 border border-gray-200'
            variants={staggerItem}
          >
            <div className='text-sm text-gray-600 mb-1'>{stat.label}</div>
            <div className='text-2xl font-bold text-gray-900'>{stat.value}</div>
          </MotionDiv>
        ))}
      </div>
    </MotionDiv>
  );
}
