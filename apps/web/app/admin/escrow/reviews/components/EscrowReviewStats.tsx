'use client';

import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';

interface EscrowReviewStatsProps {
  pendingCount: number;
  heldCount: number;
  totalAmount: string;
  reviewCount: number;
  selectedCount: number;
  actionLoading: boolean;
  onBulkApprove: () => void;
  onBulkHold: () => void;
  onClearSelection: () => void;
}

export function EscrowReviewStats({
  pendingCount,
  heldCount,
  totalAmount,
  reviewCount,
  selectedCount,
  actionLoading,
  onBulkApprove,
  onBulkHold,
  onClearSelection,
}: EscrowReviewStatsProps) {
  return (
    <>
      <AdminPageHeader
        title='Escrow Review Dashboard'
        subtitle='Review and approve escrow releases for completed jobs'
        quickStats={[
          {
            label: 'pending',
            value: pendingCount,
            icon: 'clock',
            color: '#F59E0B',
          },
          {
            label: 'on hold',
            value: heldCount,
            icon: 'lock',
            color: theme.colors.warning,
          },
          {
            label: 'total amount',
            value: totalAmount,
            icon: 'currencyPound',
            color: theme.colors.success,
          },
        ]}
      />

      {/* Bulk Actions Bar */}
      {selectedCount > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: theme.spacing[3],
            padding: `${theme.spacing[3]} ${theme.spacing[4]}`,
            marginBottom: theme.spacing[4],
            backgroundColor: '#EFF6FF',
            borderRadius: theme.borderRadius.md,
            border: '1px solid #BFDBFE',
          }}
        >
          <span
            style={{
              fontSize: theme.typography.fontSize.sm,
              fontWeight: 600,
              color: '#1E40AF',
            }}
          >
            {selectedCount} selected
          </span>
          <Button size='sm' onClick={onBulkApprove} disabled={actionLoading}>
            Approve Selected
          </Button>
          <Button
            size='sm'
            variant='outline'
            onClick={onBulkHold}
            disabled={actionLoading}
          >
            Hold Selected
          </Button>
          <Button size='sm' variant='ghost' onClick={onClearSelection}>
            Clear
          </Button>
        </div>
      )}

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing[4],
          marginBottom: theme.spacing[8],
        }}
      >
        <AdminMetricCard
          label='Pending Reviews'
          value={pendingCount}
          icon='clock'
          iconColor='#F59E0B'
        />
        <AdminMetricCard
          label='On Hold'
          value={heldCount}
          icon='lock'
          iconColor={theme.colors.warning}
        />
        <AdminMetricCard
          label='Total Amount'
          value={totalAmount}
          icon='currencyPound'
          iconColor={theme.colors.success}
        />
        <AdminMetricCard
          label='Total Reviews'
          value={reviewCount}
          icon='fileText'
          iconColor={theme.colors.primary}
        />
      </div>
    </>
  );
}
