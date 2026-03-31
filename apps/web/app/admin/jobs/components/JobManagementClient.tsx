'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Icon } from '@/components/ui/Icon';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter]);

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

  useEffect(() => {
    refreshTimerRef.current = setInterval(() => {
      if (!document.hidden) fetchJobs();
    }, AUTO_REFRESH_INTERVAL);
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

  const countMap: Record<string, number> = {
    posted: stats.posted,
    assigned: stats.assigned,
    in_progress: stats.inProgress,
    completed: stats.completed,
    cancelled: stats.cancelled,
  };

  return (
    <div className='min-h-screen bg-[#f7f9fb] px-6 md:px-10 py-8 max-w-[1440px] mx-auto space-y-8'>
      {/* Page Header */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <h2 className='text-[2.75rem] font-extrabold tracking-tight text-[#2a3439] leading-tight'>
            Job Management
          </h2>
          <p className='text-[#566166] text-lg mt-2'>
            Monitor all platform jobs, track progress, and intervene when
            needed.
          </p>
        </div>
        <button
          onClick={fetchJobs}
          disabled={loading}
          className='px-5 py-2.5 bg-[#e1e9ee] text-[#2a3439] rounded-xl font-medium text-sm hover:bg-[#d9e4ea] transition-all flex items-center gap-2 disabled:opacity-50'
        >
          <Icon
            name='refresh'
            size={16}
            color='#565e74'
            className={loading ? 'animate-spin' : ''}
          />
          Refresh
        </button>
      </div>

      {/* Metrics Grid */}
      <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4'>
        <AdminMetricCard
          label='Total Jobs'
          value={stats.total.toLocaleString()}
          icon='briefcase'
          iconColor='#565e74'
        />
        <AdminMetricCard
          label='Active'
          value={stats.active.toLocaleString()}
          icon='activity'
          iconColor='#565e74'
        />
        <AdminMetricCard
          label='Posted'
          value={stats.posted.toLocaleString()}
          icon='clock'
          iconColor='#506076'
        />
        <AdminMetricCard
          label='Assigned'
          value={stats.assigned.toLocaleString()}
          icon='userCheck'
          iconColor='#605c78'
        />
        <AdminMetricCard
          label='Completed'
          value={stats.completed.toLocaleString()}
          icon='checkCircle'
          iconColor='#506076'
        />
        <AdminMetricCard
          label='Cancelled'
          value={stats.cancelled.toLocaleString()}
          icon='x'
          iconColor='#9f403d'
        />
      </div>

      {/* Filter Bar */}
      <div className='bg-white rounded-[1.5rem] p-4 flex flex-wrap items-center gap-4'>
        {/* Status Tabs */}
        <div className='flex gap-1 bg-[#f0f4f7] rounded-xl p-1'>
          {STATUS_TABS.map((tab) => {
            const isActive = statusFilter === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-[#565e74] font-semibold shadow-sm'
                    : 'text-[#566166] hover:text-[#2a3439]'
                }`}
              >
                {tab.label}
                {tab.key !== 'all' && (
                  <span
                    className={`ml-1.5 text-xs ${isActive ? 'text-[#565e74]' : 'text-[#a9b4b9]'}`}
                  >
                    {countMap[tab.key] ?? 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className='flex-1 min-w-[240px] relative'>
          <Icon
            name='search'
            size={16}
            color='#a9b4b9'
            className='absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none'
          />
          <input
            type='text'
            placeholder='Search by job title...'
            aria-label='Search jobs by title'
            value={searchInput}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setSearchInput(e.target.value)
            }
            className='w-full pl-10 pr-4 py-2 bg-[#e1e9ee] border-none rounded-xl text-sm text-[#2a3439] placeholder:text-[#a9b4b9] focus:ring-2 focus:ring-[#565e74]/20 transition-all'
          />
        </div>
      </div>

      {/* Table */}
      <div className='bg-white rounded-[1.5rem] overflow-hidden shadow-[0_12px_32px_-4px_rgba(42,52,57,0.04)] border border-[#a9b4b9]/10'>
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
      </div>
    </div>
  );
}
