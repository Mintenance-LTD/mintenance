/**
 * PushSoftAskModal
 *
 * Rationale screen shown AFTER the onboarding swiper finishes, asking
 * the user to enable push notifications. This is the one and only
 * app-controlled gate that may fire the iOS one-shot system dialog —
 * see `usePushSoftAskGate` for the surrounding logic.
 *
 * Behaviour:
 *   - If the current OS permission is 'undetermined', we show the
 *     "Allow Notifications" CTA. Tapping it triggers
 *     NotificationService.initialize({ promptIfUndetermined: true }),
 *     which burns the one-shot dialog RIGHT HERE, with context on
 *     screen, instead of during a silent sign-in.
 *   - If the current OS permission is 'denied' (we've been here
 *     before, user said no, 7-day cool-off elapsed), we swap the
 *     primary CTA for "Open Settings" which deep-links to the
 *     device notification settings page — the only way to recover
 *     on iOS once the one-shot is spent.
 *   - "Not Now" / swipe-down is always a valid escape hatch. We
 *     persist the dismissal timestamp so the soft-ask doesn't
 *     re-appear for 7 days.
 *
 * Non-forced: user can always dismiss. Push remains optional.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../../theme';
import type { PushPermissionStatus } from '../../hooks/usePushSoftAskGate';

interface PushSoftAskModalProps {
  visible: boolean;
  permissionStatus: PushPermissionStatus | null;
  /** Return value (if any) is ignored — we only care about the side-effect. */
  onAllow: () => void | Promise<unknown>;
  onDismiss: () => void | Promise<unknown>;
  onOpenSettings: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'briefcase-outline',
      text: 'Get notified the moment a contractor bids on your job',
    },
    {
      icon: 'cash-outline',
      text: 'Never miss a payment confirmation or escrow update',
    },
    {
      icon: 'chatbubbles-outline',
      text: 'Get real-time messages from the other side of the job',
    },
    {
      icon: 'calendar-outline',
      text: 'Reminders for site visits and meeting times',
    },
  ];

export function PushSoftAskModal({
  visible,
  permissionStatus,
  onAllow,
  onDismiss,
  onOpenSettings,
}: PushSoftAskModalProps) {
  if (!visible) return null;

  const isDenied = permissionStatus === 'denied';

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={() => {
        onDismiss();
      }}
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons
              name='notifications'
              size={48}
              color={theme.colors.primary}
            />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            Stay in the loop
          </Text>

          <Text style={styles.subtitle}>
            {isDenied
              ? 'Notifications are turned off for Mintenance. To get bid, payment and message alerts, enable them in Settings.'
              : 'Turn on notifications so you never miss an important update on your jobs.'}
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
              We only send notifications about your jobs — never marketing. You
              can change this at any time in Settings.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              if (isDenied) {
                onOpenSettings();
              } else {
                onAllow();
              }
            }}
            accessibilityRole='button'
            accessibilityLabel={
              isDenied ? 'Open notification settings' : 'Allow notifications'
            }
          >
            <Text style={styles.primaryButtonText}>
              {isDenied ? 'Open Settings' : 'Allow Notifications'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              onDismiss();
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.backgroundSecondary,
  },
  content: {
    flex: 1,
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
