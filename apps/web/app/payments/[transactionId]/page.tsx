'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { fetchCurrentUser } from '@/lib/auth-client';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import { PaymentService } from '@/lib/services/PaymentService';
import type { EscrowTransaction, User } from '@mintenance/types';

export default function PaymentDetailPage() {
  const router = useRouter();
  const params = useParams();
  const transactionId = params?.transactionId as string;

  const [user, setUser] = useState<User | null>(null);
  const [transaction, setTransaction] = useState<EscrowTransaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (transactionId) {
      loadTransactionDetails();
    }
  }, [transactionId]);

  const loadTransactionDetails = async () => {
    try {
      setLoading(true);
      const currentUser = await fetchCurrentUser();

      if (!currentUser) {
        router.push('/login');
        return;
      }

      setUser(currentUser);

      // Get user's payment history and find this transaction
      const userTransactions = await PaymentService.getUserPaymentHistory(currentUser.id);
      const foundTransaction = userTransactions.find(t => t.id === transactionId);

      if (!foundTransaction) {
        setError('Transaction not found');
        return;
      }

      setTransaction(foundTransaction);
    } catch (err) {
      console.error('Error loading transaction details:', err);
      setError('Failed to load transaction details');
    } finally {
      setLoading(false);
    }
  };

  const handleReleasePayment = async () => {
    if (!transaction) return;

    setProcessing(true);
    try {
      await PaymentService.releaseEscrowPayment(transaction.id);
      alert('Payment released successfully!');
      loadTransactionDetails(); // Refresh transaction data
    } catch (error: any) {
      console.error('Error releasing payment:', error);
      alert(error.message || 'Failed to release payment');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefundPayment = async () => {
    if (!transaction) return;

    const reason = prompt('Please provide a reason for the refund:');
    if (!reason) return;

    setProcessing(true);
    try {
      await PaymentService.refundEscrowPayment(transaction.id, reason);
      alert('Refund request submitted successfully!');
      loadTransactionDetails(); // Refresh transaction data
    } catch (error: any) {
      console.error('Error requesting refund:', error);
      alert(error.message || 'Failed to request refund');
    } finally {
      setProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return theme.colors.warning;
      case 'held': return theme.colors.info;
      case 'released': return theme.colors.success;
      case 'refunded': return theme.colors.error;
      default: return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'held': return '🔒';
      case 'released': return '✅';
      case 'refunded': return '↩️';
      default: return '❓';
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
            You must be logged in to view payment details.
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

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.backgroundSecondary
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: theme.typography.fontSize.lg,
            color: theme.colors.textSecondary
          }}>
            Loading payment details...
          </div>
        </div>
      </div>
    );
  }

  if (error || !transaction) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.colors.backgroundSecondary,
        padding: theme.spacing.lg
      }}>
        <div style={{
          maxWidth: '800px',
          margin: '0 auto',
          textAlign: 'center'
        }}>
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.xl,
            boxShadow: theme.shadows.sm
          }}>
            <div style={{
              fontSize: theme.typography.fontSize['4xl'],
              marginBottom: theme.spacing.lg
            }}>
              ❌
            </div>
            <h1 style={{
              fontSize: theme.typography.fontSize['2xl'],
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.error,
              marginBottom: theme.spacing.md
            }}>
              {error || 'Transaction Not Found'}
            </h1>
            <p style={{
              color: theme.colors.textSecondary,
              marginBottom: theme.spacing.lg
            }}>
              The payment transaction you&apos;re looking for could not be found or you don&apos;t have permission to view it.
            </p>
            <div style={{ display: 'flex', gap: theme.spacing.md, justifyContent: 'center' }}>
              <Button
                onClick={() => router.push('/payments')}
                variant="primary"
              >
                Back to Payments
              </Button>
              <Button
                onClick={() => router.push('/dashboard')}
                variant="outline"
              >
                Go to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isPayee = transaction.payeeId === user.id;
  const isPayer = transaction.payerId === user.id;
  const canRelease = isPayee && transaction.status === 'held';
  const canRefund = isPayer && ['pending', 'held'].includes(transaction.status);

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.colors.backgroundSecondary
    }}>
      <div style={{
        maxWidth: '800px',
        margin: '0 auto',
        padding: theme.spacing.lg
      }}>
        {/* Header */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: theme.spacing.md
          }}>
            <Button
              onClick={() => router.push('/payments')}
              variant="ghost"
              size="sm"
              style={{ marginRight: theme.spacing.md }}
            >
              ← Back to Payments
            </Button>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              backgroundColor: `${getStatusColor(transaction.status)}15`,
              color: getStatusColor(transaction.status),
              padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
              borderRadius: theme.borderRadius.full,
              fontSize: theme.typography.fontSize.sm,
              fontWeight: theme.typography.fontWeight.medium,
            }}>
              <span style={{ marginRight: '4px' }}>
                {getStatusIcon(transaction.status)}
              </span>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </div>
          </div>
          <h1 style={{
            fontSize: theme.typography.fontSize['3xl'],
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: '4px'
          }}>
            💰 Payment Details
          </h1>
          <p style={{
            color: theme.colors.textSecondary,
            fontSize: theme.typography.fontSize.base,
            margin: 0
          }}>
            Transaction ID: {transaction.id}
          </p>
        </div>

        {/* Payment Overview */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: theme.spacing.md
          }}>
            Payment Overview
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: theme.spacing.lg,
            marginBottom: theme.spacing.lg
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: theme.typography.fontSize['3xl'],
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.primary,
                marginBottom: theme.spacing.xs
              }}>
                {formatAmount(transaction.amount)}
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary
              }}>
                Payment Amount
              </div>
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: theme.typography.fontSize.xl,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                marginBottom: theme.spacing.xs
              }}>
                {transaction.job?.title || 'Job Payment'}
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.textSecondary
              }}>
                Job Title
              </div>
            </div>
          </div>

          {/* Participants */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: theme.spacing.lg,
            padding: theme.spacing.md,
            backgroundColor: theme.colors.backgroundSecondary,
            borderRadius: theme.borderRadius.md
          }}>
            <div>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                From (Homeowner)
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                {transaction.payer
                  ? `${transaction.payer.first_name} ${transaction.payer.last_name}`
                  : isPayer
                  ? 'You'
                  : 'Homeowner'
                }
              </div>
            </div>
            <div>
              <div style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                To (Contractor)
              </div>
              <div style={{
                fontSize: theme.typography.fontSize.base,
                color: theme.colors.text,
                fontWeight: theme.typography.fontWeight.medium
              }}>
                {transaction.payee
                  ? `${transaction.payee.first_name} ${transaction.payee.last_name}`
                  : isPayee
                  ? 'You'
                  : 'Contractor'
                }
              </div>
            </div>
          </div>
        </div>

        {/* Transaction Timeline */}
        <div style={{
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.lg,
          padding: theme.spacing.lg,
          marginBottom: theme.spacing.lg,
          boxShadow: theme.shadows.sm
        }}>
          <h2 style={{
            fontSize: theme.typography.fontSize.xl,
            fontWeight: theme.typography.fontWeight.bold,
            color: theme.colors.text,
            margin: 0,
            marginBottom: theme.spacing.md
          }}>
            📅 Transaction Timeline
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: theme.spacing.md }}>
            {/* Created */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              padding: theme.spacing.sm,
              backgroundColor: theme.colors.backgroundSecondary,
              borderRadius: theme.borderRadius.md
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: theme.colors.info,
                color: theme.colors.white,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: theme.spacing.md,
                fontSize: theme.typography.fontSize.lg
              }}>
                ✨
              </div>
              <div>
                <div style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text
                }}>
                  Payment Created
                </div>
                <div style={{
                  fontSize: theme.typography.fontSize.xs,
                  color: theme.colors.textSecondary
                }}>
                  {formatDate(transaction.createdAt)}
                </div>
              </div>
            </div>

            {/* Released */}
            {transaction.releasedAt && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: theme.spacing.sm,
                backgroundColor: `${theme.colors.success}10`,
                borderRadius: theme.borderRadius.md
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.success,
                  color: theme.colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: theme.spacing.md,
                  fontSize: theme.typography.fontSize.lg
                }}>
                  ✅
                </div>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.success
                  }}>
                    Payment Released
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary
                  }}>
                    {formatDate(transaction.releasedAt)}
                  </div>
                </div>
              </div>
            )}

            {/* Refunded */}
            {transaction.refundedAt && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                padding: theme.spacing.sm,
                backgroundColor: `${theme.colors.error}10`,
                borderRadius: theme.borderRadius.md
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: theme.colors.error,
                  color: theme.colors.white,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: theme.spacing.md,
                  fontSize: theme.typography.fontSize.lg
                }}>
                  ↩️
                </div>
                <div>
                  <div style={{
                    fontSize: theme.typography.fontSize.sm,
                    fontWeight: theme.typography.fontWeight.medium,
                    color: theme.colors.error
                  }}>
                    Payment Refunded
                  </div>
                  <div style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary
                  }}>
                    {formatDate(transaction.refundedAt)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Job Details */}
        {transaction.job?.description && (
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            marginBottom: theme.spacing.lg,
            boxShadow: theme.shadows.sm
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: theme.spacing.md
            }}>
              📋 Job Details
            </h2>
            <p style={{
              fontSize: theme.typography.fontSize.base,
              color: theme.colors.text,
              margin: 0,
              lineHeight: theme.typography.lineHeight.relaxed
            }}>
              {transaction.job.description}
            </p>
          </div>
        )}

        {/* Actions */}
        {(canRelease || canRefund) && (
          <div style={{
            backgroundColor: theme.colors.white,
            borderRadius: theme.borderRadius.lg,
            padding: theme.spacing.lg,
            boxShadow: theme.shadows.sm
          }}>
            <h2 style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.text,
              margin: 0,
              marginBottom: theme.spacing.md
            }}>
              🎯 Available Actions
            </h2>
            <div style={{
              display: 'flex',
              gap: theme.spacing.md,
              flexWrap: 'wrap'
            }}>
              {canRelease && (
                <Button
                  onClick={handleReleasePayment}
                  variant="primary"
                  disabled={processing}
                >
                  {processing ? 'Processing...' : '✅ Release Payment'}
                </Button>
              )}
              {canRefund && (
                <Button
                  onClick={handleRefundPayment}
                  variant="outline"
                  disabled={processing}
                  style={{ color: theme.colors.error, borderColor: theme.colors.error }}
                >
                  {processing ? 'Processing...' : '↩️ Request Refund'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Security Notice */}
        <div style={{
          marginTop: theme.spacing.lg,
          padding: theme.spacing.md,
          backgroundColor: `${theme.colors.success}10`,
          border: `1px solid ${theme.colors.success}`,
          borderRadius: theme.borderRadius.md,
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: theme.typography.fontSize.sm,
            color: theme.colors.success,
            fontWeight: theme.typography.fontWeight.medium,
            marginBottom: '4px'
          }}>
            🔒 Secure Escrow Protection
          </div>
          <div style={{
            fontSize: theme.typography.fontSize.xs,
            color: theme.colors.textSecondary
          }}>
            This payment is protected by our secure escrow system. Funds are held safely until the job is completed to your satisfaction.
          </div>
        </div>
      </div>
    </div>
  );
}