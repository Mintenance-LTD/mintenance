import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '../../../theme';

interface ProfileHeaderUser {
  first_name?: string;
  last_name?: string;
  /** Computed compat fields */
  firstName?: string;
  lastName?: string;
  company_name?: string;
  email?: string;
  profile_image_url?: string;
  avatar_url?: string;
  verified?: boolean;
  role?: string;
}

interface ProfileHeaderProps {
  user: ProfileHeaderUser | null;
  joinDate: string;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({ user, joinDate }) => {
  const firstName = user?.first_name || user?.firstName || '';
  const lastName = user?.last_name || user?.lastName || '';
  const displayName =
    user?.company_name ||
    (firstName ? `${firstName}${lastName ? ' ' + lastName : ''}` : 'User');

  const initials = firstName && lastName
    ? `${firstName[0]}${lastName[0]}`.toUpperCase()
    : firstName
    ? firstName[0].toUpperCase()
    : '?';

  const avatarUri = user?.profile_image_url || user?.avatar_url;
  const isContractor = user?.role === 'contractor';
  const gradientColors: [string, string, string] = isContractor
    ? ['#0F766E', '#0D9488', '#0891B2']
    : ['#1E40AF', '#3B82F6', '#06B6D4'];

  return (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.hero}
    >
      {/* Decorative circles */}
      <View style={styles.decor1} />
      <View style={styles.decor2} />

      {/* Avatar with white ring */}
      <View style={styles.avatarRing}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
            accessibilityLabel={`Profile photo of ${displayName}`}
          />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        {user?.verified && (
          <View style={styles.verifiedDot}>
            <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          </View>
        )}
      </View>

      {/* Name */}
      <Text style={styles.displayName} numberOfLines={1}>
        {displayName}
      </Text>

      {/* Contractor subtitle */}
      {isContractor && (
        <View style={styles.subtitleRow}>
          <Ionicons name="hammer" size={12} color="rgba(255,255,255,0.75)" />
          <Text style={styles.subtitleText}>Professional Contractor</Text>
        </View>
      )}

      {/* Email */}
      {user?.email ? (
        <Text style={styles.emailText} numberOfLines={1}>
          {user.email}
        </Text>
      ) : null}

      {/* Badge pills */}
      <View style={styles.badgeRow}>
        <View style={styles.pill}>
          <Ionicons
            name={isContractor ? 'construct' : 'home'}
            size={11}
            color="rgba(255,255,255,0.9)"
          />
          <Text style={styles.pillText}>
            {isContractor ? 'Professional' : 'Homeowner'}
          </Text>
        </View>
        {joinDate ? (
          <View style={styles.pill}>
            <Ionicons name="calendar-outline" size={11} color="rgba(255,255,255,0.9)" />
            <Text style={styles.pillText}>Since {joinDate}</Text>
          </View>
        ) : null}
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  hero: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 16,
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.07)',
    top: -60,
    right: -50,
  },
  decor2: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255,255,255,0.05)',
    bottom: -40,
    left: -30,
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 94,
    height: 94,
    borderRadius: 47,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 94,
    height: 94,
    borderRadius: 47,
  },
  avatarText: {
    fontSize: 34,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
  },
  subtitleText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  emailText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 14,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  pillText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.92)',
    fontWeight: '600',
  },
});
