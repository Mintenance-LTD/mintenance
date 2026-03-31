import React from 'react';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { formatCurrency, type Stats, type StatusFilter } from './DisputesTable';

const FILTER_TABS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All Disputes' },
  { value: 'open', label: 'Open' },
  { value: 'reviewing', label: 'In Review' },
  { value: 'resolved', label: 'Resolved' },
];

interface DisputesPageHeaderProps {
  stats: Stats;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
}

export function DisputesPageHeader({
  stats,
  statusFilter,
  onStatusFilterChange,
}: DisputesPageHeaderProps) {
  return (
    <>
      {/* Page Header — matches mockup typography */}
      <div className='mb-10 flex flex-col md:flex-row md:justify-between md:items-end gap-4'>
        <div>
          <h2 className='text-[2.75rem] font-bold tracking-tight text-[#2a3439] leading-tight mb-2'>
            Disputes Resolution
          </h2>
          <p className='text-[#566166] max-w-lg'>
            Manage and resolve conflicts between contractors and clients. Review
            evidence and issue final determinations.
          </p>
        </div>
        <div className='flex gap-3'>
          <button className='px-5 py-2.5 rounded-xl border border-[#a9b4b9]/30 text-[#565e74] font-semibold text-sm hover:bg-[#f0f4f7] transition-colors'>
            Export Report
          </button>
        </div>
      </div>

      {/* Metrics Grid — 4 columns matching mockup */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10'>
        <AdminMetricCard
          label='Open Disputes'
          value={stats.open}
          icon='alert'
          iconColor='#565e74'
        />
        <AdminMetricCard
          label='In Review'
          value={stats.reviewing}
          icon='search'
          iconColor='#605c78'
        />
        <AdminMetricCard
          label='Resolved'
          value={stats.resolved}
          icon='checkCircle'
          iconColor='#506076'
        />
        <AdminMetricCard
          label='Amount at Risk'
          value={formatCurrency(stats.totalAmountAtRisk)}
          icon='currencyPound'
          iconColor='#9f403d'
          className='border-r-4 border-[#fe8983]'
        />
      </div>

      {/* Filter Tabs — pill style */}
      <div className='bg-white rounded-[1.5rem] p-2 mb-6 inline-flex gap-1'>
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => onStatusFilterChange(tab.value)}
            className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${
              statusFilter === tab.value
                ? 'bg-[#565e74] text-white shadow-sm'
                : 'text-[#566166] hover:bg-[#f0f4f7]'
            }`}
            aria-pressed={statusFilter === tab.value}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </>
  );
}
