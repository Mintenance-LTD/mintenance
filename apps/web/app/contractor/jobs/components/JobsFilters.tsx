'use client';

import { Zap, Eye, Star, CheckCircle, Clock } from 'lucide-react';
import { MotionDiv } from '@/components/ui/MotionDiv';
import { fadeIn } from '@/lib/animations/variants';
import type { JobsFilter } from '../types';

const FILTER_TABS: Array<{
  label: string;
  value: JobsFilter;
  icon: React.ReactNode;
}> = [
  { label: 'In Progress', value: 'active', icon: <Zap size={16} /> },
  { label: 'Bids Pending', value: 'bid', icon: <Clock size={16} /> },
  {
    label: 'Completed',
    value: 'completed',
    icon: <CheckCircle size={16} />,
  },
  { label: 'Saved', value: 'saved', icon: <Star size={16} /> },
  { label: 'Viewed', value: 'viewed', icon: <Eye size={16} /> },
];

const CATEGORIES = [
  'All',
  'Plumbing',
  'Electrical',
  'Carpentry',
  'Painting',
  'Roofing',
  'HVAC',
  'Flooring',
  'Gardening',
];

interface Props {
  filter: JobsFilter;
  setFilter: (f: JobsFilter) => void;
  categoryFilter: string;
  setCategoryFilter: (c: string) => void;
}

/**
 * Filter tabs (status) + category dropdown. Extracted from
 * `contractor/jobs/page.tsx` on 2026-05-09 (AUDIT_PUNCH_LIST P2 #42).
 */
export function JobsFilters({
  filter,
  setFilter,
  categoryFilter,
  setCategoryFilter,
}: Props) {
  return (
    <MotionDiv
      className='bg-white rounded-2xl border border-gray-200 shadow-sm p-6'
      variants={fadeIn}
      initial='initial'
      animate='animate'
    >
      <div className='flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4'>
        <div className='flex items-center gap-2 overflow-x-auto'>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-6 py-2.5 rounded-xl font-medium text-sm whitespace-nowrap transition-all flex items-center gap-2 ${
                filter === tab.value
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className='px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500'
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat.toLowerCase()}>
              {cat}
            </option>
          ))}
        </select>
      </div>
    </MotionDiv>
  );
}
