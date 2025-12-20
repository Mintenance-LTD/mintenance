'use client';
import React, { useState } from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';

interface FilterOption {
  label: string;
  value: string;
  count?: number;
}

interface SavedView {
  id: string;
  name: string;
  filters: Record<string, any>;
  isDefault?: boolean;
}

interface JobsFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  savedViews?: SavedView[];
  currentView?: string;
  onViewChange?: (viewId: string) => void;
}

export function JobsFilters({
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  searchQuery,
  onSearchQueryChange,
  savedViews = [],
  currentView = 'all',
  onViewChange,
}: JobsFiltersProps) {
  const [showFilters, setShowFilters] = useState(true);

  const statusOptions: FilterOption[] = [
    { label: 'All', value: 'all' },
    { label: 'Scheduled', value: 'scheduled' },
    { label: 'In Progress', value: 'in_progress' },
    { label: 'Completed', value: 'completed' },
    { label: 'Cancelled', value: 'cancelled' },
  ];

  const priorityOptions: FilterOption[] = [
    { label: 'All Priorities', value: 'all' },
    { label: 'Urgent', value: 'urgent' },
    { label: 'High', value: 'high' },
    { label: 'Medium', value: 'medium' },
    { label: 'Low', value: 'low' },
  ];

  const defaultSavedViews: SavedView[] = [
    { id: 'all', name: 'All Jobs', filters: {}, isDefault: true },
    { id: 'my-jobs', name: 'My Jobs', filters: { assignedToMe: true } },
    { id: 'urgent', name: 'Urgent', filters: { priority: 'urgent' } },
    { id: 'overdue', name: 'Overdue', filters: { overdue: true } },
    ...savedViews,
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing[4] }}>
      {/* Saved Views */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[2],
        overflowX: 'auto',
        paddingBottom: theme.spacing[2],
      }}>
        {defaultSavedViews.map((view) => (
          <button
            key={view.id}
            onClick={() => onViewChange?.(view.id)}
            style={{
              padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
              borderRadius: theme.borderRadius.lg,
              border: `1px solid ${currentView === view.id ? theme.colors.primary : theme.colors.border}`,
              backgroundColor: currentView === view.id ? theme.colors.primary : theme.colors.white,
              color: currentView === view.id ? 'white' : theme.colors.textPrimary,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (currentView !== view.id) {
                e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== view.id) {
                e.currentTarget.style.backgroundColor = theme.colors.white;
              }
            }}
          >
            {view.name}
          </button>
        ))}
        <button
          style={{
            padding: `${theme.spacing[2]} ${theme.spacing[3]}`,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.sm,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[1],
          }}
        >
          <Icon name="plus" size={16} color={theme.colors.textSecondary} />
          Save View
        </button>
      </div>

      {/* Search and Filter Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: theme.spacing[3],
        flexWrap: 'wrap',
      }}>
        {/* Search */}
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
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
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

        {/* Filter Toggle */}
        <button
          onClick={() => setShowFilters(!showFilters)}
          style={{
            height: '40px',
            padding: `0 ${theme.spacing[4]}`,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: showFilters ? theme.colors.backgroundSecondary : theme.colors.white,
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon name="filter" size={16} color={theme.colors.textSecondary} />
          Filters
          {(statusFilter !== 'all' || priorityFilter !== 'all') && (
            <div style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: theme.colors.primary,
            }} />
          )}
        </button>

        {/* Export */}
        <button
          style={{
            height: '40px',
            padding: `0 ${theme.spacing[4]}`,
            borderRadius: theme.borderRadius.lg,
            border: `1px solid ${theme.colors.border}`,
            backgroundColor: theme.colors.white,
            color: theme.colors.textPrimary,
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[2],
          }}
        >
          <Icon name="download" size={16} color={theme.colors.textSecondary} />
          Export
        </button>
      </div>

      {/* Expandable Filters */}
      {showFilters && (
        <div style={{
          display: 'flex',
          gap: theme.spacing[4],
          padding: theme.spacing[4],
          backgroundColor: theme.colors.backgroundSecondary,
          borderRadius: theme.borderRadius.lg,
          flexWrap: 'wrap',
        }}>
          {/* Status Filter */}
          <div style={{ minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[2],
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
            }}>
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: `0 ${theme.spacing[3]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.white,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Priority Filter */}
          <div style={{ minWidth: '200px' }}>
            <label style={{
              display: 'block',
              marginBottom: theme.spacing[2],
              fontSize: theme.typography.fontSize.xs,
              fontWeight: theme.typography.fontWeight.semibold,
              color: theme.colors.textSecondary,
              textTransform: 'uppercase',
            }}>
              Priority
            </label>
            <select
              value={priorityFilter}
              onChange={(e) => onPriorityFilterChange(e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: `0 ${theme.spacing[3]}`,
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.lg,
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textPrimary,
                backgroundColor: theme.colors.white,
                cursor: 'pointer',
                outline: 'none',
              }}
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {(statusFilter !== 'all' || priorityFilter !== 'all') && (
            <div style={{ display: 'flex', alignItems: 'flex-end' }}>
              <button
                onClick={() => {
                  onStatusFilterChange('all');
                  onPriorityFilterChange('all');
                }}
                style={{
                  height: '40px',
                  padding: `0 ${theme.spacing[4]}`,
                  borderRadius: theme.borderRadius.lg,
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: theme.colors.primary,
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  cursor: 'pointer',
                }}
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

