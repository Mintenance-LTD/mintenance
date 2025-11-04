'use client';

import React, { useMemo, useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { useRouter } from 'next/navigation';

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
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: theme.spacing[4],
        flexWrap: 'wrap',
      }}>
        <div>
          <h1 style={{
            margin: 0,
            marginBottom: theme.spacing[1],
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
          }}>
            Client Relationship Management
          </h1>
          <p style={{
            margin: 0,
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textSecondary,
          }}>
            {filteredClients.length} clients • {clients.filter(c => c.active_jobs > 0).length} active
          </p>
        </div>
        <button style={{
          height: '40px',
          padding: `0 ${theme.spacing[4]}`,
          borderRadius: theme.borderRadius.lg,
          border: 'none',
          backgroundColor: theme.colors.primary,
          color: 'white',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: theme.typography.fontWeight.semibold,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: theme.spacing[2],
        }}>
          <Icon name="plus" size={16} color="white" />
          Add Client
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: theme.spacing[4],
      }}>
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[5],
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[3],
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              Total Clients
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.lg,
              backgroundColor: '#DBEAFE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="users" size={20} color="#2563EB" />
            </div>
          </div>
          <div style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}>
            {analytics.total_clients}
          </div>
        </div>

        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[5],
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[3],
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              New This Month
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.lg,
              backgroundColor: '#D1FAE5',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="plus" size={20} color="#065F46" />
            </div>
          </div>
          <div style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: theme.spacing[2],
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.textPrimary,
              fontVariantNumeric: 'tabular-nums',
            }}>
              {analytics.new_clients_this_month}
            </div>
            {analytics.month_over_month_change !== undefined && analytics.month_over_month_change !== 0 && (
              <div style={{
                padding: `${theme.spacing[1]} ${theme.spacing[2]}`,
                borderRadius: theme.borderRadius.full,
                backgroundColor: analytics.month_over_month_change >= 0 ? '#D1FAE5' : '#FEE2E2',
                color: analytics.month_over_month_change >= 0 ? '#065F46' : '#991B1B',
                fontSize: theme.typography.fontSize.xs,
                fontWeight: theme.typography.fontWeight.semibold,
              }}>
                {analytics.month_over_month_change >= 0 ? '+' : ''}{analytics.month_over_month_change}%
              </div>
            )}
          </div>
        </div>

        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[5],
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[3],
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              Repeat Clients
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.lg,
              backgroundColor: '#FEF3C7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="briefcase" size={20} color="#92400E" />
            </div>
          </div>
          <div style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            fontVariantNumeric: 'tabular-nums',
            marginBottom: '4px',
          }}>
            {analytics.repeat_clients}
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary,
          }}>
            {analytics.total_clients > 0 
              ? `${Math.round((analytics.repeat_clients / analytics.total_clients) * 100)}% return rate`
              : '0% return rate'}
          </div>
        </div>

        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.xl,
          padding: theme.spacing[5],
          border: `1px solid ${theme.colors.border}`,
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[3],
          }}>
            <span style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              Avg Lifetime Value
            </span>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: theme.borderRadius.lg,
              backgroundColor: '#E0E7FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <Icon name="currencyPound" size={20} color="#3730A3" />
            </div>
          </div>
          <div style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary,
            fontVariantNumeric: 'tabular-nums',
          }}>
            £{analytics.client_lifetime_value.toFixed(0)}
          </div>
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
              style={{
                width: '100%',
                height: '40px',
                padding: `0 ${theme.spacing[3]} 0 ${theme.spacing[10]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.white,
                outline: 'none',
              }}
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
            <button
              suppressHydrationWarning
              onClick={() => setViewMode('cards')}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: viewMode === 'cards' ? theme.colors.white : 'transparent',
                color: viewMode === 'cards' ? theme.colors.textPrimary : theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                boxShadow: viewMode === 'cards' ? theme.shadows.sm : 'none',
              }}
            >
              Cards
            </button>
            <button
              suppressHydrationWarning
              onClick={() => setViewMode('table')}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: viewMode === 'table' ? theme.colors.white : 'transparent',
                color: viewMode === 'table' ? theme.colors.textPrimary : theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                boxShadow: viewMode === 'table' ? theme.shadows.sm : 'none',
              }}
            >
              Table
            </button>
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
            <button
              key={filter.key}
              suppressHydrationWarning
              onClick={() => setSelectedFilter(filter.key)}
              style={{
                padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
                borderRadius: theme.borderRadius.full,
                border: `1px solid ${selectedFilter === filter.key ? theme.colors.primary : theme.colors.border}`,
                backgroundColor: selectedFilter === filter.key ? theme.colors.primary : theme.colors.white,
                color: selectedFilter === filter.key ? 'white' : theme.colors.textPrimary,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {/* Client Cards */}
      {viewMode === 'cards' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
          gap: theme.spacing[4],
        }}>
          {filteredClients.map((client) => (
            <div
              key={client.id}
              onClick={() => router.push(`/contractor/crm/${client.id}`)}
              style={{
                backgroundColor: theme.colors.white,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.xl,
                padding: theme.spacing[5],
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = theme.shadows.lg;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
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
                  backgroundColor: theme.colors.primary,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <span style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: 'white',
                  }}>
                    {client.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{
                    margin: 0,
                    marginBottom: '2px',
                    fontSize: theme.typography.fontSize.base,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {client.name}
                  </h3>
                  <p style={{
                    margin: 0,
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}>
                    {client.email}
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: theme.spacing[3],
                marginBottom: theme.spacing[4],
              }}>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginBottom: '2px',
                  }}>
                    Total Jobs
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {client.total_jobs}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginBottom: '2px',
                  }}>
                    Active Jobs
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {client.active_jobs}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginBottom: '2px',
                  }}>
                    Completed
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {client.completed_jobs}
                  </div>
                </div>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginBottom: '2px',
                  }}>
                    Total Spent
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.lg,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textPrimary,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
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

