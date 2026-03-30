'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { CircleDollarSign } from 'lucide-react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
import { Icon } from '@/components/ui/Icon';
import { logger } from '@mintenance/shared';
import { getCsrfHeaders } from '@/lib/csrf-client';
import { FeeTransferTable } from './FeeTransferTable';
import { HoldTransferDialog, ErrorDialog } from './FeeTransferDialogs';

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

export function FeeTransferManagementClient() {
  const [transfers, setTransfers] = useState<FeeTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([]);
  const [holdDialog, setHoldDialog] = useState<{
    open: boolean;
    transferId?: string;
  }>({ open: false });
  const [holdReason, setHoldReason] = useState('');
  const [errorDialog, setErrorDialog] = useState<{
    open: boolean;
    message: string;
  }>({ open: false, message: '' });

  const fetchPendingTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(
        '/api/admin/escrow/fee-transfer/pending?limit=100'
      );
      if (!response.ok) {
        throw new Error('Failed to fetch pending fee transfers');
      }
      const data = await response.json();
      setTransfers(data.transfers || []);
    } catch (error) {
      logger.error('Error fetching pending transfers:', error);
      setErrorDialog({ open: true, message: 'Failed to load fee transfers' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingTransfers();
    // Refresh every 30 seconds
    const interval = setInterval(fetchPendingTransfers, 30000);
    return () => clearInterval(interval);
  }, [fetchPendingTransfers]);

  const handleHoldTransfer = async () => {
    if (!holdDialog.transferId || !holdReason.trim()) {
      return;
    }

    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/escrow/fee-transfer/hold', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({
          feeTransferId: holdDialog.transferId,
          reason: holdReason,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to hold fee transfer');
      }

      setHoldDialog({ open: false });
      setHoldReason('');
      fetchPendingTransfers();
    } catch (error) {
      setErrorDialog({ open: true, message: 'Failed to hold fee transfer' });
    }
  };

  const handleReleaseTransfer = async (transferId: string) => {
    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/escrow/fee-transfer/release', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ feeTransferId: transferId }),
      });

      if (!response.ok) {
        throw new Error('Failed to release fee transfer');
      }

      fetchPendingTransfers();
    } catch (error) {
      setErrorDialog({ open: true, message: 'Failed to release fee transfer' });
    }
  };

  const handleBatchRelease = async () => {
    if (selectedTransfers.length === 0) return;

    try {
      const csrfHeaders = await getCsrfHeaders();
      const response = await fetch('/api/admin/escrow/fee-transfer/batch', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders },
        body: JSON.stringify({ feeTransferIds: selectedTransfers }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch release fee transfers');
      }

      setSelectedTransfers([]);
      fetchPendingTransfers();
    } catch (error) {
      setErrorDialog({
        open: true,
        message: 'Failed to batch release fee transfers',
      });
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'transferred':
        return theme.colors.success;
      case 'held':
        return theme.colors.warning;
      case 'pending':
        return theme.colors.info;
      case 'failed':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const pendingCount = transfers.filter((t) => t.status === 'pending').length;
  const heldCount = transfers.filter((t) => t.status === 'held').length;
  const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
  const totalNetRevenue = transfers.reduce((sum, t) => sum + t.net_revenue, 0);

  return (
    <div
      style={{
        padding: theme.spacing[8],
        maxWidth: '1440px',
        margin: '0 auto',
        width: '100%',
      }}
    >
      <AdminPageHeader
        title='Fee Transfer Management'
        subtitle='Manage platform fee transfers and holds'
        quickStats={[
          {
            label: 'pending',
            value: pendingCount,
            icon: 'clock',
            color: theme.colors.info,
          },
          {
            label: 'on hold',
            value: heldCount,
            icon: 'lock',
            color: theme.colors.warning,
          },
          {
            label: 'total amount',
            value: formatCurrency(totalAmount),
            icon: 'currencyPound',
            color: theme.colors.success,
          },
        ]}
      />

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
          label='Pending Transfers'
          value={pendingCount}
          icon='clock'
          iconColor={theme.colors.info}
        />
        <AdminMetricCard
          label='On Hold'
          value={heldCount}
          icon='lock'
          iconColor={theme.colors.warning}
        />
        <AdminMetricCard
          label='Total Amount'
          value={formatCurrency(totalAmount)}
          icon='currencyPound'
          iconColor={theme.colors.success}
        />
        <AdminMetricCard
          label='Net Revenue'
          value={formatCurrency(totalNetRevenue)}
          icon='trendingUp'
          iconColor={theme.colors.success}
        />
      </div>

      {selectedTransfers.length > 0 && (
        <Card
          style={{ marginBottom: theme.spacing[6], padding: theme.spacing[4] }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span
              style={{
                fontSize: theme.typography.fontSize.base,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.textPrimary,
              }}
            >
              {selectedTransfers.length} transfer(s) selected
            </span>
            <Button onClick={handleBatchRelease} variant='primary'>
              <Icon name='checkCircle' size={16} /> Batch Release Selected
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div
            style={{
              padding: theme.spacing[8],
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                border: '4px solid #d1d5db',
                borderTopColor: '#4b5563',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        ) : transfers.length === 0 ? (
          <div
            style={{
              padding: '64px 16px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}
            >
              <CircleDollarSign
                className='w-8 h-8'
                style={{ color: '#94a3b8' }}
              />
            </div>
            <h3
              style={{
                fontSize: 18,
                fontWeight: 600,
                color: theme.colors.text,
                marginBottom: 4,
              }}
            >
              No Pending Transfers
            </h3>
            <p
              style={{
                fontSize: 14,
                color: theme.colors.textSecondary,
                maxWidth: 384,
              }}
            >
              Fee transfers will appear here when escrow payments are released.
            </p>
          </div>
        ) : (
          <FeeTransferTable
            transfers={transfers}
            selectedTransfers={selectedTransfers}
            onSelectAll={(checked) => {
              if (checked) {
                setSelectedTransfers(transfers.map((t) => t.id));
              } else {
                setSelectedTransfers([]);
              }
            }}
            onToggleSelect={(id, checked) => {
              if (checked) {
                setSelectedTransfers([...selectedTransfers, id]);
              } else {
                setSelectedTransfers(
                  selectedTransfers.filter((tid) => tid !== id)
                );
              }
            }}
            onHold={(transferId) => setHoldDialog({ open: true, transferId })}
            onRelease={handleReleaseTransfer}
            formatCurrency={formatCurrency}
            formatDate={formatDate}
            getStatusColor={getStatusColor}
          />
        )}
      </Card>

      {/* Hold Dialog */}
      <HoldTransferDialog
        open={holdDialog.open}
        holdReason={holdReason}
        onOpenChange={(open) => setHoldDialog({ open })}
        onReasonChange={setHoldReason}
        onConfirm={handleHoldTransfer}
      />

      {/* Error Dialog */}
      <ErrorDialog
        open={errorDialog.open}
        message={errorDialog.message}
        onClose={() => setErrorDialog({ open: false, message: '' })}
      />
    </div>
  );
}
