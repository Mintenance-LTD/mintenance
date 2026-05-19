import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SearchFilters } from '../../../services/AISearchService';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Slide-down filter panel (Category + Location rows + Clear).
 * The two filter rows are display-only placeholders today (the
 * tappable values lead nowhere); preserved as-is during the
 * 2026-05-09 split (AUDIT_PUNCH_LIST P2 #44e). Wiring up real
 * pickers is a separate UX task.
 */
export function FiltersPanel({
  filters,
  onClear,
}: {
  filters: SearchFilters;
  onClear: () => void;
}) {
  return (
    <View style={styles.filtersContainer}>
      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Category</Text>
        <TouchableOpacity style={styles.filterValue}>
          <Text style={styles.filterValueText}>
            {filters.category || 'All Categories'}
          </Text>
          <Ionicons name='chevron-down' size={16} color={me.ink3} />
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        <Text style={styles.filterLabel}>Location</Text>
        <TouchableOpacity style={styles.filterValue}>
          <Text style={styles.filterValueText}>
            {filters.location || 'Any Location'}
          </Text>
          <Ionicons name='chevron-down' size={16} color={me.ink3} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.clearFiltersButton}
        onPress={onClear}
        accessibilityRole='button'
        accessibilityLabel='Clear all search filters'
      >
        <Text style={styles.clearFiltersText}>Clear Filters</Text>
      </TouchableOpacity>
    </View>
  );
}
