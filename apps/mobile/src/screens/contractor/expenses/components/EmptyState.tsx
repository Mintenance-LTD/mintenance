import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Empty-list placeholder with a "Log First Expense" CTA.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a).
 */
export function EmptyState({ onAddPress }: { onAddPress: () => void }) {
  return (
    <View style={styles.emptyWrap}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name='receipt-outline' size={32} color={me.brand} />
      </View>
      <Text style={styles.emptyTitle}>No expenses logged yet</Text>
      <Text style={styles.emptySubtitle}>
        Track materials, fuel, and other business costs to stay on top of your
        finances.
      </Text>
      <TouchableOpacity
        style={styles.emptyCta}
        onPress={onAddPress}
        accessibilityRole='button'
        accessibilityLabel='Log first expense'
      >
        <Ionicons name='add-circle-outline' size={18} color={me.onBrand} />
        <Text style={styles.emptyCtaText}>Log First Expense</Text>
      </TouchableOpacity>
    </View>
  );
}
