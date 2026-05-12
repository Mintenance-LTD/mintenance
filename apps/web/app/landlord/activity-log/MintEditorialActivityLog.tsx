'use client';

/**
 * Mint Editorial port of /landlord/activity-log.
 *
 * Same data path + filter logic as the legacy inline JSX in
 * `page.tsx`. Visual diffs:
 *   - Header → .t-h1 + .t-body with `.field` select for the filter
 *   - Empty state → <MintEditorialEmptyState> primitive
 *   - Table → .card with mint-tinted header row and brand-soft
 *     action chip per row
 *   - Pagination → .btn-ghost btn-sm pair
 */

import React from 'react';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { MintEditorialEmptyState } from '@/components/mint-editorial/MintEditorialEmptyState';

export interface LogEntry {
  id: string;
  action_type: string;
  description: string;
  property_id: string | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

interface Props {
  logs: LogEntry[];
  total: number;
  offset: number;
  limit: number;
  loading: boolean;
  filterType: string;
  actionLabels: Record<string, string>;
  onFilterChange: (next: string) => void;
  onPageBack: () => void;
  onPageForward: () => void;
}

export function MintEditorialActivityLog({
  logs,
  total,
  offset,
  limit,
  loading,
  filterType,
  actionLabels,
  onFilterChange,
  onPageBack,
  onPageForward,
}: Props) {
  return (
    <div style={{ maxWidth: 960, margin: '0 auto' }}>
      <div className='between' style={{ marginBottom: 22, gap: 16 }}>
        <div className='col' style={{ gap: 4 }}>
          <h1 className='t-h1'>Activity log</h1>
          <p className='t-body'>
            Every action taken across your portfolio — invites, jobs posted,
            compliance uploads, schedules created.
          </p>
        </div>
        <select
          className='field'
          value={filterType}
          onChange={(e) => onFilterChange(e.target.value)}
          style={{ width: 220 }}
        >
          <option value=''>All actions</option>
          {Object.entries(actionLabels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {loading ? (
        <div
          className='card card-pad'
          style={{ textAlign: 'center', padding: '40px 20px' }}
        >
          <p className='t-body'>Loading activity…</p>
        </div>
      ) : logs.length === 0 ? (
        <MintEditorialEmptyState
          icon={Activity}
          title={filterType ? 'No matching activity' : 'No activity yet'}
          body={
            filterType
              ? 'Try a different filter or clear it to see everything.'
              : 'Activity from your portfolio will appear here once you post jobs, invite team members, or upload compliance docs.'
          }
        />
      ) : (
        <>
          <div className='card' style={{ overflow: 'hidden' }}>
            <div
              className='row'
              style={{
                padding: '12px 18px',
                borderBottom: '1px solid var(--me-line-2)',
                background: 'var(--me-bg-2)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--me-ink-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              <span style={{ width: 200 }}>When</span>
              <span style={{ width: 180 }}>Action</span>
              <span style={{ flex: 1 }}>Description</span>
            </div>
            {logs.map((log, i) => (
              <div
                key={log.id}
                className='row'
                style={{
                  padding: '14px 18px',
                  borderTop: i ? '1px solid var(--me-line-2)' : 0,
                  gap: 12,
                  alignItems: 'center',
                }}
              >
                <span
                  className='t-meta'
                  style={{ width: 200, fontSize: 12, whiteSpace: 'nowrap' }}
                >
                  {new Date(log.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                <span style={{ width: 180 }}>
                  <span className='badge badge-info'>
                    {actionLabels[log.action_type] || log.action_type}
                  </span>
                </span>
                <span
                  style={{
                    flex: 1,
                    fontSize: 13,
                    color: 'var(--me-ink-2)',
                    minWidth: 0,
                  }}
                >
                  {log.description}
                </span>
              </div>
            ))}
          </div>

          <div className='between' style={{ marginTop: 14 }}>
            <span className='t-meta'>
              Showing {offset + 1}–{Math.min(offset + limit, total)} of {total}
            </span>
            <div className='row' style={{ gap: 6 }}>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                disabled={offset === 0}
                onClick={onPageBack}
                aria-label='Previous page'
              >
                <ChevronLeft size={14} strokeWidth={1.75} />
              </button>
              <button
                type='button'
                className='btn btn-ghost btn-sm'
                disabled={offset + limit >= total}
                onClick={onPageForward}
                aria-label='Next page'
              >
                <ChevronRight size={14} strokeWidth={1.75} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
