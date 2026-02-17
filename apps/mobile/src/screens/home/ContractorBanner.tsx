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
        {user?.is_verified ? (
          <View style={styles.iconRow}>
            <View style={styles.proIcon}>
              <Ionicons name="shield-checkmark" size={16} color={theme.colors.primary} />
            </View>
            <Text style={styles.proBadge}>Verified Pro</Text>
          </View>
        ) : (
          <View style={styles.iconRow}>
            <View style={[styles.proIcon, { backgroundColor: theme.colors.backgroundTertiary }]}>
              <Ionicons name="shield-outline" size={16} color={theme.colors.textTertiary} />
            </View>
            <Text style={[styles.proBadge, { color: theme.colors.textTertiary }]}>Get Verified</Text>
          </View>
        )}
        <Text style={styles.contractorGreeting}>{getTimeGreeting()}</Text>
        <Text style={styles.contractorName}>{user?.firstName}</Text>
        <Text style={styles.contractorSubtext}>Ready to grow your business today</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  contractorBanner: {
    backgroundColor: theme.colors.background,
    paddingTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 0,
  },
  contractorContent: {
    flex: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  proIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: theme.colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  proBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: theme.colors.primary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  contractorGreeting: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    marginBottom: 2,
  },
  contractorName: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginBottom: 2,
  },
  contractorSubtext: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
});
