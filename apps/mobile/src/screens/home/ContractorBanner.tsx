/**
 * ContractorBanner Component
 * 
 * Displays the contractor-specific banner with greeting and profile icon.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { User } from '../../types';

interface ContractorBannerProps {
  user: User | null;
}

export const ContractorBanner: React.FC<ContractorBannerProps> = ({ user }) => {
  return (
    <View style={styles.contractorBanner}>
      <View style={styles.contractorContent}>
        <Text style={styles.contractorGreeting}>Mintenance Service Hub</Text>
        <Text style={styles.contractorSubGreeting}>Good morning,</Text>
        <Text style={styles.contractorName}>{user?.firstName}</Text>
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
  contractorBanner: {
    backgroundColor: theme.colors.primary,
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  contractorContent: {
    flex: 1,
    paddingLeft: 20,
  },
  contractorGreeting: {
    fontSize: 14,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
    fontWeight: '500',
  },
  contractorSubGreeting: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
  },
  contractorName: {
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
