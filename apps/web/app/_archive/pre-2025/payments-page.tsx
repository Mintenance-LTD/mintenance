'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Icon } from '@/components/ui/Icon';
import { Breadcrumbs } from '@/components/ui/Breadcrumbs';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { HomeownerLayoutShell } from '../dashboard/components/HomeownerLayoutShell';
import { useCSRF } from '@/lib/hooks/useCSRF';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/label';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { EscrowTransaction, User } from '@mintenance/types';

export default function PaymentsPage() {
  const router = useRouter();
  const { csrfToken } = useCSRF();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [alertDialog, setAlertDialog] = useState<{
    open: boolean;
    title: string;
    message: string;
    onConfirm?: () => void;
  }>({ open: false, title: '', message: '' });
  const [refundDialog, setRefundDialog] = useState<{
    open: boolean;
    transactionId: string | null;
    reason: string;
  }>({ open: false, transactionId: null, reason: '' });
  const [successAlert, setSuccessAlert] = useState<{ show: boolean; message: string }>({ show: false, message: '' });

  // Set page title
  useEffect(() => {
    document.title = 'Payments | Mintenance';
  }, []);

  useEffect(() => {
    loadUserAndPayments();
  }, []);

  const loadUserAndPayments = async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);
      
      // Fetch from API route instead of client-side service
      const response = await fetch('/api/payments/history');
      if (!response.ok) {
        throw new Error('Failed to load payment history');
      }
      const { payments } = await response.json();
      setTransactions(payments || []);
    } catch (err) {
      logger.error('Error loading payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async (transactionId: string) => {
    if (!csrfToken) {
      setAlertDialog({
        open: true,
        title: 'Security Error',
        message: 'Security token not loaded. Please refresh the page.',
      });
      return;
    }

    setAlertDialog({
      open: true,
      title: 'Release Payment',
      message: 'Are you sure you want to release this payment? This action cannot be undone.',
      onConfirm: async () => {
        try {
          const response = await fetch('/api/payments/release-escrow', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-csrf-token': csrfToken,
            },
            body: JSON.stringify({
              escrowTransactionId: transactionId,
              releaseReason: 'job_completed'
            }),
          });
          
          if (!response.ok) {
            const data = await response.json();
            throw new Error(data.error || 'Failed to release payment');
          }
          
          setSuccessAlert({ show: true, message: 'Payment released successfully!' });
          setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
          loadUserAndPayments(); // Refresh the list
        } catch (error: any) {
          logger.error('Error releasing payment:', error);
          setAlertDialog({
            open: true,
            title: 'Error',
            message: error.message || 'Failed to release payment',
          });
        }
      },
    });
  };

  const handleRefundPayment = async (transactionId: string) => {
    if (!csrfToken) {
      setAlertDialog({
        open: true,
        title: 'Security Error',
        message: 'Security token not loaded. Please refresh the page.',
      });
      return;
    }

    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Transaction not found',
      });
      return;
    }

    setRefundDialog({ open: true, transactionId, reason: '' });
  };

  const confirmRefund = async () => {
    if (!refundDialog.transactionId || !refundDialog.reason.trim()) {
      setAlertDialog({
        open: true,
        title: 'Validation Error',
        message: 'Please provide a reason for the refund',
      });
      return;
    }

    const transaction = transactions.find(t => t.id === refundDialog.transactionId);
    if (!transaction) {
      setAlertDialog({
        open: true,
        title: 'Error',
        message: 'Transaction not found',
      });
      return;
    }

    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken!,
        },
        body: JSON.stringify({
          escrowTransactionId: refundDialog.transactionId,
          jobId: transaction.jobId,
          amount: transaction.amount,
          reason: refundDialog.reason.trim()
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request refund');
      }
      
      setSuccessAlert({ show: true, message: 'Refund request submitted successfully!' });
      setTimeout(() => setSuccessAlert({ show: false, message: '' }), 3000);
      setRefundDialog({ open: false, transactionId: null, reason: '' });
      loadUserAndPayments(); // Refresh the list
    } catch (error: any) {
      logger.error('Error requesting refund:', error);
      setAlertDialog({
        open: true,
        title: 'Error',
        message: error.message || 'Failed to request refund',
      });
    }
  };

  const handleViewDetails = (transactionId: string) => {
    router.push(`/payments/${transactionId}`);
  };

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  const getStatusCounts = () => {
    const counts = transactions.reduce((acc, transaction) => {
      acc[transaction.status] = (acc[transaction.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    return counts;
  };

  const statusCounts = getStatusCounts();
  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
  const totalReleased = transactions
    .filter(t => t.status === 'released')
    .reduce((sum, t) => sum + t.amount, 0);

  if (!user) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary
      }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            marginBottom: theme.spacing.md
          }}>
            Access Denied
          </h1>
          <p style={{
            color: theme.colors.textSecondary,
            marginBottom: theme.spacing.lg
          }}>
            You must be logged in to view payments.
          </p>
          <Button
            onClick={() => router.push('/login')}
            variant="primary"
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const userDisplayName = user.first_name && user.last_name 
    ? `${user.first_name} ${user.last_name}`.trim() 
    : user.email;

  return (
    <HomeownerLayoutShell 
      currentPath="/payments"
      userName={user.first_name && user.last_name ? `${user.first_name} ${user.last_name}`.trim() : undefined}
      userEmail={user.email}
    >
      <div style={{
        maxWidth: '1440px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
        {/* Breadcrumbs */}
        <Breadcrumbs 
          items={[
            { label: 'Home', href: '/' },
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Payments', current: true }
          ]}
          style={{ marginBottom: theme.spacing[4] }}
        />

        {/* Header */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-50 via-white to-gray-50 p-8 -m-8 rounded-2xl mb-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-50 to-secondary-50 flex items-center justify-center shadow-sm">
                <Icon name="creditCard" size={28} color={theme.colors.primary} />
              </div>
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2 tracking-tight">
                  Payments & Escrow
                </h1>
                <p className="text-base font-medium text-gray-600 leading-relaxed">
                  Manage your secure payments and escrow transactions
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={() => router.push('/jobs')}
                variant="outline"
                size="sm"
                leftIcon={<Icon name="briefcase" size={16} />}
              >
                View Jobs
              </Button>
              <Button
                onClick={loadUserAndPayments}
                variant="outline"
                size="sm"
                disabled={loading}
                leftIcon={<Icon name="refresh" size={16} />}
              >
                Refresh
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: theme.spacing.lg,
          marginBottom: theme.spacing.lg
        }}>
          <div style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.sm,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
              marginBottom: theme.spacing.xs
            }}>
              {transactions.length}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Total Transactions
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.sm,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.success,
              marginBottom: theme.spacing.xs
            }}>
              ${totalAmount.toLocaleString()}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Total Volume
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.sm,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.info,
              marginBottom: theme.spacing.xs
            }}>
              {statusCounts.held || 0}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              In Escrow
            </div>
          </div>

          <div style={{
            backgroundColor: theme.colors.white,
            padding: theme.spacing.lg,
            borderRadius: theme.borderRadius.lg,
            boxShadow: theme.shadows.sm,
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.success,
              marginBottom: theme.spacing.xs
            }}>
              ${totalReleased.toLocaleString()}
            </div>
            <div style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary
            }}>
              Released
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.md,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm,
          display: 'flex',
          gap: theme.spacing.sm,
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <span style={{
            fontSize: theme.typography.fontSize.sm,
            fontWeight: theme.typography.fontWeight.medium,
            color: theme.colors.text,
            marginRight: theme.spacing.sm
          }}>
            Filter:
          </span>
          {['all', 'pending', 'held', 'released', 'refunded'].map(status => (
            <Button
              key={status}
              variant={filter === status ? 'primary' : 'outline'}
              size="sm"
              onClick={() => setFilter(status)}
              className="capitalize"
            >
              {status} {status !== 'all' && statusCounts[status] ? `(${statusCounts[status]})` : ''}
            </Button>
          ))}
        </div>

        {/* Payments Content */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          boxShadow: theme.shadows.sm,
          overflow: 'hidden'
        }}>
          {loading && (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: theme.typography.fontSize.lg,
                color: theme.colors.textSecondary
              }}>
                Loading payments...
              </div>
            </div>
          )}

          {successAlert.show && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800">Success</AlertTitle>
              <AlertDescription className="text-green-700">
                {successAlert.message}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center'
            }}>
              <div style={{
                color: theme.colors.error,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing.md
              }}>
                {error}
              </div>
              <Button
                onClick={loadUserAndPayments}
                variant="outline"
                size="sm"
              >
                Try Again
              </Button>
            </div>
          )}

          {!loading && !error && filteredTransactions.length === 0 && (
            <EmptyState
              variant="default"
              icon="creditCard"
              title={filter === 'all' ? 'No payments yet' : `No ${filter} payments`}
              description={
                filter === 'all'
                  ? 'You haven\'t made any payments yet. Start by posting a job or applying to jobs to begin transacting.'
                  : `No ${filter} payments found. Try changing the filter to see other transactions.`
              }
              actionLabel={filter === 'all' ? 'Browse Jobs' : 'Clear Filter'}
              onAction={filter === 'all' ? () => router.push('/jobs') : () => setFilter('all')}
            />
          )}

          {!loading && !error && filteredTransactions.length > 0 && (
            <div style={{ padding: theme.spacing.lg }}>
              {filteredTransactions.map((transaction) => (
                <PaymentCard
                  key={transaction.id}
                  transaction={transaction}
                  currentUserId={user.id}
                  onRelease={handleReleasePayment}
                  onRefund={handleRefundPayment}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          )}
        </div>

        {/* Alert Dialog */}
        <AlertDialog open={alertDialog.open} onOpenChange={(open: boolean) => setAlertDialog({ ...alertDialog, open })}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{alertDialog.title}</AlertDialogTitle>
              <AlertDialogDescription>{alertDialog.message}</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setAlertDialog({ open: false, title: '', message: '' })}>
                {alertDialog.onConfirm ? 'Cancel' : 'OK'}
              </AlertDialogCancel>
              {alertDialog.onConfirm && (
                <AlertDialogAction onClick={() => {
                  alertDialog.onConfirm?.();
                  setAlertDialog({ open: false, title: '', message: '' });
                }}>
                  Confirm
                </AlertDialogAction>
              )}
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Refund Dialog */}
        <Dialog open={refundDialog.open} onOpenChange={(open: boolean) => setRefundDialog({ ...refundDialog, open })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Refund</DialogTitle>
              <DialogDescription>
                Please provide a reason for requesting this refund.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="refund-reason">Reason *</Label>
                <Input
                  id="refund-reason"
                  value={refundDialog.reason}
                  onChange={(e) => setRefundDialog({ ...refundDialog, reason: e.target.value })}
                  placeholder="Enter reason for refund..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setRefundDialog({ open: false, transactionId: null, reason: '' })}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={confirmRefund}
                disabled={!refundDialog.reason.trim()}
              >
                Submit Refund Request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </HomeownerLayoutShell>
  );
}