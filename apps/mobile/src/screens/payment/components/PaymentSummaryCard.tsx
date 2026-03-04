import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

interface PaymentSummaryCardProps {
  jobTitle: string;
  jobId: string;
  amount: number;
  platformFee: number;
  contractorPayout: number;
  totalAmount: number;
  useEscrow: boolean;
}

export const PaymentSummaryCard: React.FC<PaymentSummaryCardProps> = ({
  jobTitle,
  jobId,
  amount,
  platformFee,
  contractorPayout,
  totalAmount,
  useEscrow,
}) => {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryTitle}>Payment Summary</Text>
      <View style={styles.jobInfo}>
        <Text style={styles.jobTitle}>{jobTitle}</Text>
        <Text style={styles.jobIdText}>Job ID: {jobId}</Text>
      </View>

      <View style={styles.amountBreakdown}>
        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Job Amount</Text>
          <Text style={styles.amountValue}>{'\u00A3'}{amount.toFixed(2)}</Text>
        </View>

        {useEscrow && (
          <>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Platform Fee</Text>
              <Text style={styles.amountValue}>{'\u00A3'}{platformFee.toFixed(2)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Contractor Payout</Text>
              <Text style={styles.amountValue}>{'\u00A3'}{contractorPayout.toFixed(2)}</Text>
            </View>
          </>
        )}

        <View style={[styles.amountRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>
            {useEscrow ? 'Total (Escrow)' : 'Total'}
          </Text>
          <Text style={styles.totalValue}>{'\u00A3'}{totalAmount.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  summaryTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.lg,
  },
  jobInfo: {
    marginBottom: theme.spacing.lg,
  },
  jobTitle: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.xs,
  },
  jobIdText: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  amountBreakdown: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.lg,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  amountLabel: {
    fontSize: theme.typography.fontSize.md,
    color: theme.colors.textSecondary,
  },
  amountValue: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textPrimary,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    paddingTop: theme.spacing.md,
    marginTop: theme.spacing.sm,
  },
  totalLabel: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  totalValue: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textPrimary,
  },
});
