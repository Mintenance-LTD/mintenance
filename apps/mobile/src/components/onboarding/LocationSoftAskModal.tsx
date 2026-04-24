/**
 * LocationSoftAskModal — Tier 1 step 2 of the 2026-04-19 mobile
 * onboarding audit (§5.3). Contextual rationale before the iOS/
 * Android foreground-location dialog fires for a new contractor.
 *
 * Mirrors PushSoftAskModal line-for-line — same pageSheet layout,
 * same Allow / Not Now / Open Settings variants, same theme
 * tokens. The only differences are the copy and the permission
 * this modal governs.
 *
 * "While using the app" only. The audit calls the always-on
 * tracking permission out as a separate post-first-job ask
 * (§5.4), so this modal never asks for "Always".
 */

import React from 'react';
import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { LocationPermissionStatus } from '../../hooks/useLocationSoftAskGate';

interface LocationSoftAskModalProps {
  visible: boolean;
  permissionStatus: LocationPermissionStatus | null;
  /** Return value is ignored; we only care about the side-effect. */
  onAllow: () => void | Promise<unknown>;
  onDismiss: () => void | Promise<unknown>;
  onOpenSettings: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'briefcase-outline',
      text: 'See jobs posted in your service area',
    },
    {
      icon: 'map-outline',
      text: 'Homeowners find you on the map when they search nearby',
    },
    {
      icon: 'navigate-outline',
      text: 'Get accurate travel times so you can plan your day',
    },
  ];

export const LocationSoftAskModal: React.FC<LocationSoftAskModalProps> = ({
  visible,
  permissionStatus,
  onAllow,
  onDismiss,
  onOpenSettings,
}) => {
  if (!visible) return null;

  const isDenied = permissionStatus === 'denied';

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={() => {
        void onDismiss();
      }}
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrap}>
            <Ionicons name='location' size={48} color={theme.colors.primary} />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            See jobs near you
          </Text>

          <Text style={styles.subtitle}>
            {isDenied
              ? 'Location is turned off for Mintenance. Enable it in Settings to see jobs near you and get matched based on your area.'
              : 'Allow location access while you use the app — we only read your location when Mintenance is open.'}
          </Text>

          <View style={styles.benefits}>
            {BENEFITS.map((b) => (
              <View key={b.icon} style={styles.benefitRow}>
                <View style={styles.benefitIconWrap}>
                  <Ionicons
                    name={b.icon}
                    size={20}
                    color={theme.colors.primary}
                  />
                </View>
                <Text style={styles.benefitText}>{b.text}</Text>
              </View>
            ))}
          </View>

          <View style={styles.privacyNote}>
            <Ionicons
              name='shield-checkmark-outline'
              size={16}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.privacyText}>
              We ask for &ldquo;While using the app&rdquo; only. For en-route
              tracking during a job, we&apos;ll ask separately when you accept
              your first job.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (isDenied) {
                void onOpenSettings();
              } else {
                void onAllow();
              }
            }}
            accessibilityRole='button'
            accessibilityLabel={
              isDenied ? 'Open location settings' : 'Allow location'
            }
          >
            <Text style={styles.primaryButtonText}>
              {isDenied ? 'Open Settings' : 'Allow Location'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              void onDismiss();
            }}
            accessibilityRole='button'
            accessibilityLabel='Not now'
          >
            <Text style={styles.secondaryButtonText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  iconWrap: {
    width: 88,
    height: 88,
    borderRadius: 28,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: { elevation: 3 },
    }),
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 15,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  benefits: {
    backgroundColor: theme.colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.textPrimary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 2 },
    }),
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  benefitIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: theme.colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  benefitText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.textPrimary,
    lineHeight: 20,
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 4,
    marginBottom: 16,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: theme.colors.textTertiary,
    lineHeight: 18,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 12,
  },
  primaryButton: {
    backgroundColor: theme.colors.textPrimary,
    paddingVertical: 16,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.textInverse,
  },
  secondaryButton: {
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.textSecondary,
  },
});
