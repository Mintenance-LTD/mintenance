'use client';

import { motion } from 'framer-motion';
import { Search, Filter, Download } from 'lucide-react';
import type { FilterTab } from './useQuotesData';

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
};

interface QuotesFilterBarProps {
  filterTabs: { value: FilterTab; label: string; count: number }[];
  activeFilter: FilterTab;
  onFilterChange: (filter: FilterTab) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function QuotesFilterBar({
  filterTabs,
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
}: QuotesFilterBarProps) {
  return (
    <motion.div
      initial='hidden'
      animate='visible'
      variants={fadeInUp}
      className='bg-white rounded-2xl border border-slate-200 shadow-sm'
    >
      <div className='border-b border-slate-200'>
        <div className='flex flex-wrap gap-2 p-6 overflow-x-auto'>
          {filterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onFilterChange(tab.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm whitespace-nowrap transition-all duration-200 ${
                activeFilter === tab.value
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'bg-gray-50 text-slate-700 hover:bg-gray-100'
              }`}
            >
              {tab.label}
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  activeFilter === tab.value
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className='p-6 flex flex-col sm:flex-row gap-3'>
        <div className='flex-1 relative'>
          <Search className='absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400' />
          <input
            type='search'
            placeholder='Search quotes by title, customer, or email...'
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className='w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all'
          />
        </div>
        <div className='flex gap-2'>
          <button className='flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium'>
            <Filter className='w-4 h-4' />
            Filter
          </button>
          <button className='flex items-center gap-2 px-4 py-2.5 bg-gray-50 border border-slate-200 text-slate-700 rounded-xl hover:bg-gray-100 transition-all text-sm font-medium'>
            <Download className='w-4 h-4' />
            Export
          </button>
        </div>
      </div>
    </motion.div>
  );
}
