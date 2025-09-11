import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { Invoice } from '../services/ContractorBusinessSuite';

interface InvoiceCardProps {
  invoice: Invoice;
  onPress: () => void;
  onSendReminder: () => void;
  onMarkPaid: () => void;
}

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPress,
  onSendReminder,
  onMarkPaid
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return theme.colors.success;
      case 'overdue': return theme.colors.error;
      case 'sent': return theme.colors.warning;
      case 'draft': return theme.colors.textSecondary;
      default: return theme.colors.primary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return 'checkmark-circle';
      case 'overdue': return 'warning';
      case 'sent': return 'mail';
      case 'draft': return 'document-outline';
      default: return 'document';
    }
  };

  const isOverdue = invoice.status === 'overdue';
  const canSendReminder = invoice.status === 'sent' || isOverdue;
  const canMarkPaid = invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
          <Text style={styles.clientName}>{(invoice as any).client_name || ''}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(invoice.status) }]}>
          <Ionicons 
            name={getStatusIcon(invoice.status) as any} 
            size={14} 
            color="#fff" 
          />
          <Text style={styles.statusText}>
            {invoice.status.toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>
            {invoice.currency} {invoice.total_amount.toFixed(2)}
          </Text>
          <Text style={styles.dueDate}>
            Due: {new Date(invoice.due_date).toLocaleDateString()}
          </Text>
        </View>

        {isOverdue && (
          <View style={styles.overdueContainer}>
            <Ionicons name="time-outline" size={14} color={theme.colors.error} />
            <Text style={styles.overdueText}>
              {Math.ceil((new Date().getTime() - new Date(invoice.due_date).getTime()) / (1000 * 60 * 60 * 24))} days overdue
            </Text>
          </View>
        )}

        {(invoice as any).reminder_sent_count > 0 && (
          <Text style={styles.reminderText}>
            {(invoice as any).reminder_sent_count} reminder(s) sent
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {canSendReminder && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.reminderButton]}
            onPress={onSendReminder}
          >
            <Ionicons name="mail-outline" size={16} color={theme.colors.primary} />
            <Text style={styles.reminderButtonText}>Send Reminder</Text>
          </TouchableOpacity>
        )}

        {canMarkPaid && (
          <TouchableOpacity 
            style={[styles.actionButton, styles.paidButton]}
            onPress={onMarkPaid}
          >
            <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.success} />
            <Text style={styles.paidButtonText}>Mark Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.background,
    borderRadius: theme.borderRadius.lg,
    padding: 16,
    marginBottom: 12,
    ...theme.shadows.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  clientName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 4,
  },
  details: {
    marginBottom: 12,
  },
  amountContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  amount: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.textPrimary,
  },
  dueDate: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  overdueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  overdueText: {
    fontSize: 12,
    color: theme.colors.error,
    marginLeft: 4,
    fontWeight: '500',
  },
  reminderText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: theme.borderRadius.sm,
    borderWidth: 1,
  },
  reminderButton: {
    borderColor: theme.colors.primary,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
  },
  reminderButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
  paidButton: {
    borderColor: theme.colors.success,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  paidButtonText: {
    fontSize: 12,
    color: theme.colors.success,
    marginLeft: 4,
    fontWeight: '500',
  },
});
