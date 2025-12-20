/**
 * QuoteItemsList Component
 * 
 * List of quote line items with add/edit/remove actions.
 * 
 * @filesize Target: <100 lines
 * @compliance Single Responsibility - Items list display
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import type { LineItem } from '../viewmodels/CreateQuoteViewModel';

interface QuoteItemsListProps {
  lineItems: LineItem[];
  onAddItem: () => void;
  onEditItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
}

export const QuoteItemsList: React.FC<QuoteItemsListProps> = ({
  lineItems,
  onAddItem,
  onEditItem,
  onRemoveItem,
}) => {
  const renderItem = ({ item, index }: { item: LineItem; index: number }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <Text style={styles.itemName}>{item.item_name}</Text>
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => onEditItem(index)} style={styles.actionButton}>
            <Ionicons name="pencil" size={16} color={theme.colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onRemoveItem(index)} style={styles.actionButton}>
            <Ionicons name="trash" size={16} color={theme.colors.error} />
          </TouchableOpacity>
        </View>
      </View>
      
      {item.item_description && (
        <Text style={styles.itemDescription}>{item.item_description}</Text>
      )}
      
      <View style={styles.itemDetails}>
        <Text style={styles.itemQuantity}>Qty: {item.quantity} {item.unit}</Text>
        <Text style={styles.itemPrice}>${item.unit_price.toFixed(2)} each</Text>
        <Text style={styles.itemTotal}>
          Total: ${(item.quantity * item.unit_price).toFixed(2)}
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Line Items</Text>
        <TouchableOpacity style={styles.addButton} onPress={onAddItem}>
          <Ionicons name="add" size={20} color={theme.colors.textInverse} />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      {lineItems.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-outline" size={48} color={theme.colors.textTertiary} />
          <Text style={styles.emptyStateText}>No items added yet</Text>
          <Text style={styles.emptyStateSubtext}>Tap &quot;Add Item&quot; to get started</Text>
        </View>
      ) : (
        <FlatList
          data={lineItems}
          renderItem={renderItem}
          keyExtractor={(_, index) => index.toString()}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
    ...theme.shadows.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: theme.typography.fontSize.xl,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
    gap: theme.spacing.xs,
  },
  addButtonText: {
    fontSize: theme.typography.fontSize.sm,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textInverse,
  },
  itemCard: {
    backgroundColor: theme.colors.surfaceTertiary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.sm,
  },
  itemName: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
    flex: 1,
  },
  itemActions: {
    flexDirection: 'row',
    gap: theme.spacing.sm,
  },
  actionButton: {
    padding: theme.spacing.xs,
  },
  itemDescription: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemQuantity: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  itemPrice: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textSecondary,
  },
  itemTotal: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.semibold,
    color: theme.colors.textPrimary,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xxl,
  },
  emptyStateText: {
    fontSize: theme.typography.fontSize.lg,
    fontWeight: theme.typography.fontWeight.medium,
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
  emptyStateSubtext: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xs,
  },
});
