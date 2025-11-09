'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useRouter } from 'next/navigation';
import { AnimatedCounter } from '@/components/ui/AnimatedCounter';
import { MetricCard, StatusBadge } from '@/components/ui/figma';
import { getGradientCardStyle, getIconContainerStyle } from '@/lib/theme-enhancements';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  total_jobs: number;
  active_jobs: number;
  completed_jobs: number;
  total_spent: number;
  last_contact: string;
  first_job_date: string;
  address?: string;
  status: 'active' | 'inactive';
}

interface AnalyticsSummary {
  total_clients: number;
  new_clients_this_month: number;
  month_over_month_change?: number;
  repeat_clients: number;
  client_lifetime_value: number;
}

interface CRMDashboardEnhancedProps {
  clients: Client[];
  analytics: AnalyticsSummary;
}

const FILTERS = [
  { key: 'all', label: 'All Clients' },
  { key: 'active', label: 'Active' },
  { key: 'new', label: 'New This Month' },
  { key: 'repeat', label: 'Repeat Clients' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

// Consistent date formatting function that works on both server and client
// This prevents hydration mismatches by using a fixed format
const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return 'Invalid date';
    }
    // Use a consistent format: MM/DD/YYYY
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  } catch {
    return 'Invalid date';
  }
};

export function CRMDashboardEnhanced({ clients, analytics }: CRMDashboardEnhancedProps) {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search filter
      const search = searchQuery.toLowerCase();
      if (
        search &&
        !client.name.toLowerCase().includes(search) &&
        !client.email.toLowerCase().includes(search) &&
        !(client.phone && client.phone.toLowerCase().includes(search))
      ) {
        return false;
      }

      // Status filter
      if (selectedFilter === 'active') {
        return client.active_jobs > 0;
      }
      if (selectedFilter === 'new') {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        return new Date(client.first_job_date) >= monthAgo;
      }
      if (selectedFilter === 'repeat') {
        return client.total_jobs > 1;
      }

      return true;
    });
  }, [clients, searchQuery, selectedFilter]);

  return (
    <div 
      suppressHydrationWarning
      style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing[6],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[6],
        width: '100%',
        boxSizing: 'border-box',
      }}>
      {/* Header - Modern Design */}
      <div className="flex justify-between items-start gap-4 flex-wrap">
        <div>
          <h1 className="text-heading-md font-[640] text-gray-900 mb-3 tracking-tighter">
            Client Relationship Management
          </h1>
          <div className="flex items-center gap-4 flex-wrap">
            <p className="text-base font-[560] text-gray-700 m-0">
              {filteredClients.length} clients
            </p>
            <span className="text-gray-300">•</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <p className="text-base font-[560] text-gray-700 m-0">
                {clients.filter(c => c.active_jobs > 0).length} active
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="primary"
          onClick={() => {/* Add client action */}}
          className="px-6 py-3 rounded-xl"
        >
          <Icon name="plus" size={18} color="white" />
          Add Client
        </Button>
      </div>

            {/* KPI Cards - Modern Grid */}
            <div className="grid grid-cols-12 gap-6">
              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <MetricCard
                  label="Total Clients"
                  value={<AnimatedCounter value={analytics.total_clients} />}
                  icon="users"
                  iconColor={theme.colors.primary}
                  gradient={false}
                  gradientVariant="primary"
                />
              </div>

              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <MetricCard
                  label="New This Month"
                  value={<AnimatedCounter value={analytics.new_clients_this_month} />}
                  icon="plus"
                  iconColor={theme.colors.success}
                  trend={analytics.month_over_month_change !== undefined ? {
                    direction: analytics.month_over_month_change >= 0 ? 'up' : 'down',
                    value: `${Math.abs(analytics.month_over_month_change)}%`,
                    label: 'vs last month',
                  } : undefined}
                  gradient={false}
                  gradientVariant="success"
                />
              </div>

              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <MetricCard
                  label="Repeat Clients"
                  value={<AnimatedCounter value={analytics.repeat_clients} />}
                  subtitle={analytics.total_clients > 0 
                    ? `${Math.round((analytics.repeat_clients / analytics.total_clients) * 100)}% return rate`
                    : '0% return rate'}
                  icon="briefcase"
                  iconColor={theme.colors.warning}
                  gradient={false}
                  gradientVariant="warning"
                />
              </div>

              <div className="col-span-12 sm:col-span-6 xl:col-span-3">
                <MetricCard
                  label="Avg Lifetime Value"
                  value={<AnimatedCounter 
                    value={analytics.client_lifetime_value} 
                    formatType="currency" 
                    currency="GBP" 
                    prefix="£" 
                    decimals={0}
                  />}
                  icon="currencyPound"
                  iconColor={theme.colors.info}
                  gradient={false}
                  gradientVariant="primary"
                />
              </div>
            </div>

      {/* Search and Filters */}
      <div 
        suppressHydrationWarning
        style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: theme.spacing[4],
          width: '100%',
          maxWidth: '100%',
          overflowX: 'visible',
          boxSizing: 'border-box',
        }}>
        {/* Search */}
        <div style={{
          display: 'flex',
          gap: theme.spacing[3],
          alignItems: 'center',
          flexWrap: 'wrap',
        }}>
          <div style={{
            flex: 1,
            minWidth: '280px',
            position: 'relative',
          }}>
            <div style={{
              position: 'absolute',
              left: theme.spacing[3],
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }}>
              <Icon name="search" size={18} color={theme.colors.textTertiary} />
            </div>
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 px-3 pl-10 border border-gray-200 rounded-lg text-sm font-[460] text-gray-900 bg-white outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-500 focus:ring-offset-0 transition-all duration-200"
            />
          </div>

          {/* View Toggle */}
          <div 
            suppressHydrationWarning
            style={{
              display: 'flex',
              gap: theme.spacing[1],
              padding: theme.spacing[1],
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.lg,
            }}>
            <Button
              variant={viewMode === 'cards' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('cards')}
            >
              Cards
            </Button>
            <Button
              variant={viewMode === 'table' ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
            >
              Table
            </Button>
          </div>
        </div>

        {/* Filter Pills */}
        <div 
          suppressHydrationWarning
          style={{
            display: 'flex',
            gap: theme.spacing[2],
            flexWrap: 'wrap',
            width: '100%',
            maxWidth: '100%',
            overflowX: 'visible',
            boxSizing: 'border-box',
          }}>
          {FILTERS.map((filter) => (
            <Button
              key={filter.key}
              variant={selectedFilter === filter.key ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setSelectedFilter(filter.key)}
              className="rounded-full capitalize"
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

            {/* Client Cards - Modern Grid */}
            {viewMode === 'cards' && (
              <div className="grid grid-cols-12 gap-6">
                {filteredClients.map((client) => (
                  <div
                    key={client.id}
                    onClick={() => router.push(`/contractor/crm/${client.id}`)}
                    className="col-span-12 md:col-span-6 xl:col-span-4 group bg-white border border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-gray-300 relative overflow-hidden"
                  >
              {/* Subtle top accent */}
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 via-secondary-500 to-primary-500 opacity-0 lg:opacity-100 group-hover:opacity-100 transition-opacity z-10"></div>
              
              {/* Header */}
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: theme.spacing[3],
                marginBottom: theme.spacing[4],
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: theme.colors.primary + '15',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: `2px solid ${theme.colors.primary}30`,
                }}>
                  <span style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.primary,
                  }}>
                    {client.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-[560] text-gray-900 mb-0.5 overflow-hidden text-ellipsis whitespace-nowrap">
                    {client.name}
                  </h3>
                  <p className="text-xs font-[460] text-gray-600 m-0 overflow-hidden text-ellipsis whitespace-nowrap">
                    {client.email}
                  </p>
                </div>
                {client.status === 'active' && (
                  <span className="px-2.5 py-1 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-[560]">
                    Active
                  </span>
                )}
              </div>

              {/* Stats Grid - Modern Layout */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: theme.spacing[3],
                marginBottom: theme.spacing[4],
              }}>
                <div className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="text-xs font-[460] text-gray-600 mb-1 uppercase tracking-wider">
                    Total Jobs
                  </div>
                  <div className="text-lg font-[640] text-gray-900 tabular-nums">
                    {client.total_jobs}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors">
                  <div className="text-xs font-[460] text-gray-600 mb-1 uppercase tracking-wider">
                    Active Jobs
                  </div>
                  <div className="text-lg font-[640] text-green-600 tabular-nums">
                    {client.active_jobs}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors">
                  <div className="text-xs font-[460] text-gray-600 mb-1 uppercase tracking-wider">
                    Completed
                  </div>
                  <div className="text-lg font-[640] text-blue-600 tabular-nums">
                    {client.completed_jobs}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="text-xs font-[460] text-gray-600 mb-1 uppercase tracking-wider">
                    Total Spent
                  </div>
                  <div className="text-lg font-[640] text-gray-900 tabular-nums">
                    £{client.total_spent.toLocaleString()}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: theme.spacing[3],
                borderTop: `1px solid ${theme.colors.border}`,
              }}>
                <span style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textTertiary,
                }}>
                  Last contact: {formatDate(client.last_contact)}
                </span>
                <div style={{
                  padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                  borderRadius: theme.borderRadius.full,
                  backgroundColor: client.active_jobs > 0 ? '#D1FAE5' : '#F3F4F6',
                  color: client.active_jobs > 0 ? '#065F46' : '#6B7280',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                }}>
                  {client.active_jobs > 0 ? 'Active' : 'Inactive'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {filteredClients.length === 0 && (
        <div style={{
          padding: theme.spacing[12],
          textAlign: 'center',
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.xl,
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            margin: '0 auto',
            marginBottom: theme.spacing[4],
            borderRadius: theme.borderRadius.full,
            backgroundColor: theme.colors.backgroundSecondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <Icon name="users" size={32} color={theme.colors.textTertiary} />
          </div>
          <h3 style={{
            margin: 0,
            marginBottom: theme.spacing[2],
            fontSize: theme.typography.fontSize.lg,
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.textPrimary,
          }}>
            No clients found
          </h3>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            {searchQuery || selectedFilter !== 'all'
              ? 'Try adjusting your filters or search query'
              : 'Complete jobs to build your client base'}
          </p>
        </div>
      )}
    </div>
  );
}

