import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';
import { styles } from '../theme/styles';

/**
 * Empty state shown when a non-empty query returns 0 results.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44e).
 */
export function NoResults() {
  return (
    <View style={styles.noResultsContainer}>
      <View style={styles.noResultsIconWrap}>
        <Ionicons
          name='search-outline'
          size={32}
          color={theme.colors.textTertiary}
          accessible={false}
        />
      </View>
      <Text style={styles.noResultsTitle}>No Results Found</Text>
      <Text style={styles.noResultsSubtitle}>
        Try adjusting your search terms or filters
      </Text>
    </View>
  );
}
