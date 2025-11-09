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

  return (
    <div style={{ padding: theme.spacing.lg }}>
      <div style={{ marginBottom: theme.spacing.xl }}>
        <h1 style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold }}>
          Fee Transfer Management
        </h1>
        <p style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>
          Manage platform fee transfers and holds
        </p>
      </div>

      {selectedTransfers.length > 0 && (
        <Card style={{ marginBottom: theme.spacing.lg, padding: theme.spacing.md }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{selectedTransfers.length} transfer(s) selected</span>
            <Button onClick={handleBatchRelease} variant="primary">
              Batch Release Selected
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {loading ? (
          <div style={{ padding: theme.spacing.xl, textAlign: 'center' }}>Loading...</div>
        ) : transfers.length === 0 ? (
          <div style={{ padding: theme.spacing.xl, textAlign: 'center', color: theme.colors.textSecondary }}>
            No pending fee transfers
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                  <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>
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
                  <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>Job</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>Contractor</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'right' }}>Platform Fee</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'right' }}>Net Revenue</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>Status</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>Created</th>
                  <th style={{ padding: theme.spacing.md, textAlign: 'left' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {transfers.map((transfer) => (
                  <tr key={transfer.id} style={{ borderBottom: `1px solid ${theme.colors.border}` }}>
                    <td style={{ padding: theme.spacing.md }}>
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
                    <td style={{ padding: theme.spacing.md }}>
                      {transfer.jobs?.title || 'N/A'}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
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
                    <td style={{ padding: theme.spacing.md }}>
                      <span
                        style={{
                          padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                          borderRadius: theme.borderRadius.md,
                          backgroundColor: `${getStatusColor(transfer.status)}20`,
                          color: getStatusColor(transfer.status),
                          fontSize: theme.typography.fontSize.sm,
                          fontWeight: theme.typography.fontWeight.medium,
                        }}
                      >
                        {transfer.status}
                      </span>
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      {formatDate(transfer.created_at)}
                    </td>
                    <td style={{ padding: theme.spacing.md }}>
                      <div style={{ display: 'flex', gap: theme.spacing.xs }}>
                        {transfer.status === 'held' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => handleReleaseTransfer(transfer.id)}
                          >
                            Release
                          </Button>
                        )}
                        {transfer.status === 'pending' && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setHoldDialog({ open: true, transferId: transfer.id })}
                          >
                            Hold
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
          <div style={{ marginBottom: theme.spacing.md }}>
            <textarea
              value={holdReason}
              onChange={(e) => setHoldReason(e.target.value)}
              placeholder="Reason for hold..."
              style={{
                width: '100%',
                minHeight: '100px',
                padding: theme.spacing.sm,
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

