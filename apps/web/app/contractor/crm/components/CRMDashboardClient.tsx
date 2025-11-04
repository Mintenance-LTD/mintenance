'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { DataTable, Column } from '@/components/ui/DataTable';
import { Badge as StatusBadge } from '@/components/ui/Badge.unified';
import { Card } from '@/components/ui/Card.unified';

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
}

interface AnalyticsSummary {
  total_clients: number;
  new_clients_this_month: number;
  repeat_clients: number;
  client_lifetime_value: number;
}

interface CRMDashboardClientProps {
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

export function CRMDashboardClient({ clients, analytics }: CRMDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      // Search filter
      const search = searchQuery.toLowerCase();
      if (
        search &&
        !client.name.toLowerCase().includes(search) &&
        !client.email.toLowerCase().includes(search)
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

  // Client columns for DataTable
  const clientColumns: Column<Client>[] = [
    {
      key: 'name',
      label: 'Client Name',
      render: (client) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <span style={{ fontWeight: theme.typography.fontWeight.semibold }}>
            {client.name}
          </span>
          <span
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
            }}
          >
            {client.email}
          </span>
        </div>
      ),
    },
    {
      key: 'phone',
      label: 'Contact',
      render: (client) => client.phone || '-',
    },
    {
      key: 'total_jobs',
      label: 'Total Jobs',
      align: 'center' as const,
      render: (client) => (
        <span style={{ fontWeight: theme.typography.fontWeight.semibold }}>
          {client.total_jobs}
        </span>
      ),
    },
    {
      key: 'active_jobs',
      label: 'Active',
      align: 'center' as const,
      render: (client) =>
        client.active_jobs > 0 ? (
          <StatusBadge status="in_progress" size="sm" />
        ) : (
          <span style={{ color: theme.colors.textSecondary }}>-</span>
        ),
    },
    {
      key: 'total_spent',
      label: 'Total Spent',
      align: 'right' as const,
      render: (client) => (
        <span
          style={{
            fontWeight: theme.typography.fontWeight.semibold,
            color: theme.colors.success,
          }}
        >
          £{client.total_spent.toFixed(2)}
        </span>
      ),
    },
    {
      key: 'last_contact',
      label: 'Last Contact',
      render: (client) =>
        new Date(client.last_contact).toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      {/* Header */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: theme.spacing[4],
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Client Relationship Management
          </h1>
          <p
            style={{
              margin: 0,
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.sm,
            }}
          >
            Track relationships, identify opportunities, and maximize lifetime value
          </p>
        </div>
      </header>

      {/* Analytics Metrics */}
      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <Card.Metric
          label="Total Clients"
          value={analytics.total_clients.toString()}
          subtitle="In your network"
          icon="users"
          color={theme.colors.primary}
        />

        <Card.Metric
          label="New This Month"
          value={analytics.new_clients_this_month.toString()}
          subtitle="Recently added"
          icon="plus"
          color={theme.colors.success}
        />

        <Card.Metric
          label="Repeat Clients"
          value={analytics.repeat_clients.toString()}
          subtitle={`${analytics.total_clients > 0 ? Math.round((analytics.repeat_clients / analytics.total_clients) * 100) : 0}% return rate`}
          icon="briefcase"
          color="#F59E0B"
        />

        <Card.Metric
          label="Avg Lifetime Value"
          value={`£${analytics.client_lifetime_value.toFixed(2)}`}
          subtitle="Per client"
          icon="currencyPound"
          color={theme.colors.info}
        />
      </section>

      {/* Search and Filters */}
      <div
        style={{
          display: 'flex',
          gap: theme.spacing[4],
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <input
          type="text"
          placeholder="Search clients by name or email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{
            flex: '1 1 300px',
            padding: theme.spacing[3],
            border: `1px solid ${theme.colors.border}`,
            borderRadius: '12px',
            fontSize: theme.typography.fontSize.sm,
            backgroundColor: theme.colors.surface,
          }}
        />

        <div style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
          {FILTERS.map((filter) => {
            const isActive = selectedFilter === filter.key;
            return (
              <button
                key={filter.key}
                onClick={() => setSelectedFilter(filter.key)}
                style={{
                  padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                  borderRadius: '12px',
                  border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                  backgroundColor: isActive
                    ? `${theme.colors.primary}15`
                    : theme.colors.surface,
                  color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Client Table */}
      <DataTable
        data={filteredClients}
        columns={clientColumns}
        title={`Clients (${filteredClients.length})`}
        emptyMessage={
          searchQuery || selectedFilter !== 'all'
            ? 'No clients match your search criteria'
            : 'No clients yet. Complete jobs to build your client base!'
        }
      />
    </div>
  );
}
