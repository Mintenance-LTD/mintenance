'use client';
import React, { useState, useMemo } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/figma';
import Link from 'next/link';

export interface Job {
  id: string;
  title: string;
  description?: string;
  location?: string;
  homeowner_id?: string;
  contractor_id?: string;
  customer?: string;
  property?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'posted' | 'assigned';
  assignedTo?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  scheduledDate?: string;
  budget?: number;
  category?: string;
  created_at?: string;
  updated_at?: string;
  photos?: string[];
}

interface JobsTableProps {
  jobs: Job[];
  onRowClick?: (job: Job) => void;
}

const statusColors: Record<Job['status'], { bg: string; text: string }> = {
  scheduled: { bg: '#DBEAFE', text: '#1E40AF' },
  in_progress: { bg: '#FEF3C7', text: '#92400E' },
  completed: { bg: '#D1FAE5', text: '#065F46' },
  cancelled: { bg: '#FEE2E2', text: '#991B1B' },
  posted: { bg: '#F3F4F6', text: '#374151' },
  assigned: { bg: '#E0E7FF', text: '#3730A3' },
};

const priorityColors: Record<NonNullable<Job['priority']>, { bg: string; text: string }> = {
  low: { bg: '#F3F4F6', text: '#6B7280' },
  medium: { bg: '#FEF3C7', text: '#92400E' },
  high: { bg: '#FED7AA', text: '#9A3412' },
  urgent: { bg: '#FEE2E2', text: '#991B1B' },
};

export function JobsTable({ jobs, onRowClick }: JobsTableProps) {
  const [sortBy, setSortBy] = useState<keyof Job>('scheduledDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: keyof Job) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      const aVal = a[sortBy];
      const bVal = b[sortBy];
      
      if (aVal === undefined) return 1;
      if (bVal === undefined) return -1;
      
      const comparison = aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [jobs, sortBy, sortOrder]);

  const SortIcon = ({ column }: { column: keyof Job }) => {
    if (sortBy !== column) {
      return <Icon name="chevronUpDown" size={14} color={theme.colors.textTertiary} />;
    }
    return sortOrder === 'asc' ? (
      <Icon name="chevronUp" size={14} color={theme.colors.primary} />
    ) : (
      <Icon name="chevronDown" size={14} color={theme.colors.primary} />
    );
  };

  return (
    <div style={{
      backgroundColor: theme.colors.white,
      borderRadius: theme.borderRadius.xl,
      border: `1px solid ${theme.colors.border}`,
      overflow: 'hidden',
    }}>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{
            backgroundColor: theme.colors.backgroundSecondary,
            borderBottom: `1px solid ${theme.colors.border}`,
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}>
            <tr>
              <th
                onClick={() => handleSort('title')}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'left',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  JOB TITLE
                  <SortIcon column="title" />
                </div>
              </th>
              <th
                onClick={() => handleSort('customer')}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'left',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  CUSTOMER
                  <SortIcon column="customer" />
                </div>
              </th>
              <th
                onClick={() => handleSort('property')}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'left',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  PROPERTY
                  <SortIcon column="property" />
                </div>
              </th>
              <th
                onClick={() => handleSort('status')}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'left',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  STATUS
                  <SortIcon column="status" />
                </div>
              </th>
              <th
                onClick={() => handleSort('assignedTo')}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'left',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  ASSIGNED TO
                  <SortIcon column="assignedTo" />
                </div>
              </th>
              <th
                onClick={() => handleSort('priority')}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'left',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  PRIORITY
                  <SortIcon column="priority" />
                </div>
              </th>
              <th
                onClick={() => handleSort('scheduledDate')}
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'left',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  cursor: 'pointer',
                  userSelect: 'none',
                  whiteSpace: 'nowrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: theme.spacing[1] }}>
                  SCHEDULED DATE
                  <SortIcon column="scheduledDate" />
                </div>
              </th>
              <th
                style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'right',
                  fontSize: theme.typography.fontSize.xs,
                  fontWeight: theme.typography.fontWeight.semibold,
                  color: theme.colors.textSecondary,
                  whiteSpace: 'nowrap',
                }}
              >
                ACTIONS
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedJobs.map((job, index) => (
              <tr
                key={job.id}
                onClick={() => onRowClick?.(job)}
                style={{
                  borderBottom: index < sortedJobs.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                  cursor: onRowClick ? 'pointer' : 'default',
                  transition: 'background-color 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.textPrimary,
                }}>
                  {job.title}
                </td>
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  {job.customer || '—'}
                </td>
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  {job.property || '—'}
                </td>
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                }}>
                  <StatusBadge
                    status={job.status === 'completed' ? 'completed' : job.status === 'in_progress' ? 'on_going' : job.status === 'posted' ? 'posted' : job.status === 'assigned' ? 'posted' : 'pending'}
                  />
                </td>
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                }}>
                  {job.assignedTo || 'Unassigned'}
                </td>
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                }}>
                  {job.priority ? (
                    <div style={{
                      display: 'inline-flex',
                      padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
                      borderRadius: theme.borderRadius.full,
                      backgroundColor: priorityColors[job.priority].bg,
                      color: priorityColors[job.priority].text,
                      fontSize: theme.typography.fontSize.xs,
                      fontWeight: theme.typography.fontWeight.semibold,
                      textTransform: 'capitalize',
                    }}>
                      {job.priority}
                    </div>
                  ) : (
                    <span style={{ color: theme.colors.textTertiary }}>—</span>
                  )}
                </td>
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  fontVariantNumeric: 'tabular-nums',
                }}>
                  {job.scheduledDate || '—'}
                </td>
                <td style={{
                  padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
                  textAlign: 'right',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: theme.spacing[2] }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle view
                      }}
                      style={{
                        padding: theme.spacing[2],
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: theme.borderRadius.md,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="eye" size={16} color={theme.colors.textSecondary} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Handle more options
                      }}
                      style={{
                        padding: theme.spacing[2],
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        borderRadius: theme.borderRadius.md,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon name="moreVertical" size={16} color={theme.colors.textSecondary} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedJobs.length === 0 && (
        <div style={{
          padding: theme.spacing[8],
          textAlign: 'center',
          color: theme.colors.textSecondary,
        }}>
          No jobs found
        </div>
      )}
    </div>
  );
}

