/**
 * PaymentHistoryCard — single payment-history row + its status
 * helpers. Extracted from PaymentHistoryScreen.tsx to keep that file
 * under the 500-line per-file cap.
 *
 * Direction A · Mint Editorial — token-styled.
 */
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

export interface PaymentRecord {
  id: string;
  jobId: string;
  jobTitle: string;
  amount: number;
  status: string;
  paymentMethod?: string;
  last4?: string;
  createdAt: string;
}

// `held` keeps its decorative blue; the rest map to Mint Editorial
// brand / accent / error tokens.
export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'completed':
    case 'succeeded':
    case 'released':
      return me.brand;
    case 'held':
      return '#3B82F6';
    case 'pending':
    case 'processing':
    case 'release_pending':
      return me.accent;
    case 'failed':
    case 'refunded':
      return me.errFg;
    default:
      return me.ink2;
  }
};

export const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'completed':
    case 'succeeded':
    case 'released':
      return 'Paid';
    case 'held':
      return 'In Escrow';
    case 'pending':
      return 'Pending';
    case 'release_pending':
      return 'Releasing';
    case 'processing':
      return 'Processing';
    case 'failed':
      return 'Failed';
    case 'refunded':
      return 'Refunded';
    default:
      return status;
  }
};

const getRefundExpectedDate = (createdAt: string): string => {
  const refundDate = new Date(createdAt);
  refundDate.setDate(refundDate.getDate() + 10);
  return refundDate.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
  });
};

export const PaymentCard: React.FC<{ payment: PaymentRecord }> = ({
  payment,
}) => (
  <View style={styles.paymentCard}>
    <View style={styles.paymentHeader}>
      <View style={styles.paymentInfo}>
        <Text style={styles.paymentTitle} numberOfLines={1}>
          {payment.jobTitle || `Job #${payment.jobId.slice(0, 8)}`}
        </Text>
        <Text style={styles.paymentDate}>
          {new Date(payment.createdAt).toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          })}
        </Text>
      </View>
      <View style={styles.paymentRight}>
        <Text style={styles.paymentAmount}>
          £{Number(payment.amount).toFixed(2)}
        </Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(payment.status) + '20' },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: getStatusColor(payment.status) },
            ]}
          >
            {getStatusLabel(payment.status)}
          </Text>
        </View>
      </View>
    </View>
    {payment.status === 'refunded' && (
      <View style={styles.refundTimeline}>
        <Ionicons name='time-outline' size={14} color={me.warnFg} />
        <Text style={styles.refundTimelineText}>
          Expected by {getRefundExpectedDate(payment.createdAt)}
        </Text>
      </View>
    )}
    <View style={styles.cardFooter}>
      {payment.last4 && (
        <View style={styles.methodRow}>
          <Ionicons name='card-outline' size={14} color={me.ink3} />
          <Text style={styles.methodText}>**** {payment.last4}</Text>
        </View>
      )}
      {(payment.status === 'completed' || payment.status === 'succeeded') && (
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() =>
            Linking.openURL(`https://mintenance.com/invoices/${payment.jobId}`)
          }
          accessibilityRole='button'
          accessibilityLabel='Download receipt'
        >
          <Ionicons name='download-outline' size={16} color={me.ink} />
          <Text style={styles.receiptButtonText}>Receipt</Text>
        </TouchableOpacity>
      )}
    </View>
  </View>
);

const styles = StyleSheet.create({
  paymentCard: {
    backgroundColor: me.surface,
    borderRadius: me.radius.card,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: me.line,
    ...me.shadow.card,
  },
  paymentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  paymentInfo: {
    flex: 1,
    marginRight: 12,
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
  },
  paymentDate: {
    fontSize: 12,
    color: me.ink3,
    marginTop: 4,
  },
  paymentRight: {
    alignItems: 'flex-end',
  },
  paymentAmount: {
    fontFamily: me.font.display,
    fontSize: 18,
    color: me.ink,
    letterSpacing: me.displayTracking,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line2,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  methodText: {
    fontSize: 12,
    color: me.ink3,
  },
  receiptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: me.bg2,
  },
  receiptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: me.ink,
  },
  refundTimeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: me.warnBg,
  },
  refundTimelineText: {
    fontSize: 12,
    fontWeight: '500',
    color: me.warnFg,
  },
});
