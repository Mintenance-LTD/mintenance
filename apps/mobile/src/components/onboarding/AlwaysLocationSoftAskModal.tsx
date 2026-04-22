/**
 * AlwaysLocationSoftAskModal — Tier 2 of the 2026-04-19 mobile
 * onboarding audit (PDF §5.4). Contextual rationale before the
 * iOS/Android "Always / Allow all the time" system dialog.
 *
 * Fires when a contractor has a live assigned/in_progress job.
 * At this point the homeowner is watching the live tracking map
 * and expects "contractor is on the way" to keep updating even
 * when the contractor's phone is locked or the app is
 * backgrounded while driving.
 *
 * Mirrors LocationSoftAskModal line-for-line — same pageSheet
 * layout, Allow / Not Now / Open Settings states, same tokens.
 * The only deltas are the icon, copy, and the permission being
 * requested.
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
import type { AlwaysLocationPermissionStatus } from '../../hooks/useAlwaysLocationSoftAskGate';

interface AlwaysLocationSoftAskModalProps {
  visible: boolean;
  permissionStatus: AlwaysLocationPermissionStatus | null;
  onAllow: () => void | Promise<unknown>;
  onDismiss: () => void | Promise<unknown>;
  onOpenSettings: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'navigate-circle-outline',
      text: "Keep the homeowner's 'on the way' map live while you drive",
    },
    {
      icon: 'battery-charging-outline',
      text: 'Low-impact: we only update while you are traveling to a job',
    },
    {
      icon: 'pause-circle-outline',
      text: 'Tracking stops automatically the moment you arrive',
    },
  ];

export const AlwaysLocationSoftAskModal: React.FC<
  AlwaysLocationSoftAskModalProps
> = ({ visible, permissionStatus, onAllow, onDismiss, onOpenSettings }) => {
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
            <Ionicons name='car-sport' size={48} color={theme.colors.primary} />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            Stay live while you&apos;re on the way
          </Text>

          <Text style={styles.subtitle}>
            {isDenied
              ? "Background location is off. To keep the homeowner's live map updating while you drive, enable 'Allow all the time' in Settings."
              : "You've got a job assigned. If you background the app while driving, the homeowner's live map stops updating. Turning on 'Always' keeps it fresh."}
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
              Your location only flows while you have an active job assigned to
              you. Complete or cancel the job and tracking stops — you can flip
              it off in Settings any time.
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
              isDenied ? 'Open location settings' : 'Allow always-on location'
            }
          >
            <Text style={styles.primaryButtonText}>
              {isDenied ? 'Open Settings' : 'Allow Always'}
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
