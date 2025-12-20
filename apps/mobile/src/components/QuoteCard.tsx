import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../theme';
import { ContractorQuote } from '../services/QuoteBuilderService';

interface QuoteCardProps {
  quote: ContractorQuote;
  onPress: () => void;
  onEdit: () => void;
  onSend: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  onPress,
  onEdit,
  onSend,
  onDuplicate,
  onDelete,
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft':
        return theme.colors.textSecondary;
      case 'sent':
        return theme.colors.primary;
      case 'viewed':
        return theme.colors.warning;
      case 'accepted':
        return theme.colors.success;
      case 'rejected':
        return theme.colors.error;
      case 'expired':
        return theme.colors.textTertiary;
      default:
        return theme.colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'draft':
        return 'document-outline';
      case 'sent':
        return 'send';
      case 'viewed':
        return 'eye';
      case 'accepted':
        return 'checkmark-circle';
      case 'rejected':
        return 'close-circle';
      case 'expired':
        return 'time-outline';
      default:
        return 'document-outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return `£${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const isExpired =
    quote.valid_until && new Date(quote.valid_until) < new Date();
  const actualStatus = isExpired ? 'expired' : quote.status;

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.quoteInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.quoteNumber}>#{quote.quote_number}</Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(actualStatus) },
              ]}
            >
              <Ionicons
                name={getStatusIcon(actualStatus) as any}
                size={12}
                color='#fff'
              />
              <Text style={styles.statusText}>
                {actualStatus.toUpperCase()}
              </Text>
            </View>
          </View>

          <Text style={styles.projectTitle}>{quote.project_title}</Text>
          <Text style={styles.clientName}>{quote.client_name}</Text>
        </View>

        <View style={styles.amountContainer}>
          <Text style={styles.amount}>
            {formatCurrency(quote.total_amount)}
          </Text>
          <Text style={styles.amountLabel}>Total</Text>
        </View>
      </View>

      <View style={styles.detailsRow}>
        <View style={styles.detail}>
          <Ionicons
            name='calendar-outline'
            size={14}
            color={theme.colors.textSecondary}
          />
          <Text style={styles.detailText}>
            Created: {formatDate(quote.created_at)}
          </Text>
        </View>

        {quote.valid_until && (
          <View style={styles.detail}>
            <Ionicons
              name='time-outline'
              size={14}
              color={
                isExpired ? theme.colors.error : theme.colors.textSecondary
              }
            />
            <Text
              style={[
                styles.detailText,
                isExpired && { color: theme.colors.error },
              ]}
            >
              Valid until: {formatDate(quote.valid_until)}
            </Text>
          </View>
        )}
      </View>

      {quote.project_description && (
        <Text style={styles.description} numberOfLines={2}>
          {quote.project_description}
        </Text>
      )}

      {/* Quote Breakdown */}
      <View style={styles.breakdownRow}>
        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Subtotal</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(quote.subtotal)}
          </Text>
        </View>

        {quote.discount_amount && quote.discount_amount > 0 && (
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Discount</Text>
            <Text
              style={[styles.breakdownValue, { color: theme.colors.success }]}
            >
              -{formatCurrency(quote.discount_amount)}
            </Text>
          </View>
        )}

        <View style={styles.breakdownItem}>
          <Text style={styles.breakdownLabel}>Tax</Text>
          <Text style={styles.breakdownValue}>
            {formatCurrency(quote.tax_amount)}
          </Text>
        </View>
      </View>

      {/* Additional Info */}
      {(quote.markup_percentage ||
        quote.discount_percentage ||
        quote.notes) && (
        <View style={styles.additionalInfo}>
          {quote.markup_percentage && quote.markup_percentage > 0 && (
            <View style={styles.infoChip}>
              <Text style={styles.infoChipText}>
                Markup: {quote.markup_percentage}%
              </Text>
            </View>
          )}

          {quote.discount_percentage && quote.discount_percentage > 0 && (
            <View style={[styles.infoChip, styles.discountChip]}>
              <Text
                style={[styles.infoChipText, { color: theme.colors.success }]}
              >
                Discount: {quote.discount_percentage}%
              </Text>
            </View>
          )}

          {quote.notes && (
            <View style={styles.infoChip}>
              <Ionicons
                name='document-text-outline'
                size={12}
                color={theme.colors.primary}
              />
              <Text style={styles.infoChipText}>Has Notes</Text>
            </View>
          )}
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onEdit();
          }}
        >
          <Ionicons name='pencil' size={16} color={theme.colors.primary} />
        </TouchableOpacity>

        {quote.status === 'draft' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={(e) => {
              e.stopPropagation();
              onSend();
            }}
          >
            <Ionicons name='send' size={16} color={theme.colors.success} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Ionicons name='copy' size={16} color={theme.colors.warning} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Ionicons name='trash' size={16} color={theme.colors.error} />
        </TouchableOpacity>
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
  quoteInfo: {
    flex: 1,
    marginRight: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  quoteNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },
  projectTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.textPrimary,
    marginBottom: 4,
  },
  clientName: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  amountContainer: {
    alignItems: 'flex-end',
  },
  amount: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 2,
  },
  amountLabel: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  detailsRow: {
    marginBottom: 12,
    gap: 8,
  },
  detail: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: theme.colors.textSecondary,
  },
  description: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
    marginBottom: 8,
  },
  breakdownItem: {
    alignItems: 'center',
    flex: 1,
  },
  breakdownLabel: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  breakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  additionalInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surfaceSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: theme.borderRadius.sm,
    gap: 4,
  },
  discountChip: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  infoChipText: {
    fontSize: 11,
    color: theme.colors.textSecondary,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: theme.colors.borderLight,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: theme.borderRadius.base,
    backgroundColor: theme.colors.surfaceSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
  },
  deleteButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
});
