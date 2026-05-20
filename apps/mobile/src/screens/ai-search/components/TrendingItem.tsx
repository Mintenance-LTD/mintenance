import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SearchSuggestion } from '../../../services/AISearchService';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Single "Trending Search" chip used in the empty-query state.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44e).
 */
export function TrendingItem({
  trending,
  onPress,
}: {
  trending: SearchSuggestion;
  onPress: (s: SearchSuggestion) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.trendingItem}
      onPress={() => onPress(trending)}
      accessibilityRole='button'
      accessibilityLabel={`Trending search: ${trending.text}`}
    >
      <Ionicons
        name='trending-up'
        size={14}
        color={me.accent}
        style={{ marginRight: 6 }}
      />
      <Text style={styles.trendingText}>{trending.text}</Text>
    </TouchableOpacity>
  );
}
