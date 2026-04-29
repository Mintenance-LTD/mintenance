/**
 * ProfileHeader — Full-bleed cover hero with overlapping avatar
 *
 * Green gradient hero extending to status bar, floating nav,
 * overlapping avatar with verified badge, name, trade, location.
 */

import React from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { theme, gradients } from '../../../theme';
import { TrustLines } from './TrustLines';

interface ProfileHeaderProps {
  name: string;
  location: string;
  bio?: string;
  verified?: boolean;
  skills?: string[];
  profileImageUrl?: string | null;
  topInset?: number;
  onBack?: () => void;
  onShare?: () => void;
  onEditPress?: () => void;
  showEditButton?: boolean;
  // R7 #9 + #11 trust signals
  postcodePrefix?: string | null;
  postcodeProofCount?: number | null;
  disputeHistory?: {
    resolvedCount: number;
    unresolvedCount: number;
    avgResolutionHours?: number | null;
  };
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  name,
  location,
  bio,
  verified,
  skills,
  profileImageUrl,
  topInset = 0,
  onBack,
  onShare,
  postcodePrefix,
  postcodeProofCount,
  disputeHistory,
}) => {
  const primarySkill = skills?.[0];
  const tradeLabel = primarySkill
    ? primarySkill.charAt(0).toUpperCase() + primarySkill.slice(1)
    : 'Contractor';

  return (
    <View>
      {/* Full-bleed gradient hero */}
      <LinearGradient
        colors={gradients.heroGreen}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.hero, { paddingTop: topInset + 12 }]}
      >
        {/* Decorative elements */}
        <View style={styles.decor1} />
        <View style={styles.decor2} />

        {/* Floating nav row */}
        <View style={styles.navRow}>
          {onBack && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={onBack}
              accessibilityRole='button'
              accessibilityLabel='Go back'
            >
              <Ionicons
                name='arrow-back'
                size={20}
                color={theme.colors.textInverse}
              />
            </TouchableOpacity>
          )}
          <View style={{ flex: 1 }} />
          {onShare && (
            <TouchableOpacity
              style={styles.navBtn}
              onPress={onShare}
              accessibilityRole='button'
              accessibilityLabel='Share profile'
            >
              <Ionicons
                name='share-outline'
                size={20}
                color={theme.colors.textInverse}
              />
            </TouchableOpacity>
          )}
        </View>

        {/* Spacer for avatar overlap */}
        <View style={{ height: 50 }} />
      </LinearGradient>

      {/* Avatar — overlaps hero bottom */}
      <View style={styles.avatarSection}>
        <View style={styles.avatarWrapper}>
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.avatar}
              resizeMode='cover'
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.avatar}>
              <Ionicons
                name='person'
                size={40}
                color={theme.colors.textTertiary}
              />
            </View>
          )}
          {verified && (
            <View style={styles.verifiedBadge}>
              <Ionicons
                name='checkmark'
                size={14}
                color={theme.colors.textInverse}
              />
            </View>
          )}
        </View>

        {/* Name + trade + location */}
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.tradeText}>{tradeLabel}</Text>

        {location ? (
          <View style={styles.locationRow}>
            <Ionicons
              name='location-outline'
              size={14}
              color={theme.colors.textSecondary}
            />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        ) : null}

        {/* Bio */}
        {bio ? (
          <Text style={styles.bio} numberOfLines={3}>
            {bio}
          </Text>
        ) : null}

        {/* R7 #9 + #11 trust lines */}
        <TrustLines
          postcodePrefix={postcodePrefix}
          postcodeProofCount={postcodeProofCount}
          disputeHistory={disputeHistory}
        />

        {/* Trust signals */}
        <View style={styles.trustRow}>
          {verified && (
            <View style={styles.trustPill}>
              <Ionicons
                name='shield-checkmark'
                size={14}
                color={theme.colors.primary}
              />
              <Text style={styles.trustText}>Verified</Text>
            </View>
          )}
          <View style={styles.trustPill}>
            <Ionicons name='flash' size={14} color={theme.colors.accent} />
            <Text style={styles.trustText}>{'< 1hr Response'}</Text>
          </View>
          <View style={styles.trustPill}>
            <Ionicons name='ribbon' size={14} color='#3B82F6' />
            <Text style={styles.trustText}>Insured</Text>
          </View>
        </View>

        {/* Service pills */}
        {skills && skills.length > 0 && (
          <View style={styles.skillsRow}>
            {skills.slice(0, 6).map((skill) => (
              <View key={skill} style={styles.skillPill}>
                <Text style={styles.skillText}>
                  {skill.charAt(0).toUpperCase() + skill.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  hero: {
    paddingHorizontal: 20,
    overflow: 'hidden',
  },
  decor1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  decor2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarSection: {
    alignItems: 'center',
    marginTop: -48,
    paddingHorizontal: 24,
    paddingBottom: 20,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: theme.colors.border,
    borderWidth: 4,
    borderColor: theme.colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: { elevation: 4 },
    }),
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: theme.colors.surface,
  },
  name: {
    fontSize: 24,
    fontWeight: '800',
    color: theme.colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tradeText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: 2,
    textAlign: 'center',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.textSecondary,
  },
  bio: {
    fontSize: 14,
    color: theme.colors.textSecondary,
    lineHeight: 20,
    textAlign: 'center',
    marginTop: 10,
    maxWidth: 320,
  },
  trustRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  trustPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  trustText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.textPrimary,
  },
  skillsRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  skillPill: {
    backgroundColor: theme.colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  skillText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.primary,
  },
});
