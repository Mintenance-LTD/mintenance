/**
 * WelcomeBanner Component
 *
 * Displays the welcome banner for homeowners with greeting,
 * and a search row matching the web's Where/When/What pattern.
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

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user, onSearchPress }) => {
  return (
    <View style={styles.welcomeBanner}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeSubGreeting}>{getTimeGreeting()}</Text>
        <Text style={styles.welcomeName}>{user?.firstName}</Text>
      </View>

      {/* Search Row - matching web's Where/When/What */}
      {onSearchPress && (
        <TouchableOpacity
          style={styles.searchRow}
          onPress={onSearchPress}
          accessibilityRole="search"
          accessibilityLabel="Search for services or contractors"
        >
          <Ionicons name="search-outline" size={18} color={theme.colors.textTertiary} />
          <Text style={styles.searchPlaceholder}>What do you need help with?</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  welcomeBanner: {
    backgroundColor: theme.colors.primary,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  welcomeContent: {
    flex: 1,
  },
  welcomeSubGreeting: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
  },
  welcomeName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: 8,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.white,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginTop: 12,
    gap: 10,
  },
  searchPlaceholder: {
    color: theme.colors.textTertiary,
    fontSize: 15,
  },
});
