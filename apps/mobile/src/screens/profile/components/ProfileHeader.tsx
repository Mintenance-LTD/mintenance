/**
 * ProfileHeader — Mint Editorial v2 (2026-05-23 redesign).
 *
 * Replaces the prior heavy mint-gradient hero (245 lines, three
 * decorative circles, white-on-brand text, brand-tinted pills) with
 * the calm editorial card from redesign-v2 contractor-deck screen 17
 * "Tomas Reilly" profile and the matching homeowner deck:
 *   - Paper surface, dark ink text, mint accents only on the avatar
 *     ring + the verified checkmark.
 *   - Avatar centred, serif name underneath, role caption +
 *     "since {joinDate}" rendered as two slim chips inline.
 *   - Email shown small + muted.
 *
 * Everything else on the screen (Profile completeness, Performance,
 * Verification status, etc.) flows underneath unchanged — only the
 * header is redrawn. This lifts the entire profile screen out of the
 * "old UI with new skeleton" zone the user flagged on the APK.
 */
import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';

interface ProfileHeaderUser {
  first_name?: string;
  last_name?: string;
  firstName?: string;
  lastName?: string;
  company_name?: string;
  email?: string;
  profile_image_url?: string;
  avatar_url?: string;
  verified?: boolean;
  role?: string;
  skills?: string[];
}

interface ProfileHeaderProps {
  user: ProfileHeaderUser | null;
  joinDate: string;
  topInset?: number;
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  user,
  joinDate,
  topInset = 0,
}) => {
  const firstName = user?.first_name || user?.firstName || '';
  const lastName = user?.last_name || user?.lastName || '';
  const displayName =
    user?.company_name ||
    (firstName ? `${firstName}${lastName ? ' ' + lastName : ''}` : 'User');

  const initials =
    firstName && lastName
      ? `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
      : firstName
        ? (firstName[0] ?? '?').toUpperCase()
        : '?';

  const avatarUri = user?.profile_image_url || user?.avatar_url;
  const isContractor = user?.role === 'contractor';

  const subtitleText = isContractor
    ? user?.skills?.[0]
      ? user.skills[0].charAt(0).toUpperCase() + user.skills[0].slice(1)
      : 'Professional Contractor'
    : 'Homeowner';

  return (
    <View style={[styles.hero, { paddingTop: topInset + 24 }]}>
      <View style={styles.avatarRing}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatarImage}
            accessibilityLabel={`Profile photo of ${displayName}`}
          />
        ) : (
          <View style={styles.avatarFill}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        {user?.verified && (
          <View style={styles.verifiedDot}>
            <Ionicons name='checkmark-circle' size={20} color={me.brand} />
          </View>
        )}
      </View>

      <Text style={styles.displayName} numberOfLines={1}>
        {displayName}
      </Text>

      <Text style={styles.subtitle} numberOfLines={1}>
        {subtitleText}
      </Text>

      {user?.email ? (
        <Text style={styles.emailText} numberOfLines={1}>
          {user.email}
        </Text>
      ) : null}

      <View style={styles.chipRow}>
        <View style={styles.chip}>
          <Ionicons
            name={isContractor ? 'construct-outline' : 'home-outline'}
            size={11}
            color={me.brand}
          />
          <Text style={styles.chipText}>
            {isContractor ? 'Professional' : 'Homeowner'}
          </Text>
        </View>
        {joinDate ? (
          <View style={styles.chip}>
            <Ionicons name='calendar-outline' size={11} color={me.ink3} />
            <Text style={[styles.chipText, { color: me.ink3 }]}>
              Since {joinDate}
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    paddingBottom: 24,
    paddingHorizontal: 24,
    alignItems: 'center',
    backgroundColor: me.bg,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: me.brandSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: me.surface,
  },
  avatarFill: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: me.brand,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: me.onBrand,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: me.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  displayName: {
    fontFamily: me.font.display,
    fontSize: 26,
    lineHeight: 30,
    color: me.ink,
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: me.displayTracking,
  },
  subtitle: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
    marginBottom: 4,
  },
  emailText: {
    fontSize: 12,
    color: me.ink3,
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 12,
    color: me.brand,
    fontWeight: '600',
  },
});
