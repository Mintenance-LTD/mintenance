'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { theme } from '@/lib/theme';
import { Card } from '@/components/ui/Card.unified';
import { Button } from '@/components/ui/Button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { AdminMetricCard } from '@/components/admin/AdminMetricCard';
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

export function FeeTransferManagementClient() {
  const [transfers, setTransfers] = useState<FeeTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTransfers, setSelectedTransfers] = useState<string[]>([]);
  const [holdDialog, setHoldDialog] = useState<{ open: boolean; transferId?: string }>({ open: false });
  const [holdReason, setHoldReason] = useState('');
  const [errorDialog, setErrorDialog] = useState<{ open: boolean; message: string }>({ open: false, message: '' });

  const fetchPendingTransfers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/escrow/fee-transfer/pending?limit=100');
      if (!response.ok) {
        throw new Error('Failed to fetch pending fee transfers');
      }
      const data = await response.json();
      setTransfers(data.transfers || []);
    } catch (error) {
      console.error('Error fetching pending transfers:', error);
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
      const response = await fetch('/api/admin/escrow/fee-transfer/hold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch('/api/admin/escrow/fee-transfer/release', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch('/api/admin/escrow/fee-transfer/batch', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feeTransferIds: selectedTransfers }),
      });

      if (!response.ok) {
        throw new Error('Failed to batch release fee transfers');
      }

      setSelectedTransfers([]);
      fetchPendingTransfers();
    } catch (error) {
      setErrorDialog({ open: true, message: 'Failed to batch release fee transfers' });
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

  const pendingCount = transfers.filter(t => t.status === 'pending').length;
  const heldCount = transfers.filter(t => t.status === 'held').length;
  const totalAmount = transfers.reduce((sum, t) => sum + t.amount, 0);
  const totalNetRevenue = transfers.reduce((sum, t) => sum + t.net_revenue, 0);

  return (
    <div style={{ 
      padding: theme.spacing[8],
      maxWidth: '1440px',
      margin: '0 auto',
      width: '100%',
    }}>
      <AdminPageHeader
        title="Fee Transfer Management"
        subtitle="Manage platform fee transfers and holds"
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
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: theme.spacing[4],
        marginBottom: theme.spacing[8],
      }}>
        <AdminMetricCard
          label="Pending Transfers"
          value={pendingCount}
          icon="clock"
          iconColor={theme.colors.info}
        />
        <AdminMetricCard
          label="On Hold"
          value={heldCount}
          icon="lock"
          iconColor={theme.colors.warning}
        />
        <AdminMetricCard
          label="Total Amount"
          value={formatCurrency(totalAmount)}
          icon="currencyPound"
          iconColor={theme.colors.success}
        />
        <AdminMetricCard
          label="Net Revenue"
          value={formatCurrency(totalNetRevenue)}
          icon="trendingUp"
          iconColor={theme.colors.success}
        />
      </div>

      {selectedTransfers.length > 0 && (
        <Card style={{ marginBottom: theme.spacing[6], padding: theme.spacing[4] }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{
              fontSize: theme.typography.fontSize.base,
              fontWeight: theme.typography.fontWeight.medium,
              color: theme.colors.textPrimary,
            }}>
              {selectedTransfers.length} transfer(s) selected
            </span>
            <Button onClick={handleBatchRelease} variant="primary">
              <Icon name="checkCircle" size={16} /> Batch Release Selected
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div style={{ padding: theme.spacing[8], textAlign: 'center' }}>Loading...</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: theme.spacing[8], textAlign: 'center', color: theme.colors.textSecondary }}>
            No pending fee transfers
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.colors.border}`, backgroundColor: theme.colors.backgroundSecondary }}>
                  <th style={{ padding: theme.spacing[4], textAlign: 'left', fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', backgroundColor: theme.colors.backgroundSecondary }}>
                    <input
                      type="checkbox"
                      checked={selectedTransfers.length === transfers.length && transfers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedTransfers(transfers.map((t) => t.id));
                        } else {
                          setSelectedTransfers([]);
                        }
                      }}
                    />
                  </th>
                  <th style={{ padding: theme.spacing[4], textAlign: 'left', fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', backgroundColor: theme.colors.backgroundSecondary }}>Job</th>
                  <th style={{ padding: theme.spacing[4], textAlign: 'left', fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', backgroundColor: theme.colors.backgroundSecondary }}>Contractor</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'right' }}>Platform Fee</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'right' }}>Net Revenue</th>
                  <th style={{ padding: theme.spacing[4], textAlign: 'left', fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', backgroundColor: theme.colors.backgroundSecondary }}>Status</th>
                  <th style={{ padding: theme.spacing[4], textAlign: 'left', fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', backgroundColor: theme.colors.backgroundSecondary }}>Created</th>
                  <th style={{ padding: theme.spacing[4], textAlign: 'left', fontSize: theme.typography.fontSize.xs, fontWeight: theme.typography.fontWeight.semibold, color: theme.colors.textSecondary, textTransform: 'uppercase', backgroundColor: theme.colors.backgroundSecondary }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr 
                    key={transfer.id} 
                    style={{ 
                      borderBottom: `1px solid ${theme.colors.border}`,
                      transition: 'background-color 0.2s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.colors.backgroundSecondary;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }}
                  >
                    <td style={{ padding: theme.spacing[4], fontSize: theme.typography.fontSize.base, color: theme.colors.textPrimary }}>
                      <input
                        type="checkbox"
                        checked={selectedTransfers.includes(transfer.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedTransfers([...selectedTransfers, transfer.id]);
                          } else {
                            setSelectedTransfers(selectedTransfers.filter((id) => id !== transfer.id));
                          }
                        }}
                      />
                    </td>
                    <td style={{ padding: theme.spacing[4], fontSize: theme.typography.fontSize.base, color: theme.colors.textPrimary }}>
                      {transfer.jobs?.title || 'N/A'}
                    </td>
                    <td style={{ padding: theme.spacing[4], fontSize: theme.typography.fontSize.base, color: theme.colors.textPrimary }}>
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
                    <td style={{ padding: theme.spacing[4], fontSize: theme.typography.fontSize.base, color: theme.colors.textPrimary }}>
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
                    <td style={{ padding: theme.spacing[4], fontSize: theme.typography.fontSize.sm, color: theme.colors.textSecondary }}>
                      {formatDate(transfer.created_at)}
                    </td>
                    <td style={{ padding: theme.spacing[4], fontSize: theme.typography.fontSize.base, color: theme.colors.textPrimary }}>
                      <div style={{ display: 'flex', gap: theme.spacing[2] }}>
                        {transfer.status === 'held' && (
                          <Button
                            size="sm"
                            variant="primary"
                            onClick={() => handleReleaseTransfer(transfer.id)}
                            style={{ fontSize: theme.typography.fontSize.sm }}
                          >
                            <Icon name="unlock" size={16} /> Release
                          </Button>
                        )}
                        {transfer.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setHoldDialog({ open: true, transferId: transfer.id })}
                            style={{ fontSize: theme.typography.fontSize.sm }}
                          >
                            <Icon name="lock" size={16} /> Hold
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Hold Dialog */}
      <AlertDialog open={holdDialog.open} onOpenChange={(open) => setHoldDialog({ open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hold Fee Transfer</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a reason for holding this fee transfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div style={{ marginBottom: theme.spacing[4] }}>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="Reason for hold..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: theme.spacing[3],
                border: `1px solid ${theme.colors.border}`,
                borderRadius: theme.borderRadius.md,
              }}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button onClick={handleHoldTransfer} disabled={!holdReason.trim()}>
              Hold Transfer
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Error Dialog */}
      <AlertDialog open={errorDialog.open} onOpenChange={(open) => setErrorDialog({ open, message: '' })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Error</AlertDialogTitle>
            <AlertDialogDescription>{errorDialog.message}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <Button onClick={() => setErrorDialog({ open: false, message: '' })}>Close</Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

