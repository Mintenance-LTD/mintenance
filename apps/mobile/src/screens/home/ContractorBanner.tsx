/**
 * ContractorBanner Component
 *
 * Editorial-style hero card with gradient background,
 * geometric accent shapes, business name, live stats,
 * and a prominent "Browse Jobs" CTA.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { User } from '@mintenance/types';
import { theme, gradients } from '../../theme';
import { formatCurrency } from '../../utils/formatCurrency';

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
      colors={gradients.heroGreen}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {/* Decorative geometric shapes */}
      <View style={styles.decorTopRight} />
      <View style={styles.decorBottomLeft} />
      <View style={styles.decorDiamond} />

      <View style={styles.content}>
        <Text style={styles.greeting}>{getTimeGreeting()}</Text>
        <Text style={styles.name} numberOfLines={1}>
          {businessName}
        </Text>

        {/* Live stats row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{activeJobs}</Text>
            <Text style={styles.statLabel}>Active Jobs</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>
              {formatCurrency(monthlyEarnings)}
            </Text>
            <Text style={styles.statLabel}>This Month</Text>
          </View>
        </View>

        {/* CTA */}
        <TouchableOpacity
          style={styles.ctaButton}
          onPress={onFindJobsPress}
          activeOpacity={0.85}
          accessibilityRole='button'
          accessibilityLabel='Browse available jobs'
        >
          <Text style={styles.ctaText}>Browse Available Jobs</Text>
          <Ionicons
            name='arrow-forward'
            size={16}
            color={theme.colors.primaryDark}
          />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  hero: {
    borderRadius: 24,
    padding: 24,
    marginTop: 16,
    marginBottom: 8,
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#134E4A',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  decorTopRight: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
    top: -60,
    right: -40,
  },
  decorBottomLeft: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -40,
    left: -20,
  },
  decorDiamond: {
    position: 'absolute',
    width: 60,
    height: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: 30,
    right: 60,
    transform: [{ rotate: '45deg' }],
    borderRadius: 8,
  },
  content: {
    zIndex: 1,
  },
  greeting: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  name: {
    fontSize: 28,
    fontWeight: '700',
    color: theme.colors.textInverse,
    marginBottom: 20,
    letterSpacing: -0.5,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  statItem: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 30,
    fontWeight: '700',
    color: theme.colors.textInverse,
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '500',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 20,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.surface,
    borderRadius: 14,
    paddingVertical: 13,
    paddingHorizontal: 20,
    alignSelf: 'flex-start',
    ...Platform.select({
      ios: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  ctaText: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.primaryDark,
  },
});
