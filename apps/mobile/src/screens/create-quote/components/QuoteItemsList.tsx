/**
 * QuoteItemsList — Line items with category accents and improved layout
 *
 * Color-coded left accent per category (green=labour, blue=materials),
 * prominent total, green "Add Item" button, dashed empty state.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { LineItem } from '../viewmodels/CreateQuoteViewModel';
import { me } from '../../../design-system/mint-editorial';
import { formatCurrency } from '../../../utils/formatCurrency';

interface QuoteItemsListProps {
  lineItems: LineItem[];
  onAddItem: () => void;
  onEditItem: (index: number) => void;
  onRemoveItem: (index: number) => void;
}

const CATEGORY_ACCENT: Record<
  string,
  { color: string; bg: string; label: string }
> = {
  labour: {
    color: me.brand,
    bg: me.brandSoft,
    label: 'Labour',
  },
  labor: {
    color: me.brand,
    bg: me.brandSoft,
    label: 'Labour',
  },
  materials: { color: '#3B82F6', bg: '#DBEAFE', label: 'Materials' },
  equipment: {
    color: me.accent,
    bg: me.warnBg,
    label: 'Equipment',
  },
};

const getAccent = (category: string) => {
  const key = category?.toLowerCase() || '';
  return (
    CATEGORY_ACCENT[key] || {
      color: me.ink2,
      bg: me.bg3,
      label: category || 'Item',
    }
  );
};

export const QuoteItemsList: React.FC<QuoteItemsListProps> = ({
  lineItems,
  onAddItem,
  onEditItem,
  onRemoveItem,
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionLeft}>
          <View style={styles.sectionIconWrap}>
            <Ionicons name='list' size={16} color={me.accent} />
          </View>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {lineItems.length > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{lineItems.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity style={styles.addButton} onPress={onAddItem}>
          <Ionicons name='add' size={18} color={me.onBrand} />
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {lineItems.length === 0 ? (
        <TouchableOpacity
          style={styles.emptyState}
          onPress={onAddItem}
          activeOpacity={0.7}
        >
          <View style={styles.emptyIconWrap}>
            <Ionicons name='add-circle-outline' size={32} color={me.brand} />
          </View>
          <Text style={styles.emptyTitle}>No items yet</Text>
          <Text style={styles.emptySubtext}>
            Tap to add your first line item
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.itemsContainer}>
          {lineItems.map((item, index) => {
            const accent = getAccent(item.category);
            const itemTotal = item.quantity * item.unit_price;
            return (
              <View key={index} style={styles.itemCard}>
                {/* Left accent bar */}
                <View
                  style={[styles.accentBar, { backgroundColor: accent.color }]}
                />

                <View style={styles.itemContent}>
                  <View style={styles.itemTopRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.item_name}
                      </Text>
                      <View style={styles.itemCategoryRow}>
                        <View
                          style={[
                            styles.categoryPill,
                            { backgroundColor: accent.bg },
                          ]}
                        >
                          <Text
                            style={[
                              styles.categoryPillText,
                              { color: accent.color },
                            ]}
                          >
                            {accent.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                    <Text style={styles.itemTotal}>
                      {formatCurrency(itemTotal)}
                    </Text>
                  </View>

                  {item.item_description ? (
                    <Text style={styles.itemDescription} numberOfLines={2}>
                      {item.item_description}
                    </Text>
                  ) : null}

                  <View style={styles.itemBottomRow}>
                    <Text style={styles.itemQty}>
                      {item.quantity} {item.unit} ×{' '}
                      {formatCurrency(item.unit_price)}
                    </Text>
                    <View style={styles.itemActions}>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onEditItem(index)}
                        accessibilityLabel={`Edit ${item.item_name}`}
                      >
                        <Ionicons
                          name='pencil-outline'
                          size={16}
                          color={me.ink2}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => onRemoveItem(index)}
                        accessibilityLabel={`Remove ${item.item_name}`}
                      >
                        <Ionicons
                          name='trash-outline'
                          size={16}
                          color={me.errFg}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: me.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 12,
    ...me.shadow.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: me.warnBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: me.ink,
    letterSpacing: -0.2,
  },
  countBadge: {
    backgroundColor: me.bg3,
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: me.ink2,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: me.brand,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: me.onBrand,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    borderWidth: 2,
    borderColor: me.line,
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  emptyIconWrap: {
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: me.ink2,
  },
  emptySubtext: {
    fontSize: 13,
    color: me.ink3,
    marginTop: 2,
  },

  // Items
  itemsContainer: {
    gap: 10,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: me.bg2,
    borderRadius: 14,
    overflow: 'hidden',
  },
  accentBar: {
    width: 4,
  },
  itemContent: {
    flex: 1,
    padding: 14,
  },
  itemTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: me.ink,
    marginBottom: 4,
  },
  itemCategoryRow: {
    flexDirection: 'row',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  categoryPillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: me.ink,
    marginLeft: 12,
  },
  itemDescription: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
    marginBottom: 8,
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  itemQty: {
    fontSize: 13,
    color: me.ink3,
    fontWeight: '500',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
