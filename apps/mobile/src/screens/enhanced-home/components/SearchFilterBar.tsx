/**
 * SearchFilterBar Component
 *
 * Search input with filter button.
 *
 * @filesize Target: <80 lines
 * @compliance Single Responsibility - Search UI
 */

import React from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

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
        <Ionicons name='search' size={20} color={me.ink3} />
        <TextInput
          style={styles.searchInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={me.ink3}
          accessibilityLabel='Search services'
          accessibilityRole='search'
        />
        {value.length > 0 && (
          <TouchableOpacity
            onPress={() => onChangeText('')}
            accessibilityRole='button'
            accessibilityLabel='Clear search'
          >
            <Ionicons name='close-circle' size={20} color={me.ink3} />
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
        <Ionicons name='options' size={24} color={me.onBrand} />
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
    backgroundColor: me.bg2,
    borderRadius: 16,
    paddingHorizontal: 20,
    height: 50,
    gap: 8,
    ...me.shadow.card,
  },
  searchInput: {
    flex: 1,
    fontSize: 18,
    color: me.ink,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: me.ink,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
