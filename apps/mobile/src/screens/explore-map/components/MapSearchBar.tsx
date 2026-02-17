/**
 * MapSearchBar Component
 *
 * Airbnb-style search pill for map view.
 * Shows context (category/job count) with circular filter button.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface MapSearchBarProps {
  jobCount: number;
  selectedCategory: string | null;
  onPress?: () => void;
  onFilterPress: () => void;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  jobCount,
  selectedCategory,
  onPress,
  onFilterPress,
}) => {
  const subtitle = [
    selectedCategory
      ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
      : 'Any category',
    `${jobCount} job${jobCount !== 1 ? 's' : ''} nearby`,
  ].join(' \u00B7 ');

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.pill}
        onPress={onPress}
        accessibilityRole="search"
        accessibilityLabel={`Search jobs. ${subtitle}`}
        activeOpacity={0.9}
      >
        <Ionicons name="search" size={18} color={theme.colors.textPrimary} />
        <View style={styles.textContainer}>
          <Text style={styles.title}>Near you</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={onFilterPress}
          accessibilityRole="button"
          accessibilityLabel="Open filters"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="options-outline" size={16} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: theme.colors.textSecondary,
    marginTop: 1,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
