/**
 * HomeownerSetupScreen — Mint Editorial v2 (2026-05-22, from
 * `.design-bundle/.../redesign-v2/mobile-auth.html` screen 08).
 *
 * Post-signup homeowner profile setup. Three sections:
 *   1. Avatar uploader (placeholder — wiring is a follow-up)
 *   2. Property type grid (House / Flat / Terrace / Bungalow)
 *   3. Top concern chips (Boiler / Plumbing / Garden / etc.)
 *
 * Persistence note: this screen currently keeps form state local
 * and submits a single PATCH /api/users/profile call with the
 * collected `property_type` (stored on profiles.profile_metadata
 * follow-up) + `concern_tags` (job-feed bias preferences). The
 * fields the live `profiles` table doesn't have yet are held on
 * the screen and the route accepts unknown keys silently — wire
 * them properly in a follow-up. The screen is safe to skip
 * (CTA = "Finish setup") so a partial submit doesn't block the
 * user from reaching the dashboard.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { me } from '../../design-system/mint-editorial';

interface HomeownerSetupScreenProps {
  /** Called when the user submits or backs out — controls dismissal of the parent modal. */
  onComplete: () => void;
}

type PropertyType = 'house' | 'flat' | 'terrace' | 'bungalow';

interface PropertyTile {
  id: PropertyType;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
}

const PROPERTY_TILES: ReadonlyArray<PropertyTile> = [
  { id: 'house', icon: 'home-outline', label: 'House' },
  { id: 'flat', icon: 'business-outline', label: 'Flat' },
  { id: 'terrace', icon: 'grid-outline', label: 'Terrace' },
  { id: 'bungalow', icon: 'home-sharp', label: 'Bungalow' },
];

const CONCERN_OPTIONS: ReadonlyArray<string> = [
  'Boiler service',
  'Plumbing',
  'Garden',
  'Electrical',
  'Painting',
  'Cleaning',
];

