'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';

interface FeeTransfer {
  id: string;
  escrow_transaction_id: string;
  job_id: string;
  contractor_id: string;
  amount: number;
  stripe_processing_fee: number;
  net_revenue: number;
  status: 'pending' | 'transferred' | 'held' | 'failed';
  hold_reason?: string;
  held_by?: string;
  held_at?: string;
  created_at: string;
  transferred_at?: string;
  escrow_transactions?: {
    amount: number;
    status: string;
  };
  jobs?: {
    id: string;
    title: string;
    contractor_id: string;
    homeowner_id: string;
  };
  users?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  };
}

interface FeeTransferTableProps {
  transfers: FeeTransfer[];
  selectedTransfers: string[];
  onSelectAll: (checked: boolean) => void;
  onToggleSelect: (id: string, checked: boolean) => void;
  onHold: (transferId: string) => void;
  onRelease: (transferId: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
}

const thStyle = {
  padding: theme.spacing[4],
  textAlign: 'left' as const,
  fontSize: theme.typography.fontSize.xs,
  fontWeight: theme.typography.fontWeight.semibold,
  color: theme.colors.textSecondary,
  textTransform: 'uppercase' as const,
  backgroundColor: theme.colors.backgroundSecondary,
};

export function FeeTransferTable({
  transfers,
  selectedTransfers,
  onSelectAll,
  onToggleSelect,
  onHold,
  onRelease,
  formatCurrency,
  formatDate,
  getStatusColor,
}: FeeTransferTableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr
            style={{
              borderBottom: `1px solid ${theme.colors.border}`,
              backgroundColor: theme.colors.backgroundSecondary,
            }}
          >
            <th scope='col' style={thStyle}>
              <input
                type='checkbox'
                checked={
                  selectedTransfers.length === transfers.length &&
                  transfers.length > 0
                }
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                  onSelectAll(e.target.checked);
                }}
                aria-label='Select all transfers'
              />
            </th>
            <th scope='col' style={thStyle}>
              Job
            </th>
            <th scope='col' style={thStyle}>
              Contractor
            </th>
            <th
              scope='col'
              style={{ padding: theme.spacing.md, textAlign: 'right' as const }}
            >
              Platform Fee
            </th>
            <th
              scope='col'
              style={{ padding: theme.spacing.md, textAlign: 'right' as const }}
            >
              Net Revenue
            </th>
            <th scope='col' style={thStyle}>
              Status
            </th>
            <th scope='col' style={thStyle}>
              Created
            </th>
            <th scope='col' style={thStyle}>
              Actions
            </th>
          </tr>
        </thead>
        <tbody>
          {transfers.map((transfer) => (
            <FeeTransferRow
              key={transfer.id}
              transfer={transfer}
              selected={selectedTransfers.includes(transfer.id)}
              onToggleSelect={onToggleSelect}
              onHold={onHold}
              onRelease={onRelease}
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeeTransferRow({
  transfer,
  selected,
  onToggleSelect,
  onHold,
  onRelease,
  formatCurrency,
  formatDate,
  getStatusColor,
}: {
  transfer: FeeTransfer;
  selected: boolean;
  onToggleSelect: (id: string, checked: boolean) => void;
  onHold: (transferId: string) => void;
  onRelease: (transferId: string) => void;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  getStatusColor: (status: string) => string;
}) {
  const tdStyle = {
    padding: theme.spacing[4],
    fontSize: theme.typography.fontSize.base,
    color: theme.colors.textPrimary,
  };

  return (
    <tr
      style={{
        borderBottom: `1px solid ${theme.colors.border}`,
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor =
          theme.colors.backgroundSecondary;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
    >
      <td style={tdStyle}>
        <input
          type='checkbox'
          checked={selected}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            onToggleSelect(transfer.id, e.target.checked);
          }}
        />
      </td>
      <td style={tdStyle}>{transfer.jobs?.title || 'N/A'}</td>
      <td style={tdStyle}>
        {transfer.users
          ? `${transfer.users.first_name} ${transfer.users.last_name}`
          : 'N/A'}
      </td>
      <td style={{ padding: theme.spacing.md, textAlign: 'right' }}>
        {formatCurrency(transfer.amount)}
      </td>
      <td style={{ padding: theme.spacing.md, textAlign: 'right' }}>
        {formatCurrency(transfer.net_revenue)}
      </td>
      <td style={tdStyle}>
        <span
          style={{
            padding: `${theme.spacing[1]} ${theme.spacing[3]}`,
            borderRadius: theme.borderRadius.full,
            backgroundColor: `${getStatusColor(transfer.status)}20`,
            color: getStatusColor(transfer.status),
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.semibold,
            textTransform: 'capitalize',
          }}
        >
          {transfer.status}
        </span>
      </td>
      <td
        style={{
          padding: theme.spacing[4],
          fontSize: theme.typography.fontSize.sm,
          color: theme.colors.textSecondary,
        }}
      >
        {formatDate(transfer.created_at)}
      </td>
      <td style={tdStyle}>
        <div style={{ display: 'flex', gap: theme.spacing[2] }}>
          {transfer.status === 'held' && (
            <Button
              size='sm'
              variant='primary'
              onClick={() => onRelease(transfer.id)}
              style={{ fontSize: theme.typography.fontSize.sm }}
            >
              <Icon name='unlock' size={16} /> Release
            </Button>
          )}
          {transfer.status === 'pending' && (
            <Button
              size='sm'
              variant='secondary'
              onClick={() => onHold(transfer.id)}
              style={{ fontSize: theme.typography.fontSize.sm }}
            >
              <Icon name='lock' size={16} /> Hold
            </Button>
          )}
        </div>
      </td>
    </tr>
  );
}
