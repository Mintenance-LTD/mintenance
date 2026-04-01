'use client';

import React from 'react';
import Link from 'next/link';
import { theme } from '@/lib/theme';
import type { Job } from './JobManagementTypes';
import {
  STATUS_COLORS,
  formatProfileName,
  formatRelativeDate,
  formatBudget,
} from './JobManagementTypes';
import { ActionsDropdown } from './JobActionsDropdown';

export function TableHeader({
  label,
  align = 'left',
}: {
  label: string;
  align?: 'left' | 'center' | 'right';
}) {
  return (
    <th
      scope='col'
      style={{
        textAlign: align,
        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: '#64748B',
      }}
    >
      {label}
    </th>
  );
}

export function SortableHeader({
  label,
  column,
  currentSort,
  currentOrder,
  onSort,
  align = 'left',
}: {
  label: string;
  column: string;
  currentSort: string;
  currentOrder: 'asc' | 'desc';
  onSort: (c: string) => void;
  align?: 'left' | 'right';
}) {
  const isActive = currentSort === column;
  const ariaSortValue = isActive
    ? currentOrder === 'asc'
      ? 'ascending'
      : 'descending'
    : 'none';
  return (
    <th
      scope='col'
      aria-sort={ariaSortValue}
      onClick={() => onSort(column)}
      style={{
        textAlign: align,
        padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
        fontSize: '12px',
        fontWeight: 600,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        color: isActive ? theme.colors.primary : '#64748B',
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        transition: 'color 0.15s',
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        {label}
        {isActive && (
          <span style={{ fontSize: '10px' }}>
            {currentOrder === 'asc' ? '\u25B2' : '\u25BC'}
          </span>
        )}
      </span>
    </th>
  );
}

export function JobRow({ job }: { job: Job }) {
  const statusStyle = STATUS_COLORS[job.status] || {
    bg: '#F3F4F6',
    text: '#374151',
    border: '#D1D5DB',
  };
  return (
    <tr
      style={{
        borderBottom: '1px solid #F1F5F9',
        transition: 'background-color 0.15s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#F8FAFC';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <td style={{ padding: `${theme.spacing[3]} ${theme.spacing[4]}` }}>
        <Link
          href={`/jobs/${job.id}`}
          style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: 600,
            color: theme.colors.textPrimary,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = theme.colors.primary;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = theme.colors.textPrimary;
          }}
        >
          {job.title}
        </Link>
        {job.category && (
          <p
            style={{
              fontSize: '12px',
              color: '#94A3B8',
              margin: '2px 0 0',
            }}
          >
            {job.category}
          </p>
        )}
      </td>
      <td style={{ padding: `${theme.spacing[3]} ${theme.spacing[4]}` }}>
        <p
          style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: 500,
            color: theme.colors.textPrimary,
            margin: 0,
          }}
        >
          {formatProfileName(job.homeowner)}
        </p>
        {job.homeowner?.email && (
          <p
            style={{
              fontSize: '12px',
              color: '#94A3B8',
              margin: '2px 0 0',
            }}
          >
            {job.homeowner.email}
          </p>
        )}
      </td>
      <td style={{ padding: `${theme.spacing[3]} ${theme.spacing[4]}` }}>
        {job.contractor ? (
          <>
            <p
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: 500,
                color: theme.colors.textPrimary,
                margin: 0,
              }}
            >
              {formatProfileName(job.contractor)}
            </p>
            {job.contractor.email && (
              <p
                style={{
                  fontSize: '12px',
                  color: '#94A3B8',
                  margin: '2px 0 0',
                }}
              >
                {job.contractor.email}
              </p>
            )}
          </>
        ) : (
          <span
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: '#94A3B8',
              fontStyle: 'italic',
            }}
          >
            Unassigned
          </span>
        )}
      </td>
      <td style={{ padding: `${theme.spacing[3]} ${theme.spacing[4]}` }}>
        <span
          style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: '9999px',
            fontSize: '12px',
            fontWeight: 600,
            backgroundColor: statusStyle.bg,
            color: statusStyle.text,
            border: `1px solid ${statusStyle.border}`,
            textTransform: 'capitalize',
            whiteSpace: 'nowrap',
          }}
        >
          {job.status.replace('_', ' ')}
        </span>
      </td>
      <td
        style={{
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          textAlign: 'right',
          fontSize: theme.typography.fontSize.sm,
          fontWeight: 600,
          color: theme.colors.textPrimary,
        }}
      >
        {formatBudget(job.budget)}
      </td>
      <td style={{ padding: `${theme.spacing[3]} ${theme.spacing[4]}` }}>
        <p
          style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.textPrimary,
            margin: 0,
          }}
        >
          {formatRelativeDate(job.created_at)}
        </p>
        <p
          style={{
            fontSize: '11px',
            color: '#94A3B8',
            margin: '2px 0 0',
          }}
        >
          {new Date(job.created_at).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </p>
      </td>
      <td
        style={{
          padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
          textAlign: 'center',
        }}
      >
        <ActionsDropdown jobId={job.id} jobStatus={job.status} />
      </td>
    </tr>
  );
}

export function PageButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: `${theme.spacing[2]} ${theme.spacing[4]}`,
        borderRadius: theme.borderRadius.md,
        border: '1px solid #E2E8F0',
        backgroundColor: '#FFFFFF',
        color: disabled ? '#CBD5E1' : theme.colors.textSecondary,
        fontSize: theme.typography.fontSize.sm,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'all 0.15s',
      }}
    >
      {label}
    </button>
  );
}
