/**
 * ProfileTabs Component
 * 
 * Tab selector for Photos and Reviews.
 * 
 * @filesize Target: <70 lines
 * @compliance Single Responsibility - Tab navigation
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { theme } from '../../../theme';

interface ProfileTabsProps {
  activeTab: 'photos' | 'reviews';
  onTabChange: (tab: 'photos' | 'reviews') => void;
}

export const ProfileTabs: React.FC<ProfileTabsProps> = ({
  activeTab,
  onTabChange,
}) => {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'photos' && styles.activeTab]}
        onPress={() => onTabChange('photos')}
      >
        <Text style={[styles.tabText, activeTab === 'photos' && styles.activeTabText]}>
          Photos
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
        onPress={() => onTabChange('reviews')}
      >
        <Text style={[styles.tabText, activeTab === 'reviews' && styles.activeTabText]}>
          Reviews
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: theme.colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: theme.spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: theme.colors.primary,
  },
  tabText: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.textTertiary,
  },
  activeTabText: {
    color: theme.colors.textPrimary,
    fontWeight: theme.typography.fontWeight.semibold,
  },
});
