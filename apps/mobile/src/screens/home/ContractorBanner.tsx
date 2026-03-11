/**
 * ContractorBanner Component
 *
 * Modern gradient hero card with business name, active stats,
 * and a prominent Find Jobs CTA button.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@mintenance/types';
import { theme } from '../../theme';

interface ContractorBannerProps {
  user: User | null;
  onFindJobsPress: () => void;
  activeJobs?: number;
  monthlyEarnings?: number;
}

function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export const ContractorBanner: React.FC<ContractorBannerProps> = ({
  user,
  onFindJobsPress,
  activeJobs = 0,
  monthlyEarnings = 0,
}) => {
  const businessName =
    user?.company_name ||
    (user?.first_name
      ? `${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`
      : 'Contractor');

  return (
    <LinearGradient
      colors={[theme.colors.primaryDark, theme.colors.primary, theme.colors.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      <View style={styles.decorCircle1} />
      <View style={styles.decorCircle2} />

      <View style={styles.content}>
        <Text style={styles.greeting}>{getTimeGreeting()}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {businessName}
        </Text>

        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Ionicons name="briefcase-outline" size={13} color={theme.colors.textInverseMuted} />
            <Text style={styles.badgeText}>
              {activeJobs} active {activeJobs === 1 ? 'job' : 'jobs'}
            </Text>
          </View>
          {monthlyEarnings > 0 && (
            <View style={styles.badge}>
              <Ionicons name="cash-outline" size={13} color={theme.colors.textInverseMuted} />
              <Text style={styles.badgeText}>£{monthlyEarnings.toFixed(0)} earned</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={styles.findJobsBtn}
          onPress={onFindJobsPress}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Browse available jobs"
        >
          <Text style={styles.findJobsBtnText}>Browse Available Jobs</Text>
          <Ionicons name="arrow-forward" size={15} color={theme.colors.primary} />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: 20,
    padding: 24,
    marginTop: 16,
    marginBottom: 8,
    overflow: 'hidden',
    minHeight: 176,
    shadowColor: theme.colors.primaryDark,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  decorCircle1: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: theme.colors.overlayWhite10,
    top: -70,
    right: -50,
  },
  decorCircle2: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: theme.colors.overlayWhite10,
    bottom: -35,
    left: 10,
  },
  content: {
    zIndex: 1,
  },
  greeting: {
    fontSize: 13,
    color: theme.colors.textInverseMuted,
    fontWeight: theme.typography.fontWeight.medium,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  name: {
    fontSize: 26,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.textInverse,
    marginBottom: 14,
    letterSpacing: -0.3,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.overlayWhite15,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    color: theme.colors.textInverseMuted,
    fontWeight: theme.typography.fontWeight.medium,
  },
  findJobsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 18,
    alignSelf: 'flex-start',
    shadowColor: theme.colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  findJobsBtnText: {
    fontSize: 14,
    fontWeight: theme.typography.fontWeight.bold,
    color: theme.colors.primary,
  },
});
