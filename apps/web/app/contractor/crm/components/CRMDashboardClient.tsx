'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface Client {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  company?: string;
  phone?: string;
  relationship_status?: 'prospect' | 'active' | 'inactive' | 'high-risk' | string;
  total_jobs?: number;
  total_spend?: number;
  last_project?: string;
  churn_risk_score?: number;
  last_interaction?: string;
  notes?: string[];
  progress?: number;
  activities?: Array<{
    id: string;
    label: string;
    timestamp: string;
    status?: 'new' | 'in-progress' | 'completed';
  }>;
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
  { key: 'all', label: 'All' },
  { key: 'active', label: 'Active' },
  { key: 'prospect', label: 'Prospects' },
  { key: 'inactive', label: 'Inactive' },
  { key: 'high-risk', label: 'High risk' },
] as const;

type FilterKey = (typeof FILTERS)[number]['key'];

export function CRMDashboardClient({ clients: initialClients, analytics }: CRMDashboardClientProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<FilterKey>('all');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(initialClients[0]?.id ?? null);

  const filteredClients = useMemo(() => {
    return initialClients.filter((client) => {
      const fullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.toLowerCase();
      const search = searchQuery.toLowerCase();

      if (search && !fullName.includes(search) && !(client.email ?? '').toLowerCase().includes(search)) {
        return false;
      }

      if (selectedFilter === 'all') return true;
      if (selectedFilter === 'high-risk') return (client.churn_risk_score ?? 0) >= 70;

      return client.relationship_status === selectedFilter;
    });
  }, [initialClients, searchQuery, selectedFilter]);

  const selectedClient =
    filteredClients.find((client) => client.id === selectedClientId) ?? filteredClients[0] ?? null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[6] }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
        <div>
          <h1
            style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              marginBottom: theme.spacing[2],
            }}
          >
            Client relationship management
          </h1>
          <p style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Track key customers, spot follow-up opportunities, and reduce churn risk.
          </p>
        </div>
        <button
          type='button'
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
            borderRadius: '12px',
            border: `1px solid ${theme.colors.primary}`,
            backgroundColor: theme.colors.surface,
            color: theme.colors.primary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.semibold,
            cursor: 'pointer',
          }}
        >
          Add client
        </button>
      </header>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
          gap: theme.spacing[4],
        }}
      >
        <AnalyticsTile label='Total clients' value={analytics.total_clients} icon='users' />
        <AnalyticsTile label='New this month' value={analytics.new_clients_this_month} icon='plus' tone='success' />
        <AnalyticsTile label='Repeat clients' value={analytics.repeat_clients} icon='briefcase' tone='warning' />
        <AnalyticsTile
          label='Average lifetime value'
          value={`£${Math.round(analytics.client_lifetime_value)}`}
          icon='currencyDollar'
        />
      </section>

      <input
        type='text'
        placeholder='Search clients by name or email...'
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        style={{
          width: '100%',
          padding: theme.spacing[3],
          border: `1px solid ${theme.colors.border}`,
          borderRadius: theme.borderRadius.md,
          fontSize: theme.typography.fontSize.base,
        }}
      />

      <nav style={{ display: 'flex', gap: theme.spacing[2], flexWrap: 'wrap' }}>
        {FILTERS.map((filter) => {
          const isActive = selectedFilter === filter.key;
          return (
            <button
              key={filter.key}
              onClick={() => setSelectedFilter(filter.key)}
              style={{
                padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                borderRadius: '999px',
                border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                backgroundColor: isActive ? theme.colors.backgroundSecondary : theme.colors.surface,
                color: isActive ? theme.colors.primary : theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
                cursor: 'pointer',
              }}
            >
              {filter.label}
            </button>
          );
        })}
      </nav>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: theme.spacing[6],
          alignItems: 'flex-start',
        }}
      >
        <aside
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[4],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[2],
            minHeight: '480px',
          }}
        >
          <h2
            style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing[2],
              textTransform: 'uppercase',
            }}
          >
            Clients ({filteredClients.length})
          </h2>

          {filteredClients.length === 0 ? (
            <div
              style={{
                textAlign: 'center',
                padding: `${theme.spacing[10]} 0`,
                color: theme.colors.textSecondary,
              }}
            >
              No clients match this filter
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2], overflowY: 'auto', maxHeight: '520px' }}>
              {filteredClients.map((client) => {
                const isActive = selectedClient?.id === client.id;
                return (
                  <button
                    key={client.id}
                    type='button'
                    onClick={() => setSelectedClientId(client.id)}
                    style={{
                      textAlign: 'left',
                      borderRadius: '14px',
                      border: `1px solid ${isActive ? theme.colors.primary : theme.colors.border}`,
                      backgroundColor: isActive ? theme.colors.backgroundSecondary : theme.colors.surface,
                      padding: theme.spacing[3],
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>
                      {client.first_name} {client.last_name}
                    </span>
                    <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                      {client.company ?? 'Independent'}
                    </span>
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.xs,
                        color: theme.colors.textSecondary,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <Icon name='activity' size={12} color={theme.colors.textQuaternary} />
                      {client.last_interaction ? `Last contact ${client.last_interaction}` : 'No recent activity'}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </aside>

        <article
          style={{
            backgroundColor: theme.colors.surface,
            borderRadius: '20px',
            border: `1px solid ${theme.colors.border}`,
            padding: theme.spacing[6],
            display: 'flex',
            flexDirection: 'column',
            gap: theme.spacing[4],
            minHeight: '480px',
          }}
        >
          {selectedClient ? (
            <>
              <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: theme.spacing[4] }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[1] }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: theme.typography.fontSize['2xl'],
                      fontWeight: theme.typography.fontWeight.bold,
                    }}
                  >
                    {selectedClient.first_name} {selectedClient.last_name}
                  </h2>
                  <span style={{ fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                    {selectedClient.company ?? 'Independent homeowner'}
                  </span>
                  <div style={{ display: 'flex', gap: theme.spacing[3], fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                    {selectedClient.email && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name='messages' size={12} color={theme.colors.textSecondary} />
                        {selectedClient.email}
                      </span>
                    )}
                    {selectedClient.phone && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                        <Icon name='phone' size={12} color={theme.colors.textSecondary} />
                        {selectedClient.phone}
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type='button'
                  style={{
                    borderRadius: '12px',
                    border: `1px solid ${theme.colors.primary}`,
                    backgroundColor: theme.colors.surface,
                    color: theme.colors.primary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                    cursor: 'pointer',
                  }}
                >
                  Log activity
                </button>
              </header>

              <section style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary, textTransform: 'uppercase' }}>
                  Relationship health
                </span>
                <div
                  style={{
                    height: '10px',
                    backgroundColor: theme.colors.backgroundSecondary,
                    borderRadius: '999px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.min(100, Math.max(10, Math.round((selectedClient.progress ?? 0.65) * 100)))}%`,
                      backgroundColor: theme.colors.success,
                      height: '100%',
                    }}
                  />
                </div>
                <span style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                  {(selectedClient.progress ?? 0.65) * 100}% of onboarding journey completed
                </span>
              </section>

              <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: theme.spacing[3] }}>
                <InfoTile icon='briefcase' label='Projects completed' value={selectedClient.total_jobs ?? 0} />
                <InfoTile icon='currencyDollar' label='Total spend' value={`£${(selectedClient.total_spend ?? 0).toFixed(2)}`} />
                <InfoTile icon='calendar' label='Last project' value={selectedClient.last_project ?? '—'} />
              </section>

              <section style={{ display: 'flex', gap: theme.spacing[4], flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                  <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>
                    Latest activity
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[2] }}>
                    {(selectedClient.activities ?? []).length ? (
                      selectedClient.activities!.map((activity) => (
                        <div
                          key={activity.id}
                          style={{
                            borderRadius: '12px',
                            border: `1px solid ${theme.colors.border}`,
                            padding: theme.spacing[3],
                            backgroundColor: theme.colors.backgroundSecondary,
                          }}
                        >
                          <span style={{ fontSize: theme.typography.fontSize.sm, fontWeight: theme.typography.fontWeight.medium }}>
                            {activity.label}
                          </span>
                          <div style={{ fontSize: theme.typography.fontSize.xs, color: theme.colors.textSecondary }}>
                            {activity.timestamp}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>No activity logged yet.</div>
                    )}
                  </div>
                </div>

                <div style={{ flex: '1 1 260px', display: 'flex', flexDirection: 'column', gap: theme.spacing[3] }}>
                  <h3 style={{ margin: 0, fontSize: theme.typography.fontSize.lg, fontWeight: theme.typography.fontWeight.semibold }}>
                    Notes
                  </h3>
                  <div
                    style={{
                      borderRadius: '12px',
                      border: `1px solid ${theme.colors.border}`,
                      padding: theme.spacing[3],
                      backgroundColor: theme.colors.backgroundSecondary,
                      minHeight: '160px',
                      color: theme.colors.textSecondary,
                      fontSize: theme.typography.fontSize.sm,
                    }}
                  >
                    {(selectedClient.notes ?? []).length ? selectedClient.notes?.join('\n') : 'No notes recorded.'}
                  </div>
                </div>
              </section>
            </>
          ) : (
            <div style={{ textAlign: 'center', color: theme.colors.textSecondary }}>Select a client to view details.</div>
          )}
        </article>
      </section>
    </div>
  );
}

function AnalyticsTile({
  label,
  value,
  icon,
  tone,
}: {
  label: string;
  value: number | string;
  icon: string;
  tone?: 'success' | 'warning';
}) {
  const color =
    tone === 'success'
      ? theme.colors.success
      : tone === 'warning'
      ? theme.colors.warning
      : theme.colors.primary;

  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: '20px',
        border: `1px solid ${theme.colors.border}`,
        padding: theme.spacing[5],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: theme.spacing[2], color: theme.colors.textSecondary }}>
        <Icon name={icon} size={18} color={color} />
        {label}
      </span>
      <span style={{ fontSize: theme.typography.fontSize['3xl'], fontWeight: theme.typography.fontWeight.bold }}>{value}</span>
    </div>
  );
}

function InfoTile({ icon, label, value }: { icon: string; label: string; value: number | string }) {
  return (
    <div
      style={{
        borderRadius: '16px',
        border: `1px solid ${theme.colors.border}`,
        backgroundColor: theme.colors.backgroundSecondary,
        padding: theme.spacing[4],
        display: 'flex',
        flexDirection: 'column',
        gap: theme.spacing[2],
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.xs }}>
        <Icon name={icon} size={14} color={theme.colors.textSecondary} />
        {label}
      </span>
      <span style={{ fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textPrimary }}>{value}</span>
    </div>
  );
}
