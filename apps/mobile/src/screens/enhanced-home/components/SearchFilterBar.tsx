/**
 * SearchFilterBar Component
 *
 * Search input with filter button.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Search UI
 */

import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface SearchFilterBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onFilterPress: () => void;
  placeholder?: string;
}

export const SearchFilterBar: React.FC<SearchFilterBarProps> = ({
  value,
  onChangeText,
  onFilterPress,
  placeholder = 'Search services...',
}) => {
  return (
    <View style={styles.container}>
      <View style={styles.searchBar}>
        <Ionicons name="search" size={20} color={theme.colors.textTertiary} />
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textTertiary}
          accessibilityLabel='Search services'
          accessibilityRole='search'
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            accessibilityRole='button'
            accessibilityLabel='Clear search'
          >
            <Ionicons name="close-circle" size={20} color={theme.colors.textTertiary} />
          </TouchableOpacity>
        )}
      </View>

      <TouchableOpacity
        style={styles.filterButton}
        onPress={onFilterPress}
        accessibilityRole='button'
        accessibilityLabel='Open filters'
        accessibilityHint='Double tap to adjust search filters'
      >
        <Ionicons name="options" size={24} color={theme.colors.textInverse} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 16,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.backgroundSecondary,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 50,
    gap: 8,
    ...Platform.select({
      ios: { shadowColor: '#000000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 10 },
      android: { elevation: 2 },
    }),
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: theme.colors.textPrimary,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: theme.colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
