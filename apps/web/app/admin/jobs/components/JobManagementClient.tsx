'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { AdminCard } from '@/components/admin/AdminCard';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { logger } from '@mintenance/shared';
import { JobManagementTable } from './JobManagementTable';
import type { Job, JobStats, JobsResponse } from './JobManagementTypes';
import { STATUS_TABS, PAGE_SIZE } from './JobManagementTypes';

const AUTO_REFRESH_INTERVAL = 30_000;

export function JobManagementClient() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [stats, setStats] = useState<JobStats>({
    total: 0,
    posted: 0,
    assigned: 0,
    inProgress: 0,
    completed: 0,
    cancelled: 0,
    active: 0,
  });
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortColumn, setSortColumn] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const refreshTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page when filter changes
  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

  // Fetch jobs from API
  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: PAGE_SIZE.toString(),
        sort: sortColumn,
        order: sortOrder,
      });
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (debouncedSearch.trim())
        params.append('search', debouncedSearch.trim());

      const response = await fetch(`/api/admin/jobs?${params.toString()}`, {
        credentials: 'include',
      });
      if (!response.ok) throw new Error('Failed to fetch jobs');
      const result: JobsResponse = await response.json();
      setJobs(result.data);
      setTotal(result.total);
      setStats(result.stats);
    } catch (error) {
      logger.error('Error fetching admin jobs:', error);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, debouncedSearch, sortColumn, sortOrder]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    refreshTimerRef.current = setInterval(fetchJobs, AUTO_REFRESH_INTERVAL);
    return () => {
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current);
    };
  }, [fetchJobs]);

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortOrder('desc');
    }
  };

  return (
    <div className='p-8 md:p-10 max-w-[1440px] mx-auto bg-slate-50 min-h-screen flex flex-col gap-6'>
      <AdminPageHeader
        title='Job Management'
        subtitle='Monitor all platform jobs, track progress, and intervene when needed'
        quickStats={[
          {
            label: 'total',
            value: stats.total,
            icon: 'briefcase',
            color: theme.colors.primary,
          },
          {
            label: 'active',
            value: stats.active,
            icon: 'activity',
            color: '#0D9488',
          },
          {
            label: 'posted',
            value: stats.posted,
            icon: 'clock',
            color: '#1D4ED8',
          },
          {
            label: 'completed',
            value: stats.completed,
            icon: 'check',
            color: '#15803D',
          },
        ]}
      />

      {/* Stats Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <StatCard
          label='Total Jobs'
          value={stats.total}
          icon='briefcase'
          color={theme.colors.primary}
        />
        <StatCard
          label='Active'
          value={stats.active}
          icon='activity'
          color='#0D9488'
        />
        <StatCard
          label='Posted'
          value={stats.posted}
          icon='clock'
          color='#1D4ED8'
        />
        <StatCard
          label='Assigned'
          value={stats.assigned}
          icon='userCheck'
          color='#B45309'
        />
        <StatCard
          label='Completed'
          value={stats.completed}
          icon='check'
          color='#15803D'
        />
        <StatCard
          label='Cancelled'
          value={stats.cancelled}
          icon='x'
          color='#B91C1C'
        />
      </div>

      {/* Filters */}
      <AdminCard padding='lg'>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            gap: theme.spacing[4],
          }}
        >
          <StatusTabs
            current={statusFilter}
            stats={stats}
            onChange={setStatusFilter}
          />
          <SearchInput value={searchInput} onChange={setSearchInput} />
          <button
            onClick={fetchJobs}
            disabled={loading}
            aria-label='Refresh jobs'
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
              border: `1px solid ${theme.colors.border}`,
              borderRadius: theme.borderRadius.lg,
              backgroundColor: '#FFFFFF',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2],
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.2s',
            }}
          >
            <Icon name='refresh' size={16} color={theme.colors.textSecondary} />
            Refresh
          </button>
        </div>
      </AdminCard>

      {/* Table */}
      <AdminCard padding='none' className='overflow-hidden'>
        <JobManagementTable
          jobs={jobs}
          total={total}
          page={page}
          loading={loading}
          search={debouncedSearch}
          sortColumn={sortColumn}
          sortOrder={sortOrder}
          onSort={handleSort}
          onPageChange={setPage}
        />
      </AdminCard>

      <style>{`
        .admin-jobs-spinner {
          width: 40px; height: 40px; border: 3px solid #E2E8F0;
          border-top-color: ${theme.colors.primary}; border-radius: 50%;
          animation: admin-jobs-spin 0.8s linear infinite;
        }
        @keyframes admin-jobs-spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Extracted sub-components (kept here as they are small) ─────────

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: string;
  color: string;
}) {
  return (
    <AdminCard hover>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[3] }}
      >
        <div
          style={{
            width: '44px',
            height: '44px',
            borderRadius: theme.borderRadius.xl,
            backgroundColor: `${color}14`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={22} color={color} />
        </div>
        <div>
          <p
            style={{
              fontSize: '24px',
              fontWeight: 700,
              color: theme.colors.textPrimary,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {value.toLocaleString()}
          </p>
          <p
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              margin: 0,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontWeight: 500,
            }}
          >
            {label}
          </p>
        </div>
      </div>
    </AdminCard>
  );
}

function StatusTabs({
  current,
  stats,
  onChange,
}: {
  current: string;
  stats: JobStats;
  onChange: (s: string) => void;
}) {
  const countMap: Record<string, number> = {
    posted: stats.posted,
    assigned: stats.assigned,
    in_progress: stats.inProgress,
    completed: stats.completed,
    cancelled: stats.cancelled,
  };
  return (
    <div
      style={{
        display: 'flex',
        gap: '2px',
        backgroundColor: '#F1F5F9',
        borderRadius: theme.borderRadius.lg,
        padding: '3px',
      }}
    >
      {STATUS_TABS.map((tab) => {
        const isActive = current === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.md,
              border: 'none',
              fontSize: theme.typography.fontSize.sm,
              fontWeight: isActive ? 600 : 400,
              backgroundColor: isActive ? '#FFFFFF' : 'transparent',
              color: isActive
                ? theme.colors.primary
                : theme.colors.textSecondary,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {tab.key !== 'all' && (
              <span
                style={{
                  marginLeft: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: isActive ? theme.colors.primary : '#94A3B8',
                }}
              >
                {countMap[tab.key] ?? 0}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div style={{ flex: 1, minWidth: '240px', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          left: '12px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
        }}
      >
        <Icon name='search' size={16} color='#94A3B8' />
      </div>
      <input
        type='text'
        placeholder='Search by job title...'
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          onChange(e.target.value)
        }
        style={{
          width: '100%',
          padding: `${theme.spacing[2]} ${theme.spacing[4]} ${theme.spacing[2]} 40px`,
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.lg,
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textPrimary,
          backgroundColor: '#FFFFFF',
          outline: 'none',
          transition: 'border-color 0.2s',
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = theme.colors.primary;
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = theme.colors.border;
        }}
      />
    </div>
  );
}
