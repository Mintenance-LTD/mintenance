import React from 'react';
import { theme } from '@/lib/theme';
import { Button } from '@/components/ui/Button';
import type { EscrowTransaction } from '@mintenance/types';

interface PaymentCardProps {
  transaction: EscrowTransaction;
  currentUserId: string;
  onRelease?: (transactionId: string) => void;
  onRefund?: (transactionId: string) => void;
  onViewDetails?: (transactionId: string) => void;
}

export const PaymentCard: React.FC<PaymentCardProps> = ({
  transaction,
  currentUserId,
  onRelease,
  onRefund,
  onViewDetails,
}) => {
  const isPayee = transaction.payeeId === currentUserId;
  const isPayer = transaction.payerId === currentUserId;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return theme.colors.warning;
      case 'held':
        return theme.colors.info;
      case 'released':
        return theme.colors.success;
      case 'refunded':
        return theme.colors.error;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return '⏳';
      case 'held':
        return '🔒';
      case 'released':
        return '✅';
      case 'refunded':
        return '↩️';
      default:
        return '❓';
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
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canRelease = isPayee && transaction.status === 'held';
  const canRefund = isPayer && ['pending', 'held'].includes(transaction.status);

  return (
    <div
      style={{
        backgroundColor: theme.colors.white,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        boxShadow: theme.shadows.sm,
        border: `1px solid ${theme.colors.border}`,
        marginBottom: theme.spacing.md,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: theme.spacing.md,
        }}
      >
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '4px',
            }}
          >
            <h3
              style={{
                fontSize: theme.typography.fontSize.lg,
                fontWeight: theme.typography.fontWeight.bold,
                color: theme.colors.text,
                margin: 0,
                marginRight: theme.spacing.sm,
              }}
            >
              {formatAmount(transaction.amount)}
            </h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                backgroundColor: `${getStatusColor(transaction.status)}15`,
                color: getStatusColor(transaction.status),
                padding: `${theme.spacing.xs} ${theme.spacing.sm}`,
                borderRadius: theme.borderRadius.full,
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              <span style={{ marginRight: '4px' }}>
                {getStatusIcon(transaction.status)}
              </span>
              {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
            </div>
          </div>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              margin: 0,
            }}
          >
            {transaction.job?.title || 'Job Payment'}
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginBottom: '2px',
            }}
          >
            Created
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.text,
            }}
          >
            {formatDate(transaction.createdAt)}
          </div>
        </div>
      </div>

      {/* Payment Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: theme.spacing.md,
          marginBottom: theme.spacing.lg,
        }}
      >
        <div>
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            From
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.text,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            {transaction.payer
              ? `${transaction.payer.first_name} ${transaction.payer.last_name}`
              : isPayer
              ? 'You'
              : 'Homeowner'
            }
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            To
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.text,
              fontWeight: theme.typography.fontWeight.medium,
            }}
          >
            {transaction.payee
              ? `${transaction.payee.first_name} ${transaction.payee.last_name}`
              : isPayee
              ? 'You'
              : 'Contractor'
            }
          </div>
        </div>
        {transaction.releasedAt && (
          <div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Released
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.success,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              {formatDate(transaction.releasedAt)}
            </div>
          </div>
        )}
        {transaction.refundedAt && (
          <div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                marginBottom: '4px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              Refunded
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.error,
                fontWeight: theme.typography.fontWeight.medium,
              }}
            >
              {formatDate(transaction.refundedAt)}
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      {transaction.job?.description && (
        <div
          style={{
            backgroundColor: theme.colors.backgroundSecondary,
            padding: theme.spacing.sm,
            borderRadius: theme.borderRadius.md,
            marginBottom: theme.spacing.md,
          }}
        >
          <div
            style={{
              fontSize: theme.typography.fontSize.xs,
              color: theme.colors.textSecondary,
              marginBottom: '4px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Job Description
          </div>
          <p
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.text,
              margin: 0,
              lineHeight: theme.typography.lineHeight.relaxed,
            }}
          >
            {transaction.job.description}
          </p>
        </div>
      )}

      {/* Actions */}
      {(canRelease || canRefund || onViewDetails) && (
        <div
          style={{
            display: 'flex',
            gap: theme.spacing.sm,
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          {onViewDetails && (
            <Button
              onClick={() => onViewDetails(transaction.id)}
              variant="ghost"
              size="sm"
            >
              View Details
            </Button>
          )}
          {canRefund && onRefund && (
            <Button
              onClick={() => onRefund(transaction.id)}
              variant="outline"
              size="sm"
              style={{ color: theme.colors.error, borderColor: theme.colors.error }}
            >
              Request Refund
            </Button>
          )}
          {canRelease && onRelease && (
            <Button
              onClick={() => onRelease(transaction.id)}
              variant="primary"
              size="sm"
            >
              Release Payment
            </Button>
          )}
        </div>
      )}
    </div>
  );
};