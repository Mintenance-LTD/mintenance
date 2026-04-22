/**
 * BackgroundCheckPromptModal — Tier 1 step 6 of the 2026-04-19
 * mobile onboarding audit (§5.3). Initiates the third-party
 * background check via the existing
 * POST /api/contractor/background-check endpoint.
 *
 * Per PDF §5.3 step 6:
 *   "Kicks off a third-party check asynchronously (48h SLA).
 *    Blocks 'Place a bid' button until clear."
 *
 * No third-party provider choice on screen — the API defaults
 * to 'checkr' per its zod schema. A future commit could add a
 * provider picker if Mintenance wants to expose it.
 *
 * Loading + error handling
 * -------------------------
 * The primary CTA is async. While the request is in flight the
 * button shows a spinner and disables; on success we fire
 * onAfterNavigate so the gate re-probes (background_check_status
 * will now be 'pending' and the gate will hide itself). On
 * failure we surface a toast-style banner and let the user
 * retry or skip.
 */

import React, { useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { mobileApiClient } from '../../utils/mobileApiClient';
import { logger } from '../../utils/logger';
import { theme } from '../../theme';

interface BackgroundCheckPromptModalProps {
  visible: boolean;
  onDismiss: () => void | Promise<unknown>;
  /** Called after a successful initiate so the gate re-probes. */
  onAfterNavigate?: () => void | Promise<unknown>;
}

const BENEFITS: Array<{ icon: keyof typeof Ionicons.glyphMap; text: string }> =
  [
    {
      icon: 'checkmark-done-circle-outline',
      text: 'Unlocks the "Verified" badge homeowners filter by',
    },
    {
      icon: 'time-outline',
      text: 'Usually clears within 48 hours — no action needed from you',
    },
    {
      icon: 'lock-closed-outline',
      text: 'Required before you can place your first bid',
    },
  ];

export const BackgroundCheckPromptModal: React.FC<
  BackgroundCheckPromptModalProps
> = ({ visible, onDismiss, onAfterNavigate }) => {
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!visible) return null;

  const handleStart = async () => {
    if (submitting) return;
    setSubmitting(true);
    setErrorMsg(null);
    try {
      await mobileApiClient.post('/api/contractor/background-check', {});
      // Success — the API flipped background_check_status to
      // 'pending'. Re-probe the gate so the modal self-hides.
      if (onAfterNavigate) {
        await onAfterNavigate();
      } else {
        await onDismiss();
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Could not start the check';
      logger.warn('BackgroundCheckPromptModal: initiate failed', {
        error: msg,
      });
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType='slide'
      presentationStyle='pageSheet'
      onRequestClose={() => {
        if (!submitting) void onDismiss();
      }}
      accessibilityViewIsModal
    >
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Ionicons
              name='shield-checkmark'
              size={48}
              color={theme.colors.primary}
            />
          </View>

          <Text style={styles.title} accessibilityRole='header'>
            Run your background check
          </Text>
          <Text style={styles.subtitle}>
            We partner with a third-party to verify you. They look at basic
            criminal-record and identity checks — nothing is shared with
            homeowners.
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

          {errorMsg && (
            <View style={styles.errorBanner}>
              <Ionicons
                name='alert-circle-outline'
                size={16}
                color={theme.colors.error}
              />
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          )}

          <View style={styles.privacyNote}>
            <Ionicons
              name='information-circle-outline'
              size={14}
              color={theme.colors.textTertiary}
            />
            <Text style={styles.privacyText}>
              Our third-party partner is GDPR-compliant. Their report stays with
              us and an audit trail — not on your public profile.
            </Text>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              submitting && styles.primaryButtonDisabled,
            ]}
            onPress={handleStart}
            disabled={submitting}
            accessibilityRole='button'
            accessibilityLabel='Start background check'
            accessibilityState={{ disabled: submitting, busy: submitting }}
          >
            {submitting ? (
              <ActivityIndicator color={theme.colors.textInverse} />
            ) : (
              <Text style={styles.primaryButtonText}>Start Check</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              if (!submitting) void onDismiss();
            }}
            disabled={submitting}
            accessibilityRole='button'
            accessibilityLabel='Skip for now'
          >
            <Text style={styles.secondaryButtonText}>Skip for now</Text>
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme.colors.error,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.error,
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
    justifyContent: 'center',
    marginBottom: 12,
  },
  primaryButtonDisabled: {
    opacity: 0.6,
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
