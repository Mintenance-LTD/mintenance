'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Icon } from '@/components/ui/Icon';
import type { Job } from './JobManagementTypes';
import { PAGE_SIZE, generatePageNumbers } from './JobManagementTypes';
import {
  TableHeader,
  SortableHeader,
  JobRow,
  PageButton,
} from './JobTableSubComponents';

interface JobManagementTableProps {
  jobs: Job[];
  total: number;
  page: number;
  loading: boolean;
  search: string;
  sortColumn: string;
  sortOrder: 'asc' | 'desc';
  onSort: (column: string) => void;
  onPageChange: (page: number) => void;
}

export function JobManagementTable({
  jobs,
  total,
  page,
  loading,
  search,
  sortColumn,
  sortOrder,
  onSort,
  onPageChange,
}: JobManagementTableProps) {
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid #E2E8F0',
                backgroundColor: '#F8FAFC',
              }}
            >
              <SortableHeader
                label='Job Title'
                column='title'
                currentSort={sortColumn}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <TableHeader label='Homeowner' />
              <TableHeader label='Contractor' />
              <SortableHeader
                label='Status'
                column='status'
                currentSort={sortColumn}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label='Budget'
                column='budget'
                currentSort={sortColumn}
                currentOrder={sortOrder}
                onSort={onSort}
                align='right'
              />
              <SortableHeader
                label='Created'
                column='created_at'
                currentSort={sortColumn}
                currentOrder={sortOrder}
                onSort={onSort}
              />
              <TableHeader label='Actions' align='center' />
            </tr>
          </thead>
          <tbody>
            {loading && jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: '60px 0', textAlign: 'center' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: theme.spacing[3],
                    }}
                  >
                    <div className='admin-jobs-spinner' />
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      Loading jobs...
                    </span>
                  </div>
                </td>
              </tr>
            ) : jobs.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{ padding: '60px 0', textAlign: 'center' }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: theme.spacing[3],
                    }}
                  >
                    <Icon name='briefcase' size={40} color='#CBD5E1' />
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.base,
                        color: theme.colors.textSecondary,
                      }}
                    >
                      No jobs found
                    </span>
                    <span
                      style={{
                        fontSize: theme.typography.fontSize.sm,
                        color: '#94A3B8',
                      }}
                    >
                      {search
                        ? 'Try a different search term'
                        : 'No jobs match the selected filter'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              jobs.map((job) => <JobRow key={job.id} job={job} />)
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: `${theme.spacing[4]} ${theme.spacing[6]}`,
            borderTop: '1px solid #E2E8F0',
            backgroundColor: '#FAFBFC',
          }}
        >
          <span
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
            }}
          >
            Showing {(page - 1) * PAGE_SIZE + 1} -{' '}
            {Math.min(page * PAGE_SIZE, total)} of {total} jobs
          </span>
          <div style={{ display: 'flex', gap: theme.spacing[2] }}>
            <PageButton
              label='Previous'
              disabled={page <= 1}
              onClick={() => onPageChange(Math.max(1, page - 1))}
            />
            {generatePageNumbers(page, totalPages).map((p, idx) =>
              p === '...' ? (
                <span
                  key={`ellipsis-${idx}`}
                  style={{
                    padding: `${theme.spacing[2]} ${theme.spacing[2]}`,
                    fontSize: theme.typography.fontSize.sm,
                    color: '#94A3B8',
                  }}
                >
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  style={{
                    minWidth: '36px',
                    height: '36px',
                    borderRadius: theme.borderRadius.md,
                    border:
                      page === p
                        ? `1px solid ${theme.colors.primary}`
                        : '1px solid #E2E8F0',
                    backgroundColor:
                      page === p ? theme.colors.primary : '#FFFFFF',
                    color: page === p ? '#FFFFFF' : theme.colors.textSecondary,
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: page === p ? 600 : 400,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {p}
                </button>
              )
            )}
            <PageButton
              label='Next'
              disabled={page >= totalPages}
              onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            />
          </div>
        </div>
      )}
    </>
  );
}
