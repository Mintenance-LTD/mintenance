'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import type { Stats, StatusFilter } from './types';

interface VerificationFiltersProps {
  stats: Stats;
  filterStatus: StatusFilter;
  search: string;
  successMessage: string | null;
  onFilterChange: (status: StatusFilter) => void;
  onSearchChange: (value: string) => void;
}

const FILTER_TABS: Array<{
  key: StatusFilter;
  label: string;
  countKey: keyof Stats;
}> = [
  { key: 'pending', label: 'Pending', countKey: 'pending' },
  { key: 'verified', label: 'Verified', countKey: 'verified' },
  { key: 'rejected', label: 'Rejected', countKey: 'rejected' },
  { key: 'all', label: 'All', countKey: 'total' },
];

function getFilterColor(key: StatusFilter, isActive: boolean): string {
  if (!isActive) return theme.colors.backgroundSecondary;
  switch (key) {
    case 'pending':
      return '#F59E0B';
    case 'verified':
      return theme.colors.success;
    case 'rejected':
      return theme.colors.error;
    default:
      return theme.colors.primary;
  }
}

export function VerificationPageHeader({ stats }: { stats: Stats }) {
  return (
    <>
      {/* Page Header */}
      <div className='mb-10'>
        <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
          Contractor Verifications
        </h2>
        <p className='text-[#566166] text-lg mt-2'>
          Review and approve contractor applications and documentation.
        </p>
      </div>

      {/* Metrics Grid */}
      <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8'>
        <AdminMetricCard
          label='Total Contractors'
          value={stats.total}
          icon='users'
          iconColor='#565e74'
        />
        <AdminMetricCard
          label='Pending Review'
          value={stats.pending}
          icon='clock'
          iconColor='#605c78'
        />
        <AdminMetricCard
          label='Verified'
          value={stats.verified}
          icon='checkCircle'
          iconColor='#506076'
        />
        <AdminMetricCard
          label='Rejected'
          value={stats.rejected}
          icon='xCircle'
          iconColor='#9f403d'
        />
      </div>
    </>
  );
}

export function VerificationSearchAndFilters({
  stats,
  filterStatus,
  search,
  successMessage,
  onFilterChange,
  onSearchChange,
}: VerificationFiltersProps) {
  return (
    <>
      {/* Success Toast */}
      {successMessage && (
        <div
          style={{
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            backgroundColor: '#D1FAE5',
            border: `1px solid ${theme.colors.success}`,
            borderRadius: theme.borderRadius.md,
            color: '#065F46',
            fontSize: theme.typography.fontSize.sm,
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon name='checkCircle' size={18} color={theme.colors.success} />
          {successMessage}
        </div>
      )}

      {/* Search + Filters */}
      <AdminCard padding='lg'>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
          }}
        >
          {/* Search Input */}
          <div style={{ position: 'relative', maxWidth: '400px' }}>
            <div
              style={{
                position: 'absolute',
                left: theme.spacing[3],
                top: '50%',
                transform: 'translateY(-50%)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Icon
                name='search'
                size={18}
                color={theme.colors.textSecondary}
              />
            </div>
            <input
              type='text'
              placeholder='Search by name, email, or company...'
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              aria-label='Search contractors'
              style={{
                width: '100%',
                padding: `${theme.spacing[2]} ${theme.spacing[3]} ${theme.spacing[2]} ${theme.spacing[10]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.surface,
                outline: 'none',
              }}
            />
          </div>

          {/* Filter Tabs */}
          <div
            style={{
              display: 'flex',
              gap: theme.spacing[2],
              flexWrap: 'wrap',
            }}
          >
            {FILTER_TABS.map((tab) => {
              const isActive = filterStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => onFilterChange(tab.key)}
                  aria-pressed={isActive}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    borderRadius: theme.borderRadius.full,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    backgroundColor: getFilterColor(tab.key, isActive),
                    color: isActive
                      ? theme.colors.white
                      : theme.colors.textPrimary,
                    display: 'flex',
                    alignItems: 'center',
                    gap: theme.spacing[2],
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive)
                      e.currentTarget.style.backgroundColor =
                        theme.colors.backgroundTertiary;
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive)
                      e.currentTarget.style.backgroundColor =
                        theme.colors.backgroundSecondary;
                  }}
                >
                  {tab.label}
                  <span
                    style={{
                      backgroundColor: isActive
                        ? 'rgba(255,255,255,0.3)'
                        : theme.colors.border,
                      borderRadius: theme.borderRadius.full,
                      padding: `0 ${theme.spacing[2]}`,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      lineHeight: '20px',
                    }}
                  >
                    {stats[tab.countKey]}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </AdminCard>
    </>
  );
}
