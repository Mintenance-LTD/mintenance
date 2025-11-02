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
import type { EscrowTransaction, User } from '@mintenance/types';

export default function PaymentsPage() {
  const router = useRouter();
  const { csrfToken } = useCSRF();
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<EscrowTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');

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
      console.error('Error loading payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async (transactionId: string) => {
    if (!csrfToken) {
      alert('Security token not loaded. Please refresh the page.');
      return;
    }

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
      
      alert('Payment released successfully!');
      loadUserAndPayments(); // Refresh the list
    } catch (error: any) {
      console.error('Error releasing payment:', error);
      alert(error.message || 'Failed to release payment');
    }
  };

  const handleRefundPayment = async (transactionId: string) => {
    if (!csrfToken) {
      alert('Security token not loaded. Please refresh the page.');
      return;
    }

    const reason = prompt('Please provide a reason for the refund:');
    if (!reason) return;

    const transaction = transactions.find(t => t.id === transactionId);
    if (!transaction) {
      alert('Transaction not found');
      return;
    }

    try {
      const response = await fetch('/api/payments/refund', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify({
          escrowTransactionId: transactionId,
          jobId: transaction.jobId,
          amount: transaction.amount,
          reason
        }),
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to request refund');
      }
      
      alert('Refund request submitted successfully!');
      loadUserAndPayments(); // Refresh the list
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      alert(error.message || 'Failed to request refund');
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
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <h1 style={{
              fontSize: theme.typography.fontSize['3xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: theme.spacing[1],
              display: 'flex',
              alignItems: 'center',
              gap: theme.spacing[2]
            }}>
              <Icon name="creditCard" size={28} color={theme.colors.primary} />
              Payments & Escrow
            </h1>
            <p style={{
              color: theme.colors.textSecondary,
              fontSize: theme.typography.fontSize.base,
              margin: 0
            }}>
              Manage your secure payments and escrow transactions
            </p>
          </div>
          <div style={{ display: 'flex', gap: theme.spacing.sm }}>
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
            <button
              key={status}
              onClick={() => setFilter(status)}
              style={{
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.md,
                border: 'none',
                backgroundColor: filter === status ? theme.colors.primary : theme.colors.backgroundSecondary,
                color: filter === status ? theme.colors.white : theme.colors.text,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textTransform: 'capitalize',
              }}
            >
              {status} {status !== 'all' && statusCounts[status] ? `(${statusCounts[status]})` : ''}
            </button>
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
              icon={<Icon name="creditCard" size={64} color={theme.colors.textTertiary} />}
              title={filter === 'all' ? 'No payments yet' : `No ${filter} payments`}
              description={
                filter === 'all'
                  ? 'You haven\'t made any payments yet. Start by posting a job or applying to jobs to begin transacting.'
                  : `No ${filter} payments found. Try changing the filter to see other transactions.`
              }
              action={{
                label: filter === 'all' ? 'Browse Jobs' : 'Clear Filter',
                onClick: filter === 'all' ? () => router.push('/jobs') : () => setFilter('all')
              }}
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
      </div>
    </HomeownerLayoutShell>
  );
}