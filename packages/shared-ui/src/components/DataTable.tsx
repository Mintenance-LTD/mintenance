import React, { ReactNode } from 'react';

export interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => ReactNode;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface DataTableProps<T> {
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
        backgroundColor: '#FFFFFF',
        borderRadius: '20px',
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
      }}
    >
      {(title || actions) && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px 24px',
            borderBottom: '1px solid #E5E7EB',
          }}
        >
          {title && (
            <h3
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: '#1F2937',
                margin: 0,
              }}
            >
              {title}
            </h3>
          )}
          {actions}
        </div>
      )}

      {data.length === 0 ? (
        <div
          style={{
            textAlign: 'center',
            padding: '48px 24px',
            color: '#9CA3AF',
          }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#F9FAFB' }}>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      padding: '16px 24px',
                      textAlign: column.align || 'left',
                      fontSize: '12px',
                      fontWeight: 600,
                      color: '#6B7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      width: column.width,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((item, index) => (
                <tr
                  key={item.id}
                  onClick={() => onRowClick?.(item)}
                  style={{
                    borderTop: index > 0 ? '1px solid #F3F4F6' : 'none',
                    cursor: onRowClick ? 'pointer' : 'default',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick) {
                      e.currentTarget.style.backgroundColor = '#F9FAFB';
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
                        padding: '16px 24px',
                        textAlign: column.align || 'left',
                        fontSize: '14px',
                        color: '#374151',
                      }}
                    >
                      {column.render
                        ? column.render(item)
                        : String((item as any)[column.key] ?? '')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
