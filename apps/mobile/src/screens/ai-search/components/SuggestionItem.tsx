import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { SearchSuggestion } from '../../../services/AISearchService';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * One autocomplete suggestion row.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44e).
 */
export function SuggestionItem({
  suggestion,
  onPress,
}: {
  suggestion: SearchSuggestion;
  onPress: (s: SearchSuggestion) => void;
}) {
  return (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => onPress(suggestion)}
      accessibilityRole='button'
      accessibilityLabel={`Search suggestion: ${suggestion.text}`}
    >
      <View style={styles.suggestionIconWrap}>
        <Ionicons
          name={
            suggestion.type === 'query'
              ? 'search-outline'
              : suggestion.type === 'category'
                ? 'grid-outline'
                : 'location-outline'
          }
          size={16}
          color={me.ink2}
        />
      </View>
      <Text style={styles.suggestionText}>{suggestion.text}</Text>
      <Ionicons name='arrow-forward' size={16} color={me.ink3} />
    </TouchableOpacity>
  );
}
