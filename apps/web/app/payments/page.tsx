'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { PaymentCard } from '@/components/payments/PaymentCard';
import { PaymentService } from '@/lib/services/PaymentService';
import Logo from '../components/Logo';
import Link from 'next/link';
import type { EscrowTransaction, User } from '@mintenance/types';

export default function PaymentsPage() {
  const router = useRouter();
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
      const userTransactions = await PaymentService.getUserPaymentHistory(currentUser.id);
      setTransactions(userTransactions);
    } catch (err) {
      console.error('Error loading payments:', err);
      setError('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async (transactionId: string) => {
    try {
      await PaymentService.releaseEscrowPayment(transactionId);
      alert('Payment released successfully!');
      loadUserAndPayments(); // Refresh the list
    } catch (error: any) {
      console.error('Error releasing payment:', error);
      alert(error.message || 'Failed to release payment');
    }
  };

  const handleRefundPayment = async (transactionId: string) => {
    const reason = prompt('Please provide a reason for the refund:');
    if (!reason) return;

    try {
      await PaymentService.refundEscrowPayment(transactionId, reason);
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

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.backgroundSecondary
    }}>
      {/* Logo Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: theme.spacing[6],
        backgroundColor: theme.colors.surface,
        borderBottom: `1px solid ${theme.colors.border}`,
      }}>
        <Link href="/" style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}>
          <Logo />
          <span style={{
            marginLeft: theme.spacing[3],
            fontSize: theme.typography.fontSize['2xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.textPrimary
          }}>
            Mintenance
          </span>
        </Link>
      </div>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
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
              marginBottom: '4px'
            }}>
              💰 Payments & Escrow
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
            >
              📋 View Jobs
            </Button>
            <Button
              onClick={loadUserAndPayments}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              🔄 Refresh
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
            <div style={{
              padding: theme.spacing.xl,
              textAlign: 'center'
            }}>
              <div style={{
                fontSize: theme.typography.fontSize['4xl'],
                marginBottom: theme.spacing.lg
              }}>
                💳
              </div>
              <h3 style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                marginBottom: theme.spacing.md
              }}>
                No payments found
              </h3>
              <p style={{
                color: theme.colors.textSecondary,
                fontSize: theme.typography.fontSize.base,
                marginBottom: theme.spacing.lg,
                maxWidth: '500px',
                margin: `0 auto ${theme.spacing.lg}`
              }}>
                {filter === 'all'
                  ? 'You haven\'t made any payments yet. Start by posting a job or applying to jobs to begin transacting.'
                  : `No ${filter} payments found. Try changing the filter to see other transactions.`
                }
              </p>
              <div style={{
                display: 'flex',
                gap: theme.spacing.md,
                justifyContent: 'center',
                flexWrap: 'wrap'
              }}>
                <Button
                  onClick={() => router.push('/jobs')}
                  variant="primary"
                >
                  📋 Browse Jobs
                </Button>
                <Button
                  onClick={() => router.push('/contractors')}
                  variant="outline"
                >
                  🔧 Find Contractors
                </Button>
              </div>
            </div>
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
    </div>
  );
}