export const HomeownerSetupScreen: React.FC<HomeownerSetupScreenProps> = ({
  onComplete,
}) => {
  const { user } = useAuth();
  const [propertyType, setPropertyType] = useState<PropertyType | null>(null);
  const [concerns, setConcerns] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggleConcern = useCallback((concern: string) => {
    setConcerns((prev) => {
      const next = new Set(prev);
      if (next.has(concern)) next.delete(concern);
      else next.add(concern);
      return next;
    });
  }, []);

  const initials = useMemo(() => {
    const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    if (!name) return 'M';
    return name
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }, [user?.firstName, user?.lastName]);

  const displayName = useMemo(() => {
    const first = user?.firstName ?? '';
    const last = user?.lastName ?? '';
    const composed = `${first} ${last}`.trim();
    return composed || 'Your home';
  }, [user?.firstName, user?.lastName]);

  const handleAvatarUpload = useCallback(() => {
    Alert.alert(
      'Profile photo',
      'You can add a profile photo from the Profile tab after setup. Skipping for now.'
    );
  }, []);

  const handleFinish = useCallback(async () => {
    setSubmitting(true);
    try {
      // Best-effort PATCH — unknown keys are dropped by the route's
      // Zod schema today, but we still send them so once the
      // schema is widened (follow-up ticket) the data lands without
      // a second migration. A failure here doesn't block the user
      // from reaching the dashboard — we still dismiss the modal.
      await mobileApiClient.patch('/api/users/profile', {
        propertyType: propertyType ?? undefined,
        concernTags: Array.from(concerns),
      });
    } catch (err) {
      logger.warn('HomeownerSetup PATCH failed; continuing', { error: err });
    } finally {
      setSubmitting(false);
      onComplete();
    }
  }, [propertyType, concerns, onComplete]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={onComplete}
          accessibilityRole='button'
          accessibilityLabel='Skip setup for now'
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name='close' size={20} color={me.ink2} />
        </TouchableOpacity>

        <Text style={styles.title} accessibilityRole='header'>
          Set up your home
        </Text>
        <Text style={styles.subtitle}>
          Three questions. Helps us match better trades.
        </Text>

        {/* Avatar card */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarTile}>
            <Text style={styles.avatarInitials}>{initials}</Text>
          </View>
          <View style={styles.avatarBody}>
            <Text style={styles.avatarName}>{displayName}</Text>
            <Text style={styles.avatarHint}>Add a profile photo</Text>
          </View>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={handleAvatarUpload}
            accessibilityRole='button'
            accessibilityLabel='Upload profile photo'
          >
            <Text style={styles.uploadBtnText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Property type */}
        <Text style={styles.sectionEyebrow}>What kind of home?</Text>
        <View style={styles.propertyGrid}>
          {PROPERTY_TILES.map((tile) => {
            const active = propertyType === tile.id;
            return (
              <TouchableOpacity
                key={tile.id}
                style={[
                  styles.propertyTile,
                  active && styles.propertyTileActive,
                ]}
                onPress={() => setPropertyType(tile.id)}
                accessibilityRole='radio'
                accessibilityState={{ checked: active }}
                accessibilityLabel={`Property type: ${tile.label}`}
              >
                <Ionicons
                  name={tile.icon}
                  size={22}
                  color={active ? me.brand : me.ink2}
                />
                <Text
                  style={[
                    styles.propertyTileText,
                    active && styles.propertyTileTextActive,
                  ]}
                >
                  {tile.label}
                </Text>
                {active ? (
                  <Ionicons name='checkmark' size={14} color={me.brand} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Top concerns */}
        <Text style={styles.sectionEyebrow}>What’s first on your list?</Text>
        <View style={styles.concernChips}>
          {CONCERN_OPTIONS.map((concern) => {
            const on = concerns.has(concern);
            return (
              <TouchableOpacity
                key={concern}
                style={[styles.chip, on && styles.chipActive]}
                onPress={() => toggleConcern(concern)}
                accessibilityRole='checkbox'
                accessibilityState={{ checked: on }}
                accessibilityLabel={`Top concern: ${concern}`}
              >
                {on ? (
                  <Ionicons
                    name='checkmark'
                    size={14}
                    color={me.onBrand}
                    style={styles.chipCheck}
                  />
                ) : null}
                <Text style={[styles.chipText, on && styles.chipTextActive]}>
                  {concern}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.primaryBtn, submitting && styles.primaryBtnDisabled]}
          onPress={handleFinish}
          activeOpacity={0.9}
          disabled={submitting}
          accessibilityRole='button'
          accessibilityLabel='Finish setup'
        >
          <Text style={styles.primaryBtnText}>
            {submitting ? 'Saving…' : 'Finish setup →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default HomeownerSetupScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: me.bg,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 8,
    paddingBottom: 24,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: me.bg2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontFamily: me.font.display,
    fontSize: 30,
    lineHeight: 34,
    color: me.ink,
    marginBottom: 4,
    letterSpacing: me.displayTracking,
  },
  subtitle: {
    fontSize: 14,
    color: me.ink2,
    marginBottom: 22,
  },
  // Avatar
  avatarCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: me.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: me.line,
    padding: 14,
    marginBottom: 24,
  },
  avatarTile: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitials: {
    fontFamily: me.font.display,
    fontSize: 20,
    color: me.onBrand,
    letterSpacing: me.displayTracking,
  },
  avatarBody: {
    flex: 1,
  },
  avatarName: {
    fontSize: 14,
    fontWeight: '600',
    color: me.ink,
  },
  avatarHint: {
    fontSize: 11,
    color: me.ink3,
    marginTop: 2,
  },
  uploadBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9999,
    backgroundColor: me.brand,
  },
  uploadBtnText: {
    color: me.onBrand,
    fontSize: 12,
    fontWeight: '600',
  },
  // Section eyebrow
  sectionEyebrow: {
    fontSize: 11,
    fontWeight: '700',
    color: me.ink3,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  // Property grid
  propertyGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 22,
  },
  propertyTile: {
    flexBasis: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: me.line,
    backgroundColor: me.surface,
  },
  propertyTileActive: {
    borderColor: me.brand,
    backgroundColor: me.brandSoft,
  },
  propertyTileText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: me.ink2,
  },
  propertyTileTextActive: {
    color: me.ink,
  },
  // Concern chips
  concernChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 9999,
    backgroundColor: me.surface,
    borderWidth: 1,
    borderColor: me.line,
  },
  chipActive: {
    backgroundColor: me.brand,
    borderColor: me.brand,
  },
  chipCheck: {
    marginRight: 4,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: me.ink2,
  },
  chipTextActive: {
    color: me.onBrand,
  },
  // Footer
  footer: {
    paddingHorizontal: 22,
    paddingTop: 12,
    paddingBottom: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: me.line,
    backgroundColor: me.bg,
  },
  primaryBtn: {
    height: 52,
    borderRadius: 14,
    backgroundColor: me.brand,
    alignItems: 'center',
    justifyContent: 'center',
    ...me.shadow.btn,
  },
  primaryBtnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: me.onBrand,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
