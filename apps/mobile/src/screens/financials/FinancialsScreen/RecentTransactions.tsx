import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { CATEGORY_CONFIG, STATUS_COLORS, fmt, type PaymentRecord } from './constants';
import { styles } from './styles';

interface RecentTransactionsProps {
  recentPayments: PaymentRecord[];
  onViewAll: () => void;
}

export const RecentTransactions: React.FC<RecentTransactionsProps> = ({ recentPayments, onViewAll }) => {
  return (
    <View style={styles.sectionCard}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Transactions</Text>
        <TouchableOpacity onPress={onViewAll}>
          <Text style={styles.viewAllText}>View All</Text>
        </TouchableOpacity>
      </View>

      {recentPayments.length === 0 ? (
        <View style={styles.emptyWrap}>
          <View style={styles.emptyIcon}>
            <Ionicons name="receipt-outline" size={24} color={theme.colors.textTertiary} />
          </View>
          <Text style={styles.emptyTitle}>No transactions yet</Text>
          <Text style={styles.emptySubtext}>Your payment history will appear here</Text>
        </View>
      ) : (
        recentPayments.map((payment, index) => {
          const cat = payment.category || 'general';
          const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
          const statusColor = STATUS_COLORS[payment.status] || STATUS_COLORS.pending;
          const isLast = index === recentPayments.length - 1;

          return (
            <View key={payment.id} style={[styles.transactionRow, isLast && styles.transactionRowLast]}>
              <View style={[styles.transactionIcon, { backgroundColor: `${config.color}18` }]}>
                <Ionicons name={config.icon} size={18} color={config.color} />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionTitle} numberOfLines={1}>
                  {payment.job_title || 'Payment'}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(payment.created_at).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                <Text style={styles.transactionAmount}>{fmt(payment.amount)}</Text>
                <View style={styles.transactionStatusWrap}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.transactionStatus, { color: statusColor }]}>
                    {payment.status.replace(/_/g, ' ')}
                  </Text>
                </View>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
};
