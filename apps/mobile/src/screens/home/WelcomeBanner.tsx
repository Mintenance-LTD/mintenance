/**
 * WelcomeBanner Component
 * 
 * Displays the welcome banner for homeowners with greeting and profile icon.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { User } from '../../types';

interface WelcomeBannerProps {
  user: User | null;
}

export const WelcomeBanner: React.FC<WelcomeBannerProps> = ({ user }) => {
  return (
    <View style={styles.welcomeBanner}>
      <View style={styles.welcomeContent}>
        <Text style={styles.welcomeGreeting}>Mintenance Service Hub</Text>
        <Text style={styles.welcomeSubGreeting}>Good morning,</Text>
        <Text style={styles.welcomeName}>{user?.firstName}</Text>
      </View>
      <TouchableOpacity
        style={styles.profileIcon}
        accessibilityRole='button'
        accessibilityLabel='Profile'
        accessibilityHint='Double tap to view and edit your profile'
      >
        <Ionicons
          name='person-circle'
          size={48}
          color={theme.colors.textInverse}
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  welcomeBanner: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  welcomeContent: {
    flex: 1,
    paddingLeft: 20,
  },
  welcomeGreeting: {
    fontSize: 14,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
    fontWeight: '500',
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
  profileIcon: {
    padding: 4,
    paddingRight: 20,
  },
});
