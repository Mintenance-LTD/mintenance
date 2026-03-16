import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Invoice } from '../services/contractor-business';
import { useI18n } from '../hooks/useI18n';
import { theme } from '../theme';

interface InvoiceWithExtras extends Invoice {
  client_name?: string;
  reminder_sent_count?: number;
  currency?: string;
}

interface InvoiceCardProps {
  invoice: InvoiceWithExtras;
  onPress: () => void;
  onSendReminder: () => void;
  onMarkPaid: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  paid: theme.colors.primary,
  overdue: theme.colors.error,
  sent: theme.colors.accent,
  draft: theme.colors.textSecondary,
};

const STATUS_ICONS: Record<string, string> = {
  paid: 'checkmark-circle',
  overdue: 'warning',
  sent: 'mail',
  draft: 'document-outline',
};

export const InvoiceCard: React.FC<InvoiceCardProps> = ({
  invoice,
  onPress,
  onSendReminder,
  onMarkPaid,
}) => {
  const { formatters } = useI18n();
  const statusColor = STATUS_COLORS[invoice.status] || theme.colors.textPrimary;
  const statusIcon = STATUS_ICONS[invoice.status] || 'document';

  const isOverdue = invoice.status === 'overdue';
  const canSendReminder = invoice.status === 'sent' || isOverdue;
  const canMarkPaid =
    invoice.status !== 'paid' && invoice.status !== 'cancelled';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.invoiceInfo}>
          <Text style={styles.invoiceNumber}>#{invoice.invoice_number}</Text>
          <Text style={styles.clientName}>
            {invoice.client_name || ''}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: statusColor },
          ]}
        >
          <Ionicons
            name={statusIcon as keyof typeof Ionicons.glyphMap}
            size={14}
            color={theme.colors.textInverse}
          />
          <Text style={styles.statusText}>{invoice.status.toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.amountContainer}>
          <Text style={styles.amount}>
            {formatters.currency(invoice.total_amount, invoice.currency?.toUpperCase?.() || undefined)}
          </Text>
          <Text style={styles.dueDate}>Due: {formatters.date(new Date(invoice.due_date))}</Text>
        </View>

        {isOverdue && (
          <View style={styles.overdueContainer}>
            <Ionicons
              name='time-outline'
              size={14}
              color={theme.colors.error}
            />
            <Text style={styles.overdueText}>
              {Math.ceil(
                (new Date().getTime() - new Date(invoice.due_date).getTime()) /
                  (1000 * 60 * 60 * 24)
              )}{' '}
              days overdue
            </Text>
          </View>
        )}

        {(invoice.reminder_sent_count ?? 0) > 0 && (
          <Text style={styles.reminderText}>
            {invoice.reminder_sent_count} reminder(s) sent
          </Text>
        )}
      </View>

      <View style={styles.actions}>
        {canSendReminder && (
          <TouchableOpacity
            style={[styles.actionButton, styles.reminderButton]}
            onPress={onSendReminder}
          >
            <Ionicons
              name='mail-outline'
              size={16}
              color={theme.colors.textPrimary}
            />
            <Text style={styles.reminderButtonText}>Send Reminder</Text>
          </TouchableOpacity>
        )}

        {canMarkPaid && (
          <TouchableOpacity
            style={[styles.actionButton, styles.paidButton]}
            onPress={onMarkPaid}
          >
            <Ionicons
              name='checkmark-circle-outline'
              size={16}
              color={theme.colors.primary}
            />
            <Text style={styles.paidButtonText}>Mark Paid</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
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
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.textInverse,
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
    borderRadius: 12,
  },
  reminderButton: {
    backgroundColor: theme.colors.backgroundSecondary,
  },
  reminderButtonText: {
    fontSize: 12,
    color: theme.colors.textPrimary,
    marginLeft: 4,
    fontWeight: '500',
  },
  paidButton: {
    backgroundColor: theme.colors.primaryLight,
  },
  paidButtonText: {
    fontSize: 12,
    color: theme.colors.primary,
    marginLeft: 4,
    fontWeight: '500',
  },
});
