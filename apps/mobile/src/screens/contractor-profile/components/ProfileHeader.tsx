/**
 * Public contractor profile header — Mint Editorial v2 (2026-05-23
 * redesign). The OTHER ProfileHeader (apps/mobile/src/screens/profile/
 * components/ProfileHeader.tsx) is the contractor's OWN profile tab
 * and got the same treatment in Sprint 7.3.
 *
 * Replaces the prior full-bleed mint-gradient hero (with 2 decorative
 * circles, glassy nav pills, overlapping avatar with white border)
 * with the calm editorial pattern used by the public-facing Tomas
 * Reilly mockup: paper background, brand-soft avatar ring, serif
 * name in ink, slim chips for trust signals + skills.
 */

import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { me } from '../../../design-system/mint-editorial';
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
    <View style={[styles.wrap, { paddingTop: topInset + 12 }]}>
      {/* Nav row */}
      <View style={styles.navRow}>
        {onBack ? (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={onBack}
            accessibilityRole='button'
            accessibilityLabel='Go back'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='arrow-back' size={20} color={me.ink} />
          </TouchableOpacity>
        ) : (
          <View style={styles.navBtn} />
        )}
        <View style={{ flex: 1 }} />
        {onShare ? (
          <TouchableOpacity
            style={styles.navBtn}
            onPress={onShare}
            accessibilityRole='button'
            accessibilityLabel='Share profile'
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name='share-outline' size={20} color={me.ink} />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Avatar + verified */}
      <View style={styles.avatarBlock}>
        <View style={styles.avatarRing}>
          {profileImageUrl ? (
            <Image
              source={{ uri: profileImageUrl }}
              style={styles.avatarImage}
              resizeMode='cover'
              accessibilityIgnoresInvertColors
            />
          ) : (
            <View style={styles.avatarFill}>
              <Ionicons name='person' size={36} color={me.ink3} />
            </View>
          )}
          {verified ? (
            <View style={styles.verifiedDot}>
              <Ionicons name='checkmark-circle' size={20} color={me.brand} />
            </View>
          ) : null}
        </View>

        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.trade}>{tradeLabel}</Text>

        {location ? (
          <View style={styles.locationRow}>
            <Ionicons name='location-outline' size={13} color={me.ink3} />
            <Text style={styles.locationText}>{location}</Text>
          </View>
        ) : null}

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
        <View style={styles.chipRow}>
          {verified ? (
            <View style={styles.chip}>
              <Ionicons name='shield-checkmark' size={12} color={me.brand} />
              <Text style={styles.chipText}>Verified</Text>
            </View>
          ) : null}
          <View style={styles.chip}>
            <Ionicons name='flash' size={12} color={me.accent} />
            <Text style={styles.chipText}>&lt; 1hr response</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name='ribbon' size={12} color={me.brand} />
            <Text style={styles.chipText}>Insured</Text>
          </View>
        </View>

        {/* Service pills */}
        {skills && skills.length > 0 ? (
          <View style={styles.skillRow}>
            {skills.slice(0, 6).map((skill) => (
              <View key={skill} style={styles.skillPill}>
                <Text style={styles.skillText}>
                  {skill.charAt(0).toUpperCase() + skill.slice(1)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: me.bg,
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
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBlock: {
    alignItems: 'center',
    paddingTop: 8,
  },
  avatarRing: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 2,
    borderColor: me.brandSoft,
    backgroundColor: me.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  avatarFill: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarImage: {
    width: 88,
    height: 88,
    borderRadius: 44,
  },
  verifiedDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: me.surface,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: {
    fontFamily: me.font.display,
    fontSize: 26,
    lineHeight: 30,
    color: me.ink,
    letterSpacing: me.displayTracking,
    textAlign: 'center',
    marginBottom: 4,
  },
  trade: {
    fontSize: 13,
    color: me.ink2,
    fontWeight: '500',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  locationText: {
    fontSize: 12,
    color: me.ink3,
  },
  bio: {
    fontSize: 13,
    color: me.ink2,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 12,
    paddingHorizontal: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.ink,
  },
  skillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  skillPill: {
    backgroundColor: me.brandSoft,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  skillText: {
    fontSize: 11,
    fontWeight: '600',
    color: me.brand,
  },
});
