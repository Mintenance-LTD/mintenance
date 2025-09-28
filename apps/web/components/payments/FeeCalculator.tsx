import React from 'react';
import { theme } from '@/lib/theme';
import type { FeeCalculation } from '@mintenance/types';

interface FeeCalculatorProps {
  amount: number;
  fees: FeeCalculation;
  showDetails?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const FeeCalculator: React.FC<FeeCalculatorProps> = ({
  amount,
  fees,
  showDetails = true,
  className = '',
  style = {},
}) => {
  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatPercentage = (amount: number, total: number) => {
    const percentage = ((amount / total) * 100).toFixed(1);
    return `${percentage}%`;
  };

  return (
    <div
      className={className}
      style={{
        backgroundColor: theme.colors.backgroundSecondary,
        borderRadius: theme.borderRadius.lg,
        padding: theme.spacing.lg,
        border: `1px solid ${theme.colors.border}`,
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: theme.spacing.md,
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
          Payment Breakdown
        </h3>
        <div
          style={{
            backgroundColor: theme.colors.info,
            color: theme.colors.white,
            borderRadius: '50%',
            width: '20px',
            height: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: theme.typography.fontSize.xs,
            fontWeight: theme.typography.fontWeight.bold,
            cursor: 'help',
          }}
          title="Fees are automatically calculated and deducted from the payment amount"
        >
          ?
        </div>
      </div>

      {/* Total Amount */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: theme.spacing.md,
          backgroundColor: theme.colors.white,
          borderRadius: theme.borderRadius.md,
          marginBottom: theme.spacing.md,
          border: `2px solid ${theme.colors.primary}`,
        }}
      >
        <div>
          <div
            style={{
              fontSize: theme.typography.fontSize.sm,
              color: theme.colors.textSecondary,
              marginBottom: '2px',
            }}
          >
            Total Payment
          </div>
          <div
            style={{
              fontSize: theme.typography.fontSize.xl,
              fontWeight: theme.typography.fontWeight.bold,
              color: theme.colors.primary,
            }}
          >
            {formatAmount(amount)}
          </div>
        </div>
        <div style={{ fontSize: theme.typography.fontSize['2xl'] }}>💳</div>
      </div>

      {showDetails && (
        <>
          {/* Fee Breakdown */}
          <div
            style={{
              backgroundColor: theme.colors.white,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.md,
              marginBottom: theme.spacing.md,
            }}
          >
            <div
              style={{
                fontSize: theme.typography.fontSize.sm,
                fontWeight: theme.typography.fontWeight.medium,
                color: theme.colors.text,
                marginBottom: theme.spacing.sm,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span style={{ marginRight: theme.spacing.xs }}>📊</span>
              Fee Details
            </div>

            {/* Platform Fee */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${theme.spacing.xs} 0`,
                borderBottom: `1px solid ${theme.colors.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.text,
                  }}
                >
                  Platform Fee
                </span>
                <span
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginLeft: theme.spacing.xs,
                  }}
                >
                  ({formatPercentage(fees.platformFee, amount)})
                </span>
              </div>
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                }}
              >
                {formatAmount(fees.platformFee)}
              </span>
            </div>

            {/* Stripe Fee */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${theme.spacing.xs} 0`,
                borderBottom: `1px solid ${theme.colors.border}`,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: theme.typography.fontSize.sm,
                    color: theme.colors.text,
                  }}
                >
                  Processing Fee
                </span>
                <span
                  style={{
                    fontSize: theme.typography.fontSize.xs,
                    color: theme.colors.textSecondary,
                    marginLeft: theme.spacing.xs,
                  }}
                >
                  ({formatPercentage(fees.stripeFee, amount)})
                </span>
              </div>
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.medium,
                  color: theme.colors.text,
                }}
              >
                {formatAmount(fees.stripeFee)}
              </span>
            </div>

            {/* Total Fees */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: `${theme.spacing.sm} 0 ${theme.spacing.xs}`,
                borderBottom: `2px solid ${theme.colors.border}`,
              }}
            >
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.text,
                }}
              >
                Total Fees
              </span>
              <span
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.error,
                }}
              >
                -{formatAmount(fees.totalFees)}
              </span>
            </div>
          </div>

          {/* Contractor Amount */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: theme.spacing.md,
              backgroundColor: `${theme.colors.success}15`,
              borderRadius: theme.borderRadius.md,
              border: `1px solid ${theme.colors.success}`,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.sm,
                  color: theme.colors.textSecondary,
                  marginBottom: '2px',
                }}
              >
                Contractor Receives
              </div>
              <div
                style={{
                  fontSize: theme.typography.fontSize.lg,
                  fontWeight: theme.typography.fontWeight.bold,
                  color: theme.colors.success,
                }}
              >
                {formatAmount(fees.contractorAmount)}
              </div>
            </div>
            <div style={{ fontSize: theme.typography.fontSize.xl }}>👷‍♂️</div>
          </div>

          {/* Fee Info */}
          <div
            style={{
              backgroundColor: `${theme.colors.info}10`,
              border: `1px solid ${theme.colors.info}`,
              borderRadius: theme.borderRadius.md,
              padding: theme.spacing.sm,
              marginTop: theme.spacing.md,
            }}
          >
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.info,
                fontWeight: theme.typography.fontWeight.medium,
                marginBottom: '4px',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <span style={{ marginRight: theme.spacing.xs }}>ℹ️</span>
              Fee Information
            </div>
            <div
              style={{
                fontSize: theme.typography.fontSize.xs,
                color: theme.colors.textSecondary,
                lineHeight: theme.typography.lineHeight.relaxed,
              }}
            >
              • Platform fee: 5% of payment amount (min $0.50, max $50)
              <br />
              • Processing fee: 2.9% + $0.30 per transaction
              <br />
              • Funds are held securely in escrow until job completion
            </div>
          </div>
        </>
      )}
    </div>
  );
};