import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { me } from '../../../design-system/mint-editorial';

/**
 * Payment summary / amount-breakdown card — Direction A · Mint
 * Editorial. Token-styled.
 */

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
          <Text style={styles.amountValue}>£{amount.toFixed(2)}</Text>
        </View>

        {useEscrow && (
          <>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Platform Fee</Text>
              <Text style={styles.amountValue}>£{platformFee.toFixed(2)}</Text>
            </View>
            <View style={styles.amountRow}>
              <Text style={styles.amountLabel}>Contractor Payout</Text>
              <Text style={styles.amountValue}>
                £{contractorPayout.toFixed(2)}
              </Text>
            </View>
          </>
        )}

        <View style={[styles.amountRow, styles.totalRow]}>
          <Text style={styles.totalLabel}>
            {useEscrow ? 'Total (Protected)' : 'Total'}
          </Text>
          <Text style={styles.totalValue}>£{totalAmount.toFixed(2)}</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  summaryCard: {
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  summaryTitle: {
    fontFamily: me.font.display,
    fontSize: 22,
    color: me.ink,
    marginBottom: 20,
    letterSpacing: me.displayTracking,
  },
  jobInfo: {
    marginBottom: 20,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: me.ink,
    marginBottom: 6,
  },
  jobIdText: {
    fontSize: 13,
    color: me.ink2,
  },
  amountBreakdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line2,
    paddingTop: 20,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amountLabel: {
    fontSize: 15,
    color: me.ink2,
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '500',
    color: me.ink,
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line2,
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: me.ink,
  },
  totalValue: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
});
