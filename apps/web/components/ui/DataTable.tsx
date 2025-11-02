'use client';

import React, { ReactNode } from 'react';
import { theme } from '@/lib/theme';
import { EmptyState } from './EmptyState';
import { Card } from './Card';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
  mobileLabel?: string; // Label to show in mobile card view
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
  title?: string;
  actions?: ReactNode;
  responsive?: boolean; // Enable mobile card view
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available',
  emptyTitle = 'No items found',
  emptyDescription = emptyMessage,
  emptyAction,
  title,
  actions,
  responsive = true,
}: DataTableProps<T>) {
  return (
    <div
      style={{
        backgroundColor: theme.colors.surface,
        border: `1px solid ${theme.colors.border}`,
        borderRadius: '20px',
        padding: theme.spacing[6],
        overflow: 'hidden',
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: theme.spacing[6],
          }}
        >
          {title && (
            <h2
              style={{
                margin: 0,
                fontSize: theme.typography.fontSize['2xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.textPrimary,
              }}
            >
              {title}
            </h2>
          )}
          {actions && <div>{actions}</div>}
        </div>
      )}

      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr
              style={{
                borderBottom: `1px solid ${theme.colors.border}`,
              }}
            >
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{
                    textAlign: column.align || 'left',
                    padding: theme.spacing[3],
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textSecondary,
                    width: column.width,
                  }}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 && (
              data.map((item) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  style={{
                    borderBottom: `1px solid ${theme.colors.border}`,
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor =
                        theme.colors.backgroundSecondary;
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{
                        padding: theme.spacing[4],
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textPrimary,
                        textAlign: column.align || 'left',
                      }}
                    >
                      {column.render
                        ? column.render(item)
                        : String((item as any)[column.key] || '-')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Empty State */}
      {data.length === 0 && (
        <EmptyState
          variant="minimal"
          title={emptyTitle}
          description={emptyDescription}
          action={emptyAction}
        />
      )}

      {/* Mobile Card View */}
      {responsive && data.length > 0 && (
        <div className="md:hidden mt-4 space-y-3">
          {data.map((item) => (
            <Card
              key={item.id}
              variant="outlined"
              padding="md"
              onClick={() => onRowClick?.(item)}
              hover={!!onRowClick}
            >
              {columns.map((column, idx) => (
                <div
                  key={column.key}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    paddingBottom: idx < columns.length - 1 ? theme.spacing[3] : 0,
                    borderBottom: idx < columns.length - 1 ? `1px solid ${theme.colors.border}` : 'none',
                    marginBottom: idx < columns.length - 1 ? theme.spacing[3] : 0,
                  }}
                >
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.semibold,
                    color: theme.colors.textSecondary,
                  }}>
                    {column.mobileLabel || column.label}:
                  </span>
                  <span style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.textPrimary,
                    textAlign: 'right',
                    flex: 1,
                    marginLeft: theme.spacing[2],
                  }}>
                    {column.render
                      ? column.render(item)
                      : String((item as any)[column.key] || '-')}
                  </span>
                </div>
              ))}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
