/**
 * Social Feed Header Component
 *
 * Displays the header for the social feed with title and search functionality.
 * Focused component with single responsibility.
 *
 * @filesize Target: <100 lines
 * @compliance Architecture principles - Single responsibility
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../../theme';

interface SocialFeedHeaderProps {
  onSearchPress: () => void;
}

export const SocialFeedHeader: React.FC<SocialFeedHeaderProps> = ({
  onSearchPress,
}) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Community</Text>

      <TouchableOpacity
        style={styles.searchButton}
        onPress={onSearchPress}
        accessibilityRole="button"
        accessibilityLabel="Search posts"
        accessibilityHint="Double tap to search for posts in the community feed"
      >
        <Ionicons name="search" size={24} color={theme.colors.surface} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.surface,
  },
  searchButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
});