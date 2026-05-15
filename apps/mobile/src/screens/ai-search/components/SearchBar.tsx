import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
import { styles } from '../theme/styles';

/**
 * Top search bar — text input, clear button, and filter toggle.
 * Extracted 2026-05-09 (AUDIT_PUNCH_LIST P2 #44e).
 */
export function SearchBar({
  query,
  onChangeQuery,
  onSubmit,
  onClear,
  showFilters,
  onToggleFilters,
}: {
  query: string;
  onChangeQuery: (next: string) => void;
  onSubmit: () => void;
  onClear: () => void;
  showFilters: boolean;
  onToggleFilters: () => void;
}) {
  return (
    <View style={styles.searchContainer}>
      <View style={styles.searchBar}>
        <Ionicons name='search-outline' size={20} color={me.ink3} />
        <TextInput
          style={styles.searchInput}
          placeholder='Search jobs, contractors, services...'
          placeholderTextColor={me.ink3}
          value={query}
          onChangeText={onChangeQuery}
          onSubmitEditing={onSubmit}
          returnKeyType='search'
          accessibilityLabel='AI search'
          accessibilityHint='Type to search for jobs, contractors, or services'
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={onClear}
            accessibilityRole='button'
            accessibilityLabel='Clear search'
          >
            <Ionicons name='close-circle' size={20} color={me.ink3} />
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        style={[styles.filterButton, showFilters && styles.filterButtonActive]}
        onPress={onToggleFilters}
        accessibilityRole='button'
        accessibilityLabel={
          showFilters ? 'Hide search filters' : 'Show search filters'
        }
        accessibilityState={{ expanded: showFilters }}
      >
        <Ionicons
          name='options-outline'
          size={20}
          color={showFilters ? me.onBrand : me.ink2}
        />
      </TouchableOpacity>
    </View>
  );
}
