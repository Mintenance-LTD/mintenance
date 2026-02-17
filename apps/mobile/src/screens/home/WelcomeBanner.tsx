/**
 * WelcomeBanner Component
 *
 * Airbnb-style search pill with greeting text.
 * Search bar matches Airbnb's "Where to?" pattern with filter icon.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { User } from '@mintenance/types';

interface WelcomeBannerProps {
  user: User | null;
  onSearchPress?: () => void;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user: _user, onSearchPress }) => {
  return (
    <View style={styles.welcomeBanner}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeSubGreeting}>{getTimeGreeting()}</Text>
      </View>

      {/* Airbnb-style search pill */}
      {onSearchPress && (
        <TouchableOpacity
          style={styles.searchPill}
          onPress={onSearchPress}
          accessibilityRole="search"
          accessibilityLabel="Search for services or contractors"
        >
          <Ionicons name="search" size={20} color={theme.colors.textPrimary} />
          <View style={styles.searchTextContainer}>
            <Text style={styles.searchTitle}>Where to?</Text>
            <Text style={styles.searchSubtitle}>Anywhere · Any week · Add details</Text>
          </View>
          <View style={styles.filterButton}>
            <Ionicons name="options-outline" size={17} color={theme.colors.textPrimary} />
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  welcomeBanner: {
    backgroundColor: theme.colors.background,
    paddingTop: 10,
    paddingBottom: 10,
    paddingHorizontal: 24,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeSubGreeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 0,
  },
  searchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 9,
    paddingVertical: 11,
    marginTop: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  searchTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  searchSubtitle: {
    fontSize: 13,
    color: theme.colors.textSecondary,
    marginTop: 2,
  },
  filterButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: theme.colors.borderLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
