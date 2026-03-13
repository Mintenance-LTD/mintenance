import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';

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
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginTop: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#222222',
    marginBottom: 20,
  },
  jobInfo: {
    marginBottom: 20,
  },
  jobTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#222222',
    marginBottom: 6,
  },
  jobIdText: {
    fontSize: 13,
    color: '#717171',
  },
  amountBreakdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
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
    color: '#717171',
  },
  amountValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#222222',
  },
  totalRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EBEBEB',
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222222',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222222',
  },
});
