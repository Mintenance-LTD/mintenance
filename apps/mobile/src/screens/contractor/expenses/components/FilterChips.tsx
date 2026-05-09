import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
import { CATEGORY_FILTERS, type CategoryFilter } from '../types';
import { styles } from '../theme/styles';

/**
 * Horizontal scroll of category filter chips.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44a). Uses a horizontal
 * ScrollView (not FlatList) to avoid the FlatList sizing bug noted
 * in the original component's comment.
 */
export function FilterChips({
  filter,
  onChange,
}: {
  filter: CategoryFilter;
  onChange: (filter: CategoryFilter) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}
      style={styles.filterScrollView}
    >
      {CATEGORY_FILTERS.map((item) => (
        <TouchableOpacity
          key={item}
          style={[
            styles.filterChip,
            filter === item && styles.filterChipActive,
          ]}
          onPress={() => onChange(item)}
          accessibilityRole='button'
          accessibilityLabel={`Filter by ${item === 'all' ? 'all categories' : item}`}
          accessibilityState={{ selected: filter === item }}
        >
          <Text
            style={[
              styles.filterChipText,
              filter === item && styles.filterChipTextActive,
            ]}
          >
            {item === 'all'
              ? 'All'
              : item.charAt(0).toUpperCase() + item.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}
