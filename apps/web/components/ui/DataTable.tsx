'use client';

import React, { ReactNode } from 'react';
import { theme } from '@/lib/theme';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  title?: string;
  actions?: ReactNode;
}

export function DataTable<T extends { id: string | number }>({
  data,
  columns,
  onRowClick,
  emptyMessage = 'No data available',
  title,
  actions,
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
            {data.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  style={{
                    padding: theme.spacing[8],
                    textAlign: 'center',
                    color: theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                  }}
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
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
    </div>
  );
}
