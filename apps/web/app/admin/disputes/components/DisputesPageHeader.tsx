import React from 'react';
import { theme } from '@/lib/theme';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { AdminCard } from '@/components/admin/AdminCard';
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
      <AdminPageHeader
        title='Disputes Resolution'
        subtitle='Review and resolve payment disputes between homeowners and contractors'
        quickStats={[
          { label: 'open', value: stats.open, icon: 'alert', color: '#F59E0B' },
          {
            label: 'in review',
            value: stats.reviewing,
            icon: 'search',
            color: '#3B82F6',
          },
          {
            label: 'resolved',
            value: stats.resolved,
            icon: 'checkCircle',
            color: '#10B981',
          },
          {
            label: 'at risk',
            value: formatCurrency(stats.totalAmountAtRisk),
            icon: 'currencyPound',
            color: '#EF4444',
          },
        ]}
      />

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[6],
        }}
      >
        <AdminMetricCard
          label='Open Disputes'
          value={stats.open}
          icon='alert'
          iconColor='#F59E0B'
        />
        <AdminMetricCard
          label='In Review'
          value={stats.reviewing}
          icon='search'
          iconColor='#3B82F6'
        />
        <AdminMetricCard
          label='Resolved'
          value={stats.resolved}
          icon='checkCircle'
          iconColor='#10B981'
        />
        <AdminMetricCard
          label='Amount at Risk'
          value={formatCurrency(stats.totalAmountAtRisk)}
          icon='currencyPound'
          iconColor='#EF4444'
        />
      </div>

      {/* Filter Tabs */}
      <AdminCard padding='sm' className='mb-6'>
        <div style={{ display: 'flex', gap: theme.spacing[1] }}>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onStatusFilterChange(tab.value)}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor:
                  statusFilter === tab.value ? '#0F172A' : 'transparent',
                color: statusFilter === tab.value ? '#FFFFFF' : '#64748B',
                fontSize: theme.typography.fontSize.sm,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              aria-pressed={statusFilter === tab.value}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </AdminCard>
    </>
  );
}
