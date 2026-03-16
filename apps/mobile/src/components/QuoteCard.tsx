import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ContractorQuote } from '../services/QuoteBuilderService';
import { theme } from '../theme';

interface QuoteCardProps {
  quote: ContractorQuote;
  onPress: () => void;
  onEdit: () => void;
  onSend: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  draft: theme.colors.textSecondary,
  sent: theme.colors.textPrimary,
  viewed: theme.colors.accent,
  accepted: theme.colors.primary,
  rejected: theme.colors.error,
  expired: theme.colors.textTertiary,
};

const STATUS_ICONS: Record<string, string> = {
  draft: 'document-outline',
  sent: 'send',
  viewed: 'eye',
  accepted: 'checkmark-circle',
  rejected: 'close-circle',
  expired: 'time-outline',
};

export const QuoteCard: React.FC<QuoteCardProps> = ({
  quote,
  onPress,
  onEdit,
  onSend,
  onDuplicate,
  onDelete,
}) => {
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
  const statusColor = STATUS_COLORS[actualStatus] || theme.colors.textSecondary;
  const statusIcon = STATUS_ICONS[actualStatus] || 'document-outline';

  return (
    <TouchableOpacity style={styles.container} onPress={onPress}>
      <View style={styles.header}>
        <View style={styles.quoteInfo}>
          <View style={styles.titleRow}>
            <Text style={styles.quoteNumber}>
              #{quote.quote_number || quote.id.slice(0, 8).toUpperCase()}
            </Text>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor },
              ]}
            >
              <Ionicons
                name={statusIcon as keyof typeof Ionicons.glyphMap}
                size={12}
                color={theme.colors.textInverse}
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
              color={isExpired ? theme.colors.error : theme.colors.textSecondary}
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
              style={[styles.breakdownValue, { color: theme.colors.primary }]}
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
                style={[styles.infoChipText, { color: theme.colors.primary }]}
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
                color={theme.colors.textSecondary}
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
          <Ionicons name='pencil' size={16} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        {quote.status === 'draft' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.sendButton]}
            onPress={(e) => {
              e.stopPropagation();
              onSend();
            }}
          >
            <Ionicons name='send' size={16} color={theme.colors.primary} />
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
        >
          <Ionicons name='copy' size={16} color={theme.colors.textSecondary} />
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
    borderRadius: 6,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    color: theme.colors.textInverse,
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
    color: theme.colors.textPrimary,
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
    backgroundColor: theme.colors.backgroundSecondary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  discountChip: {
    backgroundColor: theme.colors.primaryLight,
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
    paddingTop: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: theme.colors.backgroundSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButton: {
    backgroundColor: theme.colors.primaryLight,
  },
  deleteButton: {
    backgroundColor: '#FEE2E2',
  },
});
