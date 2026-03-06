/**
 * MapSearchBar Component
 *
 * Airbnb-style search pill for map view.
 * Shows context (category/job count) with circular filter button.
 *
 * Uses useSafeAreaInsets() so the absolute-positioned pill clears the
 * status bar on all devices — absolute children ignore SafeAreaView padding.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface MapSearchBarProps {
  jobCount: number;
  selectedCategory: string | null;
  onPress?: () => void;
  onFilterPress: () => void;
  onBackToList?: () => void;
}

export const MapSearchBar: React.FC<MapSearchBarProps> = ({
  jobCount,
  selectedCategory,
  onPress,
  onFilterPress,
  onBackToList,
}) => {
  const insets = useSafeAreaInsets();
  const subtitle = [
    selectedCategory
      ? selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)
      : 'Any category',
    `${jobCount} job${jobCount !== 1 ? 's' : ''} nearby`,
  ].join(' \u00B7 ');

  return (
    <View
      style={[
        styles.container,
        // Offset by the real status-bar height so we sit below it, not behind it
        { top: insets.top + 12 },
        onBackToList && styles.containerWithBack,
      ]}
    >
      {/* Back-to-list button — only shown when map is embedded in JobsScreen */}
      {onBackToList && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBackToList}
          accessibilityRole="button"
          accessibilityLabel="Back to list"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="arrow-back" size={20} color={theme.colors.textPrimary} />
        </TouchableOpacity>
      )}
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
    // top is set dynamically via insets.top + 12 (inline style above)
    left: 16,
    right: 16,
    zIndex: 10,
  },
  containerWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
    flexShrink: 0,
  },
  pill: {
    flex: 1,
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
