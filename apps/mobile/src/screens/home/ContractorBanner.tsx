/**
 * ContractorBanner Component
 *
 * Displays the contractor-specific welcome banner with dark gradient-style
 * background and emerald accent, matching the web's contractor dashboard.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import { User } from '@mintenance/types';

interface ContractorBannerProps {
  user: User | null;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 18) return 'Good afternoon,';
  return 'Good evening,';
}

export const ContractorBanner: React.FC<ContractorBannerProps> = ({ user }) => {
  return (
    <View style={styles.contractorBanner}>
      <View style={styles.accentBar} />
      <View style={styles.contractorContent}>
        <View style={styles.iconRow}>
          <View style={styles.proIcon}>
            <Ionicons name="shield-checkmark" size={18} color={theme.colors.secondary} />
          </View>
          <Text style={styles.proBadge}>Verified Pro</Text>
        </View>
        <Text style={styles.contractorGreeting}>{getTimeGreeting()}</Text>
        <Text style={styles.contractorName}>{user?.firstName}</Text>
        <Text style={styles.contractorSubtext}>Ready to grow your business today</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contractorBanner: {
    backgroundColor: theme.colors.primary,
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: theme.colors.secondary,
  },
  contractorContent: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  proIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  proBadge: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.secondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contractorGreeting: {
    fontSize: 16,
    color: theme.colors.textInverseMuted,
    marginBottom: 4,
  },
  contractorName: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: 4,
  },
  contractorSubtext: {
    fontSize: 14,
    color: theme.colors.textInverseMuted,
  },
});
